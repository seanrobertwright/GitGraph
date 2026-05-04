"use client";

import GitGraph from "@/components/git-graph/git-graph";
import { computeLayout } from "@/components/git-graph/lib/layout";
import type { Commit } from "@/components/git-graph/types";
import { featureBranchFixture } from "../../../../../tests/unit/fixtures";

const authorFixture: Commit[] = featureBranchFixture.map((c, i) =>
  i % 2 === 0
    ? { ...c, author: { name: "Alice" } }
    : { ...c, author: { name: "Bob" } },
);

function visibleShas(commits: Commit[], filter?: (c: Commit) => boolean): string[] {
  return computeLayout(commits, filter ? { filter } : undefined).rows.map(
    (r) => r.commit.sha,
  );
}

const branchFilter = (c: Commit) => c.sha !== "f1" && c.sha !== "f2";
const aliceFilter = (c: Commit) => c.author.name === "Alice";

export default function GraphFilterPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-12">
      <h1 className="text-3xl font-bold">GitGraph — filter predicate</h1>
      <p className="text-sm text-muted-foreground">
        Three sections demonstrate the headless filter prop. Edges rewrite
        through the hidden DAG so the visible graph stays connected.
      </p>

      <section data-testid="section-none" className="space-y-3">
        <h2 className="text-xl font-semibold">No filter</h2>
        <pre data-testid="echo-none">
          {JSON.stringify({ visibleShas: visibleShas(featureBranchFixture) }, null, 2)}
        </pre>
        <GitGraph commits={featureBranchFixture} head="m3" />
      </section>

      <section data-testid="section-branch" className="space-y-3">
        <h2 className="text-xl font-semibold">Branch-only (hides f1, f2)</h2>
        <pre data-testid="echo-branch">
          {JSON.stringify(
            { visibleShas: visibleShas(featureBranchFixture, branchFilter) },
            null,
            2,
          )}
        </pre>
        <GitGraph
          commits={featureBranchFixture}
          head="m3"
          filter={branchFilter}
        />
      </section>

      <section data-testid="section-author" className="space-y-3">
        <h2 className="text-xl font-semibold">Author-only (Alice)</h2>
        <pre data-testid="echo-author">
          {JSON.stringify(
            { visibleShas: visibleShas(authorFixture, aliceFilter) },
            null,
            2,
          )}
        </pre>
        <GitGraph commits={authorFixture} head="m3" filter={aliceFilter} />
      </section>
    </main>
  );
}
