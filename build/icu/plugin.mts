import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import { type PartialMessage, type Plugin, type Location } from "esbuild";
import YAML, { LineCounter } from "yaml";
import { bcp47Normalize } from "bcp-47-normalize";
import {
	type Message,
	parseCST,
	messageFromCST,
	validate,
	MessageDataModelError,
} from "messageformat";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const createIcuFile = path.resolve(__dirname, "../../src/icu/create-icu.mts");

export const icuPlugin: Plugin = {
	name: "icu",
	setup: (build) => {
		build.onResolve({ filter: /\.icu$/ }, async (args) => {
			const pathResolve = await build.resolve(args.path + ".yml", {
				kind: args.kind,
				importer: args.importer,
				resolveDir: args.resolveDir,
				pluginData: args.pluginData,
			});
			const filePath = pathResolve.path;

			return {
				path: filePath,
				watchFiles: [filePath],
				namespace: "icu",
				sideEffects: false,
			};
		});

		build.onResolve(
			{ filter: /^create-icu$/, namespace: "icu" },
			async (args) => {
				return {
					path: createIcuFile,
					namespace: "file",
					watchFiles: [createIcuFile],
				};
			},
		);

		build.onLoad({ filter: /\.yml$/, namespace: "icu" }, async (args) => {
			const yamlText = await fs.readFile(args.path, { encoding: "utf-8" });
			const lines = new LineProvider(yamlText);
			const doc = YAML.parseDocument(yamlText, {
				keepSourceTokens: true,
				lineCounter: lines,
			});

			const errors: PartialMessage[] = [];
			const contents = parseDoc(doc, errors, args.path, lines);

			return {
				contents,
				loader: "ts",
				errors,
			};
		});
	},
};

class LineProvider extends LineCounter {
	readonly #text: string;
	#lines: string[] | null = null;

	constructor(text: string) {
		super();
		this.#text = text;
	}

	getLine(line: number): string | undefined {
		if (!this.#lines) {
			this.#lines = this.#computeLines();
		}

		return this.#lines[line - 1];
	}

	#computeLines(): string[] {
		const indices = this.lineStarts;
		const lines = [];

		for (let i = 0; i < indices.length; i++) {
			const start = indices[i];
			const end = indices[i + 1] - 1 ?? this.#text.length - 1;
			lines.push(this.#text.slice(start, end));
		}

		return lines;
	}
}

const parseDoc = (
	doc: YAML.Document,
	errors: PartialMessage[],
	file: string,
	lines: LineProvider,
) => {
	const ts = [`import { createIcu } from 'create-icu';`];
	const names: string[] = [];

	const root = doc.contents!;
	if (!YAML.isMap(root)) {
		const location = toLocation(file, root, lines);
		errors.push({
			text: "document root must be a map",
			location,
		});

		return ts.join("\n");
	}

	for (const kvp of root.items) {
		const key = kvp.key;
		const value = kvp.value;

		if (!YAML.isScalar(key)) {
			const location = toLocation(file, key as YAML.Node, lines);
			errors.push({
				text: "message key must be a string",
				location,
			});
			continue;
		}

		if (typeof key.value !== "string") {
			const location = toLocation(file, key, lines);
			errors.push({
				text: "message key must be a string",
				location,
			});
			continue;
		}

		if (!YAML.isMap(value)) {
			const location = toLocation(file, value as YAML.Node, lines);
			errors.push({
				text: `message value for ${key.value} must be a map`,
				location,
			});
			continue;
		}

		parseMessageObject(key.value, value, errors, file, lines, ts, names);
	}

	ts.push(`export default { ${names.join(", ")} };`);
	return ts.join("\n");
};

const parseMessageObject = (
	name: string,
	value: YAML.YAMLMap,
	errors: PartialMessage[],
	file: string,
	lines: LineProvider,
	ts: string[],
	names: string[],
) => {
	const locales = new Map<string, Message>();

	for (const kvp of value.items) {
		const key = kvp.key;
		const value = kvp.value;

		if (!YAML.isScalar(key)) {
			const location = toLocation(file, key as YAML.Node, lines);
			errors.push({
				text: `locale key for ${name} must be a string`,
				location,
			});
			continue;
		}

		if (typeof key.value !== "string") {
			const location = toLocation(file, key, lines);
			errors.push({
				text: `locale key for ${name} must be a string`,
				location,
			});
			continue;
		}

		if (!YAML.isScalar(value)) {
			const location = toLocation(file, value as YAML.Node, lines);
			errors.push({
				text: `locale value for ${name}.${key.value} must be a string`,
				location,
			});
			continue;
		}

		if (typeof value.value !== "string") {
			const location = toLocation(file, key, lines);
			errors.push({
				text: `locale value for ${name}.${key.value} must be a string`,
				location,
			});
			continue;
		}

		const locale = bcp47Normalize(key.value);
		if (locales.has(locale)) {
			const location = toLocation(file, key, lines);
			errors.push({
				text: `duplicate locale ${locale} for message ${name}`,
				location,
			});
			continue;
		}

		const cst = parseCST(value.value);
		const model = messageFromCST(cst);
		locales.set(locale, model);

		validate(model, (type, model) => {
			const error = new MessageDataModelError(type, model);
			const location = toLocation(file, value, lines, error);
			errors.push({
				text: error.message,
				location,
			});
		});
	}

	const result = [...locales].map((kvp) => ({
		locale: kvp[0],
		message: kvp[1],
	}));

	ts.push(`const ${name} = createIcu(${JSON.stringify(result)});`);
	names.push(name);
};

const toLocation = (
	file: string,
	node: YAML.Node,
	lines: LineProvider,
	inner?: { start: number; end: number },
): Partial<Location> | null => {
	if (!("range" in node)) {
		return null;
	}

	let range: readonly [number, number, number?] | undefined | null = node.range;
	if (!range) {
		return null;
	}

	if (inner && inner.start >= 0 && inner.end >= 0 && YAML.isScalar(node)) {
		if (node.type === "BLOCK_LITERAL") {
			const cst = node.srcToken! as YAML.CST.BlockScalar;
			const original = cst.source;
			const lastProp = cst.props[cst.props.length - 1];
			let offset = lastProp.offset;
			if ("source" in lastProp) {
				offset += lastProp.source.length;
			}
			const indentation = countLeading(original, " ");
			const start = calculateTrueOffset(
				inner.start,
				node.value as string,
				indentation,
			);
			const end = calculateTrueOffset(
				inner.end,
				node.value as string,
				indentation,
			);
			range = [offset + start, offset + end];
		} else {
			range = [range[0] + inner.start, range[0] + inner.end];
		}
	}

	const pos = lines.linePos(range[0]);
	const length = range[1] - range[0];
	return {
		file,
		namespace: "file",
		line: pos.line,
		lineText: lines.getLine(pos.line),
		column: pos.col - 1,
		length,
	};
};

const countLeading = (text: string, char: string): number => {
	let count = 0;
	while (text[count] === char) {
		count++;
	}

	return count;
};

const calculateTrueOffset = (
	offset: number,
	text: string,
	indentation: number,
): number => {
	let newLineCount = 1;
	for (let i = 0; i < offset; i++) {
		if (text[i] === "\n") {
			newLineCount++;
		}
	}

	return offset + newLineCount * indentation;
};
