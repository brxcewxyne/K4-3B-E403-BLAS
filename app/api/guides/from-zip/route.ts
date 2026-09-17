import { toErrorResponse, UserFacingError } from "@/lib/errors";
import { persistGeneratedGuide } from "@/lib/guide-service";
import { extractMarkdownDocuments } from "@/lib/markdown";
import { withZipRepository } from "@/lib/zip-loader";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const subfolder = String(form.get("subfolder") || "/");

    if (!(file instanceof File)) {
      throw new UserFacingError("Vui lòng upload file ZIP.");
    }

    const result = await withZipRepository(file, async (repoDir) => {
      const documents = await extractMarkdownDocuments(repoDir, subfolder);
      return persistGeneratedGuide({
        documents,
        subfolder
      });
    });

    return Response.json({
      ...result,
      repository: {
        url: null,
        branch: null,
        folder: subfolder
      }
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
