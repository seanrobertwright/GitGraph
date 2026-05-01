---
description: "Create comprehensive feature plan with deep codebase analysis and research"
---

# Plan a new task

## Feature: $ARGUMENTS

## Mission

Transform a feature request into a **comprehensive implementation plan** through systematic codebase analysis, external research, and strategic planning.

**Core Principle**: We do NOT write code in this phase. Our goal is to create a context-rich implementation plan that enables one-pass implementation success for ai agents.

**Key Philosophy**: Context is King. The plan must contain ALL information needed for implementation - patterns, mandatory reading, documentation, validation commands - so the execution agent succeeds on the first attempt.

## Planning Process

### Phase 1: Feature Understanding

**Deep Feature Analysis:**

- Extract the core problem being solved
- Identify user value and business impact
- Determine feature type: New Capability/Enhancement/Refactor/Bug Fix
- Assess complexity: Low/Medium/High
- Map affected systems and components

**Create User Story Format Or Refine If Story Was Provided By The User:**

```
As a <type of user>
I want to <action/goal>
So that <benefit/value>
```

### Phase 2: Codebase Intelligence Gathering

**Use specialized agents and parallel analysis:**

**1. Project Structure Analysis**

- Detect primary language(s), frameworks, and runtime versions
- Map directory structure and architectural patterns
- Identify service/component boundaries and integration points
- Locate configuration files (pyproject.toml, package.json, etc.)
- Find environment setup and build processes

**2. Pattern Recognition** (Use specialized subagents when beneficial)

- Search for similar implementations in codebase
- Identify coding conventions:
  - Naming patterns (CamelCase, snake_case, kebab-case)
  - File organization and module structure
  - Error handling approaches
  - Logging patterns and standards
- Extract common patterns for the feature's domain
- Document anti-patterns to avoid
- Check CLAUDE.md for project-specific rules and conventions

**3. Dependency Analysis**

- Catalog external libraries relevant to feature
- Understand how libraries are integrated (check imports, configs)
- Find relevant documentation in docs/, ai_docs/, .agents/reference or ai-wiki if available
- Note library versions and compatibility requirements

**4. Testing Patterns**

- Identify test framework and structure (pytest, jest, etc.)
- Find similar test examples for reference
- Understand test organization (unit vs integration)
- Note coverage requirements and testing standards

**5. Integration Points**

- Identify existing files that need updates
- Determine new files that need creation and their locations
- Map router/API registration patterns
- Understand database/model patterns if applicable
- Identify authentication/authorization patterns if relevant

**Clarify Ambiguities:**

- If requirements are unclear at this point, ask the user to clarify before you continue
- Get specific implementation preferences (libraries, approaches, patterns)
- Resolve architectural decisions before proceeding

**Interactive `.gitignore` review (if plan creates or substantially alters `.gitignore`):**

Do not infer local-only directories from templates. Ask the user to list their local-only artifacts before generating `.gitignore`:

- Editor/IDE config dirs (`.vscode/`, `.idea/`, project-local settings)
- Tool state dirs (`.claude/`, `.cursor/`, `.aider*`)
- Local env files (`.env.local`, `.env.*.local`)
- Anything else the user's workflow produces that shouldn't ship

Stdlib entries (`node_modules/`, `.next/`, `dist/`, coverage/test-report dirs) are fine to include without asking.

### Phase 2.6: Plan Self-Consistency Check

Before writing the plan, build and validate a list of **key identifiers** that will appear across multiple sections. Every identifier in this list must have exactly one canonical form used everywhere.

Identifiers to track explicitly:

- File paths declared in "New Files to Create"
- URL paths, route segments, and API endpoints (pay attention to extension boundaries — `/foo` vs `/foo.json` is a real difference)
- Version strings for pinned dependencies
- Port numbers (dev server, CI, webServer configs)
- Environment variable names
- Branch names, remote names, repository slugs

Before emitting the plan: do a one-pass grep over your draft for each key identifier. If two usages disagree, fix the plan text, not the reader's expectations.

Common failure mode: `generateStaticParams` returns `{ name: "foo" }` but the validation step expects `out/foo.json`. The reader reconciles by guessing; the execute agent typically guesses wrong. Catching this at plan time is a ~30-second grep; catching it at execution time is a full retry.

**Hand-trace fixtures with embedded expected output.** If the plan colocates a hand-authored expected result with a fixture (the "plan as source of truth" pattern that breaks snapshot circularity for deterministic algorithms), walk the stated algorithm step-by-step against each fixture and confirm every field of the expected output is reachable from the algorithm + tiebreak rules. Contradictions between narrative walk-through and embedded expected values are the highest-value bug class to catch at plan time — they cost ~30s to find now and a full retry to fix during execution. This applies to: layout/graph fixtures, expected SQL query results, expected rendered output (SVG paths, HTML strings), expected serialized payloads — anywhere the plan author claims "for input X, output Y."

### Phase 2.7: External-System Assumption Audit

Every plan makes claims about systems not under the repo's control. List every such claim explicitly, and for each, either:

- **Verify** the claim against current documentation (include the URL, dated if the source is a fast-moving doc), OR
- **Mark it an assumption** — add an explicit note that the execute agent should validate this claim before trusting it.

Categories of claims that have burned past plans:

- npm/pnpm/yarn transitive resolution ("X will pull Y at version Z"). Especially dangerous for ecosystems that ship native bindings as separate transitive packages (Tailwind v4, Rollup, esbuild, swc, lightningcss). If the plan pins a top-level package from such an ecosystem, **list the transitive native packages that need pinning via `pnpm.overrides` / npm `overrides` / yarn `resolutions`**, not just the top-level.
- GitHub Actions token permissions ("GITHUB_TOKEN can do X"). The default workflow token lacks admin scope on many APIs. Claims like "`configure-pages@v5 enablement: true` auto-provisions Pages" are false under default tokens.
- `gh` CLI side effects ("`gh repo create --source .` sets `main` as default"). First-push-wins on empty repos.
- Tool auto-generated files ("Next will produce X on first build", "`next lint` won't modify tsconfig"). Many tools mutate files on first run.
- Network availability of referenced docs (404s happen; link rot is real).
- **Container image internals.** When a plan instructs running commands inside a pinned Docker image (e.g. `mcr.microsoft.com/playwright:v1.49.1-jammy`), audit *what's bundled in the image*: which Node version, which corepack/pnpm/npm version, whether bundled signing keys are still valid against the current npm registry. Lockfile transitive engine pins can be tighter than the image's Node (e.g. a transitive requiring Node ≥22.13 against an image's 22.12). Image-bundled corepack can fail with `Cannot find matching keyid` when registry keys rotate. Provide explicit fallbacks in the recipe: `npm install -g pnpm@<version>` instead of `corepack enable`, or `--config.engine-strict=false` scoped to the image-only invocation.
- **Cross-OS filesystem semantics for build tools.** When a plan instructs a developer to run a build/test step locally, audit OS-specific path and filesystem behavior. NTFS-through-Docker-Desktop bind mounts don't honor pnpm's atomic-rename pattern inside `node_modules` — fix is anonymous volumes mounted *over* each `node_modules` dir. Windows-host commands should be written as PowerShell with `Get-ChildItem` / `Remove-Item`, not bash one-liners. If a recipe must work on both, provide both forms.
- **Playwright assertions on SVG / zero-area elements.** `toBeVisible()` is unreliable for stroke-only `<path>`, `<line>`, `<polyline>` (zero bounding box on Chromium and WebKit; passes on Firefox, which is misleading and produces false positives in 3-browser specs). Plans that prescribe Playwright assertions on SVG must specify attribute-based assertions (`toHaveAttribute("d", /.+/)`, `toHaveAttribute("cy", "20")`) or geometry-derived checks, not visibility.

Do not claim "zero manual steps" unless every external-system claim is verified. If any step requires a one-time manual toggle (GitHub Pages Source setting, npm 2FA, cloud console clicks), call it out in a dedicated "Manual Steps Required" section at the top of the plan.

### Phase 3: External Research & Documentation

**Use specialized subagents when beneficial for external research:**

**Documentation Gathering:**

- Research latest library versions and best practices
- Find official documentation with specific section anchors
- Locate implementation examples and tutorials
- Identify common gotchas and known issues
- Check for breaking changes and migration guides

**Technology Trends:**

- Research current best practices for the technology stack
- Find relevant blog posts, guides, or case studies
- Identify performance optimization patterns
- Document security considerations

**Compile Research References:**

```markdown
## Relevant Documentation

- [Library Official Docs](https://example.com/docs#section)
  - Specific feature implementation guide
  - Why: Needed for X functionality
- [Framework Guide](https://example.com/guide#integration)
  - Integration patterns section
  - Why: Shows how to connect components
```

### Phase 4: Deep Strategic Thinking

**Think Harder About:**

- How does this feature fit into the existing architecture?
- What are the critical dependencies and order of operations?
- What could go wrong? (Edge cases, race conditions, errors)
- How will this be tested comprehensively?
- What performance implications exist?
- Are there security considerations?
- How maintainable is this approach?

**Design Decisions:**

- Choose between alternative approaches with clear rationale
- Design for extensibility and future modifications
- Plan for backward compatibility if needed
- Consider scalability implications

### Phase 5: Plan Structure Generation

**Create comprehensive plan with the following structure:**

Whats below here is a template for you to fill for th4e implementation agent:

```markdown
# Feature: <feature-name>

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

<Detailed description of the feature, its purpose, and value to users>

## User Story

As a <type of user>
I want to <action/goal>
So that <benefit/value>

## Problem Statement

<Clearly define the specific problem or opportunity this feature addresses>

## Solution Statement

<Describe the proposed solution approach and how it solves the problem>

## Feature Metadata

**Feature Type**: [New Capability/Enhancement/Refactor/Bug Fix]
**Estimated Complexity**: [Low/Medium/High]
**Primary Systems Affected**: [List of main components/services]
**Dependencies**: [External libraries or services required]

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

<List files with line numbers and relevance>

- `path/to/file.py` (lines 15-45) - Why: Contains pattern for X that we'll mirror
- `path/to/model.py` (lines 100-120) - Why: Database model structure to follow
- `path/to/test.py` - Why: Test pattern example

### New Files to Create

- `path/to/new_service.py` - Service implementation for X functionality
- `path/to/new_model.py` - Data model for Y resource
- `tests/path/to/test_new_service.py` - Unit tests for new service

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Documentation Link 1](https://example.com/doc1#section)
  - Specific section: Authentication setup
  - Why: Required for implementing secure endpoints
- [Documentation Link 2](https://example.com/doc2#integration)
  - Specific section: Database integration
  - Why: Shows proper async database patterns

### Patterns to Follow

<Specific patterns extracted from codebase - include actual code examples from the project>

**Naming Conventions:** (for example)

**Error Handling:** (for example)

**Logging Pattern:** (for example)

**Other Relevant Patterns:** (for example)

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

<Describe foundational work needed before main implementation>

**Tasks:**

- Set up base structures (schemas, types, interfaces)
- Configure necessary dependencies
- Create foundational utilities or helpers

### Phase 2: Core Implementation

<Describe the main implementation work>

**Tasks:**

- Implement core business logic
- Create service layer components
- Add API endpoints or interfaces
- Implement data models

### Phase 3: Integration

<Describe how feature integrates with existing functionality>

**Tasks:**

- Connect to existing routers/handlers
- Register new components
- Update configuration files
- Add middleware or interceptors if needed

### Phase 4: Testing & Validation

<Describe testing approach>

**Tasks:**

- Implement unit tests for each component
- Create integration tests for feature workflow
- Add edge case tests
- Validate against acceptance criteria

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task Format Guidelines

Use information-dense keywords for clarity:

- **CREATE**: New files or components
- **UPDATE**: Modify existing files
- **ADD**: Insert new functionality into existing code
- **REMOVE**: Delete deprecated code
- **REFACTOR**: Restructure without changing behavior
- **MIRROR**: Copy pattern from elsewhere in codebase
- **CONFIRM**: User-gated action that must not run without explicit approval (push, PR, merge, deploy, destructive git, force operations)

### {ACTION} {target_file}

- **IMPLEMENT**: {Specific implementation detail}
- **PATTERN**: {Reference to existing pattern - file:line}
- **IMPORTS**: {Required imports and dependencies}
- **GOTCHA**: {Known issues or constraints to avoid — but see "No conditional fixes" rule below}
- **VALIDATE**: `{executable validation command}`

### Rules that apply to every task

**No conditional fixes.** If the plan author knows a step is likely to fail and knows the fix, write the fix as part of `IMPLEMENT`, not as a "GOTCHA: if X fails, add Y" fallback. Conditional fixes guarantee one wasted iteration on first execution. The only legitimate use of conditional language in `GOTCHA` is for failures whose *cause* depends on user environment (e.g. "fails on Windows if line endings aren't LF") — not for predictable dependency issues.

**Host-environment declaration.** Tasks that prescribe a local validation recipe (Docker run, shell script, browser-tooling invocation) must declare the host OS the recipe was authored against in a `Host:` line at the top of the task. If the recipe is expected to work cross-platform, list the verified hosts. If only one host has been verified, say so explicitly — don't claim portability that wasn't tested. A bash one-liner that "should work" on Windows-via-Git-Bash but was only verified on Linux belongs in a `Host: linux (verified); windows-git-bash (untested)` declaration, not buried as a footnote.

**Every destructive or shared-state action is a `CONFIRM` task.** This includes: `git push` (first push of a branch, not subsequent repushes), `git push -f`, `git reset --hard`, `git checkout --`, `gh pr create`, `gh pr merge`, `gh pr close`, `gh api --method {PATCH,DELETE,PUT}`, any workflow `workflow_dispatch` against production, any `rm -rf` outside build artifacts. Grouping multiple destructive actions into one `CONFIRM` is fine as long as the user can see all of them before approving.

**Greenfield-repo sequencing.** If the plan creates a new git repo or remote, the task order must be:

1. `gh repo create` (or equivalent).
2. `git init`, `.gitattributes`, `.gitignore`, `.nvmrc`, `.npmrc`.
3. **Initial commit on `main` and push to origin** — before any feature branch exists.
4. Then create the feature branch and proceed with the rest of the plan.

Skipping step 3 means `gh repo create --source .` or first-push-wins will make the feature branch the remote default, and opening a PR will require an orphan-commit rebase dance. Do not optimize this step away.

**No "implementation-defined" error handling at security/integrity boundaries.** If invalid input could (a) cause a downstream non-null assertion or unchecked index access to crash with a confusing error, or (b) silently corrupt internal state (e.g. last-wins on a duplicate key that other code counts), the plan must specify *throw with a named, descriptive error* and include the error test in the same task as the validation. Wording like "may throw or use last-wins" or "implementation-defined" is not a valid spec — pick one, and pick "throw" by default at any boundary where a non-null assertion lives downstream. This rule supersedes any "deferred to a later errors.spec" instinct: the validation lives at the boundary it protects, not in a later phase.

**Native-binding pins.** If the plan pins a top-level package from an ecosystem that ships native bindings as separate transitive packages (Tailwind v4's `@tailwindcss/oxide` + `@tailwindcss/node`, Rollup's `@rollup/rollup-<platform>-*`, esbuild's `@esbuild/*`, swc's `@swc/core-<platform>-*`, lightningcss's `lightningcss-<platform>-*`, etc.), the plan must also pin those natives via `pnpm.overrides` (or npm `overrides` / yarn `resolutions`). Do not treat top-level pins as sufficient — the natives float across minor versions and their binary struct shapes change, producing runtime errors that never surface at `install` time.

**Spike tasks: throwaway path + measurement recorded in the plan.** Any task labeled SPIKE must (a) live at a clearly throwaway path (`_spike/` page, `_spike-*.spec.ts`, etc. — never inlined into a production file), (b) conclude by editing the plan file itself to record the measured value in the relevant downstream task's body, with a comment citing the spike, and (c) end with deletion of the spike code. Without (b), the spike's output exists only in transient test logs and can't be audited later. Without (a), the executor is tempted to "just inline it" and skip the cleanup step. Spike code is throwaway; the *measurement* is permanent and lives in the plan.

**Pre-PR scope confirmation as an explicit task.** Every plan whose final phase opens a PR must include a `CONFIRM` task immediately before `gh pr create` that runs:

1. `git status` — confirm no untracked files outside `.agents/`. Anything else: gitignore proactively or revert.
2. `git diff --name-only main...HEAD` — confirm every changed path is listed under "Primary Systems Affected" or is an explicitly planned new file.
3. Verify `.agents/plans/<phase>.md`, `.agents/code-reviews/`, `.agents/execution-reports/`, `.agents/system-reviews/` are NOT staged on the feature branch (artifact-commit cadence: those land on `main` post-merge, never in the implementation PR).

This is a checklist task, not a CLAUDE.md rule that may or may not be re-read. Sweep-in of unrelated tooling dirs and plan-file ride-along are recurring failure modes; automate the catch.

<Continue with all tasks in dependency order...>

---

## TESTING STRATEGY

<Define testing approach based on project's test framework and patterns discovered in during research>

### Unit Tests

<Scope and requirements based on project standards>

Design unit tests with fixtures and assertions following existing testing approaches

### Integration Tests

<Scope and requirements based on project standards>

### Edge Cases

<List specific edge cases that must be tested for this feature>

---

## VALIDATION COMMANDS

<Define validation commands based on project's tools discovered in Phase 2>

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

<Project-specific linting and formatting commands>

### Level 2: Unit Tests

<Project-specific unit test commands>

### Level 3: Integration Tests

<Project-specific integration test commands>

### Level 4: Manual Validation

<Feature-specific manual testing steps - API calls, UI testing, etc.>

### Level 5: Additional Validation (Optional)

<MCP servers or additional CLI tools if available>

---

## ACCEPTANCE CRITERIA

<List specific, measurable criteria that must be met for completion>

- [ ] Feature implements all specified functionality
- [ ] All validation commands pass with zero errors
- [ ] Unit test coverage meets requirements (80%+)
- [ ] Integration tests verify end-to-end workflows
- [ ] Code follows project conventions and patterns
- [ ] No regressions in existing functionality
- [ ] Documentation is updated (if applicable)
- [ ] Performance meets requirements (if applicable)
- [ ] Security considerations addressed (if applicable)

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability

---

## NOTES

<Additional context, design decisions, trade-offs>
```

## Output Format

**Filename**: `.agents/plans/{kebab-case-descriptive-name}.md`

- Replace `{kebab-case-descriptive-name}` with short, descriptive feature name
- Examples: `add-user-authentication.md`, `implement-search-api.md`, `refactor-database-layer.md`

**Directory**: Create `.agents/plans/` if it doesn't exist

## Quality Criteria

### Context Completeness ✓

- [ ] All necessary patterns identified and documented
- [ ] External library usage documented with links
- [ ] Integration points clearly mapped
- [ ] Gotchas and anti-patterns captured
- [ ] Every task has executable validation command

### Implementation Ready ✓

- [ ] Another developer could execute without additional context
- [ ] Tasks ordered by dependency (can execute top-to-bottom)
- [ ] Each task is atomic and independently testable
- [ ] Pattern references include specific file:line numbers

### Pattern Consistency ✓

- [ ] Tasks follow existing codebase conventions
- [ ] New patterns justified with clear rationale
- [ ] No reinvention of existing patterns or utils
- [ ] Testing approach matches project standards

### Information Density ✓

- [ ] No generic references (all specific and actionable)
- [ ] URLs include section anchors when applicable
- [ ] Task descriptions use codebase keywords
- [ ] Validation commands are non interactive executable

### Self-Consistency ✓ (Phase 2.6)

- [ ] Every file in "New Files to Create" appears in at least one STEP-BY-STEP task
- [ ] Every task's `VALIDATE` artifact is produced by some task's `IMPLEMENT`
- [ ] Key identifiers (URL paths, route segments, versions, ports, env vars, branches) used consistently across all sections — grep-verified
- [ ] No conditional fix notes that waste first-iteration time — known fixes are primary

### External-System Claims ✓ (Phase 2.7)

- [ ] Every claim about npm/pnpm/yarn transitive resolution either verified or marked "assumption"
- [ ] Every claim about GitHub Actions token permissions verified against current docs
- [ ] Every claim about third-party action behavior (configure-pages, deploy-pages, etc.) verified
- [ ] Every claim about `gh` CLI side effects verified
- [ ] Every claim about auto-generated files (Next, Vite, etc. mutating configs on first run) verified
- [ ] If any manual step is required, "Manual Steps Required" section exists at top of plan
- [ ] Native-binding transitive pins listed when pinning a top-level package with a native-binding ecosystem

### Greenfield Bootstrap ✓ (if applicable)

- [ ] First task that touches remote creates `main` with an initial commit before any feature branch is pushed
- [ ] Destructive/shared-state actions (push, PR create/merge, `gh api` mutations, `rm -rf`) are `CONFIRM` tasks

## Success Metrics

**One-Pass Implementation**: Execution agent can complete feature without additional research or clarification

**Validation Complete**: Every task has at least one working validation command

**Context Rich**: The Plan passes "No Prior Knowledge Test" - someone unfamiliar with codebase can implement using only Plan content

**Confidence Score**: #/10 that execution will succeed on first attempt

## Report

After creating the Plan, provide:

- Summary of feature and approach
- Full path to created Plan file
- Complexity assessment
- Key implementation risks or considerations
- Estimated confidence score for one-pass success