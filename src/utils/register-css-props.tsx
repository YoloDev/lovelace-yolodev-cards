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

export const registerCssProp = (prop: PropertyDefinition) => {
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
	for (const prop of props) {
		registerCssProp(prop);
	}
};
