import { toErrorResponse } from "@/lib/errors";
import { withClonedRepository } from "@/lib/github";
import { persistGeneratedGuide } from "@/lib/guide-service";
import { extractMarkdownDocuments } from "@/lib/markdown";
import { githubInputSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  try {
    const input = githubInputSchema.parse(await request.json());
    const result = await withClonedRepository(input.repositoryUrl, input.branch, async (repoDir) => {
      const documents = await extractMarkdownDocuments(repoDir, input.subfolder);
      return persistGeneratedGuide({
        documents,
        repositoryUrl: input.repositoryUrl,
        branch: input.branch,
        subfolder: input.subfolder
      });
    });

    return Response.json({
      ...result,
      repository: {
        url: input.repositoryUrl,
        branch: input.branch,
        folder: input.subfolder
      }
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
