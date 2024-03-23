import { CardConfig, LovelaceCard } from "./LovlaceCard";
import { object, string, any } from "superstruct";

type HTMLLovelaceCardElementConstructor = {
	getConfigElement?: () => Promise<LovelaceCardEditor<any>>;
};

type HTMLLovelaceCardElement = HTMLElement & {
	constructor?: HTMLLovelaceCardElementConstructor;
};

type HassCardHelpers = {
	createCardElement: (config: any) => HTMLLovelaceCardElement;
};

export abstract class LovelaceCardEditor<
	Config extends CardConfig,
> extends LovelaceCard<Config> {
	override setConfig(config: Exclude<Config, Function>) {
		super.setConfig(config);
	}
}

const helpers: HassCardHelpers = await (window as any).loadCardHelpers();

export const loadEditorForCard = async (cardConfig: any) => {
	const card = helpers.createCardElement(cardConfig);
	await card.constructor?.getConfigElement?.();
};

export const baseLovelaceCardConfig = object({
	type: string(),
	view_layout: any(),
	layout_options: any(),
});
