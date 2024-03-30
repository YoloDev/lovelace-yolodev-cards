import {
	type Component,
	type JSX,
	createContext,
	createMemo,
	useContext,
} from "solid-js";
import { MessageFactory } from "./icu/create-icu.mjs";
import {
	type MessageLiteralPart,
	type MessageMarkupPart,
	type MessagePart,
	type MessageNumberPart,
} from "messageformat";

const LocaleContext = createContext<string>("en");

export const LocaleProvider = LocaleContext.Provider;

export type MarkupFunction = (
	children?: JSX.Element,
	options?: Record<string, unknown>,
) => JSX.Element;

export type LocalizedProps = {
	readonly locale?: string;
	readonly message: MessageFactory;
	readonly args?: Record<string, unknown>;
	readonly markup?: Record<string, MarkupFunction>;
};

export const Localized: Component<LocalizedProps> = (props) => {
	const locale = () => props.locale || useContext(LocaleContext);
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

const walkParts = (parts: readonly MessagePart[], visitor: PartVisitor) => {
	for (const part of parts) {
		switch (part.type) {
			case "literal": {
				const literalPart = part as MessageLiteralPart;
				visitor.literal(literalPart.value);
				break;
			}

			case "markup": {
				const markupPart = part as MessageMarkupPart;
				switch (markupPart.kind) {
					case "open": {
						visitor.openMarkup(markupPart.name, markupPart.options);
						break;
					}

					case "standalone": {
						visitor.standaloneMarkup(markupPart.name, markupPart.options);
						break;
					}

					case "close": {
						visitor.closeMarkup(markupPart.name);
						break;
					}
				}
				break;
			}

			case "number": {
				const numberPart = part as MessageNumberPart;
				visitor.number(numberPart.parts);
				break;
			}
		}
	}
};

export const localize = (
	message: MessageFactory,
	args?: Record<string, unknown>,
) => {
	const locale = useContext(LocaleContext);
	return message.toString(locale, args);
};
