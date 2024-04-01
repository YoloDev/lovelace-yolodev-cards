import type { JSX } from "solid-js";

declare class HaSvgIcon extends HTMLElement {
	path: string | undefined;
	secondaryPath: string | undefined;
	viewBox: string | undefined;
}

declare interface HaSvgIconHTMLAttributes<T> extends JSX.HTMLAttributes<T> {
	readonly path?: string;
	readonly secondaryPath?: string;
	readonly viewBox?: string;
}

declare module "solid-js" {
	namespace JSX {
		interface IntrinsicElements {
			"ha-svg-icon": HaSvgIconHTMLAttributes<HaSvgIcon>;
		}
	}
}
