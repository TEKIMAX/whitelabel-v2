# Convex — Billing & Stripe

## Overview

Billing is handled by Stripe via `@convex-dev/stripe`. The whitelabel app supports:
- Subscription plans (monthly/yearly)
- AI usage metering (per-token billing)
- Stripe Customer Portal (self-service upgrades/cancellations)
- Stripe Connect for ventures that take payments from their own customers

## Files

| File | Purpose |
|---|---|
| `convex/billing.ts` | Core billing queries and mutations |
| `convex/billingActions.ts` | Stripe API calls (checkout, portal, metering) |
| `convex/billingQueries.ts` | Billing status queries |
| `convex/stripe.ts` | Stripe client setup, webhook handling |
| `convex/stripeActions.ts` | Subscription management actions |
| `convex/stripeMutations.ts` | DB writes for Stripe events |
| `convex/stripeGateway.ts` | AI-assisted Stripe gateway |

## Subscription Flow

```
User clicks "Upgrade"
  └─► ctx.runAction(api.billingActions.createCheckout, { priceId })
        └─► Stripe: creates Checkout Session
        └─► Returns { url } — redirect to Stripe hosted checkout
User completes payment on Stripe
  └─► Stripe sends webhook to CF Function or Convex HTTP endpoint
  └─► convex/stripe.ts handles event
        └─► "checkout.session.completed" → update subscription in DB
        └─► "customer.subscription.updated" → sync plan changes
        └─► "customer.subscription.deleted" → mark as cancelled
```

## Usage Metering

AI token usage is reported to Stripe Metering:

```typescript
// convex/externalUsage.ts — called by cron
await stripe.billing.meterEvents.create({
  event_name: "ai_tokens",
  payload: {
    stripe_customer_id: customerId,
    value: String(totalTokens),
  },
})
```

## Entitlements (`hooks/useEntitlements.ts`)

The `useEntitlements` hook returns the user's current plan limits:

```typescript
const { canAccessAI, maxVentures, storageQuotaMB, planName } = useEntitlements()
```

Feature flags are evaluated client-side based on the subscription record.

## Stripe Customer Portal

Users can manage their subscription via the Stripe portal:

```typescript
const { url } = await ctx.runAction(api.billingActions.createPortalSession, {
  orgId,
  returnUrl: window.location.href,
})
window.location.href = url
```

## Stripe Connect (`convex/stripeGateway.ts`)

For ventures that want to accept payments from their customers, the app provides a Stripe Connect integration:

- Connect an existing Stripe account or create a new one
- `StripeConnectDashboard` component shows revenue, payouts, and balance
- Revenue data stored in `convex/revenue.ts`

## Environment Variables Required

| Convex Env Var | Description |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_ID_*` | Price IDs for each plan |
