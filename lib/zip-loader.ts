import AdmZip from "adm-zip";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { MAX_ZIP_BYTES } from "./constants";
import { UserFacingError } from "./errors";
import { assertInsideRoot } from "./path-safety";

export async function withZipRepository<T>(file: File, work: (repoDir: string) => Promise<T>) {
  if (!file.name.toLowerCase().endsWith(".zip")) {
    throw new UserFacingError("ZIP không hợp lệ. Vui lòng upload file .zip.");
  }
  if (file.size > MAX_ZIP_BYTES) {
    throw new UserFacingError("ZIP vượt quá giới hạn 50 MB.");
  }

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lab-guide-ai-zip-"));
  const repoDir = path.join(tempRoot, "repo");

  try {
    await fs.mkdir(repoDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = new AdmZip(buffer);

    for (const entry of zip.getEntries()) {
      const target = assertInsideRoot(repoDir, path.join(repoDir, entry.entryName));
      if (entry.isDirectory) {
        await fs.mkdir(target, { recursive: true });
      } else {
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, entry.getData());
      }
    }

    return await work(repoDir);
  } catch (error) {
    if (error instanceof UserFacingError) {
      throw error;
    }
    throw new UserFacingError("ZIP không hợp lệ hoặc không thể giải nén.");
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}
