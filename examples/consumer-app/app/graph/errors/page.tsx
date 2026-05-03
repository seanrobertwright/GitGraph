"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import GitGraph from "@/components/git-graph/git-graph";
import { validate } from "@/components/git-graph/lib/validate";
import { GitGraphInputError } from "@/components/git-graph/lib/errors";
import type { Commit } from "@/components/git-graph/types";

const DUPLICATE_CASE: Commit[] = [
  { sha: "a", parents: [], author: { name: "x" }, message: "first", timestamp: 1_700_000_000_000 },
  { sha: "a", parents: [], author: { name: "x" }, message: "duplicate", timestamp: 1_700_000_001_000 },
];

const CYCLE_CASE: Commit[] = [
  { sha: "a", parents: ["b"], author: { name: "x" }, message: "a", timestamp: 1_700_000_000_000 },
  { sha: "b", parents: ["a"], author: { name: "x" }, message: "b", timestamp: 1_700_000_001_000 },
];

const MISSING_PARENT_CASE: Commit[] = [
  { sha: "a", parents: ["nonexistent"], author: { name: "x" }, message: "a", timestamp: 1_700_000_000_000 },
];

function ErrorsContent() {
  const params = useSearchParams();
  const which = params.get("case");

  const validateResult = useMemo(() => {
    if (which !== "missing-parent") return null;
    try {
      validate(MISSING_PARENT_CASE);
      return { kind: null };
    } catch (e) {
      if (e instanceof GitGraphInputError) return { kind: e.kind };
      throw e;
    }
  }, [which]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-6">
      <h1 className="text-3xl font-bold">GitGraph — error states</h1>

      {which === "duplicate" && (
        <section data-testid="case-duplicate">
          <h2 className="text-xl font-semibold mb-2">duplicate-sha</h2>
          <GitGraph commits={DUPLICATE_CASE} />
        </section>
      )}

      {which === "cycle" && (
        <section data-testid="case-cycle">
          <h2 className="text-xl font-semibold mb-2">cycle</h2>
          <GitGraph commits={CYCLE_CASE} />
        </section>
      )}

      {which === "missing-parent" && (
        <section data-testid="case-missing-parent">
          <h2 className="text-xl font-semibold mb-2">missing-parent (validate)</h2>
          {validateResult?.kind ? (
            <div data-testid="validate-error" data-error-kind={validateResult.kind}>
              validate rejected the input ({validateResult.kind})
            </div>
          ) : (
            <div data-testid="validate-ok">no error</div>
          )}
        </section>
      )}

      {!which && <p>Pass ?case=duplicate, ?case=cycle, or ?case=missing-parent.</p>}
    </main>
  );
}

export default function GraphErrorsPage() {
  return (
    <Suspense fallback={null}>
      <ErrorsContent />
    </Suspense>
  );
}
