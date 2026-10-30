import { describe, expect, it } from "vitest";
import { buildThemeScript } from "../src/script";

describe("buildThemeScript", () => {
	const base = {
		attribute: "class",
		enableColorScheme: true,
		disableTransitionOnChange: false,
	} as const;

	it("wraps the body in an IIFE invoked with serialized params", () => {
		const script = buildThemeScript({ theme: "dark", ...base });
		expect(script.startsWith("(function(theme, attribute, colorScheme, disableTransitions){")).toBe(
			true,
		);
		expect(script.endsWith('["dark","class",true,false])')).toBe(true);
	});

	it("resolves system themes via matchMedia", () => {
		const script = buildThemeScript({ theme: "system", ...base });
		expect(script).toContain('matchMedia("(prefers-color-scheme: dark)")');
		expect(script).toContain('theme === "system"');
	});

	it("applies classes when attribute is class", () => {
		const script = buildThemeScript({ theme: "dark", ...base });
		expect(script).toContain('classList.remove("light", "dark")');
		expect(script).toContain("classList.add(resolved)");
	});

	it("applies data-theme when attribute is data-theme", () => {
		const script = buildThemeScript({
			theme: "dark",
			...base,
			attribute: "data-theme",
		});
		expect(script).toContain('setAttribute("data-theme", resolved)');
	});

	it("sets color-scheme and suppresses transitions when enabled", () => {
		const script = buildThemeScript({
			theme: "dark",
			...base,
			disableTransitionOnChange: true,
		});
		expect(script).toContain('style.setProperty("color-scheme"');
		expect(script).toContain("transition:none!important");
	});
});
