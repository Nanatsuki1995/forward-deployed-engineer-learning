import type { EmbeddingProvider } from './embedding-provider.interface';
import { LocalEmbeddingProvider } from './local-embedding.provider';
import { OpenAiEmbeddingProvider } from './openai-embedding.provider';

export function createEmbeddingProvider(): EmbeddingProvider {
  const provider = (process.env.EMBEDDING_PROVIDER ?? 'local').toLowerCase();

  switch (provider) {
    case 'openai':
      return new OpenAiEmbeddingProvider();
    case 'local':
    default:
      return new LocalEmbeddingProvider();
  }
}
