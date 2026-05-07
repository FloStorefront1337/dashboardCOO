import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";

const http = httpRouter();

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return new Response("Missing signature or webhook secret", {
        status: 400,
      });
    }

    const body = await request.text();

    let event: Stripe.Event;
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response("Invalid signature", { status: 400 });
    }

    switch (event.type) {
      case "customer.subscription.created": {
        const sub = event.data.object as any;
        const item = sub.items.data[0];
        const mrr = computeMrrFromRaw(item);
        const plan = detectPlanFromRaw(sub);

        await ctx.runMutation(
          internal.stripe.webhooks.handleSubscriptionCreated,
          {
            stripeSubscriptionId: sub.id,
            stripeCustomerId:
              typeof sub.customer === "string"
                ? sub.customer
                : sub.customer.id,
            stripeEventId: event.id,
            plan,
            status: sub.status,
            mrr,
            currency: sub.currency,
            listingCount: item?.quantity ?? 1,
            startDate: (sub.start_date ?? 0) * 1000,
            currentPeriodEnd: (sub.current_period_end ?? 0) * 1000,
            cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
            stripeProductId:
              typeof item?.price?.product === "string"
                ? item.price.product
                : undefined,
            stripePriceId: item?.price?.id,
            customerEmail:
              typeof sub.customer !== "string"
                ? sub.customer?.email ?? undefined
                : undefined,
            customerName:
              typeof sub.customer !== "string"
                ? sub.customer?.name ?? undefined
                : undefined,
          },
        );
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as any;
        const item = sub.items.data[0];
        const mrr = computeMrrFromRaw(item);
        const plan = detectPlanFromRaw(sub);

        await ctx.runMutation(
          internal.stripe.webhooks.handleSubscriptionUpdated,
          {
            stripeSubscriptionId: sub.id,
            stripeCustomerId:
              typeof sub.customer === "string"
                ? sub.customer
                : sub.customer.id,
            stripeEventId: event.id,
            status: sub.status,
            mrr,
            currency: sub.currency,
            listingCount: item?.quantity ?? 1,
            currentPeriodEnd: (sub.current_period_end ?? 0) * 1000,
            cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
            canceledAt: sub.canceled_at
              ? sub.canceled_at * 1000
              : undefined,
            stripeProductId:
              typeof item?.price?.product === "string"
                ? item.price.product
                : undefined,
            stripePriceId: item?.price?.id,
            plan,
          },
        );
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        await ctx.runMutation(
          internal.stripe.webhooks.handleSubscriptionDeleted,
          {
            stripeSubscriptionId: sub.id,
            stripeCustomerId:
              typeof sub.customer === "string"
                ? sub.customer
                : sub.customer.id,
            stripeEventId: event.id,
          },
        );
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        if (!invoice.subscription) break;

        await ctx.runMutation(internal.stripe.webhooks.handlePaymentFailed, {
          stripeSubscriptionId:
            typeof invoice.subscription === "string"
              ? invoice.subscription
              : invoice.subscription.id,
          stripeCustomerId:
            typeof invoice.customer === "string"
              ? invoice.customer
              : invoice.customer?.id ?? "",
          stripeInvoiceId: invoice.id,
          amount: (invoice.amount_due ?? 0) / 100,
          currency: invoice.currency,
          failureCode: invoice.last_finalization_error?.code ?? undefined,
          failureMessage:
            invoice.last_finalization_error?.message ?? undefined,
          attemptCount: invoice.attempt_count ?? 1,
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        if (!invoice.subscription) break;

        await ctx.runMutation(
          internal.stripe.webhooks.handlePaymentSucceeded,
          {
            stripeSubscriptionId:
              typeof invoice.subscription === "string"
                ? invoice.subscription
                : invoice.subscription.id,
            stripeInvoiceId: invoice.id,
          },
        );
        break;
      }
    }

    return new Response("OK", { status: 200 });
  }),
});

function computeMrrFromRaw(item: any): number {
  if (!item?.price) return 0;
  const unitAmount = (item.price.unit_amount ?? 0) / 100;
  const quantity = item.quantity ?? 1;
  const total = unitAmount * quantity;

  switch (item.price.recurring?.interval) {
    case "year":
      return Math.round((total / 12) * 100) / 100;
    case "week":
      return Math.round(total * 4.33 * 100) / 100;
    case "day":
      return Math.round(total * 30 * 100) / 100;
    default:
      return total;
  }
}

function detectPlanFromRaw(sub: any): "basic" | "boost" {
  const productId =
    typeof sub.items.data[0]?.price?.product === "string"
      ? sub.items.data[0].price.product
      : "";
  const productName = sub.metadata?.plan_type ?? "";

  if (
    productName.toLowerCase().includes("boost") ||
    productId.toLowerCase().includes("boost")
  ) {
    return "boost";
  }
  return "basic";
}

export default http;
