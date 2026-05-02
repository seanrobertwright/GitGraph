"use client";

import { useRef } from "react";
import GitGraph from "@/components/git-graph/git-graph";
import { largeFixture } from "../../../../../tests/unit/fixtures/large";

export default function GraphLargePage() {
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">GitGraph — 10k fixture (virtualized)</h1>
        <p className="text-sm opacity-70">
          {largeFixture.length.toLocaleString()} commits captured from facebook/react.
        </p>
      </header>
      <div
        ref={ref}
        data-testid="scroll-container"
        style={{
          height: 600,
          overflow: "auto",
          border: "1px solid #888",
        }}
      >
        <GitGraph commits={largeFixture} scrollContainerRef={ref} />
      </div>
    </main>
  );
}
