import type { JSX } from "solid-js";

declare class HaCard extends HTMLElement {
	header?: string;
	raised: boolean;
}

declare interface HaCardHTMLAttributes<T> extends JSX.HTMLAttributes<T> {
	readonly header?: string | undefined;
	readonly raised?: boolean;
}

declare module "solid-js" {
	namespace JSX {
		interface IntrinsicElements {
			"ha-card": HaCardHTMLAttributes<HaCard>;
		}
	}
}
