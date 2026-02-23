import {
  cosineSimilarity,
  embedTexts,
} from "../_grading-embed/vectorEmbeddings.js";
import type { ChunkMatch } from "../types.js";
import type { ResumeChunkElement } from "../data/resumeText.js";
import type { DbMethods } from "@misterpea/sqlite-worker-db";

export class ResumeJobClassifier {
  constructor(public db: DbMethods) {
    this.db = db;
  }

  /**
   * Private method to retrieve the next row in order of id
   * @returns {Object|boolean} Return is the row data as an object or false if data not present
   */
  private async getNextJobDescription(): Promise<
    Record<string, string | number> | false
  > {
    const result = await this.db.getData(`
      UPDATE discovered_jobs
      SET is_graded='in_progress'
      WHERE id = (
        SELECT id FROM discovered_jobs
        WHERE is_graded='not_graded'
        ORDER BY id
        LIMIT 1
      )
      RETURNING *
    `);
    if (!result) {
      console.log("No pending grading jobs found");
      return false;
    }
    return result;
  }

  /**
   * Convenience method to count number of words in a string
   * @param {string} str String to be counted
   * @returns {number} number of words that comprise the input string
   */
  private wordCount(str: string): number {
    return str.trim().split(/\s+/).filter(Boolean).length;
  }

  /**
   * Private method that normalizes text strings into a repeatable pattern
   * @param {string} raw Raw text string to be normalized
   * @returns {string} Return is a normalized text string
   */
  private normalizeJobText(raw: string): string {
    const norm = raw
      .replace(/\r\n/g, "\n") // Windows → Unix newlines
      .replace(/[•·►▪]/g, "\n• ") // convert common bullets into a line break + bullet
      .replace(/\n{2,}/g, "\n\n") // collapse extra blank lines
      .replace(/[ \t]+/g, " ") // collapse spaces/tabs
      .replace(/\s(\s{1,})/g, "") // remove extra spaces
      .trim();
    return norm;
  }

  /**
   * Private method to create tiny chunks, which are then collected into larger, overlapping chunks elsewhere
   * @param {string} text Text to be chunked
   * @returns {string[]} Array of chunked strings
   */
  private createMicroChunks(text: string): string[] {
    const lines = text
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);

    const segments: string[] = [];

    for (const line of lines) {
      if (line.length > 400) {
        const sentences = line
          .split(/(?<=[.!?])\s+/) // "end-of-sentence punctuation + space"
          .map((s) => s.trim())
          .filter(Boolean);
        segments.push(...sentences);
      } else {
        segments.push(line);
      }
    }
    return segments;
  }

  /**
   * Private method to create overlapping chunks from smaller chunks
   * @param {string} text_content Article text content
   * @param {string|null} title Article title
   * @param {string|null} excerpt Article excerpt
   * @param {string|null} site_name Article site name
   * @param {number} maxWords Maximum number of words in a chunk
   * @param {number} minWords Minimum number of words in a chunk
   * @param {number} overlapWords Number of words to overlap subsequent chunks by
   * @returns {string[]} An array of strings that have been chunked
   */
  private createChunks(
    text_content: string,
    title: string | null,
    excerpt: string | null,
    site_name: string | null,
    maxWords = 220,
    minWords = 80,
    overlapWords = 40,
  ): string[] {
    const concatenatedInput = `${title ? `Title:${title}` : ""}${excerpt ? `Excerpt:${excerpt}` : ""}${site_name ? `SiteName:${site_name}` : ""}TextContent:${text_content}`;

    const norm = this.normalizeJobText(concatenatedInput);
    const microChunks = this.createMicroChunks(norm);

    const chunks: string[] = [];
    let buffer: string[] = [];
    let bufferWords = 0;

    // reset count/buffer
    const flushBuffer = () => {
      if (!buffer.length) return;
      chunks.push(buffer.join(" ").trim());
      buffer = [];
      bufferWords = 0;
    };

    for (const segment of microChunks) {
      const numSegmentWords = this.wordCount(segment);

      if (bufferWords + numSegmentWords > maxWords && bufferWords >= minWords) {
        flushBuffer();

        // start next chunk with overlap
        if (chunks.length > 0 && overlapWords > 0) {
          const lastChunk = chunks[chunks.length - 1] || "";
          const words = lastChunk.split(/\s+/).filter(Boolean);
          const overlap = words.slice(-overlapWords).join(" ");
          if (overlap) {
            buffer.push(overlap);
            bufferWords = this.wordCount(overlap);
          }
        }
      }
      buffer.push(segment);
      bufferWords += numSegmentWords;
    }
    flushBuffer();
    return chunks;
  }

  /**
   * Method to obtain embedded vectors for a resume and write them to the db
   * @param {ResumeChunkElement[]} resumeText Array of resume strings
   */
  async embedResume(resumeText: ResumeChunkElement[]) {
    console.info("Initiate resume embed");
    // Clear old data
    await this.db.setData("DELETE FROM resume_embeddings", []);

    const embeddings = await embedTexts(resumeText.map((s) => s.text));
    const sqlValues = embeddings.map((embed, i) => [
      resumeText[i]?.id ?? null,
      resumeText[i]?.type ?? null,
      resumeText[i]?.text ?? "",
      JSON.stringify(embed),
    ]);

    try {
      await this.db.insertData(
        `
        INSERT INTO resume_embeddings (id, type, text, embedding)
        VALUES (?, ?, ?, ?)`,
        sqlValues,
      );
      console.info("Resume successfully embedded");
    } catch (err) {
      console.error("Error: Resume could not be embedded");
    }
  }

  /**
   * Private method that loops through each job chunk embedding and compares that
   * with every resume chunk embedding using cosign similarity
   * @param {number[][]} jobEmbeds Array of number arrays that comprise a job embedding
   * @param {number[][]} resumeEmbeds Array of number arrays that comprise a job embedding
   * @returns {ChunkMatch[]} Array of number to be reduced to a score
   */
  private matchJobToResume(
    jobEmbeds: number[][],
    resumeEmbeds: number[][],
  ): ChunkMatch[] {
    const matches: ChunkMatch[] = [];

    for (let j = 0; j < jobEmbeds.length; j += 1) {
      const jobVector = jobEmbeds[j];

      let bestSimilarity = -1;
      let bestResumeIndex = -1;

      for (let r = 0; r < resumeEmbeds.length; r += 1) {
        const sim = cosineSimilarity(jobVector, resumeEmbeds[r]);
        if (sim > bestSimilarity) {
          bestSimilarity = sim;
          bestResumeIndex = r;
        }
      }
      matches.push({
        jobIndex: j,
        resumeIndex: bestResumeIndex,
        similarity: bestSimilarity,
      });
    }
    return matches;
  }

  /**
   * Private method to derive a matching score (0-1) between a job and resume
   * @param {ChunkMatch[]} matches
   * @returns {number} Matching score
   */
  private overallFitScore(matches: ChunkMatch[]): number {
    if (!matches.length) return 0;
    const total = matches.reduce((sum, m) => sum + m.similarity, 0);
    return total / matches.length;
  }

  private async getResumeEmbeddings(): Promise<number[][]> {
    const embeddings = await this.db.getAllData(
      "SELECT embedding FROM resume_embeddings",
    );
    return (embeddings as { embedding: string }[]).map(({ embedding }) =>
      JSON.parse(embedding),
    );
  }

  private async getResumeSummaryEmbeddings(): Promise<number[][]> {
    const embeddings = await this.db.getAllData(
      "SELECT embedding FROM resume_summary",
    );
    return (embeddings as { embedding: string }[]).map(({ embedding }) =>
      JSON.parse(embedding),
    );
  }

  /**
   * Trunk method to coordinate the grading of job fit as
   * compared to the whole resume, as well as the updating
   * of the db with the results
   * @returns
   */
  async gradeFit(excludeLessThanRes = 0.55, excludeLessThanSum = 0.55) {
    const resumeEmbeddings = await this.getResumeEmbeddings();
    const summaryEmbeddings = await this.getResumeSummaryEmbeddings();

    if (!resumeEmbeddings.length || !summaryEmbeddings.length) {
      console.error("No resume or resume summary embedded");
      return;
    }

    const currJob = await this.getNextJobDescription();
    if (!currJob) return;

    const { id, link, text_content, title, excerpt, site_name } = currJob;

    const chunks = this.createChunks(
      text_content?.toString() || "",
      title?.toString() || null,
      excerpt?.toString() || null,
      site_name?.toString() || null,
    );

    const jobEmbeddings = await embedTexts(chunks);

    const wholeResRtn = this.matchJobToResume(jobEmbeddings, resumeEmbeddings);
    const wholeFitScore = this.overallFitScore(wholeResRtn);

    const summaryResRtn = this.matchJobToResume(
      jobEmbeddings,
      summaryEmbeddings,
    );
    const summaryFitScore = this.overallFitScore(summaryResRtn);

    await this.db.setData(
      `
      UPDATE discovered_jobs 
      SET is_graded = 'graded', resume_fit_rough = ?, summary_fit_rough = ? 
      WHERE id = ? AND link= ?`,
      [wholeFitScore, summaryFitScore, id, link],
    );
    if (typeof link === "string") {
      console.info(`Graded fit - link: ${link.substring(0, 60 - 3)}...`);
    } else {
      console.info(`Graded fit - link:${link} is not a string`);
    }

    // Assign to deep comparison table if conditions met
    if (
      wholeFitScore > excludeLessThanRes ||
      summaryFitScore > excludeLessThanSum
    ) {
      await this.db.insertData(
        `
      INSERT INTO candidate_jobs (link)
      VALUES (?)
      `,
        [[link]],
      );

      await this.db.setData(
        `
        UPDATE OR IGNORE discovered_jobs
        SET added_to_candidate = 'added'
        WHERE id = ? AND link = ?
        `,
        [id, link],
      );
      console.info("Record added to candidate_jobs");
    }

    // Recursive call to grade next job
    await this.gradeFit();
  }

  /**
   * Method to check for candidate jobs outside of the normal flow of grading
   */
  async checkForCandidates(
    excludeLessThanRes = 0.55,
    excludeLessThanSum = 0.55,
  ) {
    const candidateResults = await this.db.getAllData(
      `
      SELECT id, link  FROM discovered_jobs
      WHERE added_to_candidate = 'not_added'
      AND (
        resume_fit_rough > ?
        OR summary_fit_rough > ?
      )
      `,
      [excludeLessThanRes, excludeLessThanSum],
    );

    if (!(candidateResults ?? []).length) {
      console.info("No candidates found");
      return;
    }

    for (const { id, link } of candidateResults ?? []) {
      await this.db.insertData(
        `INSERT INTO candidate_jobs (link)
         VALUES (?)
         ON CONFLICT DO NOTHING`,
        [[link]],
      );

      await this.db.setData(
        `UPDATE OR IGNORE discovered_jobs
         SET added_to_candidate = 'added'
         WHERE id = ? AND link = ?`,
        [id, link],
      );
      console.info("Record added to candidate_jobs");
    }
  }
}
