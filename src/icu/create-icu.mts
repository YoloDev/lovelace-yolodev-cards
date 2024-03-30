import { type Message, MessageFormat, MessagePart } from "messageformat";
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

		const messageFormat = new MessageFormat(message, [locale, found]);
		this.cache.set(locale, messageFormat);
		return messageFormat;
	}
}

type IcuEntry = {
	readonly locale: string;
	readonly message: Message;
};

export type MessageFactory = {
	toString: (
		locale: string | undefined,
		msgParams?: Record<string, unknown>,
	) => string;
	toParts: (
		locale: string | undefined,
		msgParams?: Record<string, unknown>,
	) => MessagePart[];
};

export const createIcu = (langs: readonly IcuEntry[]): MessageFactory => {
	const messages = new Map<string, Message>();
	for (const lang of langs) {
		messages.set(lang.locale, lang.message);
	}

	const localeLookup = new LocaleLookup(messages);
	const toString = (
		locale: string | undefined,
		msgParams?: Record<string, unknown>,
	) => {
		const lang = locale || "en";
		const messageFormat = localeLookup.findMessageFormat(lang);
		return messageFormat.format(msgParams);
	};
	const toParts = (
		locale: string | undefined,
		msgParams?: Record<string, unknown>,
	) => {
		const lang = locale || "en";
		const messageFormat = localeLookup.findMessageFormat(lang);
		return messageFormat.formatToParts(msgParams);
	};

	return Object.freeze({ toString, toParts });
};
