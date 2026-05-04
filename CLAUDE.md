# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Environment — PRO (Storefront) — COO

This is the **Pro** environment for the COO dashboard.

| Tool | Identity |
|------|----------|
| GitHub CLI | `gh` (Florian's account, fg@thestorefront.com) |
| Vercel CLI | `npx vercel` (team The Storefront) |
| Git | standard `git` | `fg@thestorefront.com` |
| Convex | `npx convex` (project: `coo`, team: Adrien Kerbrat's team) — **NEVER touch other projects** |

**CRITICAL — Convex isolation**: Florian has Developer access to the entire Convex team. The dashboard (dashboard.convex.dev) shows ALL projects (CRO, CEO, CTO, CMO, offsite, idea-dashboard). **NEVER open, modify, deploy, or interact with any project other than `coo`.** The local `convex.json` locks CLI commands to COO, but the browser dashboard has no such guard. If in doubt, check the project name in the top-left corner of the Convex dashboard before any action.

## Who is Florian

- **Florian** — COO (Chief Operating Officer) of TheStorefront
- Architect of the entire Salesforce environment: flows, automations, invoice system, data model
- Led the MRR initiative: subscriptions and boost system
- Owns the operational bridge between Salesforce and the platform (thestorefront.com)
- Deep Salesforce expertise — Claude Code should treat Florian as the SF authority, not explain SF basics
- Email: fg@thestorefront.com

## Project overview

**TheStorefront** (thestorefront.com) — B2B marketplace for short-term commercial space rentals (1 day to several years). Brands rent physical spaces from landlords (LOs). This repo contains the COO operational layer: monitoring, analytics, and automation tools focused on the SF-Platform bridge, invoicing, subscriptions, and operational health.

**Naming rule**: Always use "TheStorefront" (with "The"). Never use "Storefront" alone.

## Team

- **Mohamed** — CEO. Company leader.
- **Adrien Kerbrat** — CRO (Chief Revenue Officer). Pilots the AI automation layer (separate repo/dashboard). Maximizes revenue. Reviews pipeline daily.
- **Ruben** — CTO. Technical lead. Executes the tech side.
- **Florian** — COO. Salesforce architect, MRR/subscriptions lead, SF-Platform bridge owner.
- **Julien** — Manages the US market globally.
- **Zdravko** — Manages the UK/London market (concierge model).
- **Tiana** — Customer Success, Europe.
- **Faniry** — Customer Success, Europe.
- **Susanna** — External partner (50/50 contract). Manages Spain market launch.

Governance: weekly standup + monthly deep dive. Adrien pilots revenue/AI, Florian sponsors operations, Ruben builds.

## What already exists — Adrien's CRO layer

Adrien has built a separate AI automation layer (repo `thestorefront-ai`, Convex project `cro`). Understanding what exists avoids duplication and identifies integration points.

**Adrien's stack**: Next.js 16 + Convex + Clerk + Vercel + Claude API (Anthropic) + Salesforce direct API + Redshift.

**What Adrien's layer does:**
- **Pipeline Copilot**: AI scoring of every deal through the entire funnel (0-100 score, trend, next action, risk)
- **Progressive Data Collection**: 5 gates collecting info at the right moments (entry, pre-visit, post-visit, pre-payment, post-event)
- **Support Inbox**: AI triage of platform messages + Formaloo form submissions, with draft responses
- **Bypass Detection**: Scans for clients/LOs who exchange contact info and transact off-platform
- **Platform Responsiveness**: Monitors LO and client response times, flags silent deals
- **Monitoring Dashboard**: Real-time view of all automations, alerts, AI outputs for CRO review

**SF custom fields created by Adrien's layer** (prefix `AI_*`): `AI_Score__c`, `AI_Match_Score__c`, `AI_Next_Action__c`, etc. — written back to SF via direct API.

**Composio**: Fully removed (April 2026). All integrations migrated to direct HTTP APIs (SF OAuth, Gmail, Slack webhooks, Stripe, Customer.io, GA4).

**Integration points with COO layer**: Florian's dashboard can read from Adrien's Convex data (cross-project queries or shared SF data), and both layers write to the same Salesforce org.

## Tech stack

| Layer | Technology | Role |
|-------|-----------|------|
| Backend / DB | Convex (project: `coo`) | COO database, API, business logic, cron jobs |
| Frontend | Next.js 16 | COO dashboard |
| Auth | Clerk | Authentication, admin roles |
| Hosting | Vercel | Frontend deployment (team The Storefront) |
| AI | Claude API (Anthropic) | Analysis, generation, classification |
| CRM | Salesforce | **Source of truth** — leads, requests, reservations, pipeline, contacts, invoices |
| Payments | Stripe | Online payments — auto-splits commission + payout. 100% SF invoice reconciliation achieved (2,540/2,540) |
| Email automation | Customer.io | Workspace tsf-production. ~33,300 emails/month, 79 active campaigns, 76.4% open rate, 27.6% click rate |
| Data warehouse | Redshift | READ access to all platform tables (messages, conversations, callbacks). 30min refresh. |
| Platform | thestorefront.com | Marketplace frontend — Ruby on Rails backend + Angular/React frontend |
| Notifications | Slack | Webhook integration for all platform notifications |

## Salesforce data model

Florian built this, but Claude Code needs the reference:

```
Account (Company/Brand) --> Contact (point of contact)
                                --> Opportunity (the deal)
                                      |-- has N --> Inquiry (custom: request for a specific space)
                                      |                 --> references 1 Listing (custom: a space on the platform, has a LO)
                                      |-- has N --> Invoice (custom)
```

- 1 Opportunity = 1 client looking for a space
- 1 Opportunity has N Inquiries, each pointing to 1 Listing
- SF custom fields for AI use `AI_*` prefix (created by Adrien's CRO layer)

### Opportunity stages

| # | Stage name | Description |
|---|-----------|-------------|
| 1 | New request - Not contacted | Initial — scoring trigger |
| 2 | Contacted - Waiting Infos | Data collection |
| 3 | Contacted - Waiting for proposition | Matching needed |
| 4 | Waiting for Availabilities | Checking LO availability |
| 5 | Proposition Done | Proposal sent |
| 6 | Waiting for Visit | Pre-visit |
| 7 | Visit Done | Post-visit, 12h enforcement |
| 8 | Booking Sent | "Invite to Book" sent |
| 9 | Waiting for Invoices/Contract | Billing data, invoice generation |
| A | Pending Event | Reservation lifecycle |
| B | Success | Closed won — NPS, renewal tracking |
| C | Failed | Closed lost — analyze loss reason |
| D | To Follow up (3 sub-stages) | Stalled — re-engagement |

### SF <-> Platform sync

| Method | Usage |
|--------|-------|
| SF REST API (SOQL) | Periodic sync — Convex cron pulls modified records |
| SF Platform Events | Real-time sync (new Inquiry, stage change) |
| Writeback API | Push results into SF custom fields |

### Redshift access (confirmed April 29, 2026 by Ruben)

READ access to platform tables not available in SF:
- `platform.messages`, `platform.conversations`, `platform.conversation_members` — full message history
- `platform.message_flag_annotation` — callback events (who requested, who accepted, when)

Access via `queryRedshift()` helper. Connection: pg Client, SSL required, port 5439. Per-call (not pooled).

## Business context — validated data

All numbers below have been validated from real data (SF, GA4, Stripe, Customer.io, Redshift). Last full validation: April 2026.

### Funnel metrics
- **~55,000 web sessions/month** (GA4, May 2025-Mar 2026 avg)
- **~950 new requests/month** (SF Jul 2025+: avg 954, range 682-1,077)
- **Session to request: ~1.7%**
- **Request to deal: 10-13%** (trending up in 2026)
- **End-to-end: 0.18%** (1 deal per 550 sessions)
- **4-week median time to close** (29 days median, P10: 6 days for fast deals)

### Revenue & commissions
- **Revenue split**: 68% booking commissions ($348K), 32% subscriptions ($165K) — Q1-Q2 2026
- **Commission distribution** (396 Service invoices):
  - 75% of deals: < $700 commission (24% of revenue)
  - 20% of deals: $700-$3,000 (30% of revenue)
  - 5% of deals: $3,000+ (46% of revenue)
  - Mean: $878, Median: $360, P90: $1,595, P95: $3,481
- **Top 25% of deals (> $700) = 76% of revenue**

### Deal assignment — biggest lever
- 79% of opps stay on "Storefront Platform" (unowned) at **8.7% conversion**
- When a human takes ownership: **20-64% conversion** (Faniry 63.7%, Tiana 35.1%, Julien 20.1%)
- This 4-7x gap makes auto-assignment the single highest-ROI intervention

### Traffic sources
- 44% direct, 25% Google organic, 13% email (Customer.io), 1.2% AI referral (ChatGPT)
- **France = 8% of traffic but 47% of won deals** — converts 6x better than US
- Email: 61% of clicks from "new inquiry message" notifications. LOs click 55% more than brands

### Loss reasons
- 97% of losses are "expired" — but expiration is a symptom, not a cause
- 4 scenarios hide inside: (1) LO never responds, (2) discussion dies before contact exchange, (3) contact exchanged then platform silence (bypass risk), (4) visit then silence (bypass risk)
- "Found Elsewhere" is only 1.7% in SF but real bypass rate is hidden inside expiration

### Supply
- **4,117 listings publicly visible** (Lifecycle=published + Visibility=public + not admin-offline)
- 30,964 total in SF, only 13.3% visible
- 8,670 published-but-offline (LOs who hid their listing — reactivation opportunity)
- 13,784 unique LOs, 3,073 with active listings
- Top visible: Paris 668, Hong Kong 533, NY 315, Milan 221, LA 214

### Payment paths
- 74% Stripe (online), 25% unknown/wire, 1% explicit wire
- **Major pain point**: billing data often missing at invoicing → sales wastes time chasing company name, address, VAT, bank details

### Bookings
- 85%: 1-7 days (pop-ups, events)
- 10%: 1-4 weeks
- 5%: 1-3 months
- 82% of won deals have missing duration data

### Customer.io
- ~33,300 emails/month, 79 active campaigns
- 76.4% open rate, 27.6% click rate
- 42 deprecated campaigns still running (tech debt)
- Subscription Renewed campaign broken (0% opens on 226 sends)
- Campaign 76552 (new message, #1 volume) not yet migrated to Space to Pop branding

### Key business rules
- **20% Service Fee** on Occupant, negotiable down to **12% floor** on large/long deals
- **36-month bypass covenant**: parties found on TheStorefront must book through the platform for 36 months. Liquidated damages: 3x the total fee. Currently poorly tracked.
- **Cancellation**: 24h full refund, 50% refund 30+ days before Move-In, $0 under 30 days. LOs penalized 20% for late cancellations.
- **~10% repeat booking rate** (9.6% validated)

## Geographic markets

| Market | Key cities | Model | Description |
|--------|-----------|-------|-------------|
| **US** | New York, LA, Miami | Marketplace | Mostly online, self-serve |
| **France** | Paris | Marketplace + Value | Mix of online and human-assisted |
| **UK** | London | Concierge / Offline | Zdravko matches off-platform via his network |
| **Spain** | Madrid, Barcelona | Launching | Susanna sourcing spaces |
| **Secondary** | Amsterdam, Milan | Smaller | Less volume |

Competitors: Peerspace (US), Appear Here (UK), My Pop-up Store (FR).

## Branding rules

| Market | Brand | Email domain | Language |
|--------|-------|-------------|----------|
| France | Space to Pop | @spacetopop.com | French |
| All others | TheStorefront | @thestorefront.com | Market language |

**Always** write "Space to Pop" (three words, never Space2Pop or SpaceToPop).
Brand is determined by **space location** (France = Space to Pop), language by **contact's language**.

## Currency rules

Deals in EUR (France/Spain), GBP (UK), USD (US). Dashboard amounts in USD using monthly fixed exchange rates (rate locked per month, never recalculated retroactively).

## Platform messaging — 3 channels per deal

| Channel | Participants | Purpose |
|---------|-------------|---------|
| General thread | Client + LO + Admin | Main deal discussion |
| Private LO thread | LO + Admin only | Internal with LO |
| Private Client thread | Client + Admin only | Internal with client |

Callback feature: when both parties agree, phone/address shared. Conversion jumps from 10% to 30% after callback.

## Coding conventions

- TypeScript everywhere
- Convex functions use `v.` validators for all inputs
- AI calls: Haiku for simple tasks, Sonnet for complex/client-facing
- No PII sent to Claude API
- Every queried field must have a Convex index
- Crons only in `crons.ts`

## Build & run commands

```bash
npx convex dev          # Start Convex dev server
npm run dev             # Start Next.js dev server (local testing)
npx convex deploy       # Deploy Convex to production
npm run build           # Build Next.js
```

## Dashboard theme

- **Theme**: Claude (from tweakcn) — `pnpm dlx shadcn@latest add https://tweakcn.com/r/themes/claude.json`
- **Default mode**: Dark
- **Color space**: oklch
- **Mode switching**: `next-themes` ThemeProvider with `defaultTheme="dark"`

## Language

All code, comments, commit messages in **English**. AI-generated outbound emails localized by market. No AI disclaimer needed on human-reviewed messages.

## First task — Vision creation

Before building anything, Florian must define his COO vision:

1. **Create `vision/` folder** at repo root
2. **Define the COO scope**: what operational problems to solve, what to monitor, what to automate
3. **Create Feature/Task folders** for each initiative, with README.md specs
4. **Validate with Adrien** before implementation

This is the onboarding exercise. Claude Code helps facilitate the vision creation, but the vision is Florian's.
