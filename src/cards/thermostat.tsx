import {
	createComputed,
	createEffect,
	createMemo,
	createSignal,
	on,
	onCleanup,
} from "solid-js";
import { type CardConfig, LovelaceCard, registerCard } from "../LovlaceCard";
import {
	fireEvent,
	type HomeAssistant,
	type LovelaceCardEditor,
} from "custom-card-helpers";
import { findEntities } from "../find-entities";
import strings from "./thermostat.icu";
import { Localized } from "src/Localized";

const TAG = "yolodev-thermostat";
export type ThermostatCardConfig = CardConfig & {
	entity: string;
	toggle_entity: string | null;
	floor_temp_entity?: string | null;
	// theme?: string;
	name?: string;
	// show_current_as_primary?: boolean;
	// features?: LovelaceCardFeatureConfig[];
};

class ThermostatCard extends LovelaceCard<ThermostatCardConfig> {
	public static async getConfigElement(): Promise<LovelaceCardEditor> {
		const module = await import("./thermostat_editor");
		return document.createElement(module.tag) as any;
	}

	public static getStubConfig(
		hass: HomeAssistant,
		entities: string[],
		entitiesFallback: string[],
	): ThermostatCardConfig {
		const includeDomains = ["climate"];
		const maxEntities = 1;
		const foundEntities = findEntities(
			hass,
			maxEntities,
			entities,
			entitiesFallback,
			includeDomains,
		);

		return {
			type: `custom:${TAG}`,
			toggle_entity: null,
			floor_temp_entity: null,
			entity: foundEntities[0] || "",
		};
	}

	public getCardSize(): number {
		return 3;
	}

	render() {
		const entity = super.entity((config) => config.entity);
		const toggleEntity = super.entity((config) => config.toggle_entity);
		const floorTempEntity = super.entity((config) => config.floor_temp_entity);
		const [pendingTemp, setPendingTemp] = createSignal<number | null>(null);

		const isPending = () => pendingTemp() !== null;

		createEffect(() => {
			const value = pendingTemp();
			if (value === null) {
				return;
			}

			const timeout = setTimeout(() => {
				const entity_id = entity.value?.entity_id;
				if (entity_id) {
					this.callService("climate", "set_temperature", {
						entity_id,
						temperature: value,
					});
				}
			}, 1_000);

			onCleanup(() => {
				clearTimeout(timeout);
			});
		});

		const tempAttr = entity.attribute("temperature");
		createEffect(
			on(
				() => tempAttr.value,
				(value, prev) => {
					if (value !== prev) {
						setPendingTemp(null);
					}
				},
			),
		);

		const name = createMemo(() => {
			const config = this.config;
			const entityState = entity.value;

			let name: string | undefined;
			if (typeof config?.name === "string") {
				name = config.name;
			} else if (config?.name === false) {
				name = void 0;
			} else if (entityState) {
				name = entityState.attributes.friendly_name;
			}

			return name ?? null;
		});

		const hvacAction = entity.attribute("hvac_action");

		const toggle = toggleEntity.map((entity) => {
			return (
				<ha-switch
					checked={entity.state === "on"}
					on:click={() => {
						this.callService("switch", "toggle", {
							entity_id: entity.entity_id,
						});
					}}
				/>
			);
		});

		const currentTemp = entity.attribute("current_temperature").map((value) => {
			const num = Number.parseFloat(value);
			if (Number.isNaN(num)) {
				return void 0;
			}

			return num;
		});

		const setPoint = tempAttr.map((value) => {
			const pending = pendingTemp();
			if (pending !== null) {
				return pending;
			}

			const num = Number.parseFloat(value);
			if (Number.isNaN(num)) {
				return void 0;
			}

			return num;
		});

		const floorTemp = floorTempEntity.stateAccessor
			.map((value) => {
				const num = Number.parseFloat(value);
				if (Number.isNaN(num)) {
					return void 0;
				}

				return num;
			})
			.map((value) => {
				return (
					<>
						<dt class="m-0">
							<Localized message={strings.floor} />
						</dt>
						<dl class="m-0">
							<Localized message={strings.temp_value} args={{ value }} />
						</dl>
					</>
				);
			});

		const slider = entity.map((entity) => {
			const setPoint = Number.parseFloat(entity.attributes.temperature);
			if (Number.isNaN(setPoint)) {
				return void 0;
			}

			const minTemp = Number.parseFloat(entity.attributes.min_temp ?? "5");
			const maxTemp = Number.parseFloat(entity.attributes.max_temp ?? "30");
			const stepSize = Number.parseFloat(
				entity.attributes.target_temp_step ?? "0.5",
			);

			return { setPoint, minTemp, maxTemp, stepSize };
		});

		const incTempAccessor = slider.map(
			({ stepSize, setPoint, maxTemp }) =>
				() =>
					setPendingTemp((prev) => {
						const newValue = (prev ?? setPoint) + stepSize;
						if (newValue > maxTemp) {
							return maxTemp;
						}

						return newValue;
					}),
		);

		const decTempAccessor = slider.map(
			({ stepSize, setPoint, minTemp }) =>
				() =>
					setPendingTemp((prev) => {
						const newValue = (prev ?? setPoint) - stepSize;
						if (newValue < minTemp) {
							return minTemp;
						}

						return newValue;
					}),
		);

		const incTemp = () => {
			const fn = incTempAccessor.value;
			if (fn) {
				fn();
			}
		};

		const decTemp = () => {
			const fn = decTempAccessor.value;
			if (fn) {
				fn();
			}
		};

		const isActive = () => {
			const state = hvacAction.value;
			if (state === "idle" || !state) {
				return false;
			}

			return true;
		};

		const openMoreInfo = () => {
			fireEvent(this, "hass-more-info", {
				entityId: entity.value!.entity_id,
			});
		};

		return (
			<ha-card
				classList={{
					"thermostat-card @container/card": true,
					"state-off": entity.state === "off",
					"state-auto": entity.state === "auto",
					"state-cool": entity.state === "cool",
					"state-dry": entity.state === "dry",
					"state-fan_only": entity.state === "fan_only",
					"state-heat": entity.state === "heat",
					"state-heat-cool": entity.state === "heat-cool",
					"state-unavailable": entity.state === "unavailable",
					active: isActive(),
				}}
			>
				<header class="flex gap-2 items-center pt-6 pb-1 md:pb-4 px-4">
					<ha-icon
						icon="mdi:heat-wave"
						class="flex-none transition-colors duration-500 thermostat-icon cursor-pointer"
						on:click={openMoreInfo}
					/>
					<h2
						class="flex-auto text-title font-normal m-0 cursor-pointer"
						on:click={openMoreInfo}
					>
						{name()}
					</h2>
					<div class="flex-none">{toggle.value}</div>
				</header>
				<section class="flex items-center px-4 py-1 md:p-4 ">
					<dl class="flex-none grid auto-rows-fr grid-cols-2 gap-y-0 gap-x-2 mt-0 mb-0">
						<dt class="m-0">
							<Localized message={strings.current} />
						</dt>
						{/* <dl class="m-0">{currentTemp.value} °C</dl> */}
						<dl class="m-0">
							<Localized
								message={strings.temp_value}
								args={{ value: currentTemp.value }}
							/>
						</dl>
						{floorTemp.value}
						{/* <dt class="m-0">{strings.state(this.locale)}</dt>
								<dl class="m-0">
									{strings.state_value(this.locale, { state: hvacAction.value })}
								</dl> */}
					</dl>
					<span class="block flex-auto text-title font-normal px-6 py-2 text-right thermostat-setpoint transition-colors duration-500 flex gap-2 items-center justify-end">
						<button
							class="@sm/card:inline-block hidden px-2 flex-none"
							on:click={decTemp}
						>
							-
						</button>
						<data value={setPoint.value} class="flex-none">
							<Localized
								message={strings.temp_value}
								args={{ value: setPoint.value }}
								markup={{
									temp: (value) => (
										<span
											classList={{
												"text-setpoint transition-colors": true,
												"text-error": isPending(),
											}}
										>
											{value}
										</span>
									),
									unit: (value) => <span>{value}</span>,
								}}
							/>
						</data>
						<button
							class="@sm/card:inline-block hidden px-2 flex-none"
							on:click={incTemp}
						>
							+
						</button>
					</span>
				</section>
				<section class="px-4 pt-1 pb-4 md:p-4">
					<ha-control-slider
						class="transition-colors duration-500 control-slider"
						unit="°C"
						value={slider.value?.setPoint}
						step={slider.value?.stepSize}
						min={slider.value?.minTemp}
						max={slider.value?.maxTemp}
						disabled={isPending()}
						on:value-changed={(ev: CustomEvent) => {
							this.callService("climate", "set_temperature", {
								entity_id: entity.value!.entity_id,
								temperature: ev.detail.value,
							});
						}}
					/>
				</section>
			</ha-card>
		);
	}
}

registerCard(
	{
		tag: TAG,
		name: "YoloDev Thermostat",
		description: "YoloDev Thermostat card",
	},
	ThermostatCard,
);
