import { prisma } from "./prisma";
import { generateGuide } from "./ai";
import { renderGuideMarkdown } from "./guide-renderer";
import type { MarkdownDocument } from "./markdown";

export async function persistGeneratedGuide(input: {
  documents: MarkdownDocument[];
  repositoryUrl?: string;
  branch?: string;
  subfolder?: string;
}) {
  const structured = await generateGuide(input.documents);
  const markdown = renderGuideMarkdown(structured);

  const guide = await prisma.guide.create({
    data: {
      title: structured.title || "Hướng dẫn thực hiện bài lab",
      repositoryUrl: input.repositoryUrl,
      branch: input.branch,
      subfolder: input.subfolder,
      markdownContent: markdown,
      structuredContent: JSON.stringify(structured),
      status: "completed",
      sources: {
        create: input.documents.map((doc) => ({
          path: doc.path,
          content: doc.content
        }))
      }
    },
    include: {
      sources: true
    }
  });

  return {
    id: guide.id,
    status: guide.status,
    title: guide.title,
    filesFound: guide.sources.map((source) => source.path),
    guideMarkdown: guide.markdownContent,
    warnings: structured.conflicts.map((conflict) => conflict.description)
  };
}
