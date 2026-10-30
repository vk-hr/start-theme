import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	ThemeProvider,
	useTheme,
	type ThemeProviderProps,
	type UseThemeReturn,
} from "../src/provider";
import { emitSystemChange, setSystemPrefersDark } from "./setup";

const invalidateRef = { current: vi.fn() };

beforeEach(() => {
	invalidateRef.current.mockReset();
});

vi.mock("@tanstack/react-router", () => ({
	ScriptOnce: () => null,
	useRouter: () => ({ invalidate: invalidateRef.current }),
}));

function renderTheme(props: ThemeProviderProps): {
	values: UseThemeReturn[];
} {
	const values: UseThemeReturn[] = [];
	function Probe() {
		const value = useTheme();
		values.push(value);
		return (
			<button type="button" onClick={() => value.setTheme("dark")}>
				switch
			</button>
		);
	}
	render(
		<ThemeProvider {...props}>
			<Probe />
		</ThemeProvider>,
	);
	return { values };
}

describe("ThemeProvider", () => {
	it("resolves explicit themes before effects, SSR-correct", () => {
		const { values } = renderTheme({ theme: "dark" });
		expect(values[0]?.theme).toBe("dark");
		expect(values[0]?.resolvedTheme).toBe("dark");
		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	it("leaves system unresolved on first render, resolves after mount", async () => {
		const { values } = renderTheme({ theme: "system" });
		expect(values[0]?.resolvedTheme).toBeNull();
		await waitFor(() => expect(values.at(-1)?.resolvedTheme).toBe("light"));
		expect(document.documentElement.classList.contains("light")).toBe(true);
		expect(values.at(-1)?.systemTheme).toBe("light");
	});

	it("persists via setThemeFn and invalidates loaders by default", async () => {
		const setThemeFn = vi.fn(async () => {});
		renderTheme({ theme: "system", setThemeFn });
		fireEvent.click(screen.getByRole("button"));
		expect(document.documentElement.classList.contains("dark")).toBe(true);
		expect(setThemeFn).toHaveBeenCalledWith("dark");
		await waitFor(() => expect(invalidateRef.current).toHaveBeenCalled());
	});

	it("skips invalidation when invalidate is false", async () => {
		const setThemeFn = vi.fn(async () => {});
		renderTheme({ theme: "system", setThemeFn, invalidate: false });
		fireEvent.click(screen.getByRole("button"));
		await waitFor(() => expect(setThemeFn).toHaveBeenCalled());
		expect(invalidateRef.current).not.toHaveBeenCalled();
	});

	it("supports the data-theme attribute", () => {
		renderTheme({ theme: "light", attribute: "data-theme" });
		expect(document.documentElement.getAttribute("data-theme")).toBe("light");
		fireEvent.click(screen.getByRole("button"));
		expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
	});

	it("reacts to system preference changes", async () => {
		renderTheme({ theme: "system" });
		setSystemPrefersDark(true);
		act(() => emitSystemChange());
		await waitFor(() =>
			expect(document.documentElement.classList.contains("dark")).toBe(true),
		);
	});

	it("syncs across tabs via BroadcastChannel", async () => {
		const first = renderTheme({ theme: "light" });
		const second = renderTheme({ theme: "light" });
		fireEvent.click(screen.getAllByRole("button")[0] as HTMLButtonElement);
		await waitFor(() => expect(second.values.at(-1)?.theme).toBe("dark"));
		expect(first.values.at(-1)?.theme).toBe("dark");
	});

	it("suppresses transitions on change when enabled", async () => {
		renderTheme({ theme: "light", disableTransitionOnChange: true });
		fireEvent.click(screen.getByRole("button"));
		const style = document.head.querySelector("style");
		expect(style?.textContent).toContain("transition:none");
		await new Promise<void>((resolve) => {
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					resolve();
				});
			});
		});
		expect(document.head.querySelector("style")).toBeNull();
	});
});
