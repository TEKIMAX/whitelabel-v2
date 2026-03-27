# Convex Backend — Overview

**Directory:** `convex/` — 89+ TypeScript files

## What Convex Provides

Convex is a reactive backend-as-a-service. For this app it provides:

- **Real-time queries** — React components auto-update when data changes
- **Mutations** — Transactional, server-side write operations
- **Actions** — Node.js runtime, can call external APIs (WorkOS, Stripe, Gemini)
- **Workflows** — Multi-step AI flows via `@convex-dev/workflow`
- **Cron jobs** — Scheduled background tasks (`crons.ts`)
- **File storage** — Integrated with Cloudflare R2

## Module Index

| Module | Files | Purpose |
|---|---|---|
| **Users & Auth** | `users.ts`, `auth.ts`, `workos.ts`, `roles.ts`, `permissions.ts` | User management, RBAC, WorkOS sync |
| **Projects** | `projects.ts`, `project_actions.ts` | Venture CRUD |
| **Canvas** | `canvas.ts` | Lean canvas versions |
| **AI** | `ai.ts`, `aiChat.ts`, `aiChatWorkflow.ts`, `aiAgents.ts`, `aiModules/` | Multi-model AI, chat, agents |
| **Market** | `market.ts`, `marketResearch.ts`, `bottomUp.ts` | Market sizing, research |
| **Customer** | `customers.ts` | Customer discovery |
| **Finance** | `billing.ts`, `billingActions.ts`, `stripe.ts`, `stripeActions.ts`, `revenue.ts` | Payments, metering |
| **Content** | `documents.ts`, `blog.ts`, `blog_posts.ts`, `tiptap.ts` | Docs, blog, rich text |
| **Files** | `files.ts`, `r2.ts`, `storageQuota.ts` | File storage, R2, quotas |
| **Goals** | `goals.ts`, `initiatives.ts` | OKRs, initiatives |
| **Decks** | `deck.ts`, `decks.ts` | Pitch deck versions |
| **Legal** | `legal.ts`, `safe.ts` | Legal docs, SAFE |
| **Analytics** | `analytics.ts`, `usage.ts` | Event tracking, usage reporting |
| **Team** | `team.ts`, `invites.ts` | Team management |
| **Config** | `model_config.ts`, `modelConfigActions.ts`, `pageConfigs.ts` | Model + page configuration |
| **Onboarding** | `story.ts`, `adaptive.ts` | Onboarding flow, adaptive learning |
| **Admin** | `admin.ts`, `audit.ts`, `debug.ts` | Admin tools, audit log |

## Auth in Convex

Every Convex call carries the WorkOS access token (injected by `ConvexProviderWithAuth`). Convex validates it against the WorkOS JWKS endpoint configured in `convex.json`.

Inside mutations and queries, the user identity is accessed via:

```typescript
const identity = await ctx.auth.getUserIdentity()
if (!identity) throw new Error("Unauthenticated")

const userId = identity.subject           // WorkOS user ID
const orgId = identity.orgId as string    // WorkOS org ID (from token claim)
const tokenIdentifier = identity.tokenIdentifier
```

## Accessing Data

### Queries (live-subscribed)

```typescript
// In a Convex query
const projects = await ctx.db
  .query("projects")
  .withIndex("by_org", q => q.eq("orgId", orgId))
  .collect()
```

### Mutations (transactional)

```typescript
// In a Convex mutation
const id = await ctx.db.insert("projects", {
  orgId,
  name: args.name,
  // ...
})
```

### Actions (can call external APIs)

```typescript
// In a Convex action (Node.js runtime)
const response = await fetch("https://api.workos.com/...")
const result = await ctx.runMutation(internal.projects.createInternal, args)
```

## Cron Jobs (`crons.ts`)

Scheduled tasks run automatically:
- Usage reporting to Stripe Metering API
- Storage quota checks
- Cleanup of orphaned records
- Token expiry checks

## Internal vs Public API

Convex functions can be:
- `query` / `mutation` / `action` — callable from the React client
- `internalQuery` / `internalMutation` / `internalAction` — callable only server-side (from other Convex functions)

Internal functions (prefixed with `internal.`) are used for operations that must not be called directly from the browser, such as `internal.projects.createInternal`.
