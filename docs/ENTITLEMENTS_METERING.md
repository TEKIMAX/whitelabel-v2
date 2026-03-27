# WorkOS Entitlements & Usage Metering

## Overview

This document explains how the whitelabel platform uses **WorkOS Stripe Entitlements** to manage plan-based AI usage limits and **org-level metering** to track consumption.

Users pay a **monthly or yearly subscription** via Stripe. Their plan determines how many AI tokens they can consume. Usage is tracked per **organization**, not per user, so all members share the same quota.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Stripe Dashboard                      │
│  Products → Entitlements:                                │
│    ai:basic     → Base monthly/yearly plan               │
│    ai:pro       → Pro plan                               │
│    ai:enterprise → Enterprise plan                       │
└────────────────────────┬────────────────────────────────┘
                         │ auto-sync
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   WorkOS Organization                    │
│  stripe_customer_id linked during provisioning           │
│  → entitlements injected into JWT automatically          │
└────────────────────────┬────────────────────────────────┘
                         │ JWT with entitlements claim
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Convex Backend (usage.ts)                    │
│                                                          │
│  checkLimit() → reads identity.entitlements              │
│    → maps to plan tier + token/request limits             │
│    → checks org-level daily + monthly usage               │
│                                                          │
│  trackUsage() → writes to usage table (per org, daily)   │
│                                                          │
│  getSubscriptionStatus() → returns tier, usage, limits    │
│    → displayed on SubscriptionPage dashboard              │
└─────────────────────────────────────────────────────────┘
```

## Plan Tiers & Limits

| Entitlement Feature | Tier       | Monthly Tokens | Daily Requests |
|---------------------|------------|----------------|----------------|
| *(none)*            | Free       | 10,000         | 20             |
| `ai:basic`          | Basic      | 50,000         | 50             |
| `ai:pro`            | Pro        | 4,000,000      | 1,000          |
| `ai:enterprise`     | Enterprise | Unlimited      | Unlimited      |

## How It Works

### 1. Provisioning (Admin Panel)

During customer provisioning, the `setStripeCustomerOnOrgStep` links the Stripe Customer ID to the WorkOS Organization:

```typescript
await workos.organizations.updateOrganization({
    organization: workosOrgId,
    stripeCustomerId: stripeCustomerId,
});
```

This enables WorkOS to automatically inject Stripe entitlements into the user's JWT.

### 2. JWT Entitlements

When a user logs in, their access token includes an `entitlements` claim:

```json
{
  "sub": "user_01ABC...",
  "org_id": "org_01XYZ...",
  "entitlements": ["ai:pro"],
  "iss": "https://api.workos.com/..."
}
```

### 3. Limit Checking (Convex)

The `checkLimit` query in `usage.ts` reads entitlements from the JWT:

```typescript
const { orgId, entitlements } = getOrgContext(identity);
const plan = getPlanFromEntitlements(entitlements);
// plan = { tier: "pro", monthlyTokens: 4_000_000, dailyRequests: 1000 }
```

It then checks:
1. **Daily rate limit** — requests today vs. plan's daily limit
2. **Monthly token limit** — tokens this month vs. plan's monthly cap

### 4. Usage Tracking

Every AI call records usage at the **org level**:

```typescript
// usage table schema
{
  userId: string,        // who made the call
  orgId: string,         // org-level aggregation (from JWT org_id)
  date: "YYYY-MM-DD",   // daily bucketing
  tokens: number,        // cumulative tokens for the day
  requests: number,      // cumulative requests for the day
  model: string          // which AI model was used
}
```

### 5. Dashboard Display

`getSubscriptionStatus` returns the tier, usage, and limits for the current org. The `SubscriptionPage` component renders:
- Current plan tier
- Usage progress bar (tokens used / limit)
- 30-day usage history chart

## Stripe Dashboard Setup

To create entitlement features:

1. Go to **Stripe Dashboard** → **Products** → **Entitlements**
2. Create features:
   - Key: `ai:basic` — attach to the monthly/yearly base product
   - Key: `ai:pro` — attach to the Pro product
   - Key: `ai:enterprise` — attach to the Enterprise product
3. Entitlements automatically flow into WorkOS JWTs when the org has an active subscription

## Backwards Compatibility

The system falls back gracefully:
- If no `entitlements` in JWT → checks local `user.subscriptionStatus` field
- If no `orgId` data → falls back to per-user usage tracking (`by_user_date` index)
- Trial users (< 3 days old) get Pro-level access

## Key Files

| File | Purpose |
|------|---------|
| `convex/usage.ts` | Core metering: trackUsage, checkLimit, getSubscriptionStatus |
| `convex/schema.ts` | Usage table with `orgId` + `by_org_date` index |
| `convex/aiModules/shared.ts` | Calls checkLimit before AI operations |
| `components/SubscriptionPage.tsx` | Dashboard UI for billing & usage |
| `convex/auth.config.ts` | WorkOS JWT provider configuration |
