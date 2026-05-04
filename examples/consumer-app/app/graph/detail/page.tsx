"use client";

import { useState } from "react";
import GitGraph from "@/components/git-graph/git-graph";
import type { Commit } from "@/components/git-graph/types";
import { featureBranchFixture } from "../../../../../tests/unit/fixtures";

function detailContent(commit: Commit | undefined) {
  return (
    <div data-testid="detail-content" data-sha={commit?.sha ?? ""}>
      <h3>{commit?.message ?? "No selection"}</h3>
      <code>{commit?.sha}</code>
    </div>
  );
}

export default function GraphDetailPage() {
  // Section 2 — controlled-decoupled state.
  const [sha2, setSha2] = useState<string>("");
  const [open2, setOpen2] = useState<boolean>(false);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-12">
      <h1 className="text-3xl font-bold">GitGraph — detail drawer</h1>

      <section data-testid="section-uncontrolled" className="space-y-3">
        <h2 className="text-xl font-semibold">Uncontrolled (default)</h2>
        <p className="text-sm text-muted-foreground">
          Click a row — drawer auto-opens. ESC closes.
        </p>
        <GitGraph
          commits={featureBranchFixture}
          head="m3"
          renderDetail={detailContent}
        />
      </section>

      <section data-testid="section-controlled" className="space-y-3">
        <h2 className="text-xl font-semibold">Controlled-decoupled</h2>
        <p className="text-sm text-muted-foreground">
          Row click selects but does NOT open drawer. The button below opens it
          independently.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="open-detail"
            onClick={() => setOpen2(true)}
            className="rounded-md border px-3 py-1 text-sm"
          >
            open drawer
          </button>
          <button
            type="button"
            data-testid="close-detail"
            onClick={() => setOpen2(false)}
            className="rounded-md border px-3 py-1 text-sm"
          >
            close drawer
          </button>
        </div>
        <GitGraph
          commits={featureBranchFixture}
          head="m3"
          selectedSha={sha2}
          onSelectChange={(s) => setSha2(s ?? "")}
          detailOpen={open2}
          onDetailOpenChange={(next) => {
            // Ignore the default click-to-open signal so selection and drawer
            // stay decoupled. Only honour explicit close (ESC, backdrop) so the
            // drawer can still be dismissed.
            if (next === false) setOpen2(false);
          }}
          renderDetail={detailContent}
        />
      </section>
    </main>
  );
}
