import type { HomeAssistant } from "custom-card-helpers";
import type { JSX } from "solid-js";
import type { HaFormDataContainer, HaFormSchema } from "../hass/form";

declare class HaForm extends HTMLElement {
	hass: HomeAssistant | undefined;
	data: HaFormDataContainer;
	schema: readonly HaFormSchema[];
	error?: Record<string, string | readonly string[]>;
	warning?: Record<string, string>;
	disabled: boolean;
	computeError?: (schema: any, error: any) => string;
	computeWarning?: (schema: any, warning: any) => string;
	computeLabel?: (schema: any, data: HaFormDataContainer) => string;
	computeHelper?: (schema: any) => string | undefined;
	localizeValue?: (key: string) => string;
	focus(): Promise<void>;
}

declare interface HaFormHTMLAttributes<T> extends JSX.HTMLAttributes<T> {
	readonly hass: HomeAssistant | undefined;
	readonly data: HaFormDataContainer;
	readonly schema: readonly HaFormSchema[];
	readonly disabled?: boolean;
	readonly computeError?: (schema: any, error: any) => string;
	readonly computeWarning?: (schema: any, warning: any) => string;
	readonly computeLabel?: (schema: any, data: HaFormDataContainer) => string;
	readonly computeHelper?: (schema: any) => string | undefined;
	readonly localizeValue?: (key: string) => string;
	readonly "on:value-changed": (ev: CustomEvent<unknown>) => void;
}

declare module "solid-js" {
	namespace JSX {
		interface IntrinsicElements {
			"ha-form": HaFormHTMLAttributes<HaForm>;
		}
	}
}
