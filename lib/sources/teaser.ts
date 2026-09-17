import type { SourceDocument } from "../shared/types";

export type SourceTeaser = {
  title: string;
  excerpt: string;
  headings: string[];
};

function withoutFrontmatter(content: string) {
  return content.replace(/^---\s*\n[\s\S]*?\n---\s*(?:\n|$)/, "");
}

function plainMarkdown(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_~>#]/g, "")
    .replace(/^\s*(?:[-+*]|\d+\.)\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function createSourceTeaser(source: SourceDocument): SourceTeaser {
  const content = withoutFrontmatter(source.content).replace(/```[\s\S]*?```/g, " ");
  const headings = [...content.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)]
    .map((match) => plainMarkdown(match[1]))
    .filter(Boolean);
  const title = headings[0] || source.name;
  const blocks = content
    .split(/\n\s*\n/)
    .map((block) => block.replace(/^#{1,6}\s+.+$/gm, ""))
    .map(plainMarkdown)
    .filter((block) => block.length >= 20 && block !== title);
  const excerpt = (blocks[0] || "Open the document to read the complete source.").slice(0, 320);

  return { title, excerpt, headings: headings.slice(0, 4) };
}
