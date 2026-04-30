"use client";

import { useState } from "react";
import GitGraphGutter from "@/components/git-graph/git-graph-gutter";
import { computeLayout } from "@/components/git-graph/lib/layout";
import {
  featureBranchFixture,
  linearFixture,
  longLivedReleaseFixture,
  mergeFixture,
  octopusFixture,
  orphanFixture,
} from "../../../../tests/unit/fixtures";

const FIXTURES = [
  { name: "linear", commits: linearFixture },
  { name: "feature-branch", commits: featureBranchFixture },
  { name: "merge", commits: mergeFixture },
  { name: "octopus", commits: octopusFixture },
  { name: "orphan", commits: orphanFixture },
  { name: "long-lived-release", commits: longLivedReleaseFixture },
] as const;

export default function GutterPage() {
  const [themed, setThemed] = useState(false);

  function flipTheme() {
    const root = document.documentElement;
    if (themed) {
      root.style.removeProperty("--graph-branch-1");
    } else {
      root.style.setProperty("--graph-branch-1", "hsl(0 100% 50%)");
    }
    setThemed(!themed);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-12">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gutter — fixture gallery</h1>
        <button
          type="button"
          data-testid="theme-flip"
          onClick={flipTheme}
          className="rounded-md border px-3 py-1 text-sm"
        >
          {themed ? "Reset theme" : "Flip --graph-branch-1 to red"}
        </button>
      </header>

      {FIXTURES.map((fixture) => {
        const layout = computeLayout(fixture.commits);
        return (
          <section
            key={fixture.name}
            data-testid={`fixture-${fixture.name}`}
            className="space-y-2"
          >
            <h2 className="text-lg font-semibold">{fixture.name}</h2>
            <GitGraphGutter layout={layout} className="bg-background" />
          </section>
        );
      })}
    </main>
  );
}
