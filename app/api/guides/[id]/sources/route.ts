import { toErrorResponse, UserFacingError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const guide = await prisma.guide.findUnique({
      where: { id },
      include: { sources: true }
    });

    if (!guide) {
      throw new UserFacingError("Không tìm thấy guide.", 404);
    }

    return Response.json({
      guideId: guide.id,
      sources: guide.sources.map((source) => ({
        id: source.id,
        path: source.path,
        content: source.content,
        createdAt: source.createdAt
      }))
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
