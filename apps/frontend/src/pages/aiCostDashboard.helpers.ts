import type { AiLog, AiTokenUsage } from '../api/client';

export interface AiCostSummary {
  apiCallCount: number;
  cachedPromptTokens: number;
  cacheHitRate: number;
  cacheMissPromptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number | null;
  promptTokens: number;
  reasoningTokens: number;
  totalTokens: number;
}

export interface ModelCostRow extends AiCostSummary {
  key: string;
  model: string;
  requestCount: number;
}

const EMPTY_SUMMARY: AiCostSummary = {
  apiCallCount: 0,
  cachedPromptTokens: 0,
  cacheHitRate: 0,
  cacheMissPromptTokens: 0,
  completionTokens: 0,
  estimatedCostUsd: null,
  promptTokens: 0,
  reasoningTokens: 0,
  totalTokens: 0,
};

const EMPTY_USAGE: AiTokenUsage = {
  apiCallCount: 0,
  cachedPromptTokens: 0,
  cacheMissPromptTokens: 0,
  completionTokens: 0,
  estimatedCostUsd: null,
  promptTokens: 0,
  reasoningTokens: 0,
  totalTokens: 0,
};

export function summarizeAiCosts(logs: AiLog[]): AiCostSummary {
  const summary = logs.reduce<AiCostSummary>((acc, log) => {
    const usage = getAiLogUsage(log);

    acc.apiCallCount += usage.apiCallCount;
    acc.cachedPromptTokens += usage.cachedPromptTokens;
    acc.cacheMissPromptTokens += usage.cacheMissPromptTokens;
    acc.completionTokens += usage.completionTokens;
    acc.promptTokens += usage.promptTokens;
    acc.reasoningTokens += usage.reasoningTokens;
    acc.totalTokens += usage.totalTokens;
    acc.estimatedCostUsd = mergeNullableCost(
      acc.estimatedCostUsd,
      usage.estimatedCostUsd,
    );

    return acc;
  }, { ...EMPTY_SUMMARY });
  const billablePromptTokens =
    summary.cachedPromptTokens + summary.cacheMissPromptTokens;

  return {
    ...summary,
    cacheHitRate:
      billablePromptTokens > 0
        ? Math.round((summary.cachedPromptTokens / billablePromptTokens) * 100)
        : 0,
  };
}

export function buildModelCostRows(logs: AiLog[]): ModelCostRow[] {
  const rows = new Map<string, ModelCostRow>();

  for (const log of logs) {
    const usage = getAiLogUsage(log);
    const current =
      rows.get(log.model) ??
      ({
        ...EMPTY_SUMMARY,
        key: log.model,
        model: log.model,
        requestCount: 0,
      } satisfies ModelCostRow);

    current.apiCallCount += usage.apiCallCount;
    current.cachedPromptTokens += usage.cachedPromptTokens;
    current.cacheMissPromptTokens += usage.cacheMissPromptTokens;
    current.completionTokens += usage.completionTokens;
    current.promptTokens += usage.promptTokens;
    current.reasoningTokens += usage.reasoningTokens;
    current.requestCount += 1;
    current.totalTokens += usage.totalTokens;
    current.estimatedCostUsd = mergeNullableCost(
      current.estimatedCostUsd,
      usage.estimatedCostUsd,
    );

    rows.set(log.model, current);
  }

  return [...rows.values()].map((row) => {
    const billablePromptTokens =
      row.cachedPromptTokens + row.cacheMissPromptTokens;

    return {
      ...row,
      cacheHitRate:
        billablePromptTokens > 0
          ? Math.round((row.cachedPromptTokens / billablePromptTokens) * 100)
          : 0,
    };
  });
}

export function getAiLogUsage(log: AiLog): AiTokenUsage {
  return log.usage ?? EMPTY_USAGE;
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
