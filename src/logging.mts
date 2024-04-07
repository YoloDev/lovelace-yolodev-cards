import { pino } from "pino";

const baseLogger = pino({
	level: process.env.LOG_LEVEL,
	browser: {
		write: {
			trace: (o) => console.log(o),
		},
	},
});

export const createLogger = (name: string) => baseLogger.child({ name });
