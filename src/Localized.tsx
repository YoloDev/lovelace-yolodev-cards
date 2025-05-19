import type { FrontendLocaleData } from "custom-card-helpers";
import { type MessageNumberPart, type MessagePart } from "messageformat";
import type { Component, JSX } from "solid-js";
import { useLanguage } from "./hass-context";
import type { MessageFactory } from "./icu/create-icu.mjs";

export type MarkupFunction = (
	children?: JSX.Element,
	options?: Record<string, unknown>,
) => JSX.Element;

export type LocalizedProps = {
	readonly locale?: FrontendLocaleData;
	readonly message: MessageFactory;
	readonly args?: Record<string, unknown>;
	readonly markup?: Record<string, MarkupFunction>;
};

export const Localized: Component<LocalizedProps> = (props) => {
	const languageAccessor = useLanguage();
	const locale = () => languageAccessor() || "en";
	const parts = () => {
		const message = props.message;
		const args = props.args;
		const markupSet = props.markup;

		if (!markupSet) {
			return message.toString(locale(), args);
		}

		const parts = message.toParts(locale(), args);
		let current: JSX.Element[] = [];
		let stack: {
			readonly markup: MarkupFunction;
			readonly options: Record<string, unknown> | undefined;
			readonly parent: JSX.Element[];
		}[] = [];

		walkParts(parts, {
			literal(value) {
				current.push(value);
			},

			number(parts) {
				for (const part of parts) {
					current.push(part.value);
				}
			},

			openMarkup(name, options) {
				const markup = markupSet?.[name];
				if (!markup) {
					return;
				}

				stack.push({ markup, options, parent: current });
				current = [];
			},

			standaloneMarkup(name, options) {
				const markup = markupSet?.[name];
				if (!markup) {
					return;
				}

				const element = markup(void 0, options);
				current.push(element);
			},

			closeMarkup(name) {
				const fn = markupSet?.[name];
				if (!fn) {
					return;
				}

				const { markup, options, parent } = stack.pop()!;
				const element = markup(current, options);
				current = parent;
				current.push(element);
			},
		});

		return current;
	};

	return <>{parts()}</>;
};

type PartVisitor = {
	readonly literal: (value: string) => void;
	readonly number: (parts: readonly Intl.NumberFormatPart[]) => void;
	readonly openMarkup: (
		name: string,
		options?: Record<string, unknown>,
	) => void;
	readonly standaloneMarkup: (
		name: string,
		options?: Record<string, unknown>,
	) => void;
	readonly closeMarkup: (name: string) => void;
};

const walkParts = (
	parts: readonly MessagePart<never>[],
	visitor: PartVisitor,
) => {
	for (const part of parts) {
		switch (part.type) {
			case "text": {
				visitor.literal(part.value);
				break;
			}

			case "markup": {
				switch (part.kind) {
					case "open": {
						visitor.openMarkup(part.name, part.options);
						break;
					}

					case "standalone": {
						visitor.standaloneMarkup(part.name, part.options);
						break;
					}

					case "close": {
						visitor.closeMarkup(part.name);
						break;
					}

					default: {
						const exhaustive: never = part.kind;
						throw new Error(`Unexpected markup kind: ${exhaustive}`);
					}
				}
				break;
			}

			case "number": {
				const numberPart = part as MessageNumberPart;
				visitor.number(numberPart.parts);
				break;
			}

			default: {
				throw new Error(`Unsupported part type: ${part.type}`);
			}
		}
	}
};

export const localize = (
	message: MessageFactory,
	args?: Record<string, unknown>,
) => {
	const language = useLanguage()() ?? "en";
	return message.toString(language, args);
};
