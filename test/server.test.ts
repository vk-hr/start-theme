import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start/server", () => ({
	getCookie: vi.fn(),
	setCookie: vi.fn(),
}));

import { getCookie, setCookie } from "@tanstack/react-start/server";
import { createThemeCookie } from "../src/server";

const getCookieMock = vi.mocked(getCookie);
const setCookieMock = vi.mocked(setCookie);

describe("createThemeCookie", () => {
	beforeEach(() => {
		getCookieMock.mockReset();
		setCookieMock.mockReset();
	});

	describe("read", () => {
		it("falls back to the default theme when the cookie is missing", () => {
			getCookieMock.mockReturnValue(undefined);
			expect(createThemeCookie().read()).toBe("system");
		});

		it("falls back to the default theme on an invalid value", () => {
			getCookieMock.mockReturnValue("blue");
			expect(createThemeCookie().read()).toBe("system");
		});

		it("returns the cookie value when valid", () => {
			getCookieMock.mockReturnValue("dark");
			expect(createThemeCookie().read()).toBe("dark");
		});

		it("uses the configured default theme", () => {
			getCookieMock.mockReturnValue(undefined);
			expect(createThemeCookie({ defaultTheme: "light" }).read()).toBe(
				"light",
			);
		});
	});

	describe("write", () => {
		it("writes hardened cookie defaults", () => {
			createThemeCookie().write("dark");
			expect(setCookieMock).toHaveBeenCalledWith("theme", "dark", {
				path: "/",
				maxAge: 31536000,
				sameSite: "lax",
				secure: false,
			});
		});

		it("honors configured options", () => {
			createThemeCookie({
				key: "_preferred-theme",
				maxAge: 60,
				sameSite: "strict",
				secure: true,
				domain: "example.com",
			}).write("light");
			expect(setCookieMock).toHaveBeenCalledWith(
				"_preferred-theme",
				"light",
				{
					path: "/",
					maxAge: 60,
					sameSite: "strict",
					secure: true,
					domain: "example.com",
				},
			);
		});
	});

	describe("validate", () => {
		it("passes valid themes through", () => {
			expect(createThemeCookie().validate("light")).toBe("light");
		});

		it("throws on invalid input", () => {
			expect(() => createThemeCookie().validate("blue")).toThrow(TypeError);
			expect(() => createThemeCookie().validate(42)).toThrow(/Expected one of/);
			expect(() => createThemeCookie().validate(undefined)).toThrow(/Invalid theme/);
		});
	});

	it("exposes the configured key and default", () => {
		const cookie = createThemeCookie({ key: "_preferred-theme" });
		expect(cookie.key).toBe("_preferred-theme");
		expect(cookie.defaultTheme).toBe("system");
	});
});
