"use client";

import { useState } from "react";
import GitGraph from "@/components/git-graph/git-graph";
import { featureBranchFixture } from "../../../../../tests/unit/fixtures";

export default function GraphWorkingTreePage() {
  const [show, setShow] = useState(false);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-6">
      <h1 className="text-3xl font-bold">GitGraph — working tree</h1>
      <button
        type="button"
        data-testid="toggle-wt"
        onClick={() => setShow((s) => !s)}
        className="rounded-md border px-3 py-1 text-sm"
      >
        {show ? "Hide working-tree row" : "Show working-tree row"}
      </button>
      <GitGraph
        commits={featureBranchFixture}
        head="m3"
        showWorkingTreeRow={show}
      />
    </main>
  );
}
