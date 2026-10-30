import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/server.ts"],
	format: "esm",
	dts: true,
	sourcemap: true,
	platform: "neutral",
	target: "es2022",
});
