// Heavy fixture (~3.2 MB JSON, 10 000 commits captured from facebook/react).
// Kept OUT of `./index.ts` so unrelated barrel consumers don't pull this
// chunk into their bundle. Import directly:
//
//   import { largeFixture } from "tests/unit/fixtures/large";
//
import largeFixtureJson from "./large.fixture.json";
import type { Commit } from "../../../registry/git-graph/types";
export const largeFixture = largeFixtureJson as Commit[];
