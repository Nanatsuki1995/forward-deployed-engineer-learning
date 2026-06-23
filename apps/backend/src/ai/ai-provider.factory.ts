import type { AiProvider } from './ai-provider.interface';
import { DeepSeekAiProvider } from './deepseek-ai.provider';
import { MockAiProvider } from './mock-ai.provider';

export const AI_PROVIDER_TOKEN = 'AI_PROVIDER';

export function createAiProvider(): AiProvider {
  const provider = (process.env.AI_PROVIDER ?? 'mock').toLowerCase();

  switch (provider) {
    case 'deepseek':
      return new DeepSeekAiProvider();
    case 'mock':
    default:
      return new MockAiProvider();
  }
}
