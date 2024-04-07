import type { HomeAssistant } from "custom-card-helpers";
import type { HassEntity } from "home-assistant-js-websocket";
import { createMemo, type Accessor } from "solid-js";
import { createLogger } from "src/logging.mjs";
import { BaseAccessor, createBaseAccessor } from "./accessors";
import { extendFunction, type OmitFunctionProps } from "./function";

export interface HassAccessor<T>
	extends OmitFunctionProps<BaseAccessor<T | undefined>, "map"> {
	map<U>(fn: (value: T) => U | undefined): HassAccessor<U>;
}

const hassAccessor = {
	map: {
		writable: false,
		enumerable: false,
		configurable: true,
		value: function map<const T, const U>(
			this: HassAccessor<T>,
			fn: (value: T) => U | undefined,
		): HassAccessor<U> {
			const inner = this;
			return createHassAccessor(() => {
				const value = inner();
				return value === undefined ? undefined : fn(value);
			});
		},
	},
} as const satisfies PropertyDescriptorMap;

export function createHassAccessor<const T>(
	accessor: Accessor<T | undefined>,
): HassAccessor<T> {
	const base = createBaseAccessor(accessor);
	return extendFunction(base, hassAccessor);
}

export interface HassAttributeAccessor<T = unknown> extends HassAccessor<T> {
	readonly exists: HassAccessor<boolean>;
}

const ATTRIBUTE_NOT_EXISTS = Symbol("attribute:not-exists");

export function createHassAttributeAccessor<const T>(
	inner: Accessor<HassEntity | undefined>,
	attributeName: string,
): HassAttributeAccessor<T> {
	const memo = createMemo(() => {
		const entity = inner();
		if (!entity) {
			return ATTRIBUTE_NOT_EXISTS;
		}

		if (!Object.hasOwn(entity.attributes, attributeName)) {
			return ATTRIBUTE_NOT_EXISTS;
		}

		return entity.attributes[attributeName] as T;
	});

	const exists = createHassAccessor(() => memo() === ATTRIBUTE_NOT_EXISTS);
	const value = createHassAccessor(() => {
		const result = memo();
		if (result === ATTRIBUTE_NOT_EXISTS) {
			return void 0;
		}

		return result;
	});

	return extendFunction(value, {
		exists: {
			writable: false,
			enumerable: false,
			configurable: true,
			value: exists,
		},
	});
}

export interface HassEntityAccessor extends HassAccessor<HassEntity> {
	readonly entityId: HassAccessor<string>;
	readonly state: HassAccessor<string>;
	attribute<const T = unknown>(name: string): HassAttributeAccessor<T>;
}

type HassEntityMemoState = {
	readonly entity: HassEntity;
	readonly entity_id: string;
	readonly last_updated: string;
};

export function createHassEntityAccessor(
	hassAccessor: Accessor<HomeAssistant | undefined>,
	entityIdAccessor: Accessor<string | undefined>,
	name: string,
): HassEntityAccessor {
	const logger = createLogger(`hass-entity-accessor:${name}`);
	const entityMemo = createMemo(
		(prev: HassEntityMemoState | undefined) => {
			const hass = hassAccessor();
			if (!hass) {
				return void 0;
			}

			const entityId = entityIdAccessor();
			if (!entityId) {
				return void 0;
			}

			const entity = hass.states[entityId];
			if (!entity) {
				logger.warn(`Entity ${entityId} not found`);
				return void 0;
			}

			if (entityHasChanged(prev, entity)) {
				logger.trace(`Entity ${entityId} has changed`);
				return {
					entity,
					entity_id: entity.entity_id,
					last_updated: entity.last_updated,
				};
			}

			return prev;
		},
		void 0,
		{ name: `hass-entity-accessor:${name}` },
	);

	const base = createHassAccessor(() => entityMemo()?.entity);
	const idAccessor = createHassAccessor(
		base
			.map((e) => e.entity_id)
			.memo({ name: `hass-entity-accessor:${name}:entity_id` }),
	);
	const stateAccessor = createHassAccessor(
		base
			.map((e) => e.state)
			.memo({ name: `hass-entity-accessor:${name}:state` }),
	);

	const attributes = new Map<string, HassAttributeAccessor>();
	const attribute = function attribute<const T = unknown>(
		name: string,
	): HassAttributeAccessor<T> {
		let accessor = attributes.get(name);

		if (accessor === undefined) {
			accessor = createHassAttributeAccessor<T>(base, name);
			attributes.set(name, accessor);
		}

		return accessor as HassAttributeAccessor<T>;
	};

	return extendFunction(base, {
		entityId: {
			writable: false,
			enumerable: false,
			configurable: true,
			value: idAccessor,
		},
		state: {
			writable: false,
			enumerable: false,
			configurable: true,
			value: stateAccessor,
		},
		attribute: {
			writable: false,
			enumerable: false,
			configurable: true,
			value: attribute,
		},
	});
}
const entityHasChanged = (
	prev: HassEntityMemoState | undefined,
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
