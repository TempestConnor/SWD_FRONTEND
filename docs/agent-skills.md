# Shared React skills

The skill folders in `.agents/skills/` are versioned with the repository, installed with `npx skills add` and recorded in `skills-lock.json`. `.claude/skills/` holds local Windows junctions to them for Claude Code discovery; junctions do not survive git, so agents that do not discover skills natively should read the `SKILL.md` files directly.

| Skill | Use when |
|---|---|
| `vercel-composition-patterns` | Designing or refactoring component APIs: compound components, avoiding boolean-prop sprawl, context providers |
| `vercel-react-best-practices` | Writing components, effects, data fetching; reviewing re-renders and bundle size |
| `vitest` | Writing or configuring tests, mocking, fake timers |

`.claude/skills/implement-feature/` is a project command, not an installed skill: a real folder (not a junction), run by the user as `/implement-feature F02`. It drives the [test-first workflow](testing.md#test-first-workflow); agents without slash commands follow that section directly.

## Project overrides

[AGENTS.md](../AGENTS.md) and the topic docs override generic skill examples, naming, and technology choices.

- **vercel-react-best-practices** targets React *and Next.js*. This is a client-only Vite SPA: ignore all `server-*` rules, `async-api-routes`, and `rendering-hydration-*`. Ignore `client-swr-dedup`; TanStack Query handles deduplication. The `async-*`, `bundle-*`, `rerender-*`, and `rendering-*` rules apply.
- **vercel-composition-patterns** `react19-*` rules apply (the project is on React 19).
- **vitest** was generated from Vitest 5.1 beta; the project pins Vitest 5.0.x. If an API in the skill is missing, follow the installed version.
- No skill covers React Testing Library; follow [testing.md](testing.md).
- A skill's availability does not authorize new dependencies or architecture changes.
