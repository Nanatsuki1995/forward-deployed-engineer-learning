import type { EmbeddingProvider } from './embedding-provider.interface';

const EMBEDDING_DIMENSIONS = 16;

export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions = EMBEDDING_DIMENSIONS;

  async embed(texts: string[]): Promise<number[][]> {
    return Promise.resolve(
      texts.map((text) => createDeterministicEmbedding(text)),
    );
  }
}

function createDeterministicEmbedding(content: string): number[] {
  const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);

  for (let index = 0; index < content.length; index += 1) {
    const code = content.charCodeAt(index);
    const bucket = code % EMBEDDING_DIMENSIONS;
    vector[bucket] += ((code * (index + 1)) % 997) / 997;
  }

  const magnitude = Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0),
  );

  if (!magnitude) {
    return vector;
  }

  return vector.map((value) => Number((value / magnitude).toFixed(6)));
}
