import { pipeline } from '@xenova/transformers';

let embedderPromise: Promise<any> | null = null;

async function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      // You can swap to a better embedding model, e.g. a BGE/GTE port when available.
      const pipe = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2' // small & decent for similarity
      );

      // Wrap with pooling + normalization
      return async (input: string | string[]) => {
        const output = await pipe(input, {
          pooling: 'mean',
          normalize: true,
        });
        // Ensure always returns an array of vectors
        return Array.isArray(input) ? output : [output];
      };
    })();
  }
  return embedderPromise;
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  const embed = await getEmbedder();
  return embed!(texts);
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}