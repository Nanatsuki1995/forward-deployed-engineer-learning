import type { EmbeddingProvider } from './embedding-provider.interface';

export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions: number;

  private readonly apiBase: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    this.apiBase = (
      process.env.OPENAI_API_BASE ?? 'https://api.openai.com/v1'
    ).replace(/\/$/, '');
    this.apiKey = process.env.OPENAI_API_KEY ?? '';
    this.model = process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small';

    this.dimensions = Number(process.env.EMBEDDING_DIMENSIONS ?? '1536');
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error(
        'OPENAI_API_KEY is required when EMBEDDING_PROVIDER is set to "openai"',
      );
    }

    const response = await fetch(`${this.apiBase}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `OpenAI embedding API error (${response.status}): ${errorBody}`,
      );
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };

    return data.data.map((item) => item.embedding);
  }
}
