"use client";

import GitGraph from "./git-graph/git-graph";
import type { Commit } from "./git-graph/types";

export default function LiveDemo({
  commits,
  head,
  showWorkingTreeRow,
  height = 320,
}: {
  commits: Commit[];
  head?: string;
  showWorkingTreeRow?: boolean;
  height?: number;
}) {
  return (
    <div
      className="my-4 overflow-auto rounded-md border border-border bg-background"
      style={{ height }}
    >
      <GitGraph
        commits={commits}
        {...(head !== undefined ? { head } : {})}
        {...(showWorkingTreeRow !== undefined ? { showWorkingTreeRow } : {})}
      />
    </div>
  );
}
