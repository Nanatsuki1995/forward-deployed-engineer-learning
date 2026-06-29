import { DeepSeekAiProvider } from './deepseek-ai.provider';

describe('DeepSeekAiProvider', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    process.env = {
      ...originalEnv,
      DEEPSEEK_API_KEY: 'test-api-key',
      DEEPSEEK_MODEL: 'deepseek-v4-pro',
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('returns token usage and estimated cost from DeepSeek usage metadata', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                result:
                  '工单摘要：企业知识库存在权限不一致问题，影响售后回复效率。当前状态：平台工程师处理中。建议下一步：核对角色权限、数据归属和审批记录后提交人工审核。',
                confidence: 0.93,
                citations: ['RBAC', '知识库'],
              }),
            },
          },
        ],
        usage: {
          prompt_tokens: 1200,
          prompt_cache_hit_tokens: 1000,
          prompt_cache_miss_tokens: 200,
          completion_tokens: 300,
          total_tokens: 1500,
          completion_tokens_details: {
            reasoning_tokens: 30,
          },
        },
      }),
    );

    const output = await new DeepSeekAiProvider().generateSummary({
      ticketTitle: '企业知识库权限不一致',
      ticketDescription: '销售团队能看到售后知识条目。',
      ticketStatus: 'IN_PROGRESS',
      ticketPriority: 'MEDIUM',
      assignee: '平台工程师',
      ticketTags: ['RBAC', '知识库'],
    });

    expect(output.usage).toEqual(
      expect.objectContaining({
        promptTokens: 1200,
        cachedPromptTokens: 1000,
        cacheMissPromptTokens: 200,
        completionTokens: 300,
        totalTokens: 1500,
        reasoningTokens: 30,
        apiCallCount: 1,
      }),
    );
    expect(output.usage?.estimatedCostUsd).toBe(0.000351625);
  });

  it('accumulates token usage across validation retries', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  result: '太短',
                  confidence: 0.9,
                  citations: ['知识库'],
                }),
              },
            },
          ],
          usage: {
            prompt_tokens: 10,
            prompt_cache_hit_tokens: 4,
            prompt_cache_miss_tokens: 6,
            completion_tokens: 2,
            total_tokens: 12,
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  result:
                    '工单摘要：该问题涉及跨部门数据共享和权限审计，需要先确认数据归属部门、最小权限范围和人工复核人，再由平台工程师推进配置修正。',
                  confidence: 0.91,
                  citations: ['知识库权限与审计规范'],
                }),
              },
            },
          ],
          usage: {
            prompt_tokens: 20,
            prompt_cache_hit_tokens: 10,
            prompt_cache_miss_tokens: 10,
            completion_tokens: 5,
            total_tokens: 25,
          },
        }),
      );

    const output = await new DeepSeekAiProvider().generateSummary({
      ticketTitle: '部门间数据共享权限申请',
      ticketDescription: '需要确认权限范围。',
      ticketStatus: 'TRIAGE',
      ticketPriority: 'MEDIUM',
      assignee: '平台工程师',
      ticketTags: ['权限'],
    });

    expect(output.usage).toEqual(
      expect.objectContaining({
        promptTokens: 30,
        cachedPromptTokens: 14,
        cacheMissPromptTokens: 16,
        completionTokens: 7,
        totalTokens: 37,
        apiCallCount: 2,
      }),
    );
    expect(output.usage?.estimatedCostUsd).toBe(0.00001310075);
  });
});

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    json: () => Promise.resolve(body),
  } as Response;
}
