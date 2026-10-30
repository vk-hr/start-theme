import type { ResolvedTheme } from "./types";

export type ThemeAttribute = "class" | "data-theme";

export interface ApplyThemeOptions {
	attribute: ThemeAttribute;
	enableColorScheme: boolean;
}

/** Apply a resolved theme to `<html>`. Safe to call outside React. */
export function applyTheme(
	resolved: ResolvedTheme,
	options: ApplyThemeOptions,
): void {
	const root = document.documentElement;
	if (options.attribute === "class") {
		root.classList.remove("light", "dark");
		root.classList.add(resolved);
	} else {
		root.setAttribute("data-theme", resolved);
	}
	if (options.enableColorScheme) {
		root.style.setProperty("color-scheme", resolved);
	}
}

/**
 * Suppress CSS transitions for two animation frames, so a theme switch does
 * not animate every transition-capable element on the page.
 */
export function suppressTransitions(): void {
	const style = document.createElement("style");
	style.appendChild(
		document.createTextNode(
			"*,*::before,*::after{transition:none!important}",
		),
	);
	document.head.appendChild(style);
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			style.remove();
		});
	});
}
