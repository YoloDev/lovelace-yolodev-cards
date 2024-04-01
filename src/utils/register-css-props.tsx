const symbol = Symbol.for("yolodev:css:props-registry");
const registry = (() => {
	let registry: Map<string, PropertyDefinition> = (window as any)[symbol];
	if (!registry) {
		registry = new Map();
		(window as any)[symbol] = registry;
	}

	return registry;
})();

const assertEqual = (
	registered: PropertyDefinition,
	prop: PropertyDefinition,
) => {
	if (registered.syntax !== prop.syntax) {
		throw new Error(
			`CSS property ${prop.name} is already registered with a different syntax.`,
		);
	}

	if (registered.inherits !== prop.inherits) {
		throw new Error(
			`CSS property ${prop.name} is already registered with a different inherits value.`,
		);
	}

	if (registered.initialValue !== prop.initialValue) {
		throw new Error(
			`CSS property ${prop.name} is already registered with a different initial value.`,
		);
	}
};

export const registerCssProp = (prop: PropertyDefinition) => {
	const existing = registry.get(prop.name);

	if (!existing) {
		CSS.registerProperty(prop);
		registry.set(prop.name, prop);
		return;
	}

	assertEqual(existing, prop);
};

export const registerCssProps = (props: readonly PropertyDefinition[]) => {
	for (const prop of props) {
		registerCssProp(prop);
	}
};
