import { toErrorResponse, UserFacingError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const guide = await prisma.guide.findUnique({ where: { id } });
    if (!guide) {
      throw new UserFacingError("Không tìm thấy guide.", 404);
    }

    return new Response(guide.markdownContent, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": 'attachment; filename="LAB_GUIDE.md"'
      }
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
