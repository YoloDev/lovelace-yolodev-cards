import {
	createMemo,
	type Accessor,
	type MemoOptions,
	type EffectFunction,
	type NoInfer,
} from "solid-js";
import { type OmitFunctionProps, extendFunction } from "./function";

export interface BaseAccessor<T> extends Accessor<T> {
	memo(options?: MemoOptions<T>): MemoizedAccessor<T>;
	map<const U>(fn: (value: T) => U): BaseAccessor<U>;
}

const baseAccessor = {
	memo: {
		writable: false,
		enumerable: false,
		configurable: true,
		value: function memo<const T>(
			this: BaseAccessor<T>,
			options?: MemoOptions<T>,
		): MemoizedAccessor<T> {
			return createMemoAccessor(this, void 0, options);
		},
	},

	map: {
		writable: false,
		enumerable: false,
		configurable: true,
		value: function map<const T, const U>(
			this: BaseAccessor<T>,
			fn: (value: T) => U,
		): BaseAccessor<U> {
			const inner = this;
			return createBaseAccessor(() => fn(inner()));
		},
	},
} as const satisfies PropertyDescriptorMap;

export function createBaseAccessor<const T>(
	accessor: Accessor<T>,
): BaseAccessor<T> {
	return extendFunction(accessor, baseAccessor);
}

export interface MemoizedAccessor<T>
	extends OmitFunctionProps<BaseAccessor<T>, "memo"> {}

const memoAccessor = {
	memo: {
		writable: false,
		enumerable: false,
		configurable: true,
		value: function memo<T>(this: MemoizedAccessor<T>): MemoizedAccessor<T> {
			return this;
		},
	},
} as const satisfies PropertyDescriptorMap;

export function createMemoAccessor<
	const Next extends Prev,
	const Init = Next,
	const Prev = Next,
>(
	accessor: EffectFunction<undefined | NoInfer<Prev>, Next>,
): MemoizedAccessor<Next>;
export function createMemoAccessor<
	const Next extends Prev,
	const Init = Next,
	const Prev = Next,
>(
	fn: EffectFunction<Init | Prev, Next>,
	value: Init,
	options?: MemoOptions<Next>,
): MemoizedAccessor<Next>;
export function createMemoAccessor<
	const Next extends Prev,
	const Init,
	const Prev,
>(
	fn: EffectFunction<Init | Prev, Next>,
	value?: Init,
	options?: MemoOptions<Next>,
): MemoizedAccessor<Next> {
	const accessor = createMemo(fn as any, value, options);
	const base = createBaseAccessor(accessor);
	return extendFunction(base, memoAccessor);
}
