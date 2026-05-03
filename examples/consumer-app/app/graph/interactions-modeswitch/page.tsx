"use client";

import { useState } from "react";
import GitGraph from "@/components/git-graph/git-graph";
import { featureBranchFixture } from "../../../../../tests/unit/fixtures";

// Harness used to verify the dev-warn fires when a consumer flips
// `selectedSha` from undefined → defined (uncontrolled → controlled).
// Mirrors the Phase 4 harness shape; the regular /graph/interactions
// page now starts controlled-from-mount and produces no warning.
export default function GraphInteractionsModeSwitchPage() {
  const [selected, setSelected] = useState<string | undefined>(undefined);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-6">
      <h1 className="text-3xl font-bold">GitGraph — interactions (mode switch)</h1>

      <div className="flex gap-2">
        <button
          type="button"
          data-testid="select-f1"
          onClick={() => setSelected("f1")}
          className="rounded-md border px-3 py-1 text-sm"
        >
          select f1
        </button>
      </div>

      <GitGraph
        commits={featureBranchFixture}
        head="m3"
        {...(selected !== undefined ? { selectedSha: selected } : {})}
        onSelectChange={setSelected}
      />
    </main>
  );
}
