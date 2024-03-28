import dotenv from "dotenv";

export const loadEnv = (name: string, isLocal: boolean) => {
	let paths = [".env"];
	if (name) {
		paths.unshift(`.env.${name}`);
	}
	if (isLocal) {
		paths.unshift(".env.local");

		if (name) {
			paths.unshift(`.env.${name}.local`);
		}
	}

	dotenv.config({
		path: paths,
	});
};

export const requireEnv = (name: string) => {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing environment variable: ${name}`);
	}

	return value;
};
