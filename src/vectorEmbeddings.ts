import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const EMBEDDING_MODEL = "text-embedding-3-small";

export type EmbeddingVector = number[];

export async function embedTexts(texts: string[]): Promise<EmbeddingVector[]> {
  if (!texts.length) return [];

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts
  });

  return response.data.map((item) => item.embedding);
}

// Cosine similarity helper
export function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
  if (a.length !== b.length) throw new Error('Embedding vectors must have the same length');

  let dot = 0;
  let na = 0;
  let nb = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}