import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  subscriptions: defineTable({
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    sfAccountId: v.optional(v.string()),
    loName: v.optional(v.string()),
    email: v.optional(v.string()),
    plan: v.union(v.literal("basic"), v.literal("boost")),
    status: v.union(
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("incomplete"),
      v.literal("trialing"),
      v.literal("unpaid"),
      v.literal("paused"),
    ),
    mrr: v.number(),
    mrrUsd: v.number(),
    currency: v.string(),
    listingCount: v.number(),
    market: v.optional(v.string()),
    startDate: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    canceledAt: v.optional(v.number()),
    stripeProductId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    paymentMethodExpMonth: v.optional(v.number()),
    paymentMethodExpYear: v.optional(v.number()),
    paymentMethodLast4: v.optional(v.string()),
    paymentMethodBrand: v.optional(v.string()),
    lastSyncedAt: v.number(),
  })
    .index("by_stripe_subscription_id", ["stripeSubscriptionId"])
    .index("by_stripe_customer_id", ["stripeCustomerId"])
    .index("by_status", ["status"])
    .index("by_market", ["market"])
    .index("by_sf_account_id", ["sfAccountId"])
    .index("by_plan_status", ["plan", "status"]),

  subscriptionEvents: defineTable({
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    type: v.union(
      v.literal("new"),
      v.literal("upgrade"),
      v.literal("downgrade"),
      v.literal("churn"),
      v.literal("reactivation"),
      v.literal("payment_succeeded"),
      v.literal("payment_failed"),
    ),
    mrrDelta: v.number(),
    mrrDeltaUsd: v.number(),
    currency: v.string(),
    previousMrr: v.optional(v.number()),
    newMrr: v.optional(v.number()),
    timestamp: v.number(),
    stripeEventId: v.optional(v.string()),
    metadata: v.optional(v.string()),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_type_timestamp", ["type", "timestamp"])
    .index("by_subscription_id", ["stripeSubscriptionId"])
    .index("by_stripe_event_id", ["stripeEventId"]),

  paymentFailures: defineTable({
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    stripeInvoiceId: v.string(),
    sfAccountId: v.optional(v.string()),
    loName: v.optional(v.string()),
    amount: v.number(),
    amountUsd: v.number(),
    currency: v.string(),
    failureCode: v.optional(v.string()),
    failureMessage: v.optional(v.string()),
    attemptCount: v.number(),
    firstFailedAt: v.number(),
    lastAttemptAt: v.number(),
    resolved: v.boolean(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_resolved", ["resolved"])
    .index("by_subscription_id", ["stripeSubscriptionId"])
    .index("by_stripe_invoice_id", ["stripeInvoiceId"]),

  mrrSnapshots: defineTable({
    date: v.string(),
    totalMrr: v.number(),
    totalMrrUsd: v.number(),
    newMrr: v.number(),
    expansionMrr: v.number(),
    contractionMrr: v.number(),
    churnMrr: v.number(),
    netNewMrr: v.number(),
    subscriberCount: v.number(),
    basicCount: v.number(),
    boostCount: v.number(),
    market: v.optional(v.string()),
  })
    .index("by_date", ["date"])
    .index("by_market_date", ["market", "date"]),

  exchangeRates: defineTable({
    month: v.string(),
    currency: v.string(),
    rateToUsd: v.number(),
  }).index("by_month_currency", ["month", "currency"]),
});
