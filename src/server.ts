import { getCookie, setCookie } from "@tanstack/react-start/server";
import { isTheme, themes, type Theme } from "./types";

const YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export interface ThemeCookieOptions {
	/** Cookie name. Default `"theme"`. */
	key?: string;
	/** Theme used when the cookie is missing or invalid. Default `"system"`. */
	defaultTheme?: Theme;
	/** Cookie `Max-Age` in seconds. Default one year. */
	maxAge?: number;
	/** Cookie `Path`. Default `"/"`. */
	path?: string;
	/** Cookie `Domain`. */
	domain?: string;
	/** Cookie `SameSite`. Default `"lax"`. */
	sameSite?: "lax" | "strict" | "none";
	/** Cookie `Secure`. Default `true` when `NODE_ENV === "production"`. */
	secure?: boolean;
}

export interface ThemeCookie {
	readonly key: string;
	readonly defaultTheme: Theme;
	/** Read the theme cookie. Call from inside a `createServerFn` handler. */
	read(): Theme;
	/** Write the theme cookie with hardened defaults. Call from inside a `createServerFn` handler. */
	write(theme: Theme): void;
	/** Validate untrusted input. Throws on anything but `"light" | "dark" | "system"`. Usable as `inputValidator`. */
	validate(value: unknown): Theme;
}

/**
 * Cookie persistence for a theme, built on TanStack Start's `getCookie` and
 * `setCookie`. Call `read`/`write` from server functions you create in your
 * own app — `createServerFn` calls must live in application source so the
 * TanStack Start compiler can transform them.
 *
 * ```ts
 * const themeCookie = createThemeCookie({ key: "_preferred-theme" });
 *
 * export const getTheme = createServerFn().handler(() => themeCookie.read());
 *
 * export const setTheme = createServerFn({ method: "POST" })
 * 	.inputValidator(themeCookie.validate)
 * 	.handler(({ data }) => themeCookie.write(data));
 * ```
 */
export function createThemeCookie(
	options: ThemeCookieOptions = {},
): ThemeCookie {
	const key = options.key ?? "theme";
	const defaultTheme = options.defaultTheme ?? "system";
	const attributes = {
		path: options.path ?? "/",
		maxAge: options.maxAge ?? YEAR_IN_SECONDS,
		sameSite: options.sameSite ?? "lax",
		secure: options.secure ?? process.env.NODE_ENV === "production",
		...(options.domain ? { domain: options.domain } : {}),
	};

	return {
		key,
		defaultTheme,
		read() {
			const value = getCookie(key);
			return isTheme(value) ? value : defaultTheme;
		},
		write(theme: Theme) {
			setCookie(key, theme, attributes);
		},
		validate(value: unknown): Theme {
			if (isTheme(value)) {
				return value;
			}
			throw new TypeError(
				`Invalid theme: ${JSON.stringify(value)}. Expected one of: ${themes.join(", ")}.`,
			);
		},
	};
}

export { isTheme, themes, type ResolvedTheme, type Theme } from "./types";
