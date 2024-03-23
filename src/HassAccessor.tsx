import type { HassEntity } from "home-assistant-js-websocket";
import { Accessor, createMemo } from "solid-js";

class HassAccessor<T> {
	readonly #inner: Accessor<T | undefined>;

	constructor(inner: Accessor<T | undefined>) {
		this.#inner = inner;
	}

	get value(): T | undefined {
		return this.#inner();
	}

	map<U>(fn: (value: T) => U | undefined): HassAccessor<U> {
		const inner = this.#inner;
		const accessor = () => {
			const value = this.#inner();
			return value === undefined ? undefined : fn(value);
		};

		return new HassAccessor(createMemo(accessor));
	}
}

class HassEntityAccessor extends HassAccessor<HassEntity> {
	readonly #state: HassAccessor<string>;
	readonly #attributes: Map<string, HassAccessor<string>> = new Map();

	constructor(inner: Accessor<HassEntity | undefined>) {
		super(inner);

		this.#state = this.map((entity) => entity.state);
	}

	get stateAccessor(): HassAccessor<string> {
		return this.#state;
	}

	get state(): string | undefined {
		return this.#state.value;
	}

	attribute(name: string): HassAccessor<string> {
		let accessor = this.#attributes.get(name);

		if (accessor === undefined) {
			accessor = this.map((entity) => entity.attributes[name]);
			this.#attributes.set(name, accessor);
		}

		return accessor;
	}
}

export const createHassEntityAccessor = (
	inner: Accessor<HassEntity | undefined>,
): HassEntityAccessor => new HassEntityAccessor(inner);

export type { HassEntityAccessor, HassAccessor };
