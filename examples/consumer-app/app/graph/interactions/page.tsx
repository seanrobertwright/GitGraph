"use client";

import { useState } from "react";
import GitGraph from "@/components/git-graph/git-graph";
import { featureBranchFixture } from "../../../../../tests/unit/fixtures";

// Empty string is the "no selection" sentinel: it's deliberately falsy for
// the component's `selectedSha ? rows.find(...) : undefined` check, while
// still being a defined string so `selectedSha={selected}` always passes a
// value. That keeps GitGraph in controlled-from-mount mode and avoids the
// uncontrolled→controlled dev-warn this harness is explicitly NOT testing
// (see /graph/interactions-modeswitch for that case).
export default function GraphInteractionsPage() {
  const [selected, setSelected] = useState<string>("");
  const [lastClicked, setLastClicked] = useState<string | null>(null);
  const [lastHover, setLastHover] = useState<string | null>(null);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-6">
      <h1 className="text-3xl font-bold">GitGraph — interactions</h1>

      <pre data-testid="echo">
        {JSON.stringify({ selected, lastClicked, lastHover }, null, 2)}
      </pre>

      <div className="flex gap-2">
        <button
          type="button"
          data-testid="select-f1"
          onClick={() => setSelected("f1")}
          className="rounded-md border px-3 py-1 text-sm"
        >
          select f1
        </button>
        <button
          type="button"
          data-testid="clear-selection"
          onClick={() => setSelected("")}
          className="rounded-md border px-3 py-1 text-sm"
        >
          clear
        </button>
      </div>

      <GitGraph
        commits={featureBranchFixture}
        head="m3"
        selectedSha={selected}
        onSelectChange={(s) => setSelected(s ?? "")}
        onCommitClick={(c) => setLastClicked(c.sha)}
        onCommitHover={(c) => setLastHover(c?.sha ?? null)}
      />
    </main>
  );
}
