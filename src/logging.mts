import { pino } from "pino";

const baseLogger = pino({
	level: process.env.LOG_LEVEL,
	browser: {
		write: {
			trace: (o) => console.trace(o),
			debug: (o) => console.debug(o),
			info: (o) => console.info(o),
			warn: (o) => console.warn(o),
			error: (o) => console.error(o),
			fatal: (o) => console.error(o),
		},
	},
});

export const createLogger = (name: string) => baseLogger.child({ name });
