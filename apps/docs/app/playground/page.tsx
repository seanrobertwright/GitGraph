"use client";

import { useMemo, useState } from "react";
import GitGraph from "../../components/git-graph/git-graph";
import { validate } from "../../components/git-graph/lib/validate";
import type { Commit } from "../../components/git-graph/types";
import { SAMPLE_COMMITS_JSON } from "../../components/sample-commits";

type ParseResult =
  | { ok: true; commits: Commit[] }
  | { ok: false; error: string };

function shapeCheck(value: unknown): string | null {
  if (!Array.isArray(value)) return "Top-level value must be an array of Commit objects.";
  for (let i = 0; i < value.length; i++) {
    const c = value[i] as Record<string, unknown> | null;
    const at = `commits[${i}]`;
    if (c === null || typeof c !== "object") return `${at}: not an object.`;
    if (typeof c.sha !== "string") return `${at}.sha: must be a string.`;
    if (!Array.isArray(c.parents) || !c.parents.every((p) => typeof p === "string")) {
      return `${at}.parents: must be an array of strings.`;
    }
    const author = c.author as Record<string, unknown> | undefined;
    if (!author || typeof author.name !== "string") {
      return `${at}.author.name: must be a string.`;
    }
    if (typeof c.message !== "string") return `${at}.message: must be a string.`;
    if (typeof c.timestamp !== "number" && typeof c.timestamp !== "string") {
      return `${at}.timestamp: must be a number or string.`;
    }
  }
  return null;
}

export default function PlaygroundPage() {
  const [json, setJson] = useState<string>(SAMPLE_COMMITS_JSON);

  const parsed = useMemo<ParseResult>(() => {
    let value: unknown;
    try {
      value = JSON.parse(json);
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
    const shapeError = shapeCheck(value);
    if (shapeError) return { ok: false, error: shapeError };
    const commits = value as Commit[];
    try {
      validate(commits, { allowMissingParents: true });
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
    return { ok: true, commits };
  }, [json]);

  return (
    <div className="mx-auto flex h-screen max-w-7xl flex-col px-6 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Playground</h1>
        <p className="text-sm text-muted-foreground">
          Edit the JSON on the left; the graph re-renders on the right. Errors surface inline.
        </p>
      </header>
      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2">
        <div className="flex min-h-0 flex-col">
          <label
            htmlFor="playground-json"
            className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Commits (JSON)
          </label>
          <textarea
            id="playground-json"
            value={json}
            onChange={(e) => setJson(e.target.value)}
            spellCheck={false}
            className="min-h-0 flex-1 resize-none rounded-md border border-border bg-muted p-3 font-mono text-xs"
          />
        </div>
        <div className="flex min-h-0 flex-col">
          <span className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Render
          </span>
          <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border bg-background">
            {parsed.ok ? (
              <GitGraph commits={parsed.commits} />
            ) : (
              <pre className="p-4 text-xs text-red-600">{parsed.error}</pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
