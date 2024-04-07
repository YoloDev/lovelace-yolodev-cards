import { mdiMinus, mdiPlus } from "@mdi/js";
import {
	fireEvent,
	type HomeAssistant,
	type LovelaceCardEditor,
} from "custom-card-helpers";
import {
	Show,
	createEffect,
	createMemo,
	createSignal,
	on,
	onCleanup,
	untrack,
} from "solid-js";
import { Localized } from "src/Localized";
import { useLocale } from "src/hass-context";
import { LovelaceCard, registerCard, type CardConfig } from "../LovlaceCard";
import { findEntities } from "../find-entities";
import strings from "./thermostat.icu";

const TAG = "yolodev-thermostat";
export type ThermostatCardConfig = CardConfig & {
	entity: string;
	toggle_entity: string | null;
	floor_temp_entity?: string | null;
	// theme?: string;
	name?: string;
	show_status?: boolean;
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
		const locale = useLocale();

		const entity = super.entity((config) => config.entity, "thermostat.entity");
		const setPointAttribute = entity.attribute<number>("temperature");
		const friendlyName = entity.attribute<string>("friendly_name");
		const hvacAction = entity.attribute<string>("hvac_action");
		const currentTemp = entity.attribute<number>("current_temperature");
		const minTemp = entity.attribute<number>("min_temp");
		const maxTemp = entity.attribute<number>("max_temp");
		const targetTempStep = entity.attribute<number>("target_temp_step");

		const toggleEntity = super.entity(
			(config) => config.toggle_entity,
			"thermostat.toggle_entity",
		);
		const floorTempEntity = super.entity(
			(config) => config.floor_temp_entity,
			"thermostat.floor_temp_entity",
		);

		const [pendingTemp, setPendingTemp] = createSignal<number>();

		const floorTempValue = floorTempEntity.state
			.map((value) => {
				if (value === "") {
					return void 0;
				}

				const num = Number.parseFloat(value);
				if (Number.isNaN(num)) {
					return void 0;
				}

				return num;
			})
			.memo();

		const isPending = () => typeof pendingTemp() !== "undefined";

		// when we start modifying the temperature using -/+ buttons, we save it as a pending value
		// and only after 1 second we send the new value to the server
		createEffect(() => {
			const value = pendingTemp();
			if (typeof value === "undefined") {
				return;
			}

			debugger;
			const entity_id = untrack(() => entity.entityId());
			if (!entity_id) {
				return;
			}

			const timeout = setTimeout(() => {
				this.callService("climate", "set_temperature", {
					entity_id,
					temperature: value,
				});
			}, 1_000);

			onCleanup(() => {
				clearTimeout(timeout);
			});
		});

		// when we get a new setpoint value from the server, we reset the pending value
		createEffect(
			on(setPointAttribute, (value, prev) => {
				if (value !== prev) {
					setPendingTemp(void 0);
				}
			}),
		);

		const name = () => {
			const config = this.config;

			let name: string | undefined;
			if (typeof config?.name === "string") {
				name = config.name;
			} else if (config?.name === false) {
				name = void 0;
			} else {
				name = friendlyName();
			}

			return name ?? null;
		};

		const setPoint = () => {
			const pending = pendingTemp();
			if (typeof pending !== "undefined") {
				return pending;
			}

			return setPointAttribute();
		};

		const toggle = (
			<Show when={toggleEntity()}>
				<ha-switch
					haptic
					checked={toggleEntity.state() === "on"}
					on:click={() => {
						this.callService("switch", "toggle", {
							entity_id: toggleEntity.entityId(),
						});
					}}
				/>
			</Show>
		);

		const floorTemp = (
			<Show when={floorTempEntity()}>
				<dt class="m-0">
					<Localized message={strings.floor} />
				</dt>
				<dl class="m-0">
					<Localized
						message={strings.temp_value}
						args={{ value: floorTempValue() }}
					/>
				</dl>
			</Show>
		);

		const showTemperatureControls = createMemo(
			() =>
				typeof setPointAttribute() !== "undefined" &&
				typeof minTemp() !== "undefined" &&
				typeof maxTemp() !== "undefined" &&
				typeof targetTempStep() !== "undefined",
		);

		const slider = (
			<Show when={showTemperatureControls()}>
				<ha-control-slider
					locale={locale()}
					class="control-slider transition-colors duration-500"
					unit="°C"
					value={setPoint()}
					step={targetTempStep()}
					min={minTemp()}
					max={maxTemp()}
					disabled={isPending()}
					on:value-changed={(ev) => {
						this.callService("climate", "set_temperature", {
							entity_id: entity.entityId(),
							temperature: ev.detail.value,
						});
					}}
				/>
			</Show>
		);

		const incTemp = () => {
			const stepSize = targetTempStep();
			const maxTempValue = maxTemp();
			const setPointValue = setPoint();

			if (
				typeof stepSize !== "undefined" &&
				typeof maxTempValue !== "undefined" &&
				typeof setPointValue !== "undefined"
			) {
				setPendingTemp((prev) => {
					const newValue = (prev ?? setPointValue) + stepSize;
					if (newValue > maxTempValue) {
						return maxTempValue;
					}

					return newValue;
				});
			}
		};

		const decTemp = () => {
			const stepSize = targetTempStep();
			const minTempValue = minTemp();
			const setPointValue = setPoint();

			if (
				typeof stepSize !== "undefined" &&
				typeof minTempValue !== "undefined" &&
				typeof setPointValue !== "undefined"
			) {
				setPendingTemp((prev) => {
					const newValue = (prev ?? setPointValue) - stepSize;
					if (newValue < minTempValue) {
						return minTempValue;
					}

					return newValue;
				});
			}
		};

		const statusRow = (
			<Show when={this.config.show_status}>
				<dt class="m-0">
					<Localized message={strings.state} />
				</dt>
				<dl class="m-0">
					<Localized
						message={strings.state_value}
						args={{ state: hvacAction() }}
					/>
				</dl>
			</Show>
		);

		const isActive = () => {
			const state = hvacAction();
			if (state === "idle" || !state) {
				return false;
			}

			return true;
		};

		const openMoreInfo = () => {
			const entityId = entity.entityId();

			if (entityId) {
				fireEvent(this, "hass-more-info", {
					entityId,
				});
			}
		};

		return (
			<ha-card>
				<div
					classList={{
						"thermostat-card @container/card": true,
						"state-off": entity.state() === "off",
						"state-auto": entity.state() === "auto",
						"state-cool": entity.state() === "cool",
						"state-dry": entity.state() === "dry",
						"state-fan_only": entity.state() === "fan_only",
						"state-heat": entity.state() === "heat",
						"state-heat-cool": entity.state() === "heat-cool",
						"state-unavailable": entity.state() === "unavailable",
						active: isActive(),
						pending: isPending(),
					}}
				>
					<header class="flex items-center gap-2 pt-6 px-4 pb-1 md:pb-4">
						<ha-icon
							icon="mdi:heat-wave"
							class="thermostat-icon flex-none cursor-pointer transition-colors duration-500"
							on:click={openMoreInfo}
						/>
						<h2
							class="text-title m-0 flex-auto cursor-pointer font-normal"
							on:click={openMoreInfo}
						>
							{name()}
						</h2>
						<div class="flex-none">{toggle}</div>
					</header>
					<section class="flex items-center py-1 px-4 md:p-4 ">
						<dl class="mt-0 mb-0 grid flex-none auto-rows-fr grid-cols-2 gap-x-2 gap-y-0">
							<dt class="m-0">
								<Localized message={strings.current} />
							</dt>
							<dl class="m-0">
								<Localized
									message={strings.temp_value}
									args={{ value: currentTemp() }}
								/>
							</dl>
							{floorTemp}
							{statusRow}
						</dl>
						<span class="text-title thermostat-setpoint block flex flex-auto items-center justify-end gap-4 py-2 pr-0 pl-6 text-right font-normal transition-colors duration-500">
							<ha-outlined-icon-button
								class="icon-button hidden flex-none @sm/card:inline-block"
								on:click={decTemp}
							>
								<ha-svg-icon path={mdiMinus} />
							</ha-outlined-icon-button>

							<data value={setPoint()} class="flex-none">
								<Localized
									message={strings.temp_value}
									args={{ value: setPoint() }}
									markup={{
										temp: (value) => (
											<span
												classList={{
													"text-setpoint thermostat-setpoint": true,
												}}
											>
												{value}
											</span>
										),
										unit: (value) => <span>{value}</span>,
									}}
								/>
							</data>

							<ha-outlined-icon-button
								class="icon-button hidden flex-none @sm/card:inline-block"
								on:click={incTemp}
							>
								<ha-svg-icon path={mdiPlus} />
							</ha-outlined-icon-button>
						</span>
					</section>
					<section class="pt-1 px-4 pb-4 md:p-4">{slider}</section>
				</div>
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
