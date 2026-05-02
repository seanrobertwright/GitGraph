"use client";

import { useState } from "react";
import GitGraph from "@/components/git-graph/git-graph";
import { linearFixture } from "../../../../../tests/unit/fixtures";
import type { Commit } from "@/components/git-graph/types";

export default function GraphAnimationPage() {
  const [commits, setCommits] = useState<Commit[]>(linearFixture);

  function append() {
    setCommits((prev) => {
      const tip = prev[0];
      const next: Commit = {
        sha: `new-${prev.length}`,
        parents: tip ? [tip.sha] : [],
        author: { name: "A" },
        message: `appended ${prev.length}`,
        timestamp: Date.now(),
      };
      return [next, ...prev];
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-4">
      <h1 className="text-2xl font-bold">Animation harness</h1>
      <button
        type="button"
        data-testid="append-commit"
        onClick={append}
        className="rounded border px-3 py-1"
      >
        Append
      </button>
      <GitGraph commits={commits} />
    </main>
  );
}
