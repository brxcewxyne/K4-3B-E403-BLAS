import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractMarkdownDocuments } from "@/lib/markdown";

describe("extractMarkdownDocuments", () => {
  it("finds md and mdx files, parses headings, and ignores build folders", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "lab-guide-test-"));
    try {
      await fs.mkdir(path.join(root, "docs"), { recursive: true });
      await fs.mkdir(path.join(root, "node_modules"), { recursive: true });
      await fs.writeFile(path.join(root, "README.md"), "# Main\n\nRun `npm test`");
      await fs.writeFile(path.join(root, "docs", "guide.mdx"), "## Setup\n\nContent");
      await fs.writeFile(path.join(root, "node_modules", "ignored.md"), "# Ignored");

      const docs = await extractMarkdownDocuments(root, "/");

      expect(docs.map((doc) => doc.path)).toEqual(["README.md", "docs/guide.mdx"]);
      expect(docs[0].title).toBe("Main");
      expect(docs[1].headings[0]).toEqual({ level: 2, text: "Setup" });
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
