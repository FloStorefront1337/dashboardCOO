import { internalAction, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import Stripe from "stripe";

export const syncSubscriptions = internalAction({
  args: {},
  handler: async (ctx) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      return;
    }

    const stripe = new Stripe(stripeKey);
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const params: Stripe.SubscriptionListParams = {
        limit: 100,
        expand: ["data.customer", "data.default_payment_method"],
      };
      if (startingAfter) params.starting_after = startingAfter;

      const subscriptions = await stripe.subscriptions.list(params);

      for (const rawSub of subscriptions.data) {
        const sub = rawSub as any;
        const item = sub.items.data[0];
        const unitAmount = (item?.price?.unit_amount ?? 0) / 100;
        const quantity = item?.quantity ?? 1;
        let mrr = unitAmount * quantity;

        if (item?.price?.recurring?.interval === "year") {
          mrr = Math.round((mrr / 12) * 100) / 100;
        }

        const customer =
          typeof sub.customer === "string" ? null : sub.customer;
        const pm =
          sub.default_payment_method &&
          typeof sub.default_payment_method !== "string"
            ? sub.default_payment_method
            : null;

        const planType =
          sub.metadata?.plan_type?.toLowerCase().includes("boost") ||
          (typeof item?.price?.product === "string" &&
            item.price.product.toLowerCase().includes("boost"))
            ? "boost"
            : "basic";

        const periodEnd =
          item?.current_period_end ?? sub.current_period_end ?? 0;

        await ctx.runMutation(internal.stripe.sync.upsertSubscription, {
          stripeSubscriptionId: sub.id,
          stripeCustomerId:
            typeof sub.customer === "string"
              ? sub.customer
              : sub.customer.id,
          plan: planType as "basic" | "boost",
          status: sub.status,
          mrr,
          currency: sub.currency,
          listingCount: quantity,
          startDate: (sub.start_date ?? 0) * 1000,
          currentPeriodEnd: periodEnd * 1000,
          cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
          canceledAt: sub.canceled_at
            ? sub.canceled_at * 1000
            : undefined,
          stripeProductId:
            typeof item?.price?.product === "string"
              ? item.price.product
              : undefined,
          stripePriceId: item?.price?.id,
          customerEmail: customer?.email ?? undefined,
          customerName: customer?.name ?? undefined,
          paymentMethodExpMonth: pm?.card?.exp_month ?? undefined,
          paymentMethodExpYear: pm?.card?.exp_year ?? undefined,
          paymentMethodLast4: pm?.card?.last4 ?? undefined,
          paymentMethodBrand: pm?.card?.brand ?? undefined,
          market: sub.metadata?.market ?? undefined,
          sfAccountId: sub.metadata?.sf_account_id ?? undefined,
        });
      }

      hasMore = subscriptions.has_more;
      if (subscriptions.data.length > 0) {
        startingAfter =
          subscriptions.data[subscriptions.data.length - 1].id;
      }
    }

    console.log("Stripe subscription sync completed");
  },
});

export const upsertSubscription = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    plan: v.union(v.literal("basic"), v.literal("boost")),
    status: v.string(),
    mrr: v.number(),
    currency: v.string(),
    listingCount: v.number(),
    startDate: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    canceledAt: v.optional(v.number()),
    stripeProductId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerName: v.optional(v.string()),
    paymentMethodExpMonth: v.optional(v.number()),
    paymentMethodExpYear: v.optional(v.number()),
    paymentMethodLast4: v.optional(v.string()),
    paymentMethodBrand: v.optional(v.string()),
    market: v.optional(v.string()),
    sfAccountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
      )
      .first();

    const mrrUsd = await convertToUsd(ctx, args.mrr, args.currency);

    if (existing) {
      await ctx.db.patch(existing._id, {
        plan: args.plan,
        status: args.status as any,
        mrr: args.mrr,
        mrrUsd,
        currency: args.currency,
        listingCount: args.listingCount,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        canceledAt: args.canceledAt,
        stripeProductId: args.stripeProductId,
        stripePriceId: args.stripePriceId,
        email: args.customerEmail ?? existing.email,
        loName: args.customerName ?? existing.loName,
        paymentMethodExpMonth: args.paymentMethodExpMonth,
        paymentMethodExpYear: args.paymentMethodExpYear,
        paymentMethodLast4: args.paymentMethodLast4,
        paymentMethodBrand: args.paymentMethodBrand,
        market: args.market ?? existing.market,
        sfAccountId: args.sfAccountId ?? existing.sfAccountId,
        lastSyncedAt: Date.now(),
      });
    } else {
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
        canceledAt: args.canceledAt,
        stripeProductId: args.stripeProductId,
        stripePriceId: args.stripePriceId,
        email: args.customerEmail,
        loName: args.customerName,
        paymentMethodExpMonth: args.paymentMethodExpMonth,
        paymentMethodExpYear: args.paymentMethodExpYear,
        paymentMethodLast4: args.paymentMethodLast4,
        paymentMethodBrand: args.paymentMethodBrand,
        market: args.market,
        sfAccountId: args.sfAccountId,
        lastSyncedAt: Date.now(),
      });
    }
  },
});

export const snapshotMrr = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];

    const existing = await ctx.db
      .query("mrrSnapshots")
      .withIndex("by_date", (q) => q.eq("date", today))
      .first();

    if (existing) return;

    const allSubs = await ctx.db.query("subscriptions").collect();
    const activeSubs = allSubs.filter(
      (s) => s.status === "active" || s.status === "trialing",
    );

    const totalMrrUsd = activeSubs.reduce((sum, s) => sum + s.mrrUsd, 0);
    const basicCount = activeSubs.filter((s) => s.plan === "basic").length;
    const boostCount = activeSubs.filter((s) => s.plan === "boost").length;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthStart = startOfMonth.getTime();

    const monthEvents = await ctx.db
      .query("subscriptionEvents")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", monthStart))
      .collect();

    const newMrr = monthEvents
      .filter((e) => e.type === "new")
      .reduce((sum, e) => sum + e.mrrDeltaUsd, 0);
    const expansionMrr = monthEvents
      .filter((e) => e.type === "upgrade")
      .reduce((sum, e) => sum + e.mrrDeltaUsd, 0);
    const contractionMrr = monthEvents
      .filter((e) => e.type === "downgrade")
      .reduce((sum, e) => sum + Math.abs(e.mrrDeltaUsd), 0);
    const churnMrr = monthEvents
      .filter((e) => e.type === "churn")
      .reduce((sum, e) => sum + Math.abs(e.mrrDeltaUsd), 0);

    await ctx.db.insert("mrrSnapshots", {
      date: today,
      totalMrr: totalMrrUsd,
      totalMrrUsd: totalMrrUsd,
      newMrr: Math.round(newMrr * 100) / 100,
      expansionMrr: Math.round(expansionMrr * 100) / 100,
      contractionMrr: Math.round(contractionMrr * 100) / 100,
      churnMrr: Math.round(churnMrr * 100) / 100,
      netNewMrr:
        Math.round((newMrr + expansionMrr - contractionMrr - churnMrr) * 100) /
        100,
      subscriberCount: activeSubs.length,
      basicCount,
      boostCount,
    });
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
