import type { SwitchBase } from "@material/mwc-switch/deprecated/mwc-switch-base";
import type { JSX } from "solid-js";

declare class HaSwitch extends SwitchBase {
	haptic: boolean;
}

declare interface HaSwitchHTMLAttributes<T> extends JSX.HTMLAttributes<T> {
	readonly haptic?: boolean;
	readonly checked?: boolean;
	readonly disabled?: boolean;
}

declare module "solid-js" {
	namespace JSX {
		interface IntrinsicElements {
			"ha-switch": HaSwitchHTMLAttributes<HaSwitch>;
		}
	}
}
