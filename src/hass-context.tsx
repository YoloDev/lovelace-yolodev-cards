import type {
	FrontendLocaleData,
	HomeAssistant,
	NumberFormat,
	TimeFormat,
} from "custom-card-helpers";
import {
	Context,
	createComputed,
	createContext,
	createSignal,
	useContext,
	type ContextProviderComponent,
} from "solid-js";
import { MemoizedAccessor } from "./utils/accessors";

class HassLocaleContextAccessor extends MemoizedAccessor<
	FrontendLocaleData | undefined
> {
	readonly #language: MemoizedAccessor<string | undefined>;
	readonly #numberFormat: MemoizedAccessor<NumberFormat | undefined>;
	readonly #timeFormat: MemoizedAccessor<TimeFormat | undefined>;

	constructor(accessor: HassContextAccessor) {
		const [language, setLanguage] = createSignal<string>();
		const [numberFormat, setNumberFormat] = createSignal<NumberFormat>();
		const [timeFormat, setTimeFormat] = createSignal<TimeFormat>();
		const [locale, setLocale] = createSignal<FrontendLocaleData>();

		createComputed<FrontendLocaleData | undefined>((prev) => {
			const next = accessor()?.locale;
			if (!next) {
				setLanguage(void 0);
				setNumberFormat(void 0);
				setTimeFormat(void 0);
				setLocale(void 0);
				return void 0;
			}

			if (!prev) {
				const clone = { ...next };
				setLanguage(next.language);
				setNumberFormat(next.number_format);
				setTimeFormat(next.time_format);
				setLocale(clone);
				return clone;
			}

			let modified = false;
			if (prev.language !== next.language) {
				setLanguage(next.language);
				modified = true;
			}

			if (prev.number_format !== next.number_format) {
				setNumberFormat(next.number_format);
				modified = true;
			}

			if (prev.time_format !== next.time_format) {
				setTimeFormat(next.time_format);
				modified = true;
			}

			if (modified) {
				const clone = { ...next };
				setLocale(clone);
				return clone;
			}

			return prev;
		});

		super(locale);
		this.#language = new MemoizedAccessor(language);
		this.#numberFormat = new MemoizedAccessor(numberFormat);
		this.#timeFormat = new MemoizedAccessor(timeFormat);
	}

	get language(): MemoizedAccessor<string | undefined> {
		return this.#language;
	}

	get numberFormat(): MemoizedAccessor<NumberFormat | undefined> {
		return this.#numberFormat;
	}

	get timeFormat(): MemoizedAccessor<TimeFormat | undefined> {
		return this.#timeFormat;
	}
}

class HassContextAccessor extends MemoizedAccessor<HomeAssistant | undefined> {
	readonly #locale: HassLocaleContextAccessor;

	constructor(context: Context<HomeAssistant | undefined>) {
		super(() => useContext(context));
		this.#locale = new HassLocaleContextAccessor(this);
	}

	// already memoized
	memo(): this {
		return this;
	}

	get locale(): HassLocaleContextAccessor {
		return this.#locale;
	}
}

const HassContext = createContext<HomeAssistant>(void 0, { name: "hass" });
const hassAccessor = new HassContextAccessor(HassContext);

export const useHass = () => hassAccessor;
export const useLocale = () => hassAccessor.locale;
export const useLanguage = () => hassAccessor.locale.language;

export const HassProvider: ContextProviderComponent<HomeAssistant | undefined> =
	HassContext.Provider;
