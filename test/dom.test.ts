import { describe, expect, it } from "vitest";
import { applyTheme, suppressTransitions } from "../src/dom";

const doubleRaf = () =>
	new Promise<void>((resolve) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				resolve();
			});
		});
	});

describe("applyTheme", () => {
	it("adds the resolved class and removes the other", () => {
		document.documentElement.classList.add("light");
		applyTheme("dark", { attribute: "class", enableColorScheme: true });
		expect(document.documentElement.classList.contains("dark")).toBe(true);
		expect(document.documentElement.classList.contains("light")).toBe(false);
	});

	it("sets data-theme when attribute is data-theme", () => {
		applyTheme("light", { attribute: "data-theme", enableColorScheme: true });
		expect(document.documentElement.getAttribute("data-theme")).toBe("light");
	});

	it("sets color-scheme when enabled", () => {
		applyTheme("dark", { attribute: "class", enableColorScheme: true });
		expect(document.documentElement.style.getPropertyValue("color-scheme")).toBe(
			"dark",
		);
	});

	it("leaves color-scheme untouched when disabled", () => {
		applyTheme("dark", { attribute: "class", enableColorScheme: false });
		expect(document.documentElement.style.getPropertyValue("color-scheme")).toBe(
			"",
		);
	});
});

describe("suppressTransitions", () => {
	it("injects a style element and removes it after two frames", async () => {
		suppressTransitions();
		const style = document.head.querySelector("style");
		expect(style?.textContent).toContain("transition:none");
		await doubleRaf();
		expect(document.head.querySelector("style")).toBeNull();
	});
});
