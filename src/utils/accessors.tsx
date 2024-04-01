import { createMemo, type Accessor, type MemoOptions } from "solid-js";
import { ExtensibleFunction } from "./function";

export class ExtensibleAccessor<const T> extends ExtensibleFunction<
	Accessor<T>
> {
	constructor(accessor: Accessor<T>) {
		super(accessor);
	}

	memo(options?: MemoOptions<T>): MemoizedAccessor<T> {
		return new MemoizedAccessor(createMemo(this, void 0, options));
	}

	map<U>(fn: (value: T) => U): ExtensibleAccessor<U> {
		return new ExtensibleAccessor(() => fn(this()));
	}
}

export class MemoizedAccessor<const T> extends ExtensibleAccessor<T> {
	constructor(accessor: Accessor<T>) {
		super(accessor);
	}

	// already memoized
	memo(): this {
		return this;
	}
}
