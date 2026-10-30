import { ScriptOnce, useRouter } from "@tanstack/react-router";
import * as React from "react";
import { applyTheme, suppressTransitions, type ThemeAttribute } from "./dom";
import { buildThemeScript } from "./script";
import { isTheme, type ResolvedTheme, type Theme } from "./types";

export interface ThemeProviderProps extends React.PropsWithChildren {
	/** Current theme — pass the value your root loader read from the cookie. */
	theme: Theme;
	/**
	 * Server function that persists the theme cookie. Created in your app with
	 * `createServerFn` — e.g. `setTheme` from `start-theme/server` helpers.
	 */
	setThemeFn?: (theme: Theme) => Promise<unknown> | unknown;
	/** Re-run loaders after persisting (`router.invalidate()`). Default `true`. */
	invalidate?: boolean;
	/** Where the resolved theme is written on `<html>`. Default `"class"`. */
	attribute?: ThemeAttribute;
	/** Set `color-scheme` on `<html>` for native UI (scrollbars, form controls). Default `true`. */
	enableColorScheme?: boolean;
	/** Suppress CSS transitions while switching. Default `false`. */
	disableTransitionOnChange?: boolean;
	/** Name of the cross-tab `BroadcastChannel`. Default `"start-theme"`. */
	channelName?: string;
}

export interface UseThemeReturn {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	/** Resolved theme. `null` while `"system"` is unresolved (server render). */
	resolvedTheme: ResolvedTheme | null;
	/** OS preference. `null` on the server. */
	systemTheme: ResolvedTheme | null;
}

const ThemeContext = React.createContext<UseThemeReturn | null>(null);

export function ThemeProvider({
	children,
	theme: initialTheme,
	setThemeFn,
	invalidate = true,
	attribute = "class",
	enableColorScheme = true,
	disableTransitionOnChange = false,
	channelName = "start-theme",
}: ThemeProviderProps) {
	const router = useRouter();
	const [theme, setThemeState] = React.useState<Theme>(initialTheme);
	const [resolvedTheme, setResolvedTheme] =
		React.useState<ResolvedTheme | null>(
			initialTheme === "system" ? null : initialTheme,
		);
	const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme | null>(
		null,
	);
	const channelRef = React.useRef<BroadcastChannel | null>(null);

	React.useEffect(() => {
		const media = window.matchMedia("(prefers-color-scheme: dark)");

		function update() {
			const system = media.matches ? "dark" : "light";
			const resolved = theme === "system" ? system : theme;
			applyTheme(resolved, { attribute, enableColorScheme });
			setResolvedTheme(resolved);
			setSystemTheme(system);
		}

		media.addEventListener("change", update);
		update();

		return () => media.removeEventListener("change", update);
	}, [theme, attribute, enableColorScheme]);

	React.useEffect(() => {
		if (typeof BroadcastChannel === "undefined") {
			return;
		}
		const channel = new BroadcastChannel(channelName);
		channel.onmessage = (event) => {
			if (isTheme(event.data)) {
				setThemeState(event.data);
			}
		};
		channelRef.current = channel;

		return () => {
			channelRef.current = null;
			channel.close();
		};
	}, [channelName]);

	function setTheme(next: Theme) {
		setThemeState(next);
		if (disableTransitionOnChange) {
			suppressTransitions();
		}
		const system = window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light";
		const resolved = next === "system" ? system : next;
		applyTheme(resolved, { attribute, enableColorScheme });
		setResolvedTheme(resolved);
		setSystemTheme(system);
		if (setThemeFn) {
			Promise.resolve(setThemeFn(next))
				.then(() => {
					if (invalidate) {
						router.invalidate();
					}
				})
				.catch((error) => {
					console.error("start-theme: failed to persist theme", error);
				});
		}
		channelRef.current?.postMessage(next);
	}

	return (
		<ThemeContext value={{ theme, setTheme, resolvedTheme, systemTheme }}>
			<ScriptOnce>
				{buildThemeScript({
					theme: initialTheme,
					attribute,
					enableColorScheme,
					disableTransitionOnChange,
				})}
			</ScriptOnce>
			{children}
		</ThemeContext>
	);
}

export function useTheme(): UseThemeReturn {
	const context = React.use(ThemeContext);
	if (!context) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}
