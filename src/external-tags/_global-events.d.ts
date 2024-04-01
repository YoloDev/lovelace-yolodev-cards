import type { JSX } from "solid-js";

declare module "solid-js" {
	namespace JSX {
		interface CustomEvents {
			// on:____
			click: MouseEvent;
		}
	}
}
