import type { SourceDocument } from "../shared/types";

export type SourceChunk = { sourceId: string; file: string; path: string; section: string; content: string; score?: number };

export function chunkSources(sources: SourceDocument[]): SourceChunk[] {
  return sources.flatMap((source) => {
    const matches = [...source.content.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)];
    if (!matches.length) return [{ sourceId: source.id, file: source.name, path: source.path, section: "Document", content: source.content.slice(0, 12_000) }];
    return matches.map((match, index) => {
      const start = match.index || 0;
      const end = matches[index + 1]?.index ?? source.content.length;
      return { sourceId: source.id, file: source.name, path: source.path, section: match[1].trim(), content: source.content.slice(start, end).trim().slice(0, 12_000) };
    });
  });
}

export function tokenize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").split(/[^\p{L}\p{N}._/-]+/u).filter((token) => token.length > 2);
}

export function rankChunks(chunks: SourceChunk[], question: string, limit = 7) {
  const query = new Set(tokenize(question));
  return chunks.map((chunk) => {
    const headingTokens = tokenize(`${chunk.file} ${chunk.section}`);
    const bodyTokens = tokenize(chunk.content);
    const score = headingTokens.reduce((sum, token) => sum + (query.has(token) ? 4 : 0), 0) + bodyTokens.reduce((sum, token) => sum + (query.has(token) ? 1 : 0), 0);
    return { ...chunk, score };
  }).sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, limit);
}

export function excerptFromChunk(chunk: SourceChunk, max = 240) {
  return chunk.content.replace(/^#{1,6}\s+.+$/m, "").replace(/\s+/g, " ").trim().slice(0, max);
}
