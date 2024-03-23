import {
	getLovelace,
	type HomeAssistant,
	type LovelaceCardConfig,
} from "custom-card-helpers";
import {
	createSignal,
	Signal,
	createRoot,
	type JSX,
	Show,
	createMemo,
	Accessor,
} from "solid-js";
import { insert } from "solid-js/web";
import cssRel from "./cards.css";
import {
	createHassEntityAccessor,
	type HassEntityAccessor,
} from "./HassAccessor";

const cssPath = new URL(cssRel, import.meta.url).href;

// export type HassEntityAccessor = Accessor<HassEntity | undefined> & {
// 	get state(): string;
// 	attribute(name: string)
// };

export type CardConfig = LovelaceCardConfig & {
	test_gui?: boolean;
};

export abstract class LovelaceCard<
	Config extends CardConfig,
> extends HTMLElement {
	readonly #shadow: ShadowRoot;
	readonly #hassSignal: Signal<HomeAssistant | null> =
		createSignal<HomeAssistant | null>(null);
	readonly #configSignal = createSignal<Config>();
	readonly #attributeSignals: Map<string, Signal<string | null>> = new Map();

	#dispose: null | (() => void) = null;

	get #hass(): HomeAssistant | null {
		return this.#hassSignal[0]();
	}

	set #hass(value: HomeAssistant) {
		this.#hassSignal[1](value);
	}

	get #configSet(): boolean {
		return !!this.#configSignal[0]();
	}

	private get hass(): HomeAssistant {
		return this.#hass!;
	}

	private set hass(value: HomeAssistant) {
		this.#hass = value;
	}

	protected get config(): Config {
		return this.#configSignal[0]()!;
	}

	protected setConfig(config: Exclude<Config, Function>) {
		if (!config) {
			throw new Error("Invalid configuration");
		}

		if (config.test_gui) {
			getLovelace().setEditMode(true);
		}

		this.#configSignal[1](config);
	}

	protected entity(
		entity_id: (config: Config) => string | undefined | null,
	): HassEntityAccessor {
		const memo = createMemo(
			() => {
				const id = entity_id(this.config);
				if (!id) {
					return void 0;
				}

				const hass = this.hass;
				if (!hass) {
					return void 0;
				}

				const entity = hass.states[id];
				if (!entity) {
					return void 0;
				}

				return [entity, entity.entity_id, entity.last_updated] as const;
			},
			null,
			{
				equals: (a, b) => {
					if (a == null || b == null) {
						return false;
					}

					if (a[1] !== b[1]) {
						return false;
					}

					if (a[2] !== b[2]) {
						return false;
					}

					return true;
				},
			},
		);

		return createHassEntityAccessor(() => memo()?.[0]);
	}

	protected async callService(
		domain: string,
		service: string,
		data: Record<string, any>,
	) {
		await this.hass.callService(domain, service, data);
	}

	constructor() {
		super();

		this.#shadow = this.attachShadow({ mode: "open" });
	}

	private connectedCallback() {
		createRoot((dispose) => {
			this.#dispose = dispose;

			const ready = createMemo(() => this.ready());
			const css = createMemo(() => {
				const value = this.css();
				if (!value) {
					return null;
				}

				return <style>{value}</style>;
			});

			const element = (
				<>
					<Show when={ready}>{this.render()}</Show>
					{css()}
					<link rel="stylesheet" href={cssPath} />
				</>
			);

			insert(this.#shadow, element);
		});
	}

	private disconnectedCallback() {
		if (this.#dispose) {
			this.#dispose();
			this.#dispose = null;
			this.#shadow.innerHTML = "";
		}
	}

	private adoptedCallback() {
		this.disconnectedCallback();
		this.connectedCallback();
	}

	private attributeChangedCallback(
		name: string,
		oldValue: string,
		newValue: string,
	) {
		let signal = this.#attributeSignals.get(name);
		if (!signal) {
			signal = createSignal<string | null>(newValue);
			this.#attributeSignals.set(name, signal);
		}

		signal[1](newValue);
	}

	protected ready(): boolean {
		return Boolean(this.#hass) && this.#configSet;
	}

	abstract render(): JSX.Element;

	protected css(): string | null {
		return null;
	}
}

export type CardInfo = {
	readonly tag: string;
	readonly name: string;
	readonly description: string;
};

export const registerCard = (
	info: CardInfo,
	constructor: CustomElementConstructor,
) => {
	// This puts your card into the UI card picker dialog
	(window as any).customCards = (window as any).customCards || [];
	(window as any).customCards.push({
		type: info.tag,
		name: info.name,
		description: info.description,
	});

	customElements.define(info.tag, constructor);
};

declare module "solid-js" {
	namespace JSX {
		interface IntrinsicElements {
			"ha-card": IntrinsicElements["div"];
		}
	}
}
