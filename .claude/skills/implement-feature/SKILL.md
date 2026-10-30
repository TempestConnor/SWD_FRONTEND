---
name: implement-feature
description: Build one backlog feature in the React frontend test-first, with a stop for user approval after the tests are written. Use when the user runs /implement-feature with a feature ID such as F02.
argument-hint: <feature ID, e.g. F02> [notes]
disable-model-invocation: true
---

# Implement feature $ARGUMENTS

Follow [AGENTS.md](../../../AGENTS.md) and the [test-first workflow](../../../docs/testing.md#test-first-workflow). This command adds the session order and the checkpoint; those documents hold the rules.

## Before anything

- If no feature ID was given, pick the next one: the first feature in the backlog's Suggested Implementation Order (section E) with no `feat(<ID>)` commit in `git log`. Say which one you picked and why, then continue.
- Confirm `src/api/schema.d.ts` exists. If it is missing, or lacks the endpoints this feature uses, tell the user to start the backend and run `npm run gen:api`, then stop.
- Never modify `../SWD_BACKEND/`. If the feature needs a backend change, stop and report what is missing.

## Phase 1: tests

1. Read the feature's section in the backlog, the business rules it cites, the backend endpoints it uses, and any frontend code it builds on.
2. Load the project skills that apply (see [docs/agent-skills.md](../../../docs/agent-skills.md)); always `vitest` for this phase.
3. Write the tests and the minimal stubs they need to compile, as described in the workflow. No real logic.
4. Run `npm run test` and check that every new test fails for the right reason.
5. **Stop and end your turn** with:
   - **Criteria → tests:** a table with each acceptance criterion or edge case, the test that covers it, and its current status (failing).
   - **Not covered by frontend tests:** criteria that belong to the backend, with a one-line reason each.
   - **Open questions:** Needs Clarification items and gaps, each with the behavior that depends on it.
   - **Manual checklist:** what will be checked in the browser after implementation.
   - **Files:** every test file written. These are frozen once approved.

Do not start Phase 2 in the same turn. Wait for the user to approve or adjust the tests.

## Phase 2: implementation (after approval)

1. Commit the approved tests (and their stubs) before writing any implementation: `git add <files> && git commit -m "test(<ID>): acceptance tests"`. From here on, `git diff HEAD~1 -- '*.test.*'` must stay empty unless the user approved a change.
2. Load `vercel-composition-patterns` and `vercel-react-best-practices`.
3. Implement until `npm run check` passes. Approved tests stay unchanged; if one seems wrong, stop and explain.
4. Commit the implementation: `git commit -m "feat(<ID>): <summary>"`.
5. Report:
   - the `npm run check` result
   - files created or changed
   - any test you asked to change and what the user decided
   - backend issues found (reported, not fixed)
   - the manual checklist for the user to run in the browser
