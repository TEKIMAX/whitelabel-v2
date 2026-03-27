# Security Overview

## Authentication

- **WorkOS Magic Auth** — no passwords, no credential stuffing risk
- **PKCE (Proof Key for Code Exchange)** — no client secret in browser; the code verifier never leaves the client
- **Short-lived tokens** — access tokens expire in ~5 minutes; refresh tokens rotate on use
- **Auto-sign-out** — after 3 consecutive refresh failures, session is cleared

## Tenant Isolation

Each deployment is fully isolated:

- `WORKOS_ORG_ID` scopes every Convex query to the tenant org — cross-tenant data access is structurally impossible
- `deploymentId` further scopes ventures to the exact deployment
- CF Functions validate the token and extract `orgId` before any data access
- Convex mutations enforce `orgId` filtering server-side — client cannot override

See [Org / Venture Isolation](/ventures/isolation) for the full model.

## Secrets Management

| What | Where | How protected |
|---|---|---|
| `WORKOS_API_KEY` | CF Functions `.dev.vars` / CF Pages secrets | Server-side only, never in browser |
| `STRIPE_SECRET_KEY` | Convex env | Node.js runtime only, never in client queries |
| `R2_SECRET_ACCESS_KEY` | Convex env | Node.js runtime only |
| `GEMINI_API_KEY` | Convex env | Node.js runtime only |

{% callout type="danger" title="Never put secrets in VITE_ vars" %}
`VITE_` variables are bundled into the JavaScript. Only publishable keys (Stripe pk_, WorkOS client ID) belong there.
{% /callout %}

## Input Validation

- All Convex mutation args are validated via Convex's built-in `v.` validators (similar to Zod)
- External API responses are type-checked before use
- File uploads are validated for type and size before presigned URL generation

## RBAC

- Roles enforced server-side in Convex mutations — the client cannot escalate permissions
- `useAccessControl` hook gates UI elements, but is not a security boundary (it's for UX only)
- Venture deletion requires the caller's token identifier to match the project's `userId`

## Webhook Security

- Stripe webhooks: `stripe.webhooks.constructEventAsync` with `STRIPE_WEBHOOK_SECRET`
- WorkOS webhooks: HMAC-SHA256 signature validation with `WORKOS_WEBHOOK_SECRET`

## Content Security

- File access URLs are signed (15-min upload TTL, 1-hour read TTL)
- Public share links have configurable expiry and can be revoked
- Blog public routes expose only published content — draft posts are never accessible without auth

## Dependency Security

See the project `README.md` for the current dependency audit status. Run `npm audit` regularly and update pinned versions when patches are available.
