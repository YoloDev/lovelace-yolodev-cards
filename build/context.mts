import { context, type Plugin } from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";
import postcss from "postcss";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const tailwindPlugin: Plugin = {
	name: "tailwind",
	setup: (build) => {
		const processor = postcss([require("@tailwindcss/postcss")()]);

		// Resolve *.css files with namespace
		build.onResolve({ filter: /\.css$/, namespace: "file" }, async (args) => {
			const pathResolve = await build.resolve(args.path, {
				kind: args.kind,
				importer: args.importer,
				resolveDir: args.resolveDir,
				pluginData: args.pluginData,
			});
			const filePath = pathResolve.path;

			return {
				path: filePath,
				watchFiles: [filePath],
			};
		});

		// Build *.css files
		build.onLoad({ filter: /\.css$/, namespace: "file" }, async (args) => {
			const contents = await fs.readFile(args.path, { encoding: "utf-8" });
			const dir = path.dirname(args.path);

			const result = await processor.process(contents, { from: args.path });
			return {
				contents: result.css,
				loader: "file",
				resolveDir: dir,
			};
		});
	},
};

const ctx = await context({
	entryPoints: ["./src/yolodev-cards.tsx"],
	bundle: true,
	outdir: "dist/",
	plugins: [solidPlugin(), tailwindPlugin],
	sourcemap: "external",
	splitting: true,
	format: "esm",
});

export default ctx;
