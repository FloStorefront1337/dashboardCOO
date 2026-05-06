import { query } from "./_generated/server";

export const ping = query({
  args: {},
  handler: async () => {
    return { status: "ok" as const, timestamp: Date.now() };
  },
});
