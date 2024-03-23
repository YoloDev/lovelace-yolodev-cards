import ctx from "./context.mjs";
import { connect, authtoken } from "ngrok";

await authtoken(process.env.NGROK_TOKEN);

const server = await ctx.serve({ port: 3000, servedir: "dist" });
const url = await connect({ port: server.port, region: "eu" });

console.log(`Server running at ${chalk.magenta(url + "/cards.js")}`);
