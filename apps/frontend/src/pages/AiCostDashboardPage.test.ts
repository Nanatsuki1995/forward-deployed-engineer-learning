import { describe, expect, it } from 'vitest';
import type { AiLog } from '../api/client';
import { getRolePermissions } from '../lib/workbench';
import {
  buildModelCostRows,
  summarizeAiCosts,
} from './aiCostDashboard.helpers';

const logs: AiLog[] = [
  {
    id: 'ai-log-1',
    ticketId: 'ticket-1',
    type: 'reply_suggestion',
    promptVersion: 'fde-ticket-assistant-v2',
    model: 'deepseek-v4-pro',
    result: '回复建议',
    confidence: 0.9,
    citations: ['规则'],
    usage: {
      promptTokens: 1200,
      completionTokens: 300,
      totalTokens: 1500,
      cachedPromptTokens: 1000,
      cacheMissPromptTokens: 200,
      reasoningTokens: 30,
      apiCallCount: 1,
      estimatedCostUsd: 0.000351625,
    },
    createdAt: '2026-06-29T00:00:00.000Z',
  },
  {
    id: 'ai-log-2',
    ticketId: 'ticket-2',
    type: 'summary',
    promptVersion: 'fde-ticket-assistant-v2',
    model: 'deepseek-v4-pro',
    result: '摘要',
    confidence: 0.92,
    citations: ['摘要'],
    usage: {
      promptTokens: 800,
      completionTokens: 200,
      totalTokens: 1000,
      cachedPromptTokens: 600,
      cacheMissPromptTokens: 200,
      reasoningTokens: 0,
      apiCallCount: 2,
      estimatedCostUsd: 0.00025,
    },
    createdAt: '2026-06-29T00:01:00.000Z',
  },
];

describe('AiCostDashboardPage helpers', () => {
  it('summarizes token usage and estimated cost across AI logs', () => {
    const summary = summarizeAiCosts(logs);

    expect(summary).toEqual(
      expect.objectContaining({
        apiCallCount: 3,
        cachedPromptTokens: 1600,
        cacheHitRate: 80,
        cacheMissPromptTokens: 400,
        completionTokens: 500,
        promptTokens: 2000,
        reasoningTokens: 30,
        totalTokens: 2500,
      }),
    );
    expect(summary.estimatedCostUsd).toBe(0.000601625);
  });

  it('groups cost rows by model', () => {
    const rows = buildModelCostRows(logs);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        apiCallCount: 3,
        cacheHitRate: 80,
        model: 'deepseek-v4-pro',
        requestCount: 2,
        totalTokens: 2500,
      }),
    );
  });

  it('allows admins and field engineers, but not reviewers, to view costs', () => {
    expect(getRolePermissions('admin').canViewAiCostDashboard).toBe(true);
    expect(getRolePermissions('agent').canViewAiCostDashboard).toBe(true);
    expect(getRolePermissions('reviewer').canViewAiCostDashboard).toBe(false);
  });
});
