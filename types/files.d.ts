declare module "*.icu" {
	import type { MessagePart } from "messageformat";
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
	const messages: Record<string, MessageFactory>;
	export default messages;
}

declare module "*.css" {
	export const path: string;
	export const properties: readonly PropertyDefinition[];
}
