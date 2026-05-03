# Code Review — Phase 5C (Animation: row-append keyframe + reduced-motion)

**Stats:**

- Files Modified: 2 (`registry/git-graph/git-graph.css`, `registry/git-graph/git-graph.tsx`)
- Files Added: 2 (`examples/consumer-app/app/graph/animation/page.tsx`, `tests/e2e/graph-animation.spec.ts`)
- Files Deleted: 0
- New lines: ~12 CSS, ~15 component, ~38 harness, ~95 spec
- Deleted lines: 0

Validation status at review time: `pnpm typecheck`, `pnpm test` (65 unit tests), `pnpm test:e2e` full suite (94 passed, 26 Linux-only screenshots skipped on Windows), `pnpm test:e2e graph-animation` (15/15 across chromium/firefox/webkit) all green locally.

CI status (run 25258969130, PR #9): typecheck, lint, unit, e2e (firefox), e2e (webkit) all green; **e2e (chromium) failed** on `graph-screenshots.spec.ts` baselines (`graph-feature-branch`, `graph-with-refs`) — pixel diffs ≈0.02 ratio, unrelated to Phase C changes (the `data-just-appended` attribute is absent on those routes and the new `@media` rule does not apply without it). PR was merged knowingly. See plan §"Post-execution corrections" — Phase C chromium screenshots — for the carry-forward into Phase D.

---

## Findings

```
severity: low
file: registry/git-graph/git-graph.tsx
line: ~125-135 (useGitGraphState)
issue: useMemo body writes to a ref — not pure
detail: `justAppended`'s useMemo factory mutates `prevShasRef.current = currShas`
  as a side effect of computing the diff. React docs say useMemo factories
  should be pure; in practice this works because (a) useMemo is guaranteed to
  re-run when deps change, and (b) we only need the ref to reflect "the last
  set of shas this component saw at memo-time", which aligns with re-runs.
  React strict-mode double-invoke would write the same set twice — idempotent.
  Still, an effect-based pattern would be more idiomatic.
suggestion: Acceptable as-is given the constraint that the diff must be
  available during the same render that produces the rows. An effect-based
  variant would compute justAppended one render late, defeating the
  data-attribute-on-the-correct-row property. Document this in a one-line
  comment near the ref declaration: "Side-effecting ref write inside useMemo —
  see plan §Phase C 'Append detection pattern' for justification."
```

```
severity: low
file: tests/e2e/graph-animation.spec.ts
line: 27-43 (Test 3 — repeat append)
issue: Test asserts new sha is different from prior, not that prior sha is
  no longer marked
detail: The plan calls out that "the previous-click's sha is now in
  prevShasRef, so it's no longer marked" as the property worth testing. The
  current spec asserts `toHaveCount(1)` plus "newSha !== firstSha", which
  implicitly covers the property — if the previous sha were still marked,
  count would be 2. So the assertion is correct, but the *naming*
  ("appending again only marks the newest row") is the right rationale.
  No change needed; flagging only because the plan mentions a more explicit
  formulation worth considering.
suggestion: None — the toHaveCount check is the load-bearing assertion and
  is in place.
```

```
severity: info
file: registry/git-graph/git-graph.css
line: ~78-86 (new keyframe block)
issue: No themed CSS variable for animation duration
detail: Phase 1's CSS theming surface exposes ~15 `--graph-*` custom
  properties for colors and geometry. The 150 ms animation duration is
  hard-coded. Consumers who want a slower/faster appear (or `0ms` to
  effectively disable beyond reduced-motion) need a CSS override on the
  selector itself.
suggestion: Defer. The keyframe duration interacts with the timing test
  (which assumes ~150 ms ± slack); making it tweakable adds a knob that
  needs its own coverage. If real consumer demand surfaces, expose
  `--graph-row-enter-duration: 150ms` in the same theming block.
```

---

## Plan deviations recorded

See plan §"Post-execution corrections" → "Phase C animation-timing test — measure animation duration, not click-to-end roundtrip" for the only behavioral deviation from the plan body. The `animationstart`→`animationend` measurement is what shipped; the original setup→`animationend` reading would have flaked in dev-server CI.

## Inherited findings carried into Phase D

1. **Chromium screenshot baselines drift** — Phase C CI showed `graph-feature-branch-chromium-linux.png` (2368 px diff) and `graph-with-refs-chromium-linux.png` (2953 px diff) failing. Cause likely Phase B virtualization sub-pixel positioning or chromium runner environment shift. Phase D pre-PR validation should regenerate the affected chromium-linux baselines via the `mcr.microsoft.com/playwright:v1.49.1-jammy` Docker recipe (see Phase 3 plan §"Post-execution corrections" for the working PowerShell invocation). Cite this review when adding to Phase D plan's "Inherited findings" section.
