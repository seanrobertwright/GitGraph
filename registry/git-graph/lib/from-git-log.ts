import type { Commit } from "../types";

export const GIT_LOG_FORMAT = "%H%x09%P%x09%ct%x09%an%x09%ae%x09%s";

export function fromGitLog(text: string): Commit[] {
  const commits: Commit[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    if (line === "") continue;
    const parts = line.split("\t");
    if (parts.length < 6) {
      throw new Error(
        `fromGitLog: malformed line ${i + 1}: expected 6 tab-delimited fields, got ${parts.length}`,
      );
    }
    const sha = parts[0]!;
    const parentsRaw = parts[1]!;
    const ctRaw = parts[2]!;
    const name = parts[3]!;
    const email = parts[4]!;
    const message = parts.slice(5).join("\t");
    const parents = parentsRaw === "" ? [] : parentsRaw.split(" ");
    if (!/^\d+$/.test(ctRaw)) {
      throw new Error(
        `fromGitLog: malformed timestamp on line ${i + 1}: ${ctRaw}`,
      );
    }
    const timestamp = Number(ctRaw) * 1000;
    commits.push({
      sha,
      parents,
      author: { name, email },
      message,
      timestamp,
    });
  }
  return commits;
}
