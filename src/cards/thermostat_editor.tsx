import { type JSX, createMemo } from "solid-js";
import {
	LovelaceCardEditor,
	baseLovelaceCardConfig,
	loadEditorForCard,
} from "../LovelaceCardEditor";
import { ThermostatCardConfig } from "./thermostat";
import { assign, object, optional, string } from "superstruct";
import type { HaFormSchema, SchemaUnion } from "../hass/form";
import { fireEvent } from "custom-card-helpers";

await loadEditorForCard({ type: "thermostat", entity: "climate.__fake" });

const cardConfigStruct = assign(
	baseLovelaceCardConfig,
	object({
		entity: optional(string()),
		name: optional(string()),
	}),
);

const SCHEMA = [
	{ name: "entity", selector: { entity: { domain: "climate" } } },
	{ name: "name", selector: { text: {} } },
	{ name: "toggle_entity", selector: { entity: { domain: "switch" } } },
	{ name: "floor_temp_entity", selector: { entity: { domain: "sensor" } } },
] as const satisfies readonly HaFormSchema[];

class ThermostatEditor extends LovelaceCardEditor<ThermostatCardConfig> {
	render(): JSX.Element {
		// const items = createMemo(() => {
		// 	const entities = Object.keys(this.hass.states);

		// 	return entities.map((entity) => {
		// 		return <mwc-list-item value={entity}>{entity}</mwc-list-item>;
		// 	});
		// });

		const computeLabelCallback = (schema: SchemaUnion<typeof SCHEMA>) => {
			if (schema.name === `toggle_entity`) {
				return "Toggle Entity (Optional)";
			}

			if (schema.name === "floor_temp_entity") {
				return "Floor Temp Entity (Optional)";
			}

			return this.hass!.localize(
				`ui.panel.lovelace.editor.card.generic.${schema.name}`,
			);
		};

		const valueChanged = (ev: CustomEvent) => {
			fireEvent(this, "config-changed", { config: ev.detail.value });
		};

		return (
			<>
				<ha-form
					hass={this.hass}
					data={this.config}
					schema={SCHEMA}
					prop:computeLabel={computeLabelCallback}
					on:value-changed={valueChanged}
				/>
				{/* <mwc-select
					naturalMenuWidth
					fixedMenuPosition
					label="Entity (Required)"
					// configValue="entity"
					value={this.config.entity}
					on:selected={(e: FormDataEvent) => {
						this.config.entity = e.target.value;
					}}
					on:closed={(e: Event) => {
						e.stopPropagation();
					}}
				>
					{items()}
				</mwc-select> */}
			</>
		);
	}
}

export const tag = "yolodev-thermostat-editor";
customElements.define(tag, ThermostatEditor);

declare module "solid-js" {
	namespace JSX {
		interface IntrinsicElements {
			"ha-entity-picker": any;
		}
	}
}
