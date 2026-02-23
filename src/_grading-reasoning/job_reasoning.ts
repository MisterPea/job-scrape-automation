import OpenAI from "openai";
import { prompts } from "./job_reasoning-prompts.js";
import { embedTexts } from "../_grading-embed/vectorEmbeddings.js";
import type { DeepCompareOutput } from "../types.js";
import type { DbMethods } from "@misterpea/sqlite-worker-db";

export class ReasoningModel {
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  REASONING_MODEL = "o4-mini-2025-04-16";

  constructor(public db: DbMethods) {
    this.db = db;
  }

  /**
   * Method to create a high-level summary of a resume
   * @returns None - Output written to database
   */
  async createResumeSummary() {
    console.info("Resume summary - pulling saved resume");
    const resumeText = await this.db.getAllData(
      `
      SELECT text FROM resume_embeddings`,
      [],
    );
    if (!(resumeText ?? []).length) {
      console.error("Resume not present in db");
      return;
    }
    const joinedText = (resumeText ?? [])
      .map((item) => (item as { text: string }).text)
      .join("\n\n");

    try {
      console.info("Resume summary - summarizing");
      const summaryResponse = await this.client.chat.completions.create({
        model: this.REASONING_MODEL,
        messages: [
          { role: "system", content: prompts.resumeSummarySystemMessage },
          { role: "user", content: joinedText },
        ],
        response_format: { type: "text" },
      });
      const summaryString =
        summaryResponse.choices?.[0]?.message?.content ?? "";
      const splitSummary: string[] =
        summaryString?.split("\n\n").filter(Boolean) || [];

      // get embedding
      const summaryEmbedding = await embedTexts(splitSummary);
      const joinedData = summaryEmbedding.map((embedding, i) => [
        splitSummary[i],
        JSON.stringify(embedding),
      ]);

      // insert data into db
      console.info("Resume summary - writing summary to db");
      await this.db.setData("DELETE FROM resume_summary", []);
      await this.db.insertData(
        `
        INSERT INTO resume_summary (text, embedding)
        VALUES (?, ?)`,
        joinedData,
      );
    } catch (err) {
      console.error("Error creating resume summary", err);
      return;
    }
  }

  async deepCompareJobResumeText() {
    const greaterThanRows = await this.db.getAllData(
      "SELECT * FROM candidate_jobs WHERE deep_comparison = 'pending'",
      [],
    );

    if (!(greaterThanRows ?? []).length) return;

    console.info("Deep Compare - starting");
    const resumeSummaries = (await this.db.getAllData(
      "SELECT text FROM resume_summary",
      [],
    )) as { text: string }[];
    const resumeEmbeddings = (await this.db.getAllData(
      "SELECT text FROM resume_embeddings",
      [],
    )) as { text: string }[];
    const resSummaryText = resumeSummaries
      .map(({ text }: { text: string }) => text)
      .join(" ");
    const resEmbeddingText = resumeEmbeddings
      .map(({ text }: { text: string }) => text)
      .join(" ");

    for (let i = 0; greaterThanRows && i < greaterThanRows.length; i += 1) {
      console.info(
        `Deep Compare - examining job ${i + 1} of ${greaterThanRows.length}`,
      );
      const row = greaterThanRows[i] as { id: number; link: string };
      const { id, link } = row;

      // Get title, excerpt, site_name, text_content from corresponding discovered_jobs
      const discoveredData = await this.db.getData(
        `
        SELECT text_content FROM discovered_jobs
        WHERE link = ?
        `,
        [link],
      );

      if (!discoveredData) return;

      const { text_content } = discoveredData;

      // Set current job as in_progress
      await this.db.setData(
        `
        UPDATE candidate_jobs
        SET deep_comparison = 'in_progress'
        WHERE id = ? AND link = ?
        `,
        [id, link],
      );

      const userData = {
        job_description_text: text_content,
        resume_summary_text: resSummaryText,
        resume_chunks_text: resEmbeddingText,
        optional_notes: link,
      };

      const response = await this.client.chat.completions.create({
        model: this.REASONING_MODEL,
        messages: [
          { role: "system", content: prompts.systemMessage },
          { role: "user", content: prompts.userMessage(userData) },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices?.[0]?.message?.content ?? "";
      // Temp log - calculate token usage
      console.log(
        "PROMPT_DETAILS:",
        response.usage?.prompt_tokens,
        "COMPLETION_DETAILS:",
        response.usage?.completion_tokens,
      );
      if (!content) {
        console.error(
          `Deep Compare - missing response content for job id ${id} (${link})`,
        );
        continue;
      }

      console.info("Deep Compare - Breaking out fields");
      const comparisonObject: DeepCompareOutput = JSON.parse(content);
      const { fit_score, fit_label, overlap, gaps } = comparisonObject;
      const overlap_software_lang = overlap.software.languages.join(", ");
      const overlap_software_framework = overlap.software.frameworks.join(", ");
      const overlap_software_tools = overlap.software.tools.join(", ");
      const overlap_software_platforms = overlap.software.platforms.join(", ");
      const overlap_skills_technical = overlap.skills.technical.join(", ");
      const overlap_skills_process = overlap.skills.process.join(", ");
      const overlap_skills_other = overlap.skills.other.join(", ");
      const gaps_software_lang = gaps.software.languages.join(", ");
      const gaps_software_framework = gaps.software.frameworks.join(", ");
      const gaps_software_tools = gaps.software.tools.join(", ");
      const gaps_software_platforms = gaps.software.platforms.join(", ");
      const gaps_skills_technical = gaps.skills.technical.join(", ");
      const gaps_skills_process = gaps.skills.process.join(", ");
      const gaps_skills_other = gaps.skills.other.join(", ");
      const compiledComparisons = {
        fit_score,
        fit_label,
        overlap_software_lang,
        overlap_software_framework,
        overlap_software_tools,
        overlap_software_platforms,
        overlap_skills_technical,
        overlap_skills_process,
        overlap_skills_other,
        gaps_software_lang,
        gaps_software_framework,
        gaps_software_tools,
        gaps_software_platforms,
        gaps_skills_technical,
        gaps_skills_process,
        gaps_skills_other,
      };

      await this.db.setData(
        `
        UPDATE candidate_jobs
        SET ${Object.keys(compiledComparisons)
          .map((e) => `${e} = ?`)
          .join(",\n")}
        WHERE id = ? AND link = ?
        `,
        [...Object.values(compiledComparisons), id, link],
      );

      await this.db.setData(
        `
        UPDATE candidate_jobs
        SET deep_comparison = 'complete'
        WHERE id = ? AND link = ?
        `,
        [id, link],
      );
    }
    console.info("Deep Compare - Complete");
    return;
  }
}
