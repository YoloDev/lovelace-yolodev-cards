import type { HomeAssistant } from "custom-card-helpers";
import type { HassEntity } from "home-assistant-js-websocket";
import {
	createComputed,
	createMemo,
	createSignal,
	type Accessor,
	type MemoOptions,
} from "solid-js";
import { MemoizedAccessor } from "./accessors";
import { ExtensibleFunction } from "./function";

class HassAccessor<T> extends ExtensibleFunction<Accessor<T | undefined>> {
	constructor(inner: Accessor<T | undefined>) {
		super(inner);
	}

	map<U>(fn: (value: T) => U | undefined): HassAccessor<U> {
		const inner = this;
		return new HassAccessor(() => {
			const value = inner();
			return value === undefined ? undefined : fn(value);
		});
	}

	memo(options?: MemoOptions<T | undefined>): MemoizedAccessor<T | undefined> {
		return new MemoizedAccessor(createMemo(this, void 0, options));
	}
}

class HassAttributeAccessor<T = unknown> extends HassAccessor<T> {
	readonly #exists: HassAccessor<boolean>;

	constructor(inner: Accessor<HassEntity | undefined>, name: string) {
		const [exists, setExists] = createSignal<boolean>();
		const [value, setValue] = createSignal<T>();
		createComputed<unknown>((prev) => {
			const entity = inner();
			if (!entity) {
				setExists(void 0);
				setValue(void 0);
				return void 0;
			}

			if (!Object.hasOwn(entity.attributes, name)) {
				setExists(false);
				setValue(void 0);
				return void 0;
			}

			const value = entity.attributes[name];
			if (!Object.is(prev, value)) {
				setExists(true);
				setValue(value);
				return value;
			}

			return prev;
		});

		super(value);
		this.#exists = new HassAccessor(exists);
	}

	get exists(): HassAccessor<boolean> {
		return this.#exists;
	}
}

export class HassEntityAccessor extends HassAccessor<HassEntity> {
	readonly #id: HassAccessor<string>;
	readonly #state: HassAccessor<string>;
	readonly #attributes: Map<string, HassAttributeAccessor> = new Map();

	constructor(
		hassAccessor: Accessor<HomeAssistant | undefined>,
		entityIdAccessor: Accessor<string | undefined>,
	) {
		const [entity, setEntity] = createSignal<HassEntity>();
		const [state, setState] = createSignal<string>();
		createComputed<HassEntity | undefined>((prev) => {
			const hass = hassAccessor();
			if (!hass) {
				setState(void 0);
				setEntity(void 0);
				return void 0;
			}

			const entityId = entityIdAccessor();
			if (!entityId) {
				setState(void 0);
				setEntity(void 0);
				return void 0;
			}

			const entity = hass.states[entityId];
			if (!entity) {
				console.warn(`Entity ${entityId} not found`);
				setState(void 0);
				setEntity(void 0);
				return void 0;
			}

			if (entityHasChanged(prev, entity)) {
				setEntity(entity);
				setState(entity.state);
				return entity;
			}

			return prev;
		});

		super(entity);
		this.#id = this.map((entity) => entity.entity_id);
		this.#state = new HassAccessor(state);
	}

	get entity_id(): HassAccessor<string> {
		return this.#id;
	}

	get state(): HassAccessor<string> {
		return this.#state;
	}

	attribute<T = unknown>(name: string): HassAttributeAccessor<T> {
		let accessor = this.#attributes.get(name);

		if (accessor === undefined) {
			accessor = new HassAttributeAccessor<T>(this, name);
			this.#attributes.set(name, accessor);
		}

		return accessor as HassAttributeAccessor<T>;
	}
}

const entityHasChanged = (
	prev: HassEntity | undefined,
	next: HassEntity | undefined,
): boolean => {
	if (!prev && !next) {
		return false;
	}

	if (!prev || !next) {
		return true;
	}

	// if the entity id or last_updated has changed, we conclude that the entity has changed
	// and leave finer grained filtering to the state/attribute accessors
	return (
		prev.entity_id !== next.entity_id || prev.last_updated !== next.last_updated
	);
};

export type { HassAccessor, HassAttributeAccessor };
