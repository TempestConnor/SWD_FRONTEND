# Chess frontend — React

Standards: [docs/structure.md](docs/structure.md) · [docs/api.md](docs/api.md) ·
[docs/state.md](docs/state.md) · [docs/testing.md](docs/testing.md)

## Backend boundary — read first

The frontend and backend are developed separately. **Never create, edit, or delete anything under `../SWD_BACKEND/`** — code, config, docs, or tests — even when the change looks trivial.

- Read the backend freely to learn the contract: [repository guidance](../SWD_BACKEND/docs/repository-guidance.md) describes every implemented endpoint, the OpenAPI document at `/v3/api-docs` is the type source, and controllers/DTOs are the final word.
- If a feature cannot be built without a backend change (missing endpoint, missing field, wrong status, CORS, auth), **stop and tell the user**: what is missing, which feature needs it, and the smallest backend change that would unblock it. Continue only with frontend work that does not depend on it.
- If a bug traces to the backend, **do not fix it and do not work around it silently**. Report it with evidence (request, response, expected behavior, and the rule or backlog item it violates) and wait for the user. A frontend workaround is allowed only after the user approves it.
- Do not run backend write operations (migrations, `mvnw` goals that modify files, `spotless:apply`) from a frontend task.

## Requirements

Product behavior comes from the backend's [business rules](../SWD_BACKEND/docs/Chess_Website_Business_Rules_Final_RealReal.md) and [implementation backlog](../SWD_BACKEND/docs/Chess_Implementation_Backlog.md); feature IDs (F01–F16) are shared with the backend. Implement only the feature the user asks for. Features are built **test-first** from acceptance criteria, with a user approval checkpoint after the tests are written; follow the [test-first workflow](docs/testing.md#test-first-workflow). Approved tests are frozen during implementation. Check the backlog's open questions before implementing affected behavior; ask rather than invent policy. If business rules, backlog, and the actual backend API disagree, report the conflict to the user.

## Stack

Vite 8 · React 19 · TypeScript 7 · React Router 7 (data router, `react-router` package) · TanStack Query 5 · Tailwind CSS 4 · react-chessboard 5 + chess.js · openapi-fetch with types from openapi-typescript · Vitest 5 + React Testing Library + jsdom · oxlint.

Do not add dependencies, state libraries, UI kits, or CSS frameworks without asking.

## Required skills

Project skills are versioned in `.agents/skills/`. Read [skill routing and overrides](docs/agent-skills.md) and load the skills matching the task. Always apply `vercel-composition-patterns` when designing components, `vercel-react-best-practices` when writing components or data fetching, and `vitest` when writing tests. Project docs override skill examples.

## Commands

Run `npm run check` for any code change: lint, typecheck, tests, and production build. Report the actual result and any limitation.

- `npm run dev` — dev server; `/api` is proxied to the backend on `http://localhost:8080`.
- `npm run test:watch` — Vitest in watch mode.
- `npm run gen:api` — regenerate `src/api/schema.d.ts` from the running backend. Never hand-edit that file. It runs openapi-typescript via `npx` because it requires TypeScript 5; do not add it to `package.json`.

## Layout

```text
src/
  app/                  router, providers, app-level pages and layout
  api/                  schema.d.ts (generated), client.ts (typed fetch + auth), errors
  features/<feature>/   one folder per backlog feature, e.g. auth, local-game, cpu-game, invitation
    components/         feature UI
    hooks/              useXxxQuery / useXxxMutation wrappers around TanStack Query
    api.ts              the feature's calls through the shared client
    *.test.tsx          tests next to the code they cover
  shared/ui/            presentational components used by 2+ features (Board, Clock, Button)
  shared/lib/           framework-free helpers
  test/                 Vitest setup and test utilities
```

## Gotchas

- The backend is authoritative for chess legality and outcomes (BR-MOVE-001). chess.js is only for instant UI feedback (legal-move highlights, optimistic piece movement); always reconcile with the server's FEN/status.
- There is no WebSocket or SSE. Real-time behavior (invitation claims, ready state, opponent moves, matchmaking) is polling via TanStack Query `refetchInterval` plus the backend's heartbeat endpoints.
- Local (F02) and CPU (F03) games are stateless on the server: the client keeps the full UCI move list in browser storage and sends it on every call.
- Errors are RFC 9457 Problem Details with an `errorCode` property (and `violations` for validation). Branch on `errorCode`, never on `detail` text. See [docs/api.md](docs/api.md).
- `react-router`, not `react-router-dom`.
- Clocks are displayed from server timestamps for online games; never let a local timer decide a timeout there.
