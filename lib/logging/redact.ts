const SENSITIVE_KEY = /(api_key|apikey|auth_token|authorization|bearer|client_secret|passwd|password|private_key|secret|token)/i;

function isEnvPath(value: unknown): boolean {
  return typeof value === "string" && /(^|\/)\.env(\.|$)/i.test(value);
}

/**
 * Deep-clone a value while redacting secrets. Keys matching common secret
 * names become "[REDACTED]"; `.env` file contents are never retained.
 * Dependency-free so both server and browser code can use it.
 */
export function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const envFile = isEnvPath(source.path) || isEnvPath(source.name) || isEnvPath(source.file);
    const cleaned: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(source)) {
      if (SENSITIVE_KEY.test(key)) {
        cleaned[key] = "[REDACTED]";
      } else if (envFile && key === "content") {
        cleaned[key] = "[OMITTED_ENV_CONTENT]";
      } else {
        cleaned[key] = redactValue(entry);
      }
    }
    return cleaned;
  }
  return value;
}

export function hashString(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

export type SourceLogMeta = {
  sourceId: string;
  path: string;
  type: string;
  characterCount: number;
  headings: string[];
  hash: string;
};

/** Metadata-only summary of a source: never includes content. */
export function summarizeSourceMeta(source: { id: string; path: string; type: string; content: string; headings: string[] }): SourceLogMeta {
  return {
    sourceId: source.id,
    path: source.path,
    type: source.type,
    characterCount: source.content.length,
    headings: source.headings.slice(0, 50),
    hash: hashString(`${source.path}:${source.content.length}:${source.content.slice(0, 500)}`)
  };
}

export function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}…[truncated ${value.length - maxLength} chars]`;
}
