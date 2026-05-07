import { query } from "./_generated/server";
import { v } from "convex/values";

export const getSummary = query({
  args: {},
  handler: async (ctx) => {
    const allSubs = await ctx.db.query("subscriptions").collect();
    const activeSubs = allSubs.filter(
      (s) => s.status === "active" || s.status === "trialing",
    );

    const currentMrr = activeSubs.reduce((sum, s) => sum + s.mrrUsd, 0);
    const subscriberCount = new Set(activeSubs.map((s) => s.stripeCustomerId))
      .size;
    const basicCount = activeSubs.filter((s) => s.plan === "basic").length;
    const boostCount = activeSubs.filter((s) => s.plan === "boost").length;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthStart = startOfMonth.getTime();
    const lastMonthStart = startOfLastMonth.getTime();

    const monthEvents = await ctx.db
      .query("subscriptionEvents")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", monthStart))
      .collect();

    const lastMonthEvents = await ctx.db
      .query("subscriptionEvents")
      .withIndex("by_timestamp", (q) =>
        q.gte("timestamp", lastMonthStart),
      )
      .collect();
    const lastMonthOnly = lastMonthEvents.filter(
      (e) => e.timestamp < monthStart,
    );

    const newMrr = sumByType(monthEvents, "new");
    const expansionMrr = sumByType(monthEvents, "upgrade");
    const contractionMrr = Math.abs(sumByType(monthEvents, "downgrade"));
    const churnMrr = Math.abs(sumByType(monthEvents, "churn"));
    const netNewMrr = newMrr + expansionMrr - contractionMrr - churnMrr;

    const lastMonthChurn = Math.abs(sumByType(lastMonthOnly, "churn"));

    const lastMonthSnapshot = await ctx.db
      .query("mrrSnapshots")
      .withIndex("by_date")
      .order("desc")
      .first();

    const previousMrr = lastMonthSnapshot?.totalMrrUsd ?? currentMrr;
    const mrrGrowthPct =
      previousMrr > 0
        ? Math.round(((currentMrr - previousMrr) / previousMrr) * 10000) / 100
        : 0;

    const startOfMonthMrr = currentMrr - netNewMrr;
    const churnRate =
      startOfMonthMrr > 0
        ? Math.round((churnMrr / startOfMonthMrr) * 10000) / 100
        : 0;

    const lastMonthChurnRate =
      previousMrr > 0
        ? Math.round((lastMonthChurn / previousMrr) * 10000) / 100
        : 0;

    return {
      currentMrr: Math.round(currentMrr * 100) / 100,
      previousMrr: Math.round(previousMrr * 100) / 100,
      mrrGrowthPct,
      subscriberCount,
      basicCount,
      boostCount,
      netNewMrr: Math.round(netNewMrr * 100) / 100,
      newMrr: Math.round(newMrr * 100) / 100,
      expansionMrr: Math.round(expansionMrr * 100) / 100,
      contractionMrr: Math.round(contractionMrr * 100) / 100,
      churnMrr: Math.round(churnMrr * 100) / 100,
      churnRate,
      lastMonthChurnRate,
    };
  },
});

export const getWaterfall = query({
  args: {
    months: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const monthCount = args.months ?? 12;
    const now = new Date();
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth() - monthCount + 1,
      1,
    );

    const events = await ctx.db
      .query("subscriptionEvents")
      .withIndex("by_timestamp", (q) =>
        q.gte("timestamp", startDate.getTime()),
      )
      .collect();

    const months: Record<
      string,
      {
        month: string;
        newMrr: number;
        expansionMrr: number;
        contractionMrr: number;
        churnMrr: number;
        netMrr: number;
      }
    > = {};

    for (let i = 0; i < monthCount; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - monthCount + 1 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = {
        month: key,
        newMrr: 0,
        expansionMrr: 0,
        contractionMrr: 0,
        churnMrr: 0,
        netMrr: 0,
      };
    }

    for (const event of events) {
      const d = new Date(event.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!months[key]) continue;

      const amount = Math.abs(event.mrrDeltaUsd);
      switch (event.type) {
        case "new":
          months[key].newMrr += amount;
          break;
        case "upgrade":
          months[key].expansionMrr += amount;
          break;
        case "downgrade":
          months[key].contractionMrr += amount;
          break;
        case "churn":
          months[key].churnMrr += amount;
          break;
      }
    }

    const snapshots = await ctx.db
      .query("mrrSnapshots")
      .withIndex("by_date")
      .collect();
    const snapshotMap = new Map(snapshots.map((s) => [s.date, s]));

    const result = Object.values(months)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => {
        const snap = Array.from(snapshotMap.values()).find((s) =>
          s.date.startsWith(m.month),
        );
        return {
          ...m,
          newMrr: Math.round(m.newMrr * 100) / 100,
          expansionMrr: Math.round(m.expansionMrr * 100) / 100,
          contractionMrr: Math.round(m.contractionMrr * 100) / 100,
          churnMrr: Math.round(m.churnMrr * 100) / 100,
          netMrr:
            Math.round(
              (m.newMrr + m.expansionMrr - m.contractionMrr - m.churnMrr) *
                100,
            ) / 100,
          totalMrr: snap?.totalMrrUsd ?? null,
        };
      });

    return result;
  },
});

export const listSubscriptions = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("past_due"),
        v.literal("canceled"),
        v.literal("all"),
      ),
    ),
    plan: v.optional(
      v.union(v.literal("basic"), v.literal("boost"), v.literal("all")),
    ),
    market: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let subs = await ctx.db.query("subscriptions").collect();

    if (args.status && args.status !== "all") {
      subs = subs.filter((s) => s.status === args.status);
    }
    if (args.plan && args.plan !== "all") {
      subs = subs.filter((s) => s.plan === args.plan);
    }
    if (args.market) {
      subs = subs.filter((s) => s.market === args.market);
    }

    return subs.sort((a, b) => b.mrrUsd - a.mrrUsd);
  },
});

function sumByType(
  events: Array<{ type: string; mrrDeltaUsd: number }>,
  type: string,
): number {
  return events
    .filter((e) => e.type === type)
    .reduce((sum, e) => sum + e.mrrDeltaUsd, 0);
}
