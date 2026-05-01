import GitGraph from "@/components/git-graph/git-graph";
import {
  featureBranchFixture,
  linearFixture,
  longLivedReleaseFixture,
  mergeFixture,
  octopusFixture,
  orphanFixture,
  withRefsFixture,
} from "../../../../tests/unit/fixtures";

// Fixture authoring is inconsistent: linearFixture[0] is the newest commit,
// but every other fixture starts with the root. Hardcode the tip per fixture
// so /graph passes the correct head — relevant if a future demo toggles
// showWorkingTreeRow on this page.
const FIXTURES = [
  { name: "linear", commits: linearFixture, head: "a4" },
  { name: "feature-branch", commits: featureBranchFixture, head: "m3" },
  { name: "merge", commits: mergeFixture, head: "m3" },
  { name: "octopus", commits: octopusFixture, head: "o" },
  { name: "orphan", commits: orphanFixture, head: "b2" },
  { name: "long-lived-release", commits: longLivedReleaseFixture, head: "m5" },
  { name: "with-refs", commits: withRefsFixture, head: "m3" },
] as const;

export default function GraphPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-12">
      <header>
        <h1 className="text-3xl font-bold">GitGraph — fixture gallery</h1>
      </header>

      {FIXTURES.map((fixture) => {
        const head = fixture.commits[0]?.sha;
        return (
          <section
            key={fixture.name}
            data-testid={`fixture-${fixture.name}`}
            className="space-y-2"
          >
            <h2 className="text-lg font-semibold">{fixture.name}</h2>
            <GitGraph
              commits={fixture.commits}
              {...(head ? { head } : {})}
            />
          </section>
        );
      })}
    </main>
  );
}
