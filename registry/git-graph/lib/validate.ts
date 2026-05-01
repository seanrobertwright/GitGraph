import type { Commit } from "../types";
import { GitGraphInputError } from "./errors";

export type ValidateOptions = {
  head?: string;
  allowMissingParents?: boolean;
};

export function validate(commits: Commit[], opts?: ValidateOptions): void {
  const bySha = new Set<string>();
  for (const c of commits) bySha.add(c.sha);

  const allowMissingParents = opts?.allowMissingParents === true;
  if (!allowMissingParents) {
    for (const c of commits) {
      for (const parent of c.parents) {
        if (!bySha.has(parent)) {
          throw new GitGraphInputError(
            "missing-parent",
            `validate: commit ${c.sha} references unknown parent ${parent}`,
            c.sha,
          );
        }
      }
    }
  }

  if (opts?.head !== undefined && !bySha.has(opts.head)) {
    throw new GitGraphInputError(
      "unknown-head",
      `validate: head ${opts.head} not in commits`,
      opts.head,
    );
  }
}
