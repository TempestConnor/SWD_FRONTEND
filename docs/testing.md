# Testing

Vitest + React Testing Library + jsdom. Tests live next to the code: `GameClock.tsx` → `GameClock.test.tsx`. Import `describe`/`it`/`expect`/`vi` from `vitest` explicitly; there are no globals.

## Test-first workflow

Features are built test-first from the backlog's acceptance criteria. Each feature goes through two phases. The tests are approved automatically at the end of Phase 1; from that point they are frozen and only the user can unfreeze them.

**Phase 1: tests (no production code)**

1. Read the feature in the [backlog](../../SWD_BACKEND/docs/Chess_Implementation_Backlog.md), its business rules, and the backend endpoints it uses ([repository guidance](../../SWD_BACKEND/docs/repository-guidance.md), generated `src/api/schema.d.ts`).
2. List every acceptance criterion and edge case that the frontend is responsible for. Criteria that are purely backend (atomic claims, Elo maths) are not frontend tests.
3. Anything marked **Needs Clarification**, or any gap in the criteria, becomes a question for the user. Do not write a test that silently decides it.
4. Write the tests. Only create what the tests need to compile: empty components or hooks that render nothing or throw `not implemented`, with the final file name and export. No real logic.
5. Run `npm run test` and confirm every new test **fails because the behavior is missing**, not because of a typo, bad import, or broken mock. A test that passes now is testing nothing; fix it.
6. Report to the user: a table mapping each criterion to its test(s), the failing-run output, the open questions, and the manual-check list (step 9). The tests are then approved automatically and Phase 2 starts without waiting, unless an open question would change what a test asserts; in that case stop and ask first.

**Phase 2: implementation**

7. Implement until `npm run check` passes.
8. Commit the approved tests before implementing, so any later change to them shows in the diff. Approved tests are frozen. Do not edit, delete, skip, or loosen them, even when one fails during implementation and the fix looks obvious. If one seems wrong, stop and explain why to the user; change it only after they explicitly say so. Adding new tests is fine.
9. Finish with the manual browser checklist for what jsdom cannot cover (drag and drop on the board, layout, responsiveness, real backend round-trip) and report the results of `npm run check`.

If a test fails because the backend behaves differently than documented, that is a backend issue: report it per the backend boundary in [AGENTS.md](../AGENTS.md). Do not change the test to match the backend.

### Writing tests before the code exists

- Describe behavior a user sees, not structure: roles, accessible names, visible text. Never assert on component internals, CSS classes, or DOM shape that the implementation has not decided yet.
- Drive the board by clicking squares (react-chessboard supports click-to-move), not drag and drop.
- Build mock responses from the generated API types so a mock that drifts from the backend fails `npm run typecheck`.
- Name tests after the criterion they cover: `it('restores an active game after refresh')`.

## What to test

- **Hooks and pure logic** (storage parsing, clock math, error mapping): plain unit tests, many cases.
- **Components**: render, interact the way a user would, assert on what the user sees.
- **Feature flows**: render the feature with a real `QueryClient` and a mocked network, and walk the acceptance criteria from the backlog.
- Every backlog acceptance criterion the feature touches should map to at least one test.

## React Testing Library

- Query by role and accessible name first (`getByRole('button', { name: 'Resign' })`), then label, then text. `data-testid` only when nothing else works.
- Use `@testing-library/user-event` for interaction, not `fireEvent`.
- Use `findBy*` / `waitFor` for async UI; never fixed sleeps.
- Assert with jest-dom matchers (`toBeInTheDocument`, `toBeDisabled`, `toHaveTextContent`).

## Network and time

- Mock at the API boundary: mock the feature's `api.ts` module or the shared client with `vi.mock`, never the components under test.
- Each test gets a new `QueryClient` with `retry: false`.
- Clocks, polling, and heartbeats use `vi.useFakeTimers()` and advance time explicitly; restore real timers after each test.
- Tests never call the real backend. Contract drift is caught by regenerating `schema.d.ts` and running `npm run typecheck`.

## Rules

- Do not skip, delete, or weaken a failing test to make `npm run check` pass. If a test fails because the backend behaves differently than documented, report it (see the backend boundary in [AGENTS.md](../AGENTS.md)).
