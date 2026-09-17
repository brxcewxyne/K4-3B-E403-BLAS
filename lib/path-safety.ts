import path from "node:path";
import { UserFacingError } from "./errors";

export function normalizeSubfolder(input: string | undefined) {
  const raw = (input || "/").trim();
  const normalized = raw === "" || raw === "/" ? "." : raw.replace(/^[/\\]+/, "");
  if (normalized.includes("..")) {
    throw new UserFacingError("Subfolder không hợp lệ.");
  }
  return normalized;
}

export function assertInsideRoot(root: string, target: string) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new UserFacingError("Đường dẫn nằm ngoài phạm vi repository.");
  }
  return resolvedTarget;
}

export function toPosixPath(filePath: string) {
  return filePath.split(path.sep).join("/");
}
