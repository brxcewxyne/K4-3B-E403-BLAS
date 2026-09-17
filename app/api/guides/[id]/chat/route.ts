import { answerGuideQuestion } from "@/lib/ai";
import { toErrorResponse, UserFacingError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { chatInputSchema } from "@/lib/schemas";
import { answerMockQuestion } from "@/lib/mock-data";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const input = chatInputSchema.parse({ ...body, guideId: id });

    const guide = await prisma.guide.findUnique({
      where: { id },
      include: { sources: true }
    });
    if (!guide) {
      throw new UserFacingError("Không tìm thấy guide.", 404);
    }

    const session = input.sessionId
      ? await prisma.chatSession.upsert({
          where: { id: input.sessionId },
          update: {},
          create: { id: input.sessionId, guideId: id }
        })
      : await prisma.chatSession.create({ data: { guideId: id } });

    const history = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "desc" },
      take: 10
    });

    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "user",
        content: input.message
      }
    });

    const answer = guide.repositoryUrl?.startsWith("demo://")
      ? answerMockQuestion(input.message)
      : await answerGuideQuestion({
          guideMarkdown: guide.markdownContent,
          sourceList: guide.sources.map((source) => source.path),
          history: history.reverse().map((message) => ({
            role: message.role,
            content: message.content
          })),
          message: input.message
        });

    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "assistant",
        content: answer.answer,
        sources: JSON.stringify(answer.sources)
      }
    });

    return Response.json({
      sessionId: session.id,
      answer: answer.answer,
      sources: answer.sources
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
