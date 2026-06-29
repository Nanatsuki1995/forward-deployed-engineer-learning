import type { AiTokenUsage } from './ai-provider.interface';

export function createEmptyAiTokenUsage(
  overrides: Partial<AiTokenUsage> = {},
): AiTokenUsage {
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cachedPromptTokens: 0,
    cacheMissPromptTokens: 0,
    reasoningTokens: 0,
    apiCallCount: 0,
    estimatedCostUsd: null,
    ...overrides,
  };
}

export function mergeAiTokenUsage(
  base: AiTokenUsage,
  next?: AiTokenUsage,
): AiTokenUsage {
  if (!next) {
    return base;
  }

  return {
    promptTokens: base.promptTokens + next.promptTokens,
    completionTokens: base.completionTokens + next.completionTokens,
    totalTokens: base.totalTokens + next.totalTokens,
    cachedPromptTokens: base.cachedPromptTokens + next.cachedPromptTokens,
    cacheMissPromptTokens:
      base.cacheMissPromptTokens + next.cacheMissPromptTokens,
    reasoningTokens: base.reasoningTokens + next.reasoningTokens,
    apiCallCount: base.apiCallCount + next.apiCallCount,
    estimatedCostUsd: mergeNullableCost(
      base.estimatedCostUsd,
      next.estimatedCostUsd,
    ),
  };
}

export function toAiLogUsageData(usage?: AiTokenUsage) {
  const normalized = usage ?? createEmptyAiTokenUsage();

  return {
    promptTokens: normalized.promptTokens,
    completionTokens: normalized.completionTokens,
    totalTokens: normalized.totalTokens,
    cachedPromptTokens: normalized.cachedPromptTokens,
    cacheMissPromptTokens: normalized.cacheMissPromptTokens,
    reasoningTokens: normalized.reasoningTokens,
    apiCallCount: normalized.apiCallCount,
    estimatedCostUsd: normalized.estimatedCostUsd,
  };
}

function mergeNullableCost(
  current: number | null,
  next: number | null,
): number | null {
  if (current === null) {
    return next;
  }

  if (next === null) {
    return current;
  }

  return current + next;
}
