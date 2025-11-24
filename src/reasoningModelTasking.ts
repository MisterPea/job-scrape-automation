import OpenAI from "openai";
import { prompts, UserData } from "./data/prompts";
import { embedTexts } from "./vectorEmbeddings";

export class ReasoningModel {
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  REASONING_MODEL = "o4-mini-2025-04-16";

  constructor(public db: any) {
    this.db = db;
  }

  async createResumeSummary() {
    console.info('Resume summary - pulling saved resume');
    const resumeText = await this.db.getAllData(`
      SELECT text FROM resume_embeddings`, []);
    if (!resumeText.length) {
      console.error('Resume not present in db');
      return;
    }
    const joinedText = resumeText.map(({ text }: { text: string; }) => text).join('\n\n');

    try {
      console.info('Resume summary - summarizing');
      const summaryResponse = await this.client.chat.completions.create({
        model: this.REASONING_MODEL,
        messages: [
          { role: "system", content: prompts.resumeSummarySystemMessage },
          { role: "user", content: joinedText },
        ],
        response_format: { type: "text" }
      });
      const summaryString = summaryResponse.choices[0].message.content;
      const splitSummary: string[] = summaryString?.split('\n\n').filter(Boolean) || [];

      // get embedding
      const summaryEmbedding = await embedTexts(splitSummary);
      const joinedData = summaryEmbedding.map((embedding, i) => [splitSummary[i], JSON.stringify(embedding)]);

      // insert data into db
      console.info('Resume summary - writing summary to db');
      await this.db.setData(`DELETE FROM resume_summary`, []);
      await this.db.insertData(`
        INSERT INTO resume_summary (text, embedding)
        VALUES (?, ?)`,
        joinedData);
    } catch (err) {
      console.error("Error creating resume summary", err);
      return;
    }
  }

  async deepCompareJobResumeText(excludeLessThanRes = 0.55, excludeLessThanSum = 0.55) {
    console.info("Deep Compare - starting");
    const greaterThanRows = await this.db.getAllData(`
      SELECT * FROM parsed_jobs
      WHERE resume_fit > ? OR summary_fit > ?
      `, [excludeLessThanRes, excludeLessThanSum]);

    console.info("Deep Compare - getting resume data");
    const resumeSummaries = await this.db.getAllData(`SELECT text FROM resume_summary`, []);
    const resumeEmbeddings = await this.db.getAllData(`SELECT text FROM resume_embeddings`, []);
    const resSummaryText = resumeSummaries.map(({ text }: { text: string; }) => text).join(' ');
    const resEmbeddingText = resumeEmbeddings.map(({ text }: { text: string; }) => text).join(' ');

    for (let i = 0; i < greaterThanRows.length; i += 1) {
      console.info(`Deep Compare - examining job ${i + 1} of ${greaterThanRows.length}`);
      const { id, link, text_content } = greaterThanRows[i];

      const userData = {
        job_description_text: text_content,
        resume_summary_text: resSummaryText,
        resume_chunks_text: resEmbeddingText,
        optional_notes: 'none'
      };

      const response = await this.client.chat.completions.create({
        model: this.REASONING_MODEL,
        messages: [
          { role: "system", content: prompts.systemMessage },
          { role: "user", content: prompts.userMessage(userData) }
        ],
        response_format: { type: "json_object" }
      });
      console.log(response.choices[0].message.content);
    }
  }
}
