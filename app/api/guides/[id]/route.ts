import { toErrorResponse, UserFacingError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const guide = await prisma.guide.findUnique({
      where: { id },
      include: { sources: { select: { path: true, createdAt: true } } }
    });

    if (!guide) {
      throw new UserFacingError("Không tìm thấy guide.", 404);
    }

    return Response.json({
      id: guide.id,
      title: guide.title,
      repositoryUrl: guide.repositoryUrl,
      branch: guide.branch,
      subfolder: guide.subfolder,
      markdownContent: guide.markdownContent,
      structuredContent: JSON.parse(guide.structuredContent),
      status: guide.status,
      createdAt: guide.createdAt,
      updatedAt: guide.updatedAt,
      sources: guide.sources
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
