# Structure and components

## Feature folders

- One folder per backlog feature under `src/features/`, named in kebab-case after the domain, not the ID (`local-game`, not `f02`).
- A feature may import from `shared/`, `api/`, and its own folder. Importing another feature's internals is not allowed; if two features need it, move it to `shared/`.
- Pages that compose several features live in `app/` and are registered in `app/router.tsx`.
- No barrel `index.ts` files; import from the file that defines the thing.

## Components

- Function components with named exports: `export function GameClock(...)`. No default exports except where a tool requires it.
- One component per file, file named after the component (`GameClock.tsx`). Small private subcomponents may share the file.
- Props are a `type XxxProps = { ... }` above the component. No `React.FC`.
- Components render; hooks fetch. A component does not call `fetch` or the API client directly — it uses a hook from its feature's `hooks/`.
- Prefer composition over configuration flags (see the `vercel-composition-patterns` skill). Three or more boolean props on one component is a signal to split it.
- No `useEffect` for derived values or for responding to user events; compute during render or handle in the event handler.

## Styling

- Tailwind utility classes in JSX. No separate CSS files besides `src/index.css`.
- Repeated class lists become a component in `shared/ui/`, not an `@apply` rule.
- Every interactive element must be reachable by keyboard and have an accessible name.

## TypeScript

- Strict typing; no `any`, no non-null `!` except on `document.getElementById('root')`.
- Use generated API types (`components['schemas']['XxxDTO']`) for server data; do not redeclare them by hand.
- `type` over `interface` unless declaration merging is needed.
