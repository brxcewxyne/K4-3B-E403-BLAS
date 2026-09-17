import fs from "node:fs/promises";
import path from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import {
  IGNORED_DIRS,
  MAX_COMBINED_BYTES,
  MAX_FILE_BYTES,
  MAX_MARKDOWN_FILES
} from "./constants";
import { UserFacingError } from "./errors";
import { assertInsideRoot, normalizeSubfolder, toPosixPath } from "./path-safety";

export interface MarkdownDocument {
  path: string;
  fileName: string;
  title?: string;
  headings: {
    level: number;
    text: string;
  }[];
  content: string;
  lastModified?: string;
}

type MdNode = {
  type: string;
  depth?: number;
  value?: string;
  children?: MdNode[];
};

function textFromNode(node: MdNode): string {
  if (typeof node.value === "string") {
    return node.value;
  }
  return (node.children || []).map(textFromNode).join("");
}

function parseHeadings(content: string) {
  const tree = unified().use(remarkParse).parse(content) as MdNode;
  const headings: MarkdownDocument["headings"] = [];
  for (const child of tree.children || []) {
    if (child.type === "heading" && child.depth) {
      headings.push({ level: child.depth, text: textFromNode(child).trim() });
    }
  }
  return headings;
}

async function walkMarkdown(root: string, current: string, files: string[]) {
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(current, entry.name);
    const stat = await fs.lstat(fullPath);

    if (stat.isSymbolicLink()) {
      const real = await fs.realpath(fullPath).catch(() => null);
      if (!real || !path.relative(root, real) || path.relative(root, real).startsWith("..")) {
        continue;
      }
    }

    if (entry.isDirectory()) {
      await walkMarkdown(root, fullPath, files);
      continue;
    }

    if (entry.isFile() && /\.(md|mdx)$/i.test(entry.name)) {
      files.push(fullPath);
      if (files.length > MAX_MARKDOWN_FILES) {
        throw new UserFacingError("Repository có quá nhiều file Markdown. Giới hạn MVP là 50 file.");
      }
    }
  }
}

export async function extractMarkdownDocuments(repoRoot: string, subfolder: string) {
  const folder = assertInsideRoot(repoRoot, path.join(repoRoot, normalizeSubfolder(subfolder)));
  const folderStat = await fs.stat(folder).catch(() => null);
  if (!folderStat?.isDirectory()) {
    throw new UserFacingError("Subfolder không tồn tại.");
  }

  const files: string[] = [];
  await walkMarkdown(repoRoot, folder, files);

  if (files.length === 0) {
    throw new UserFacingError("Repository không có file Markdown trong phạm vi đã chọn.");
  }

  let combinedBytes = 0;
  const documents: MarkdownDocument[] = [];

  for (const file of files.sort()) {
    const stat = await fs.stat(file);
    if (stat.size > MAX_FILE_BYTES) {
      throw new UserFacingError(`File ${toPosixPath(path.relative(folder, file))} vượt quá giới hạn 500 KB.`);
    }

    const content = await fs.readFile(file, "utf8");
    combinedBytes += Buffer.byteLength(content, "utf8");
    if (combinedBytes > MAX_COMBINED_BYTES) {
      throw new UserFacingError("Tổng nội dung Markdown vượt quá giới hạn 2 MB.");
    }

    const headings = parseHeadings(content);
    documents.push({
      path: toPosixPath(path.relative(folder, file)),
      fileName: path.basename(file),
      title: headings[0]?.text,
      headings,
      content,
      lastModified: stat.mtime.toISOString()
    });
  }

  return documents;
}

export function formatSourcesForAi(documents: MarkdownDocument[]) {
  return documents
    .map((doc) => `===== SOURCE FILE: ${doc.path} =====\n${doc.content.trim()}`)
    .join("\n\n");
}
