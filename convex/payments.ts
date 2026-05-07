import { query } from "./_generated/server";

export const getLeakage = query({
  args: {},
  handler: async (ctx) => {
    const allFailures = await ctx.db
      .query("paymentFailures")
      .withIndex("by_resolved", (q) => q.eq("resolved", false))
      .collect();

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentFailures = allFailures.filter(
      (f) => f.firstFailedAt >= thirtyDaysAgo,
    );

    const failedTotal = recentFailures.reduce(
      (sum, f) => sum + f.amountUsd,
      0,
    );

    const allSubs = await ctx.db.query("subscriptions").collect();

    const pastDueSubs = allSubs.filter((s) => s.status === "past_due");
    const pastDueMrr = pastDueSubs.reduce((sum, s) => sum + s.mrrUsd, 0);

    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const nextMonth = thirtyDaysFromNow.getMonth() + 1;
    const nextYear = thirtyDaysFromNow.getFullYear();

    const expiringCards = allSubs.filter((s) => {
      if (
        s.status !== "active" &&
        s.status !== "trialing" &&
        s.status !== "past_due"
      )
        return false;
      if (!s.paymentMethodExpMonth || !s.paymentMethodExpYear) return false;

      const expYear = s.paymentMethodExpYear;
      const expMonth = s.paymentMethodExpMonth;

      if (expYear < currentYear) return true;
      if (expYear === currentYear && expMonth <= currentMonth) return true;
      if (expYear === nextYear && expMonth <= nextMonth) return true;
      if (expYear === currentYear && expMonth <= currentMonth + 1) return true;

      return false;
    });

    return {
      failedPayments: {
        count: recentFailures.length,
        totalAmountUsd: Math.round(failedTotal * 100) / 100,
        items: recentFailures
          .sort((a, b) => b.lastAttemptAt - a.lastAttemptAt)
          .slice(0, 50),
      },
      expiringCards: {
        count: expiringCards.length,
        items: expiringCards
          .sort((a, b) => {
            const aExp =
              (a.paymentMethodExpYear ?? 0) * 12 +
              (a.paymentMethodExpMonth ?? 0);
            const bExp =
              (b.paymentMethodExpYear ?? 0) * 12 +
              (b.paymentMethodExpMonth ?? 0);
            return aExp - bExp;
          })
          .slice(0, 50),
      },
      pastDue: {
        count: pastDueSubs.length,
        mrrAtRiskUsd: Math.round(pastDueMrr * 100) / 100,
        items: pastDueSubs
          .sort((a, b) => b.mrrUsd - a.mrrUsd)
          .slice(0, 50),
      },
    };
  },
});
