# AGENTS.md

## Commands

```bash
bun install
bun run test       # vitest run
bun run build      # tsdown -> dist/
bun run typecheck  # tsc --noEmit
bun run check      # biome check
bun run format     # biome check --write
```

Always use `bun` — never npm/yarn/pnpm.

## Architecture

**The core constraint:** `createServerFn()` calls must live in the consumer's
application source — TanStack Start's Vite plugin only transforms app source,
never prebuilt packages. This package therefore ships everything *except* the
two server functions (cookie read/write). Never add `createServerFn` here.

Two entry points:

- `start-theme` (`src/index.ts`) — client: `ThemeProvider`, `useTheme`, the
  pre-paint bootstrap script builder, shared types. Must stay server-import-free.
- `start-theme/server` (`src/server.ts`) — `createThemeCookie()` helpers called
  from *inside* the consumer's `createServerFn` handlers. Must never be imported
  by client code.

**Flow:** consumer's root loader reads the cookie server-side → passes `theme`
into `ThemeProvider` → `ScriptOnce` emits a bootstrap script (src/script.ts)
that resolves `system` via `matchMedia` and applies the class/data-theme before
first paint → `setTheme` optimistically applies, POSTs via the consumer's server
function, then `router.invalidate()` re-runs loaders → cross-tab sync via
`BroadcastChannel`.

## Conventions

- Biome: tab indentation, double quotes, named exports only.
- Types shared by both entries live in `src/types.ts`.
- The bootstrap script (src/script.ts) is a plain string executed pre-paint.
  Keep it dependency-free and conservative JavaScript (no optional chaining on
  possibly-missing APIs without guards).
- CSP: `ScriptOnce` inherits `router.options.ssr.nonce` automatically — do not
  add a nonce prop.
- Zero runtime dependencies; peers are `@tanstack/react-start`,
  `@tanstack/react-router`, `react` 19.
