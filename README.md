# start-theme

[![npm version](https://img.shields.io/npm/v/start-theme.svg)](https://www.npmjs.com/package/start-theme)
[![npm downloads](https://img.shields.io/npm/dm/start-theme.svg)](https://www.npmjs.com/package/start-theme)
[![bundle size](https://img.shields.io/bundlephobia/minzip/start-theme)](https://bundlephobia.com/package/start-theme)
[![CI](https://github.com/vk-hr/start-theme/actions/workflows/ci.yml/badge.svg)](https://github.com/vk-hr/start-theme/actions/workflows/ci.yml)
[![provenance](https://shields.io/badge/published%20with-provenance-11B7A5?logo=npm)](https://docs.npmjs.com/generating-provenance-statements)
[![License: MIT](https://img.shields.io/npm/l/start-theme.svg)](./LICENSE)

SSR-driven theming for [TanStack Start](https://tanstack.com/start). The theme
lives in a **cookie**, so the server always knows it.

Most theme libraries keep the theme in `localStorage`. That means the server
never knows the theme: SSR markup is rendered against a guess, theme-dependent
markup hydrates wrong, and you sprinkle `suppressHydrationWarning` over your
root. `start-theme` takes the other road — the theme is a cookie read in your
root loader, so it is real server state:

- **No flash of the wrong theme** — an inline bootstrap script (via TanStack
  Router's `ScriptOnce`) applies the theme class before first paint.
- **SSR-correct `resolvedTheme`** — explicit themes are resolved on the server;
  only `system` waits for `matchMedia`.
- **Loaders stay honest** — switching calls your server function, then
  `router.invalidate()`, so every loader re-runs against the new cookie.
- **System preference tracking** — follows `prefers-color-scheme` live.
- **Cross-tab sync** — switching in one tab updates the others (BroadcastChannel).
- **`color-scheme` support** — native scrollbars and form controls follow.
- **Strict-CSP friendly** — the bootstrap script inherits your router's
  `ssr.nonce` automatically.
- Zero dependencies. Peers: `@tanstack/react-start`, `@tanstack/react-router`,
  React 19.

## Install

```bash
bun add start-theme
# or npm/pnpm/yarn
```

## Quick start

**1. Create the server functions in your app** (`src/theme.ts`).
`createServerFn` calls must live in application source — TanStack Start's
compiler transforms them at build time, so a package can't ship them for you:

```ts
import { createServerFn } from "@tanstack/react-start";
import { createThemeCookie } from "start-theme/server";

const themeCookie = createThemeCookie({ key: "_preferred-theme" });

export const getTheme = createServerFn().handler(() => themeCookie.read());

export const setTheme = createServerFn({ method: "POST" })
	.inputValidator(themeCookie.validate)
	.handler(({ data }) => themeCookie.write(data));
```

**2. Read it in your root loader and wrap your app:**

```tsx
// src/routes/__root.tsx
import { ThemeProvider } from "start-theme";
import { getTheme, setTheme } from "#/theme";

export const Route = createRootRouteWithContext<...>()({
	loader: () => getTheme(),
	component: RootComponent,
});

function RootComponent() {
	const theme = Route.useLoaderData();
	return (
		<ThemeProvider theme={theme} setThemeFn={setTheme}>
			<Outlet />
		</ThemeProvider>
	);
}
```

**3. Switch it anywhere:**

> **Note:** add `suppressHydrationWarning` to your root `<html>` element. The
> bootstrap script intentionally applies the theme class and `color-scheme`
> before React hydrates, and React would otherwise warn that those attributes
> differ from the server-rendered markup.

```tsx
import { useTheme } from "start-theme";

function ThemeSwitcher() {
	const { theme, setTheme, resolvedTheme } = useTheme();
	// theme: "light" | "dark" | "system"
	// resolvedTheme: "light" | "dark" | null (null while "system" is unresolved)
	return <button onClick={() => setTheme("dark")}>Dark</button>;
}
```

## How it works

1. Your root loader calls `getTheme` → the cookie is read on the server.
2. The server renders `ThemeProvider` with that value; `ScriptOnce` emits a
   tiny inline script that resolves `system` via `matchMedia` and applies the
   class (or `data-theme`) to `<html>` **before first paint**, then removes
   itself.
3. `setTheme` applies the change optimistically, POSTs to your server function
   (cookie is written with `Path=/`, `Max-Age` 1y, `SameSite=Lax`,
   `Secure` in production), broadcasts to other tabs, then
   `router.invalidate()` re-runs your loaders against the new cookie.

## API

### `ThemeProvider`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `theme` | `"light" \| "dark" \| "system"` | required | Value from your root loader. |
| `setThemeFn` | `(theme) => Promise \| unknown` | — | Your `setTheme` server function. Without it, switching is client-only. |
| `invalidate` | `boolean` | `true` | Re-run loaders after persisting. |
| `attribute` | `"class" \| "data-theme"` | `"class"` | Where the resolved theme is written on `<html>`. |
| `enableColorScheme` | `boolean` | `true` | Set `color-scheme` on `<html>`. |
| `disableTransitionOnChange` | `boolean` | `false` | Suppress transitions during switches. |
| `channelName` | `string` | `"start-theme"` | Cross-tab `BroadcastChannel` name. |

### `useTheme()`

```ts
const { theme, setTheme, resolvedTheme, systemTheme } = useTheme();
```

- `theme` — the selected theme (`"light" | "dark" | "system"`).
- `setTheme` — switch theme (optimistic + persisted).
- `resolvedTheme` — `"light" | "dark" | null`; `null` only while `theme` is
  `"system"` and the client hasn't resolved it yet (SSR render).
- `systemTheme` — the OS preference; `null` on the server.

### `start-theme/server`

```ts
createThemeCookie(options?: ThemeCookieOptions): ThemeCookie
```

| Option | Type | Default |
| --- | --- | --- |
| `key` | `string` | `"theme"` |
| `defaultTheme` | `Theme` | `"system"` |
| `maxAge` | seconds | `31536000` (1 year) |
| `path` | `string` | `"/"` |
| `domain` | `string` | — |
| `sameSite` | `"lax" \| "strict" \| "none"` | `"lax"` |
| `secure` | `boolean` | `NODE_ENV === "production"` |

`ThemeCookie.read()` / `.write(theme)` — call inside `createServerFn` handlers.
`.validate(value)` — throws on invalid input; pass it directly to
`.inputValidator()`.

## CSP

The bootstrap script is inline but rendered through `ScriptOnce`, which
forwards your router's nonce. For a strict Content-Security-Policy, set
`ssr.nonce` on your router — no package-level configuration needed.

## Why a cookie instead of localStorage?

Because the server renders HTML. A localStorage theme is invisible server-side,
so SSR markup (theme-aware meta tags, server-rendered UI variants, color-scheme
hints) is always one hydration behind. A cookie rides every request — the
server knows the theme on the very first byte. The trade-off: the cookie is
sent with each request (a few bytes) and requires a server round-trip to
persist (amortized with optimistic updates).

## Roadmap

- Resolving `system` server-side via the `Sec-CH-Prefers-Color-Scheme` client
  hint (Chromium) with the script as fallback.
- Custom named themes beyond `light` / `dark`.

## License

MIT
