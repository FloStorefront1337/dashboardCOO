# COO Dashboard — Operational Vision

**Owner**: Florian (COO)
**Status**: Brainstorming — pre-validation with Adrien
**Last updated**: 2026-05-04

## Why this dashboard

Florian owns the operational backbone of TheStorefront: the Salesforce environment, the invoicing system, the MRR/subscription engine, and the SF-Platform bridge. Today, monitoring these systems requires jumping between SF reports, Stripe dashboards, Redshift queries, and Customer.io. The COO dashboard consolidates operational health into one place and surfaces problems before they become fires.

## Scope — 4 pillars

| # | Pillar | What it covers |
|---|--------|----------------|
| 1 | **SF-Platform Bridge Health** | Sync reliability, data freshness, message flow, callback tracking |
| 2 | **Invoicing Health** | Invoice lifecycle, billing data completeness, Stripe reconciliation, payment collection |
| 3 | **MRR & Subscriptions** | Subscription revenue, churn, boost system, fee negotiations |
| 4 | **Operations Overview** | Deal assignment, loss analysis, bypass risk, geographic performance, Customer.io health |

---

## Pillar 1 — SF-Platform Bridge Health

### What Florian built
- SF REST API (SOQL) periodic sync via Convex cron pulls modified records
- SF Platform Events for real-time sync (new Inquiry, stage change)
- Writeback API pushes results into SF custom fields
- Redshift access (30min refresh) to platform tables: messages, conversations, callbacks

### Problems to detect
- **Sync lag**: Convex cron fails or slows → SF and platform drift apart
- **Writeback failures**: data pushed to SF that doesn't land (API errors, field validation, token expiry)
- **Redshift staleness**: the 30min refresh didn't run → stale conversation data
- **Message gap**: platform messages not matching SF activity (deal active in SF, silent on platform)

### Possible views
- **Sync heartbeat**: last successful cron run, records synced in last hour/day, error count
- **Writeback log**: recent writeback attempts, failures with error detail, retry status
- **Redshift freshness**: last refresh timestamp, delta from expected
- **Data drift alerts**: records modified in SF but not reflected on platform (or vice versa)

### Open questions for Florian
- [ ] How often does the cron sync actually fail today? Is this a daily problem or a once-a-month scare?
- [ ] Which writeback fields are most fragile? (AI_* fields from Adrien's layer, or your own?)
- [ ] Do you want to monitor Adrien's sync too, or strictly your own crons?
- [ ] Is Platform Event delivery something you can track, or is it fire-and-forget from SF's side?

---

## Pillar 2 — Invoicing Health

### What Florian built
- Custom Invoice object in SF, linked to Opportunity
- Stripe integration: 74% online payments, auto-splits commission + payout
- 100% SF invoice reconciliation achieved (2,540/2,540 invoices)

### Known pain points
- **Billing data missing at invoicing time**: sales wastes time chasing company name, address, VAT, bank details
- **25% of payments are unknown/wire**: harder to track, reconcile, and confirm
- **Commission negotiation**: 20% standard fee, negotiable to 12% floor — who's getting what rate and why?

### Possible views
- **Invoice pipeline**: invoices by status (draft → sent → paid → overdue), with age and amount
- **Billing data completeness score**: % of upcoming deals that have all billing fields filled before they reach invoicing stage
- **Payment method breakdown**: Stripe vs wire vs unknown, trends over time
- **Overdue tracker**: unpaid invoices sorted by age, with deal and client context
- **Reconciliation status**: real-time match rate between SF invoices and Stripe charges
- **Commission rate distribution**: histogram of negotiated rates, flagging outliers below 15%

### Open questions for Florian
- [ ] The 100% reconciliation — is that maintained automatically, or does it drift and need periodic manual correction?
- [ ] At what stage does billing data collection happen today? Could you push it earlier in the pipeline?
- [ ] Wire payments — do you have visibility into when they actually land, or is that a black box?
- [ ] Do you want to track revenue leakage (commission discounts given too easily)?

---

## Pillar 3 — MRR & Subscriptions ✅ Phase 1 BUILT

### What Florian built
- Subscription and boost system (the MRR initiative)
- Revenue split: 68% booking commissions ($348K), 32% subscriptions ($165K) — Q1-Q2 2026

### Answers (confirmed 2026-05-06)
- **Subscribers**: LOs only (landlords paying for listing subscriptions)
- **Products**: Basic Subscription (per-listing, tiered volume pricing) + Boost (self-serve add-on for top-of-results)
- **Billing source of truth**: Stripe (subscriptions, payments, invoices)
- **SF link**: Custom SF objects track subscription status, linked to Account/Listing
- **Churn visibility**: was manual/ad-hoc — now automated via dashboard
- **KPIs**: Net MRR growth, churn reduction, upsell/expansion revenue, LTV/payback period

### Phase 1 — Built (MRR Foundation)
- **MRR Summary Cards**: Current MRR, active subscribers, net new MRR, churn rate — all with MoM deltas
- **MRR Waterfall Chart**: 12-month stacked bar chart (new, expansion, contraction, churn) with total MRR line
- **Active Subscriptions Table**: sortable/filterable by status, plan, market — with Stripe deep links
- **Revenue Leakage Monitor**: failed payments, expiring cards, grace period subscriptions
- **Stripe Data Pipeline**: webhook handler + 15-min cron reconciliation + daily MRR snapshot
- **Convex Schema**: subscriptions, subscriptionEvents, paymentFailures, mrrSnapshots, exchangeRates

### Phase 2 — Next (Intelligence Layer)
- **LO Health Score Engine**: composite 0-100 score (subscription health, listing activity, engagement, payment reliability)
- **Churn Risk Dashboard**: at-risk LOs with recommended actions, SF Task creation
- **Upsell Opportunity Finder**: Basic->Boost candidates, volume expansion candidates
- **Subscriber Acquisition Pipeline**: hot/warm/cold non-subscribing LOs ranked by conversion likelihood

### Phase 3 — Later (Market Intelligence & Automation)
- Market-level MRR dashboard, cohort analysis, Boost performance analytics
- Automated retention workflows (payment failure recovery, engagement drop alerts, renewal risk alerts)

### Phase 4 — Future (Advanced Analytics)
- MRR forecast (3-month projection), revenue mix tracker, executive weekly summary

---

## Pillar 4 — Operations Overview

### Known leverage points (from validated data)

**Deal assignment — the biggest lever**
- 79% of opps stay unowned (Storefront Platform) at 8.7% conversion
- When a human takes ownership: 20-64% conversion (Faniry 63.7%, Tiana 35.1%, Julien 20.1%)
- 4-7x gap → auto-assignment is the single highest-ROI intervention

**Loss analysis**
- 97% of losses labeled "expired" — but expiration hides 4 real scenarios:
  1. LO never responds
  2. Discussion dies before contact exchange
  3. Contact exchanged, then platform silence (bypass risk)
  4. Visit happened, then silence (bypass risk)

**Bypass risk**
- 36-month covenant: parties must book through platform for 36 months
- Liquidated damages: 3x total fee — but currently poorly tracked
- Callback conversion: 10% → 30% after callback, but also highest bypass risk window

**Geographic variance**
- France = 8% of traffic but 47% of won deals (6x better conversion)
- UK = concierge model (Zdravko), not reflected in standard metrics
- Spain = launching (Susanna)

**Customer.io health**
- 42 deprecated campaigns still running
- Subscription Renewed campaign broken (0% opens on 226 sends)
- Campaign 76552 (#1 volume) not migrated to Space to Pop branding

### Possible views
- **Assignment dashboard**: unowned opps by age, market, and estimated value — with "assign" action
- **Loss waterfall**: break down "expired" into the 4 real scenarios using Redshift message data
- **Bypass risk radar**: deals where callback happened + platform went silent > 48h
- **Market scorecard**: conversion, revenue, avg deal size by market — FR, US, UK, ES
- **Team performance**: ops team member stats (response time, conversion, active deals)
- **Customer.io audit**: campaign status, broken campaigns, branding compliance

### Open questions for Florian
- [ ] Auto-assignment: is this something your dashboard should DO (assign deals), or just SURFACE (recommend assignments)?
- [ ] Bypass detection: Adrien already has a bypass scanner in the CRO layer — do you want your own, or consume his data?
- [ ] Customer.io: should the dashboard just flag issues, or should it have controls to pause/fix campaigns?
- [ ] What's the cadence — real-time monitoring, or daily/weekly review?

---

## Non-scope (Adrien's CRO layer handles these)

- AI scoring of deals (Pipeline Copilot)
- Progressive data collection (5 gates)
- Support inbox triage
- Platform responsiveness monitoring
- AI next-action recommendations

These are Adrien's domain. The COO dashboard can **read** his outputs (scores, alerts) but shouldn't duplicate the logic.

---

## Next steps

1. **Florian**: answer the open questions above to sharpen scope
2. **Florian**: rank the 4 pillars by urgency — what burns first?
3. **Florian + Adrien**: validate scope boundaries (especially bypass detection, deal assignment)
4. **Then**: create feature specs in `vision/<pillar>/` folders with detailed requirements
