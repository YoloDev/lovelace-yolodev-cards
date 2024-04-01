import type { FrontendLocaleData } from "custom-card-helpers";
import type { JSX } from "solid-js";

type TooltipPosition = "top" | "bottom" | "left" | "right";
type TooltipMode = "never" | "always" | "interaction";
type SliderMode = "start" | "end" | "cursor";

declare class HaControlSlider extends HTMLElement {
	locale: FrontendLocaleData | undefined;
	disabled: boolean;
	mode: SliderMode | undefined;
	vertical: boolean;
	showHandle: boolean;
	inverted: boolean;
	tooltipPosition?: TooltipPosition;
	unit: string | undefined;
	tooltipMode: TooltipMode;
	value: number | undefined;
	step: number;
	min: number;
	max: number;
	pressed: boolean;
	tooltipVisible: boolean;
}

declare interface HaControlSliderHTMLAttributes<T>
	extends JSX.HTMLAttributes<T> {
	readonly locale: FrontendLocaleData | undefined;
	readonly disabled?: boolean;
	readonly mode?: SliderMode;
	readonly vertical?: boolean;
	readonly showHandle?: boolean;
	readonly inverted?: boolean;
	readonly tooltipPosition?: TooltipPosition;
	readonly unit?: string;
	readonly tooltipMode?: TooltipMode;
	readonly value?: number;
	readonly step?: number;
	readonly min?: number;
	readonly max?: number;
	readonly "on:value-changed"?: (
		ev: CustomEvent<{ readonly value: number }>,
	) => void;
}

declare module "solid-js" {
	namespace JSX {
		interface IntrinsicElements {
			"ha-control-slider": HaControlSliderHTMLAttributes<HaControlSlider>;
		}
	}
}
