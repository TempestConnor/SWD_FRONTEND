# API access

## Contract

- Types come from the backend's OpenAPI document: run the backend, then `npm run gen:api` to regenerate `src/api/schema.d.ts`. Commit the generated file. Never hand-edit it.
- If the generated types lack something a feature needs, that is a backend change: stop and tell the user (see the backend boundary in [AGENTS.md](../AGENTS.md)).
- All paths start with `/api`. In development Vite proxies `/api` to `http://localhost:8080`; code always uses relative URLs.

## Client

- `src/api/client.ts` exports `api`, the one `openapi-fetch` client typed with `paths` from `schema.d.ts`. Its middleware attaches `Authorization: Bearer <accessToken>` when a session exists and clears the session when a token is rejected with 401.
- `src/api/session.ts` owns the stored session: `getSession`, `saveSession`, `clearSession`, and `subscribeToSession` (for `useSyncExternalStore`).
- Features call the client only from their `api.ts`; components use hooks in `hooks/` that wrap those calls in `useQuery` / `useMutation`.
- Query keys are arrays starting with the feature name: `['online-game', gameId]`. Each feature exports its keys from one place.

## Auth

- `POST /api/accounts/signin` and `/signup` return `AuthTokenDTO { accessToken, tokenType, expiresAt, account }`. There is no refresh token.
- Store the token and `expiresAt` in `localStorage` so a refresh keeps the session (needed for the F11 reconnect window). Treat it as signed out once `expiresAt` has passed.
- A `401` response clears the session and sends the user to sign in. Guest features (F02, F03, solving puzzles) must keep working without a session.

## Errors

The backend returns RFC 9457 Problem Details:

```json
{ "status": 409, "detail": "...", "errorCode": "ONLINE_GAME_ALREADY_STARTED" }
{ "status": 400, "errorCode": "VALIDATION_FAILED", "violations": [{ "field": "...", "message": "..." }] }
```

- Feature `api.ts` functions pass every client result through `unwrap()` from `src/api/errors.ts`: it returns the data or throws an `ApiError` (`status`, `errorCode`, `detail`, `violations`), so TanStack Query sees failures. Non-Problem-Details bodies become `UNKNOWN_ERROR`.
- The OpenAPI document does not describe error responses, so the client's `error` value is untyped; always go through `unwrap()`.
- Branch on `errorCode`, never on `detail` text. Map `violations` onto form fields.
- Unknown `errorCode` or `INTERNAL_ERROR`: show a generic message; do not expose `detail` to users.

## Polling

No push channel exists; poll with TanStack Query.

- Use `refetchInterval` on the query that represents the waiting state (invitation status, pending game, opponent's move) and stop polling (`refetchInterval: false`) once a terminal status arrives.
- Heartbeats (`POST .../heartbeat`) are mutations fired on an interval from one hook per game, cleaned up on unmount. Match the interval to the backend timeout (pending games: 30 s default; heartbeat well inside that, e.g. every 10 s).
- Treat the heartbeat response as fresh game state and write it into the query cache with `setQueryData`.
