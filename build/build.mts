import createContext from "./context.mjs";

const ctx = await createContext();
await ctx.rebuild();
await ctx.dispose();
