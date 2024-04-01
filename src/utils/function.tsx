// TypeScript really doesn't like this - so we need to work around the fact that we can't extend Function directly.
interface ExtensibleFunctionConstructor {
	new <const T extends Function>(fn: T): T;
}

export const ExtensibleFunction: ExtensibleFunctionConstructor =
	class ExtensibleFunction extends Function {
		constructor(fn: Function) {
			return Object.setPrototypeOf(fn, new.target.prototype);

			// typescript requires a super call in the constructor - even though it's not needed
			super();
		}
	} as any;
