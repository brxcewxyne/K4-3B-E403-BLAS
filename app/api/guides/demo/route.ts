import { renderGuideMarkdown } from "@/lib/guide-renderer";
import { mockGuide, mockSources } from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";
import { toErrorResponse } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST() {
  try {
    const markdown = renderGuideMarkdown(mockGuide);
    const guide = await prisma.guide.create({
      data: {
        title: mockGuide.title,
        repositoryUrl: "demo://notes-api-lab",
        branch: "main",
        subfolder: "/",
        markdownContent: markdown,
        structuredContent: JSON.stringify(mockGuide),
        status: "completed",
        sources: { create: mockSources }
      },
      include: { sources: true }
    });

    return Response.json({
      id: guide.id,
      status: guide.status,
      title: guide.title,
      filesFound: guide.sources.map((source) => source.path),
      guideMarkdown: guide.markdownContent,
      warnings: [],
      demo: true
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
