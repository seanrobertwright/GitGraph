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

const FIXTURES = [
  { name: "linear", commits: linearFixture },
  { name: "feature-branch", commits: featureBranchFixture },
  { name: "merge", commits: mergeFixture },
  { name: "octopus", commits: octopusFixture },
  { name: "orphan", commits: orphanFixture },
  { name: "long-lived-release", commits: longLivedReleaseFixture },
  { name: "with-refs", commits: withRefsFixture },
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
