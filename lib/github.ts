import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import simpleGit from "simple-git";
import { CLONE_TIMEOUT_MS } from "./constants";
import { UserFacingError } from "./errors";

export function validateGithubUrl(input: string) {
  const url = new URL(input);
  if (url.protocol !== "https:" || url.hostname !== "github.com") {
    throw new UserFacingError("GitHub URL không hợp lệ. Chỉ hỗ trợ repository public trên github.com.");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new UserFacingError("GitHub URL cần có dạng https://github.com/owner/repo.");
  }

  return `https://github.com/${parts[0]}/${parts[1].replace(/\.git$/, "")}.git`;
}

export async function withClonedRepository<T>(
  repositoryUrl: string,
  branch: string,
  work: (repoDir: string) => Promise<T>
) {
  const cloneUrl = validateGithubUrl(repositoryUrl);
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lab-guide-ai-"));
  const repoDir = path.join(tempRoot, "repo");

  try {
    const git = simpleGit({ timeout: { block: CLONE_TIMEOUT_MS } });
    await git.clone(cloneUrl, repoDir, ["--depth", "1", "--branch", branch]);
    return await work(repoDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.toLowerCase().includes("remote branch")) {
      throw new UserFacingError("Branch không tồn tại hoặc không thể truy cập.");
    }
    if (message.toLowerCase().includes("repository not found")) {
      throw new UserFacingError("Repository không tồn tại hoặc không public.");
    }
    if (error instanceof UserFacingError) {
      throw error;
    }
    throw new UserFacingError("Không thể tải repository. Hãy kiểm tra URL, branch và quyền public.");
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}
