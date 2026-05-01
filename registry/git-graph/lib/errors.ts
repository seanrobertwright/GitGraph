export type GitGraphInputErrorKind =
  | "duplicate-sha"
  | "cycle"
  | "missing-parent"
  | "unknown-head"
  | "unparseable-timestamp";

export class GitGraphInputError extends Error {
  readonly kind: GitGraphInputErrorKind;
  readonly sha: string | undefined;
  constructor(kind: GitGraphInputErrorKind, message: string, sha?: string) {
    super(message);
    this.name = "GitGraphInputError";
    this.kind = kind;
    this.sha = sha;
    Object.setPrototypeOf(this, GitGraphInputError.prototype);
  }
}
