import writeCsv from './csvControl';
import currentDatetime from './helpers/getDate';
import { resumeText } from './data/resumeText';

export class ResumeJobClassifier {
  classifier: any;

  constructor(public db: any) {
    this.classifier = null;
    this.db = db;
  }

  private async getNextJobDescription() {
    const result = await this.db.getData(`
      UPDATE parsed_jobs
      SET is_graded='graded'
      WHERE text_content = (
        SELECT text_content FROM parsed_jobs
        WHERE is_graded='not_graded'
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
    return raw
      .replace(/\r\n/g, '\n')           // Windows → Unix newlines
      .replace(/[•·►▪]/g, '\n• ')       // convert common bullets into a line break + bullet
      .replace(/\n{2,}/g, '\n\n')       // collapse extra blank lines
      .replace(/[ \t]+/g, ' ')          // collapse spaces/tabs
      .replace(/\s(\s{1,})/g, '')         // remove extra spaces
      .trim();
  }

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
  private createChunks(text: string, maxWords = 220, minWords = 80, overlapWords = 40): string[] {
    const norm = this.normalizeJobText(text);
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

  async gradeFit() {
    const currJob = await this.getNextJobDescription();
    if (!currJob) return;

    const { id, link, text_content } = currJob;
    const chunks = this.createChunks(text_content);
    console.log(chunks);
  }
}
