import { Injectable } from '@nestjs/common';
import type { EmbeddingProvider } from './embedding-provider.interface';
import { createEmbeddingProvider } from './embedding.provider';

@Injectable()
export class EmbeddingService {
  private readonly provider: EmbeddingProvider;

  constructor() {
    this.provider = createEmbeddingProvider();
  }

  get dimensions(): number {
    return this.provider.dimensions;
  }

  async embed(texts: string[]): Promise<number[][]> {
    return this.provider.embed(texts);
  }

  async embedSingle(text: string): Promise<number[]> {
    const results = await this.provider.embed([text]);
    return results[0] ?? Array.from({ length: this.dimensions }, () => 0);
  }
}
