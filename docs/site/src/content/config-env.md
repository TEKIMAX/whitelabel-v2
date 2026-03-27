# Environment Variables

## CF Pages Functions (`.dev.vars`)

Secrets available only in server-side CF Functions. Never bundled into the browser.

### WorkOS Auth

| Variable | Required | Description |
|---|---|---|
| `WORKOS_API_KEY` | ✅ | WorkOS API key |
| `WORKOS_CLIENT_ID` | ✅ | WorkOS client ID |
| `WORKOS_ORG_ID` | ✅ (provisioned) | Tenant org ID — injected by provisioner. Restricts org selector and auto-adds new users. |

### Email

| Variable | Required | Description |
|---|---|---|
| `RESEND_API_KEY` | ⬜ | Resend API key for access request and invite emails |
| `ADMIN_EMAIL` | ⬜ | Destination for access request notifications |

---

## Convex Environment Variables

Set via `npx convex env set KEY value` or in the Convex dashboard.

### Auth & Identity

| Variable | Required | Description |
|---|---|---|
| `WORKOS_API_KEY` | ✅ | WorkOS API key (for server-side WorkOS calls from actions) |
| `WORKOS_ORG_ID` | ✅ (provisioned) | Tenant org ID — scopes venture `orgId` on creation |
| `DEPLOYMENT_ID` | ✅ (provisioned) | CF Pages deployment ID — stored as `deploymentId` on ventures |

### AI

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `OLLAMA_BASE_URL` | ⬜ | Base URL for Ollama server (local models) |

### Payments

| Variable | Required | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe webhook signing secret |

### Storage

| Variable | Required | Description |
|---|---|---|
| `R2_ACCOUNT_ID` | ✅ | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | ✅ | R2 access key |
| `R2_SECRET_ACCESS_KEY` | ✅ | R2 secret access key |
| `R2_BUCKET_NAME` | ✅ | R2 bucket name |
| `R2_PUBLIC_URL` | ✅ | Public base URL for serving files |

### Provisioner Callback

| Variable | Required | Description |
|---|---|---|
| `MASTER_API_URL` | ⬜ | Provisioner Go API URL (for redeploy action) |

---

## Vite Frontend (`.env.local`)

Build-time variables bundled into the browser bundle. Must be prefixed `VITE_`.

| Variable | Required | Description |
|---|---|---|
| `VITE_CONVEX_URL` | ✅ | Convex deployment URL (`https://your-project.convex.cloud`) |
| `VITE_WORKOS_CLIENT_ID` | ✅ | WorkOS client ID (for PKCE auth flow in browser) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe publishable key (`pk_live_...`) |
| `VITE_APP_URL` | ⬜ | Public app URL (for canonical links) |

{% callout type="danger" title="Never put secrets in VITE_ vars" %}
`VITE_` variables are bundled into the JavaScript served to browsers. Never put `WORKOS_API_KEY`, `STRIPE_SECRET_KEY`, or any server secret as a `VITE_` variable.
{% /callout %}

---

## Tenant Provisioning (Set Automatically)

These are injected by the Go provisioner worker. Do not set manually for provisioned deployments.

| Variable | Set on | Value |
|---|---|---|
| `WORKOS_ORG_ID` | CF Pages + Convex | WorkOS org ID created for this deployment |
| `DEPLOYMENT_ID` | Convex | CF Pages deployment ID |
