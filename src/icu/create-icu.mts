import { type Message, MessageFormat } from "messageformat";
import { lookup } from "bcp-47-match";

class LocaleLookup {
	readonly locales: string[];
	readonly definitions: Map<string, Message>;
	readonly cache: Map<string, MessageFormat>;

	constructor(definitions: Map<string, Message>) {
		this.locales = [...definitions.keys()];
		this.definitions = definitions;
		this.cache = new Map();

		if (!this.definitions.get("en")) {
			throw new Error("Missing locale for en");
		}
	}

	findMessageFormat(locale: string): MessageFormat {
		const cached = this.cache.get(locale);
		if (cached) {
			return cached;
		}

		const found = lookup(this.locales, locale) ?? "en";
		const message = this.definitions.get(found);
		if (!message) {
			throw new Error(`Could not find locale for ${locale}`);
		}

		const messageFormat = new MessageFormat(message, found);
		this.cache.set(locale, messageFormat);
		return messageFormat;
	}
}

type IcuEntry = {
	readonly locale: string;
	readonly message: Message;
};

export type MessageFactory = (
	locale: string | undefined,
	msgParams?: Record<string, unknown>,
) => string;

export const createIcu = (langs: readonly IcuEntry[]): MessageFactory => {
	const messages = new Map<string, Message>();
	for (const lang of langs) {
		messages.set(lang.locale, lang.message);
	}

	const localeLookup = new LocaleLookup(messages);

	return (locale: string | undefined, msgParams) => {
		const lang = locale || "en";
		const messageFormat = localeLookup.findMessageFormat(lang);
		return messageFormat.format(msgParams);
	};
};
