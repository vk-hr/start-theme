export const themes = ["light", "dark", "system"] as const;

export type Theme = (typeof themes)[number];

export type ResolvedTheme = Exclude<Theme, "system">;

export function isTheme(value: unknown): value is Theme {
	return (
		typeof value === "string" && (themes as readonly string[]).includes(value)
	);
}
