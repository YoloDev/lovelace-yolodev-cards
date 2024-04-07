import type {
	FrontendLocaleData,
	HomeAssistant,
	NumberFormat,
	TimeFormat,
} from "custom-card-helpers";
import {
	Context,
	createContext,
	useContext,
	type Accessor,
	type ContextProviderComponent,
} from "solid-js";
import { createLogger } from "./logging.mjs";
import {
	MemoizedAccessor,
	createBaseAccessor,
	createMemoAccessor,
} from "./utils/accessors";
import { extendFunction } from "./utils/function";

export interface HassLocaleContextAccessor
	extends MemoizedAccessor<FrontendLocaleData | undefined> {
	readonly language: MemoizedAccessor<string | undefined>;
	readonly numberFormat: MemoizedAccessor<NumberFormat | undefined>;
	readonly timeFormat: MemoizedAccessor<TimeFormat | undefined>;
}

const logger = createLogger("hass-locale-context");
function createHassLocaleContextAccessor(
	accessor: Accessor<HomeAssistant | undefined>,
): HassLocaleContextAccessor {
	const locale = createMemoAccessor(() => {
		logger.trace("memo()");
		const value = accessor();
		if (!value) {
			return void 0;
		}

		logger.trace("locale", value.locale);
		return value.locale;
	});

	const language = locale
		.map((value) => value?.language)
		.memo({ name: "hass-locale-context:language" });

	const numberFormat = locale
		.map((value) => value?.number_format)
		.memo({ name: "hass-locale-context:number-format" });

	const timeFormat = locale
		.map((value) => value?.time_format)
		.memo({ name: "hass-locale-context:time-format" });

	const base = createBaseAccessor(locale);
	return extendFunction(base, {
		language: {
			writable: false,
			enumerable: false,
			configurable: true,
			value: language,
		},
		numberFormat: {
			writable: false,
			enumerable: false,
			configurable: true,
			value: numberFormat,
		},
		timeFormat: {
			writable: false,
			enumerable: false,
			configurable: false,
			value: timeFormat,
		},
	});
}

export interface HassContextAccessor
	extends MemoizedAccessor<HomeAssistant | undefined> {
	readonly locale: HassLocaleContextAccessor;
}

function createHassContextAccessor(
	context: Context<Accessor<HomeAssistant | undefined>>,
): HassContextAccessor {
	const accessor = useContext(context);
	const base = createBaseAccessor(accessor);
	const locale = createHassLocaleContextAccessor(base);

	return extendFunction(base, {
		locale: {
			writable: false,
			enumerable: false,
			configurable: true,
			value: locale,
		},
	});
}

const HassContext = createContext<Accessor<HomeAssistant | undefined>>(
	() => void 0,
	{ name: "hass" },
);

export const useHass = () => createHassContextAccessor(HassContext);
export const useLocale = () => useHass().locale;
export const useLanguage = () => useLocale().language;

export const HassProvider: ContextProviderComponent<
	Accessor<HomeAssistant | undefined>
> = HassContext.Provider;
