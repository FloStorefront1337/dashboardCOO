import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const handleSubscriptionCreated = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    stripeEventId: v.string(),
    plan: v.union(v.literal("basic"), v.literal("boost")),
    status: v.string(),
    mrr: v.number(),
    currency: v.string(),
    listingCount: v.number(),
    startDate: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    stripeProductId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .first();

    if (existing) return;

    const mrrUsd = await convertToUsd(ctx, args.mrr, args.currency);

    await ctx.db.insert("subscriptions", {
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripeCustomerId: args.stripeCustomerId,
      plan: args.plan,
      status: args.status as any,
      mrr: args.mrr,
      mrrUsd,
      currency: args.currency,
      listingCount: args.listingCount,
      startDate: args.startDate,
      currentPeriodEnd: args.currentPeriodEnd,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd,
      stripeProductId: args.stripeProductId,
      stripePriceId: args.stripePriceId,
      email: args.customerEmail,
      loName: args.customerName,
      lastSyncedAt: Date.now(),
    });

    const existingEvent = await ctx.db
      .query("subscriptionEvents")
      .withIndex("by_stripe_event_id", (q) =>
        q.eq("stripeEventId", args.stripeEventId),
      )
      .first();

    if (!existingEvent) {
      await ctx.db.insert("subscriptionEvents", {
        stripeSubscriptionId: args.stripeSubscriptionId,
        stripeCustomerId: args.stripeCustomerId,
        type: "new",
        mrrDelta: args.mrr,
        mrrDeltaUsd: mrrUsd,
        currency: args.currency,
        newMrr: args.mrr,
        timestamp: args.startDate,
        stripeEventId: args.stripeEventId,
      });
    }
  },
});

export const handleSubscriptionUpdated = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    stripeEventId: v.string(),
    status: v.string(),
    mrr: v.number(),
    currency: v.string(),
    listingCount: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    canceledAt: v.optional(v.number()),
    stripeProductId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    plan: v.union(v.literal("basic"), v.literal("boost")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .first();

    if (!existing) return;

    const mrrUsd = await convertToUsd(ctx, args.mrr, args.currency);
    const mrrDelta = args.mrr - existing.mrr;
    const mrrDeltaUsd = mrrUsd - existing.mrrUsd;

    await ctx.db.patch(existing._id, {
      status: args.status as any,
      mrr: args.mrr,
      mrrUsd,
      plan: args.plan,
      listingCount: args.listingCount,
      currentPeriodEnd: args.currentPeriodEnd,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd,
      canceledAt: args.canceledAt,
      stripeProductId: args.stripeProductId,
      stripePriceId: args.stripePriceId,
      lastSyncedAt: Date.now(),
    });

    if (mrrDelta !== 0) {
      const existingEvent = await ctx.db
        .query("subscriptionEvents")
        .withIndex("by_stripe_event_id", (q) =>
          q.eq("stripeEventId", args.stripeEventId),
        )
        .first();

      if (!existingEvent) {
        await ctx.db.insert("subscriptionEvents", {
          stripeSubscriptionId: args.stripeSubscriptionId,
          stripeCustomerId: args.stripeCustomerId,
          type: mrrDelta > 0 ? "upgrade" : "downgrade",
          mrrDelta,
          mrrDeltaUsd,
          currency: args.currency,
          previousMrr: existing.mrr,
          newMrr: args.mrr,
          timestamp: Date.now(),
          stripeEventId: args.stripeEventId,
        });
      }
    }
  },
});

export const handleSubscriptionDeleted = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    stripeEventId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .first();

    if (!existing) return;

    await ctx.db.patch(existing._id, {
      status: "canceled",
      canceledAt: Date.now(),
      lastSyncedAt: Date.now(),
    });

    const existingEvent = await ctx.db
      .query("subscriptionEvents")
      .withIndex("by_stripe_event_id", (q) =>
        q.eq("stripeEventId", args.stripeEventId),
      )
      .first();

    if (!existingEvent) {
      await ctx.db.insert("subscriptionEvents", {
        stripeSubscriptionId: args.stripeSubscriptionId,
        stripeCustomerId: args.stripeCustomerId,
        type: "churn",
        mrrDelta: -existing.mrr,
        mrrDeltaUsd: -existing.mrrUsd,
        currency: existing.currency,
        previousMrr: existing.mrr,
        newMrr: 0,
        timestamp: Date.now(),
        stripeEventId: args.stripeEventId,
      });
    }
  },
});

export const handlePaymentFailed = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    stripeInvoiceId: v.string(),
    amount: v.number(),
    currency: v.string(),
    failureCode: v.optional(v.string()),
    failureMessage: v.optional(v.string()),
    attemptCount: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("paymentFailures")
      .withIndex("by_stripe_invoice_id", (q) =>
        q.eq("stripeInvoiceId", args.stripeInvoiceId),
      )
      .first();

    const amountUsd = await convertToUsd(ctx, args.amount, args.currency);

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        attemptCount: args.attemptCount,
        lastAttemptAt: Date.now(),
        failureCode: args.failureCode,
        failureMessage: args.failureMessage,
      });
    } else {
      await ctx.db.insert("paymentFailures", {
        stripeSubscriptionId: args.stripeSubscriptionId,
        stripeCustomerId: args.stripeCustomerId,
        stripeInvoiceId: args.stripeInvoiceId,
        sfAccountId: subscription?.sfAccountId,
        loName: subscription?.loName,
        amount: args.amount,
        amountUsd,
        currency: args.currency,
        failureCode: args.failureCode,
        failureMessage: args.failureMessage,
        attemptCount: args.attemptCount,
        firstFailedAt: Date.now(),
        lastAttemptAt: Date.now(),
        resolved: false,
      });
    }
  },
});

export const handlePaymentSucceeded = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    stripeInvoiceId: v.string(),
  },
  handler: async (ctx, args) => {
    const failure = await ctx.db
      .query("paymentFailures")
      .withIndex("by_stripe_invoice_id", (q) =>
        q.eq("stripeInvoiceId", args.stripeInvoiceId),
      )
      .first();

    if (failure && !failure.resolved) {
      await ctx.db.patch(failure._id, {
        resolved: true,
        resolvedAt: Date.now(),
      });
    }
  },
});

async function convertToUsd(
  ctx: any,
  amount: number,
  currency: string,
): Promise<number> {
  if (currency.toLowerCase() === "usd") return amount;

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const rate = await ctx.db
    .query("exchangeRates")
    .withIndex("by_month_currency", (q: any) =>
      q.eq("month", month).eq("currency", currency.toLowerCase()),
    )
    .first();

  if (rate) return Math.round(amount * rate.rateToUsd * 100) / 100;

  const fallbackRates: Record<string, number> = {
    eur: 1.08,
    gbp: 1.27,
  };

  const fallback = fallbackRates[currency.toLowerCase()];
  if (fallback) return Math.round(amount * fallback * 100) / 100;

  return amount;
}
