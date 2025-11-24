import { cosineSimilarity, embedTexts } from './vectorEmbeddings';
import { ChunkMatch } from './types';
import { ResumeChunkElement } from './data/resumeText';

export class ResumeJobClassifier {
  classifier: any;

  constructor(public db: any) {
    this.classifier = null;
    this.db = db;
  }

  private async getNextJobDescription() {
    const result = await this.db.getData(`
      UPDATE parsed_jobs
      SET is_graded_whole='in_progress', is_graded_summary='in_progress'
      WHERE id = (
        SELECT id FROM parsed_jobs
        WHERE is_graded_whole='not_graded' AND is_graded_summary='not_graded'
        ORDER BY id
        LIMIT 1
      )
      RETURNING *
    `);
    if (!result) {
      console.log('No pending jobs found');
      return false;
    }
    return result;
  }

  private normalizeJobText(raw: string): string {
    const norm = raw
      .replace(/\r\n/g, '\n')           // Windows → Unix newlines
      .replace(/[•·►▪]/g, '\n• ')       // convert common bullets into a line break + bullet
      .replace(/\n{2,}/g, '\n\n')       // collapse extra blank lines
      .replace(/[ \t]+/g, ' ')          // collapse spaces/tabs
      .replace(/\s(\s{1,})/g, '')       // remove extra spaces
      .trim();
    return norm;
  }

  // For each job we create tiny chunks which are then collected into larger, overlapping chunks
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
          .map(s => s.trim())
          .filter(Boolean);
        segments.push(...sentences);
      } else {
        segments.push(line);
      }
    }
    return segments;
  }

  // convenience method to count number of words
  private wordCount(str: string): number {
    return str.trim().split(/\s+/).filter(Boolean).length;
  }

  // Method to create overlapping chunks from smaller chunks
  private createChunks(text_content: string, title: string | null, excerpt: string | null, site_name: string | null, maxWords = 220, minWords = 80, overlapWords = 40): string[] {
    const concatenatedInput = `${title ? 'Title:' + title : ''} ${excerpt ? 'Excerpt:' + excerpt : ''} ${site_name ? 'Site Name:' + site_name : ''} Text Content:${text_content}`;

    const norm = this.normalizeJobText(concatenatedInput);
    const microChunks = this.createMicroChunks(norm);

    const chunks: string[] = [];
    let buffer: string[] = [];
    let bufferWords = 0;

    // reset count/buffer
    const flushBuffer = () => {
      if (!buffer.length) return;
      chunks.push(buffer.join(' ').trim());
      buffer = [];
      bufferWords = 0;
    };

    for (const segment of microChunks) {
      const numSegmentWords = this.wordCount(segment);

      if (bufferWords + numSegmentWords > maxWords && bufferWords >= minWords) {
        flushBuffer();

        // start next chunk with overlap
        if (chunks.length > 0 && overlapWords > 0) {
          const lastChunk = chunks[chunks.length - 1];
          const words = lastChunk.split(/\s+/).filter(Boolean);
          const overlap = words.slice(-overlapWords).join(' ');
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

  async embedResume(resumeText: ResumeChunkElement[]) {
    console.info('Initiate resume embed');
    // Clear old data
    await this.db.setData(`DELETE FROM resume_embeddings`, []);

    const embeddings = await embedTexts(resumeText.map((s) => s.text));
    const sqlValues = embeddings.map((embed, i) => [resumeText[i].id, resumeText[i].type, resumeText[i].text, JSON.stringify(embed)]);

    try {
      await this.db.insertData(`
        INSERT INTO resume_embeddings (id, type, text, embedding)
        VALUES (?, ?, ?, ?)`,
        sqlValues
      );
      console.info(`Resume successfully embedded`);
    } catch (err) {
      console.error(`Error: Resume could not be embedded`);
    }
  }

  // Loop through each job chunk and compare with every resume chunk
  private matchJobToResume(jobEmbeds: number[][], resumeEmbeds: number[][]) {
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
        similarity: bestSimilarity
      });
    }
    return matches;
  }

  private overallFitScore(matches: ChunkMatch[]): number {
    if (!matches.length) return 0;
    const total = matches.reduce((sum, m) => sum + m.similarity, 0);
    return total / matches.length;
  }

  private async getResumeEmbeddings(): Promise<number[][]> {
    const embeddings = await this.db.getAllData(`SELECT embedding FROM resume_embeddings`);
    return embeddings.map(({ embedding }: any) => JSON.parse(embedding));
  }

  private async getResumeSummaryEmbeddings(): Promise<number[][]> {
    const embeddings = await this.db.getAllData(`SELECT embedding FROM resume_summary`);
    return embeddings.map(({ embedding }: any) => JSON.parse(embedding));
  }

  /**
   * Trunk method to coordinate the grading of job fit as 
   * compared to the whole resume, as well as the updating 
   * of the db with the results
   * @returns 
   */
  async gradeFit() {
    const resumeEmbeddings = await this.getResumeEmbeddings();
    const summaryEmbeddings = await this.getResumeSummaryEmbeddings();

    if (!resumeEmbeddings.length || !summaryEmbeddings.length) {
      console.error('No resume or resume summary embedded');
      return;
    }

    const currJob = await this.getNextJobDescription();
    if (!currJob) return;

    const { id, link, text_content, title, excerpt, site_name } = currJob;

    const chunks = this.createChunks(text_content, title, excerpt, site_name);

    const jobEmbeddings = await embedTexts(chunks);

    const wholeResRtn = this.matchJobToResume(jobEmbeddings, resumeEmbeddings);
    const wholeFitScore = this.overallFitScore(wholeResRtn);

    const summaryResRtn = this.matchJobToResume(jobEmbeddings, summaryEmbeddings);
    const summaryFitScore = this.overallFitScore(summaryResRtn);

    await this.db.setData(`
      UPDATE parsed_jobs 
      SET is_graded_whole = 'graded', resume_fit = ?, summary_fit = ? 
      WHERE id = ? AND link= ?`, [wholeFitScore, summaryFitScore, id, link]);
    console.info(`Whole resume - graded link: ${link.substring(0, 60 - 3)}...`);

    // Recursive call to grade next job
    await this.gradeFit();
  }
}
