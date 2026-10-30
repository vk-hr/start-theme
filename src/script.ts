import type { ThemeAttribute } from "./dom";
import type { Theme } from "./types";

export interface ThemeScriptOptions {
	theme: Theme;
	attribute: ThemeAttribute;
	enableColorScheme: boolean;
	disableTransitionOnChange: boolean;
}

/**
 * Build the inline bootstrap script that resolves and applies the theme
 * before first paint. Runs during SSR via `ScriptOnce` (which also forwards
 * the router's CSP nonce), then removes itself from the DOM.
 */
export function buildThemeScript(options: ThemeScriptOptions): string {
	const params = JSON.stringify([
		options.theme,
		options.attribute,
		options.enableColorScheme,
		options.disableTransitionOnChange,
	]);
	return `(function(theme, attribute, colorScheme, disableTransitions){
var root = document.documentElement;
var media = window.matchMedia("(prefers-color-scheme: dark)");
var resolved = theme === "system" ? (media.matches ? "dark" : "light") : theme;
if (disableTransitions) {
var style = document.createElement("style");
style.appendChild(document.createTextNode("*,*::before,*::after{transition:none!important}"));
document.head.appendChild(style);
window.requestAnimationFrame(function(){
window.requestAnimationFrame(function(){ style.remove(); });
});
}
if (attribute === "class") {
root.classList.remove("light", "dark");
root.classList.add(resolved);
} else {
root.setAttribute("data-theme", resolved);
}
if (colorScheme) { root.style.setProperty("color-scheme", resolved); }
})(${params})`;
}
