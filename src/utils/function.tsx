type CallSignature<T extends Function> = T extends (
	...args: infer Args
) => infer Ret
	? (...args: Args) => Ret
	: never;

type PropertyValue<T extends PropertyDescriptor> = T extends { value: infer V }
	? V
	: T extends { get: () => infer V }
		? V
		: never;

type ValueOf<T extends PropertyDescriptorMap> = {
	readonly [K in keyof T]: PropertyValue<T[K]>;
};

export type OmitFunctionProps<
	TFn extends Function,
	K extends string | number | symbol,
> = Omit<TFn, K> & CallSignature<TFn>;

export function extendFunction<
	const TFn extends Function,
	const TProps extends PropertyDescriptorMap & ThisType<TFn>,
>(
	fn: TFn,
	props: TProps,
): OmitFunctionProps<TFn, keyof TProps> & ValueOf<TProps> {
	Object.defineProperties(fn, props);
	return fn as TFn & ValueOf<TProps> & CallSignature<TFn>;
}
