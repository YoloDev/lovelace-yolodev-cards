import type { MdOutlinedIconButton } from "@material/web/iconbutton/outlined-icon-button";
import type { JSX } from "solid-js";

type FormSubmitterType = "button" | "submit" | "reset";
type LinkTarget = "_blank" | "_parent" | "_self" | "_top";

declare class HaOutlinedIconButton extends MdOutlinedIconButton {}

declare interface HaOutlinedIconButtonHTMLAttributes<T>
	extends JSX.HTMLAttributes<T> {
	readonly disabled?: boolean;
	readonly flipIconInRtl?: boolean;
	readonly href?: string;
	readonly target?: LinkTarget | "";
	readonly toggle?: boolean;
	readonly selected?: boolean;
	readonly type?: FormSubmitterType;
	readonly name?: string;
}

declare module "solid-js" {
	namespace JSX {
		interface IntrinsicElements {
			"ha-outlined-icon-button": HaOutlinedIconButtonHTMLAttributes<HaOutlinedIconButton>;
		}
	}
}
