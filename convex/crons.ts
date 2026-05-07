import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "sync-stripe-subscriptions",
  { minutes: 15 },
  internal.stripe.sync.syncSubscriptions,
);

crons.daily(
  "snapshot-mrr",
  { hourUTC: 6, minuteUTC: 0 },
  internal.stripe.sync.snapshotMrr,
);

export default crons;
