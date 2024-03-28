import createContext from "./context.mjs";
import chalk from "chalk";
import { loadEnv, requireEnv } from "./env.mjs";
import open from "open";
import { Proxy } from "http-mitm-proxy";

loadEnv("watch", true);

const homeAssistantUrl = new URL(requireEnv("HOME_ASSISTANT_URL"));
const replaceAddress = Buffer.from(requireEnv("HOME_ASSISTANT_RESOURCE_URL"));
let replaceAddressWith = Buffer.from(
	`http://localhost:3000/.esbuild/yolodev-cards.js?_v=${Date.now()}`,
);

const ctx = await createContext({
	name: "update-replacement-url",
	setup: (build) => {
		build.onEnd((_) => {
			replaceAddressWith = Buffer.from(
				`http://localhost:3000/.esbuild/yolodev-cards.js?_v=${Date.now()}`,
			);
		});
	},
});

const esbuildServer = await ctx.serve({
	port: 0,
});

const proxy = new Proxy();
proxy.onError((ctx, err) => {
	console.error("proxy error:", err);
});

proxy.onRequest((ctx, callback) => {
	const options = ctx.proxyToServerRequestOptions!;
	if (ctx.clientToProxyRequest.url?.startsWith("/.esbuild/")) {
		options.port = esbuildServer.port;
		options.host = "0.0.0.0";
		options.path = ctx.clientToProxyRequest.url.replace(/^\/\.esbuild\//, "/");
		options.headers.host = "localhost";

		return callback();
	}

	options.host = homeAssistantUrl.hostname;
	options.port = homeAssistantUrl.port;
	options.headers.host = homeAssistantUrl.hostname;
	callback();
});

proxy.onWebSocketConnection((ctx, callback) => {
	const options = ctx.proxyToServerWebSocketOptions!;
	console.log("WEBSOCKET CONNECT:", options.url);
	options.host = homeAssistantUrl.hostname;
	options.protocol = homeAssistantUrl.protocol.replace("http", "ws");
	options.headers!.host = homeAssistantUrl.hostname;
	callback();
});

proxy.onWebSocketMessage(
	(ctx, message: Buffer, isBinary: boolean, callback) => {
		if (isBinary) {
			return callback(null, message, isBinary);
		}

		const replacement = replaceAddressWith;
		while (true) {
			const index = message.indexOf(replaceAddress);
			if (index === -1) {
				break;
			}

			message = Buffer.concat(
				[
					message.subarray(0, index),
					replacement,
					message.subarray(index + replaceAddress.length),
				],
				message.length + replacement.length - replaceAddress.length,
			);
		}

		callback(null, message, isBinary);
	},
);

proxy.listen({ port: 3000 }, () => {
	console.log(`Server running at ${chalk.magenta("http://localhost:3000")}`);
	open("http://localhost:3000");
});
