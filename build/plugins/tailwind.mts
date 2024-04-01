import type { Plugin } from "esbuild";
import postcss from "postcss";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const unwrap = (value: string) => {
	if (value.startsWith('"') && value.endsWith('"')) {
		return value.slice(1, -1);
	}

	if (value.startsWith("'") && value.endsWith("'")) {
		return value.slice(1, -1);
	}

	return value;
};

const stripQuery = (path: string) => path.split("?", 2)[0];

export const tailwindPlugin: Plugin = {
	name: "tailwind",
	setup: (build) => {
		const processor = postcss([require("@tailwindcss/postcss")()]);

		// Resolve *.css files with file namespace
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
				sideEffects: false,
			};
		});

		// Resolve *.css?path with file namespace
		build.onResolve(
			{ filter: /\.css\?path$/, namespace: "file" },
			async (args) => {
				const { contents } = args.pluginData;

				return {
					path: stripQuery(args.path),
					namespace: "css-path",
					watchFiles: [args.path],
					pluginData: {
						contents,
					},
				};
			},
		);

		// Resolve *.css?properties with file namespace
		build.onResolve(
			{ filter: /\.css\?properties$/, namespace: "file" },
			async (args) => {
				const { properties } = args.pluginData;

				return {
					path: stripQuery(args.path),
					namespace: "css-properties",
					watchFiles: [args.path],
					pluginData: {
						properties,
					},
				};
			},
		);

		// Build *.css files
		build.onLoad({ filter: /\.css$/, namespace: "file" }, async (args) => {
			const contents = await fs.readFile(args.path, { encoding: "utf-8" });
			const dir = path.dirname(args.path);

			const result = await processor.process(contents, { from: args.path });
			const properties: PropertyDefinition[] = [];
			result.root.walkAtRules("property", (rule) => {
				const name = rule.params;
				const definition: PropertyDefinition = {
					name,
					inherits: false,
				};

				rule.walkDecls((decl) => {
					if (decl.prop === "inherits") {
						definition.inherits = decl.value === "true";
					}

					if (decl.prop === "initial-value") {
						definition.initialValue = decl.value;
					}

					if (decl.prop === "syntax") {
						definition.syntax = unwrap(decl.value);
					}
				});

				properties.push(definition);
				rule.remove();
			});

			const resultContents = result.root.toResult().css;
			const context = {
				properties,
				contents: resultContents,
			};

			return {
				contents: [
					`export { default as path } from "${args.path}?path"`,
					`export { default as properties } from "${args.path}?properties"`,
				].join("\n"),
				loader: "ts",
				resolveDir: dir,
				pluginData: context,
			};
		});

		// Load css-path:* files
		build.onLoad({ filter: /.*/, namespace: "css-path" }, async (args) => {
			const { contents } = args.pluginData;

			return {
				contents,
				loader: "file",
			};
		});

		// Load css-properties:* files
		build.onLoad(
			{ filter: /.*/, namespace: "css-properties" },
			async (args) => {
				const { properties } = args.pluginData;

				return {
					contents: JSON.stringify(properties),
					loader: "json",
				};
			},
		);
	},
};
