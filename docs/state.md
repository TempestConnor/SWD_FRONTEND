# State

Pick the narrowest place that works:

| State | Where |
|---|---|
| Anything the server owns (account, online game, invitation, history) | TanStack Query cache |
| Local/CPU game in progress (F02, F03) | Browser storage, mirrored in component state |
| Signed-in session | `localStorage` + one auth context in `app/` |
| Shareable UI state (selected tab, filters, IDs) | URL params / search params |
| Everything else | `useState` / `useReducer` in the component that owns it |

No global store library. Do not copy server data into `useState`; read it from the query.

## Browser storage (F02, F03)

- One key per mode, e.g. `chess.local-game.v1`, `chess.cpu-game.v1`. Bump the version when the stored shape changes.
- Store the minimum needed to rebuild the game: settings and the UCI move list (plus clock values for local games). Everything else is derived by asking the backend.
- Reading must tolerate missing, corrupt, or old-version data: validate the shape, and on failure discard it and start fresh. Never let a bad stored value crash the page.
- Wrap every storage access in `try/catch`; storage can throw in private windows.

## Game state

- The backend response (FEN, status, result, legal moves) is the source of truth. After every move, replace local derived state with the server's answer.
- Optimistic moves are allowed for responsiveness, but roll back if the server rejects the move.
- Ignore stale responses: if the move list changed while a request was in flight (for example a CPU reply after a new game started), discard the old response.
