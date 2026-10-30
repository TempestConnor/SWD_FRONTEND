# End-to-end test log

Each run of `npm run e2e` against the real backend is recorded here. Failures that need application code
changes are listed under **Open failures** and are fixed in a later session, not while the tests are written.

## Run 2026-10-31 (after fixing E2E-001)

- **Environment:** same as the run below.
- **Result:** 21 passed, 0 failed (21 tests, about 1.5 min). `local-game` › restores an untimed game after a
  reload now passes.

## Run 2026-10-31

- **Environment:** Windows 11, Chromium (Playwright 1.64.1), Vite dev server on :5173, backend
  `swd392-backend-0.0.1-SNAPSHOT.jar` on :8080 with the dev database `ChessDB` and Stockfish 19.
- **Result:** 20 passed, 1 failed (21 tests, about 1.7 min). Same result on two consecutive runs.

| Spec | Test | Result |
| --- | --- | --- |
| auth | signs up, sees the starting rating, signs out and signs back in | ✅ pass |
| auth | keeps the session across a reload | ✅ pass |
| auth | rejects a wrong password | ✅ pass |
| auth | rejects an email and a display name that are already taken | ✅ pass |
| auth | sends a guest to sign in and back to the page they asked for | ✅ pass |
| cpu-game | the engine answers the player’s move | ✅ pass |
| cpu-game | restores the game after a reload | ✅ pass |
| cpu-game | plays Black with the engine opening | ✅ pass |
| local-game | plays moves for both sides through the backend | ✅ pass |
| local-game | refuses an illegal move | ✅ pass |
| local-game | ends in checkmate | ✅ pass |
| local-game | **restores an untimed game after a reload** | ❌ **fail** (E2E-001) |
| local-game | restores a timed game after a reload | ✅ pass |
| local-game | starts over with New game | ✅ pass |
| matchmaking | joins and leaves the queue | ✅ pass |
| matchmaking | pairs two players of similar rating into the same pending game | ✅ pass |
| online-game | a friend joins by link, both get ready, play, and the resignation reaches history | ✅ pass |
| online-game | both players agree to abandon and the game is drawn | ✅ pass |
| online-game | cancelling a pending game cancels it for both players | ✅ pass |
| online-game | a cancelled invitation can no longer be joined | ✅ pass |
| online-game | the host cannot join their own invitation | ✅ pass |

## Open failures

None.

## Resolved failures

### E2E-001: an untimed local game is lost on reload (F02, BR-GAME-004)

- **Test:** `e2e/local-game.spec.ts` › restores an untimed game after a reload
- **Seen:** start a local game with **Use a clock** unchecked, play `d2d4`, reload. The setup form comes back
  with no "could not be restored" notice, so the game is silently discarded. Timed games restore fine.
- **Cause (frontend):** for an untimed game `POST /api/local-games` returns
  `"clock": {"enabled": false, "initialMinutes": null, "incrementSeconds": null}`. The game is saved to
  `localStorage` with that clock, but `isClock` in `src/features/local-game/storage.ts` accepts only `undefined`
  or a number for `initialMinutes` and `incrementSeconds`. `null` fails, so `loadLocalGame()` clears the
  saved game and returns `null`.
- **Likely fix:** accept `null` in `isClock` (or normalise the clock in `handleStarted` before it is stored),
  and add a unit test in `storage.test.ts` for a stored clock with `null` fields. The CPU game is not
  affected because it builds its clock in the browser.
- **Fix:** `isClock` now accepts `null` as well as `undefined` or a number for both timings, which also
  restores games already saved with `null` fields. Covered by a new case in `storage.test.ts`.
- **Status:** resolved 2026-10-31; `npm run check` and the full E2E suite pass.
