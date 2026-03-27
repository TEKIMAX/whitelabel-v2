# Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Tenant User)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Cloudflare Pages (CDN + Functions)              │
│         tenant.pages.dev  ·  custom domain optional          │
│                                                              │
│  ┌─────────────────────┐   ┌──────────────────────────────┐  │
│  │  React SPA (Vite)   │   │  CF Pages Functions          │  │
│  │  App.tsx + Routing  │   │  functions/api/auth/**       │  │
│  │  WorkOS PKCE auth   │   │  functions/api/orgs/**       │  │
│  └──────────┬──────────┘   └──────────────────────────────┘  │
└─────────────┼───────────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────────┐
│                    Convex (per-tenant backend)                │
│                                                              │
│  users · projects · canvas · ai · billing · files · blog     │
│  WORKOS_ORG_ID scopes all ventures to this deployment        │
└─────────────────────────────────────────────────────────────┘
              │                        │
┌─────────────▼────────┐  ┌────────────▼──────────────────────┐
│  WorkOS              │  │  External Services                 │
│  1 org per deploy    │  │  Stripe — payments                 │
│  Magic Auth          │  │  Google Gemini — AI                │
│  PKCE token exchange │  │  Cloudflare R2 — file storage      │
└──────────────────────┘  │  Resend — email                   │
                          └────────────────────────────────────┘
```

## Core Components

### React SPA (`index.tsx`, `App.tsx`)

The entry point wraps the app with providers:
- `CustomAuthProvider` — WorkOS PKCE auth, 4-minute token refresh heartbeat
- `ConvexProviderWithAuth` — injects the WorkOS access token into every Convex call
- `UserProvider` — global user state (current org, project, roles)
- `ErrorBoundary` — top-level error handling

`App.tsx` (687 lines) is the master router. It manages:
- Auth state (unauthenticated → AuthPage → onboarding/dashboard)
- View state machine (`ONBOARDING`, `SETTINGS`, `WIKI`, `CANVAS`, etc.)
- URL routes for blog, settings, billing, legal, referrals, and invites
- Feature gating via `useAccessControl`

### Convex Backend (`convex/`)

89+ TypeScript files. Convex is a reactive backend-as-a-service:
- Mutations run server-side, transactional
- Queries are live-subscribed — UI auto-updates when data changes
- Actions can call external APIs (WorkOS, Stripe, Gemini)
- Workflows (via `@convex-dev/workflow`) for multi-step AI flows

Auth is bridged from WorkOS: `convex.json` configures the WorkOS JWKS endpoint. Every call from the React app carries the WorkOS access token, which Convex validates and uses to populate `identity`.

### Cloudflare Pages Functions (`functions/`)

Lightweight CF Workers (edge, V8) for server-side operations that need secrets not available client-side:

| File | Purpose |
|---|---|
| `functions/api/auth/login.ts` | POST — initiate Magic Auth login |
| `functions/api/auth/signup.ts` | POST — create user + send magic code |
| `functions/api/auth/login-org.ts` | POST — exchange pending token for org-scoped token |
| `functions/api/auth/refresh.ts` | POST — refresh access token |
| `functions/api/auth/request-access.ts` | POST — request access email to admin |
| `functions/api/auth/accept-invite.ts` | POST — accept a WorkOS invitation |
| `functions/api/orgs/membership.ts` | GET — list user's orgs (filtered to `WORKOS_ORG_ID`) |

### WorkOS Auth Model

```
WorkOS Organization (tenant org)
  └─► 1 per deployment, created by provisioner
  └─► ID injected as WORKOS_ORG_ID into CF Pages + Convex env
  └─► All ventures scoped to this org in Convex

WorkOS User
  └─► Authenticates via Magic Auth (email + 6-digit code)
  └─► Added to tenant org on signup (if WORKOS_ORG_ID set)
  └─► Token scoped to tenant org after org selection
```

See [Auth Flow](/auth/flow) for the full sequence.

### AI Layer (`convex/ai.ts`, `convex/aiModules/`)

Multi-model AI via the Vercel AI SDK:
- **Google Gemini** — primary model (Pro, Flash)
- **Ollama** — local model support (`convex/ollamaService.ts`)
- Model selection is per-deployment — configured by provisioner via `modelConfigActions`

19 specialized AI modules in `convex/aiModules/`:
- `analysisActions.ts` — general analysis
- `customerActions.ts` — customer discovery
- `financialActions.ts` — revenue modeling
- `marketActions.ts` — market research
- `pitchDeckActions.ts` — slide generation
- `documentActions.ts` — legal/marketing docs
- And 13 more (interview, discovery, report, sizing, etc.)

### Billing (`convex/billing.ts`, `convex/stripe.ts`)

Stripe is integrated via `@convex-dev/stripe`:
- Subscription management (checkout, webhooks, portal)
- AI usage metering via Stripe Metering API
- Token usage tracked in `usage.ts` + reported via cron
- Entitlement gates via `useEntitlements` hook

## Data Flow: User Creates a Venture

```
User clicks "New Venture"
  └─► React calls ctx.runAction(api.project_actions.create)
        └─► Convex Action (Node.js runtime)
              └─► orgId = process.env.WORKOS_ORG_ID  (no WorkOS API call)
              └─► ctx.runMutation(internal.projects.createInternal)
                    └─► INSERT projects { orgId, deploymentId, name, ... }
                    └─► INSERT canvases (default lean canvas)
                    └─► INSERT team_members (founder)
              └─► Returns projectId to React
  └─► React navigates to new venture dashboard
```

## Data Flow: AI Chat

```
User sends message
  └─► React calls ctx.runAction(api.aiChat.sendMessage)
        └─► Convex Action streams from Gemini/Ollama
              └─► Writes streamed chunks to Convex database
  └─► React query live-subscribes to message chunks
        └─► UI streams response in real-time
```
