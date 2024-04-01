import { context, type Plugin } from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";
import { icuPlugin } from "./plugins/icu.mjs";
import { tailwindPlugin } from "./plugins/tailwind.mjs";

const createContext = async (...extraPlugins: Plugin[]) => {
	const ctx = await context({
		entryPoints: ["./src/yolodev-cards.tsx"],
		bundle: true,
		outdir: "dist/",
		plugins: [solidPlugin(), icuPlugin, tailwindPlugin, ...extraPlugins],
		sourcemap: "external",
		splitting: true,
		format: "esm",
	});

	return ctx;
};

export default createContext;
