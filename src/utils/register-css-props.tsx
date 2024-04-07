const UA = navigator.userAgent;
const isWebkit =
	/AppleWebKit/.test(UA) &&
	!/Edge\//.test(UA) &&
	!/Chrome\//.test(UA) &&
	!/Gecko\//.test(UA) &&
	!(window as any).MSStream;

const symbol = Symbol.for("yolodev:css:props-registry");
const registry = (() => {
	let registry: Map<string, PropertyDefinition> = (window as any)[symbol];
	if (!registry) {
		registry = new Map();
		(window as any)[symbol] = registry;
	}

	return registry;
})();

const warnIfNotEqual = (
	registered: PropertyDefinition,
	prop: PropertyDefinition,
) => {
	if (registered.syntax !== prop.syntax) {
		console.warn(
			`CSS property ${prop.name} is already registered with a different syntax.`,
		);
	}

	if (registered.inherits !== prop.inherits) {
		console.warn(
			`CSS property ${prop.name} is already registered with a different inherits value.`,
		);
	}

	if (registered.initialValue !== prop.initialValue) {
		console.warn(
			`CSS property ${prop.name} is already registered with a different initial value.`,
		);
	}
};

const isWebkitSafe = (name: string) => {
	switch (name) {
		case "--tw-shadow":
		case "--tw-inset-shadow":
			return true;

		default:
			return false;
	}
};

export const registerCssProp = (prop: PropertyDefinition) => {
	if (isWebkit && !isWebkitSafe(prop.name)) {
		console.warn(`Skipping unsafe CSS property ${prop.name}.`);
		return;
	}

	const existing = registry.get(prop.name);

	if (!existing) {
		try {
			CSS.registerProperty(prop);
			registry.set(prop.name, prop);
		} catch {
			console.warn(`Failed to register CSS property ${prop.name}.`);
		}
		return;
	}

	warnIfNotEqual(existing, prop);
};

export const registerCssProps = (props: readonly PropertyDefinition[]) => {
	console.log("webkit:", isWebkit);
	if (isWebkit) {
		console.warn(
			"CSS.registerProperty crashes WebKit - so we're only registering a known set of safe value.",
		);
	}

	for (const prop of props) {
		registerCssProp(prop);
	}
};
