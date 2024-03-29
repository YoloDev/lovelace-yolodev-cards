declare module "*.icu" {
	type MessageFactory = (
		locale: string | undefined,
		msgParams?: Record<string, unknown>,
	) => string;
	const messages: Record<string, MessageFactory>;
	export default messages;
}

declare module "*.css" {
	const css: string;
	export default css;
}
