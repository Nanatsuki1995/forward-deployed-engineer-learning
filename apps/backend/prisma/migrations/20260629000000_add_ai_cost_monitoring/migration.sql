-- AlterTable
ALTER TABLE "AiLog"
  ADD COLUMN "promptTokens" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "completionTokens" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "totalTokens" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cachedPromptTokens" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cacheMissPromptTokens" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reasoningTokens" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "apiCallCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "estimatedCostUsd" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "AiLog_model_createdAt_idx" ON "AiLog"("model", "createdAt");
