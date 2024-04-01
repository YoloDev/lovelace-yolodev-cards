import type { JSX } from "solid-js";

declare class HaIcon extends HTMLElement {
	icon?: string;
}

declare interface HaIconHTMLAttributes<T> extends JSX.HTMLAttributes<T> {
	readonly icon: string | undefined;
}

declare module "solid-js" {
	namespace JSX {
		interface IntrinsicElements {
			"ha-icon": HaIconHTMLAttributes<HaIcon>;
		}
	}
}
