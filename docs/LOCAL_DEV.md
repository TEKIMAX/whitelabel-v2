# Local Development — Whitelabel App

The whitelabel is a **React + Convex** app. It's the template that gets provisioned for each customer. Local dev runs Convex (backend functions + schema sync) alongside Vite (frontend hot reload).

---

## Quick Start

```bash
cd whitelabel
./dev.sh
```

Open: **http://localhost:5173**

---

## First-Time Setup

### 1. Create `.env.local`

```bash
# Create the file
touch .env.local
```

Add the following (get values from your Convex dashboard and WorkOS dashboard):

```env
# ── Convex ────────────────────────────────────────────────────
CONVEX_DEPLOYMENT=dev:your-deployment-name
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_CONVEX_SITE_URL=https://your-deployment.convex.site

# ── WorkOS ───────────────────────────────────────────────────
VITE_WORKOS_CLIENT_ID=client_...       # WorkOS Dashboard → Configuration
WORKOS_CLIENT_ID=client_...
WORKOS_API_KEY=sk_...                  # WorkOS Dashboard → API Keys
WORKOS_COOKIE_PASSWORD=...             # Any 32+ character random string
WORKOS_REDIRECT_URI=http://localhost:3001/callback

# ── Go Provision API ─────────────────────────────────────────
VITE_API_URL=https://brain-adaptive.adaptivestartup.io
BRAIN_SHARED_SECRET=                   # Must match Convex env var of same name

# ── AI Models (optional for local) ───────────────────────────
VITE_OLLAMA_HOST=https://ollama.com
VITE_OLLAMA_MODEL=gpt-oss:120b
VITE_OLLAMA_API_KEY=...
GEMINI_API_KEY=...
```

> `.env.local` is gitignored. Never commit it.

### 2. Log in to Convex

```bash
npx convex login
```

### 3. Run

```bash
./dev.sh
```

---

## Dev Script Options

```bash
./dev.sh              # Full dev: Convex sync + Vite
./dev.sh --no-convex  # Vite only — skips Convex (uses existing cloud deployment)
```

**Use `--no-convex` when:**
- You haven't changed any Convex schema or functions
- You want faster startup
- You're only working on UI/frontend code

**Use full `./dev.sh` when:**
- You changed `convex/schema.ts`
- You added or modified Convex functions (`convex/*.ts`)
- You need to see Convex function logs in real time

---

## What Runs Where

| Process | Port | Purpose |
|---|---|---|
| Vite | 5173 | React frontend with hot reload |
| Convex dev | (cloud) | Syncs functions/schema to your dev Convex deployment |

**Architecture:**

```
Browser → localhost:5173 (Vite)
              └── Convex client → your-deployment.convex.cloud
                      ├── Queries / Mutations (real-time)
                      ├── HTTP Actions (/api/* routes)
                      └── Scheduled functions
```

---

## Convex

### View your Convex dashboard

```
https://dashboard.convex.dev
```

Select your dev deployment to see:
- Live function logs
- Database tables and documents
- HTTP action traffic
- Scheduled function runs

### Push schema/functions manually

```bash
npx convex deploy --dry-run   # preview what will change
npx convex deploy             # push to your dev deployment
```

### Run a Convex function from the CLI

```bash
# Query
npx convex run modelConfigs:getAll

# Mutation
npx convex run deployments:createDeployment '{"orgId":"org_123","name":"Test"}'
```

### Clear a Convex table (dev only)

Go to Convex dashboard → your deployment → Data → select table → delete all documents.

---

## Authentication Flow (Magic Auth)

The whitelabel uses **WorkOS Magic Auth** (passwordless OTP). The flow in local dev:

1. User enters email on `/login`
2. CF Pages Function (or Convex HTTP action) calls WorkOS `POST /user_management/magic_auth`
3. WorkOS sends OTP email to user
4. User enters 6-digit code
5. Function calls `authenticateWithMagicAuth()` → returns session
6. Session stored in localStorage → user is logged in

**Testing locally:** Use a real email address — WorkOS sends actual emails even in dev mode with test API keys.

---

## Common Scenarios

### Scenario: Testing the full provision → whitelabel flow

1. Start provision dashboard: `cd ../Customer-Portal-Provision && ./dev.sh`
2. Start whitelabel: `cd ../whitelabel && ./dev.sh`
3. In provision dashboard: create a new organization and complete provisioning
4. The provision flow pushes model config to Convex via `sync-models-to-convex`
5. Open whitelabel at `localhost:5173` — models should appear

### Scenario: Adding or changing a Convex function

```bash
# Edit the function
nano convex/myFunction.ts

# Convex dev (running via ./dev.sh) auto-detects and syncs within seconds
# Watch the terminal for "✔ Deployed" confirmation
```

### Scenario: Changing Convex schema

Edit `convex/schema.ts`, then save. Convex dev syncs automatically. If you remove a field that has data, Convex will warn you — handle migrations carefully.

### Scenario: Debugging model sync from provision dashboard

The `sync-models-to-convex` endpoint in the provision dashboard calls this Convex HTTP action:
```
POST https://your-deployment.convex.site/sync-model-config
```

To test it directly:

```bash
curl -X POST https://your-deployment.convex.site/sync-model-config \
  -H "Content-Type: application/json" \
  -d '{"orgId":"org_123","models":[{"id":"gpt-4","enabled":true}]}'
```

No auth header needed — the endpoint allows unauthenticated calls for model sync.

### Scenario: Switching organizations without redirect

The whitelabel uses refresh tokens to switch orgs without triggering an AuthKit redirect. If a user is logged in and selects a different workspace:

1. `switchToOrganization(orgId)` is called in `CustomAuthProvider`
2. It calls `POST /api/auth/refresh` with `{ refresh_token, organization_id }`
3. New session tokens are returned and stored in localStorage
4. App reloads to `/` in the new org context — no external redirect

If the refresh token is missing, it falls back to WorkOS PKCE redirect.

### Scenario: Port already in use

```bash
lsof -ti:5173 | xargs kill
./dev.sh
```

---

## Stopping Dev

`Ctrl+C` in the `./dev.sh` terminal. This kills both Vite and Convex dev.

---

## Deploy to Production

```bash
# Deploy Convex functions to production
npx convex deploy --prod

# Deploy frontend (Cloudflare Pages or your host)
pnpm build
npx wrangler pages deploy dist --project-name whitelabel
```

Or push to `prod` branch for automatic CI/CD deployment.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `❌ No .env.local found` | Create `.env.local` with `VITE_CONVEX_URL` and `VITE_WORKOS_CLIENT_ID` |
| Convex functions not updating | Save any file in `convex/` to trigger re-sync |
| "Unable to connect. Please try again." on login | WorkOS API key is wrong or the Magic Auth endpoint URL is wrong in `functions/api/auth/login.ts` |
| OTP email not arriving | Check spam; verify `WORKOS_API_KEY` is correct |
| Convex query returns stale data | Hard refresh browser — Convex real-time subscription may have dropped |
| `npx convex dev` auth error | Run `npx convex login` |
| Model sync 502 error | Check `BRAIN_SHARED_SECRET` matches between provision `.dev.vars` and Convex env vars |
