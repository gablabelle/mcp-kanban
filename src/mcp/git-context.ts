import { execSync } from "child_process";

export interface GitContext {
  branch: string;
  isWorktree: boolean;
}

export function detectGitContext(): GitContext | null {
  try {
    const branch = execSync("git branch --show-current", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    // Empty string means detached HEAD
    if (!branch) return null;

    const commonDir = execSync("git rev-parse --git-common-dir", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    // In a worktree, --git-common-dir points to the main repo's .git dir
    // (e.g., "../../.git" or "/abs/path/.git"), not ".git"
    const isWorktree = commonDir !== ".git";

    return { branch, isWorktree };
  } catch {
    // Not in a git repo
    return null;
  }
}
