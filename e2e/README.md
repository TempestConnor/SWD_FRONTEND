# End-to-end tests

Playwright drives the real app in Chromium against the **real backend**. Unlike the Vitest suite, nothing is
mocked. These tests are not part of `npm run check`.

## Run

1. Start the backend on http://localhost:8080 (see the backend README). CPU tests need `STOCKFISH_PATH`.
   The run stops at once with a clear message if the backend is not reachable.
2. Run `npm run e2e` (or `npm run e2e:ui` to watch and debug). Playwright starts the Vite dev server on :5173
   itself, or reuses one that is already running.
3. Open `playwright-report/index.html` for the report. Failed tests keep a trace and a screenshot in `test-results/`.
4. Record the run in [TEST_LOG.md](TEST_LOG.md).

First time on a machine: `npx playwright install chromium`.

## Notes

- Every test signs up fresh accounts (`e2e-…@example.test`) through the API. The backend has no delete
  endpoint, so these accounts and their games stay in whichever database the backend uses.
- Tests run one at a time: they share one database, and the matchmaking test needs its two players to be
  paired with each other. A real player searching at the same time and rating could be paired instead.
- Online tests open two browser contexts, one per player. Moves and claims reach the other player through
  the app's normal polling.
- Board squares are found by react-chessboard's `data-square` attributes, as in `src/test/board.ts`.
