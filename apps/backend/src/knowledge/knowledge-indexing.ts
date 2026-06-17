const MAX_CHUNK_LENGTH = 480;
const EMBEDDING_DIMENSIONS = 16;

export interface KnowledgeChunkInput {
  position: number;
  content: string;
  startOffset: number;
  endOffset: number;
  embedding: number[];
}

export function parseMarkdownKnowledge(markdown: string): {
  content: string;
  chunks: KnowledgeChunkInput[];
  citations: string[];
} {
  const content = normalizeMarkdownText(markdown);
  const chunks = splitIntoChunks(content).map((chunk, index) => ({
    position: index,
    content: chunk.content,
    startOffset: chunk.startOffset,
    endOffset: chunk.endOffset,
    embedding: createDeterministicEmbedding(chunk.content),
  }));

  return {
    content,
    chunks: chunks.length > 0 ? chunks : [createEmptyChunk()],
    citations: extractCitations(content),
  };
}

function normalizeMarkdownText(markdown: string): string {
  return markdown
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, '').trim())
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitIntoChunks(content: string): Array<{
  content: string;
  startOffset: number;
  endOffset: number;
}> {
  if (!content) {
    return [];
  }

  const chunks: Array<{
    content: string;
    startOffset: number;
    endOffset: number;
  }> = [];
  const paragraphs = content.match(/[^\n]+(?:\n(?!\n)[^\n]+)*/g) ?? [content];
  let cursor = 0;
  let pending = '';
  let pendingStart = 0;

  for (const paragraph of paragraphs) {
    const paragraphStart = content.indexOf(paragraph, cursor);
    const normalizedParagraph = paragraph.trim();
    cursor = paragraphStart + paragraph.length;

    if (!normalizedParagraph) {
      continue;
    }

    if (!pending) {
      pending = normalizedParagraph;
      pendingStart = paragraphStart;
      continue;
    }

    const candidate = `${pending}\n\n${normalizedParagraph}`;
    if (candidate.length <= MAX_CHUNK_LENGTH) {
      pending = candidate;
      continue;
    }

    chunks.push(...splitOversizedChunk(pending, pendingStart));
    pending = normalizedParagraph;
    pendingStart = paragraphStart;
  }

  if (pending) {
    chunks.push(...splitOversizedChunk(pending, pendingStart));
  }

  return chunks;
}

function splitOversizedChunk(content: string, startOffset: number) {
  const chunks: Array<{
    content: string;
    startOffset: number;
    endOffset: number;
  }> = [];

  for (let offset = 0; offset < content.length; offset += MAX_CHUNK_LENGTH) {
    const chunkContent = content
      .slice(offset, offset + MAX_CHUNK_LENGTH)
      .trim();

    if (chunkContent) {
      const chunkStart = startOffset + offset;
      chunks.push({
        content: chunkContent,
        startOffset: chunkStart,
        endOffset: chunkStart + chunkContent.length,
      });
    }
  }

  return chunks;
}

function extractCitations(content: string): string[] {
  const headings = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.length <= 80)
    .slice(0, 5);

  return headings.length > 0 ? headings : ['上传文档'];
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

function createEmptyChunk(): KnowledgeChunkInput {
  return {
    position: 0,
    content: '',
    startOffset: 0,
    endOffset: 0,
    embedding: Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0),
  };
}
