import type { HomeAssistant } from "custom-card-helpers";
import type { HassEntity } from "home-assistant-js-websocket";

export const computeDomain = (entityId: string): string => {
	const index = entityId.indexOf(".");
	return index === -1 ? entityId : entityId.substring(0, index);
};

const arrayFilter = (
	array: any[],
	conditions: Array<(value: any) => boolean>,
	maxSize: number,
) => {
	if (!maxSize || maxSize > array.length) {
		maxSize = array.length;
	}

	const filteredArray: any[] = [];

	for (let i = 0; i < array.length && filteredArray.length < maxSize; i++) {
		let meetsConditions = true;

		for (const condition of conditions) {
			if (!condition(array[i])) {
				meetsConditions = false;
				break;
			}
		}

		if (meetsConditions) {
			filteredArray.push(array[i]);
		}
	}

	return filteredArray;
};

export const findEntities = (
	hass: HomeAssistant,
	maxEntities: number,
	entities: string[],
	entitiesFallback: string[],
	includeDomains?: string[],
	entityFilter?: (stateObj: HassEntity) => boolean,
) => {
	const conditions: Array<(value: string) => boolean> = [];

	if (includeDomains?.length) {
		conditions.push((eid) => includeDomains!.includes(computeDomain(eid)));
	}

	if (entityFilter) {
		conditions.push(
			(eid) => hass.states[eid] && entityFilter(hass.states[eid]),
		);
	}

	const entityIds = arrayFilter(entities, conditions, maxEntities);

	if (entityIds.length < maxEntities && entitiesFallback.length) {
		const fallbackEntityIds = findEntities(
			hass,
			maxEntities - entityIds.length,
			entitiesFallback,
			[],
			includeDomains,
			entityFilter,
		);

		entityIds.push(...fallbackEntityIds);
	}

	return entityIds;
};
