# Local Development

## Prerequisites

- Node.js 18+
- pnpm (preferred) or npm
- Convex account
- WorkOS account + app configured
- Google Gemini API key (or Ollama running locally)

## Setup

### 1. Install dependencies

```bash
cd whitelabel
pnpm install
```

### 2. Set up Convex

```bash
npx convex dev
```

This starts the Convex dev server and generates `convex/_generated/`. Leave it running in a separate terminal.

### 3. Configure environment variables

Copy `.env.local.example` to `.env.local` (or create it):

```bash
# Vite frontend (VITE_ prefix = bundled into browser)
VITE_CONVEX_URL=https://your-project.convex.cloud
VITE_WORKOS_CLIENT_ID=client_...
VITE_APP_URL=http://localhost:5173

# Stripe (publishable key only in VITE_)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Create `.dev.vars` for CF Functions secrets (never in frontend):

```
WORKOS_API_KEY=sk_...
WORKOS_CLIENT_ID=client_...
WORKOS_ORG_ID=org_...
```

### 4. Configure Convex env vars

In the Convex dashboard or via CLI:

```bash
npx convex env set WORKOS_API_KEY sk_...
npx convex env set WORKOS_ORG_ID org_...
npx convex env set DEPLOYMENT_ID local-dev
npx convex env set STRIPE_SECRET_KEY sk_test_...
npx convex env set GEMINI_API_KEY AIza...
```

### 5. Start the dev server

```bash
pnpm dev
# or
./dev.sh
```

The app runs on `http://localhost:5173`. CF Functions run via Wrangler on `http://localhost:8788`.

## Running CF Functions Locally

CF Pages Functions need Wrangler to run locally with the correct secrets:

```bash
npx wrangler pages dev dist --compatibility-date=2024-10-22
```

Or use the provided `dev.sh` script which starts both Vite and Wrangler.

## WorkOS Setup

1. Create a WorkOS application at `dashboard.workos.com`
2. Set redirect URIs:
   - `http://localhost:5173/callback` (dev)
   - `https://your-tenant.pages.dev/callback` (prod)
3. Enable Magic Auth in WorkOS dashboard
4. Create at least one organization and note its ID for `WORKOS_ORG_ID`

## Convex Auth Configuration

`convex.json` configures WorkOS as the auth provider:

```json
{
  "auth": {
    "providers": [
      {
        "domain": "https://api.workos.com",
        "applicationID": "your_workos_client_id"
      }
    ]
  }
}
```

## Common Issues

### "User not found during project creation"
Convex webhook may be slow to sync the new user record. The `project_actions.ts` `create` action calls `api.users.store` to force sync before creating the venture.

### "WORKOS_ORG_ID is not configured"
Set `WORKOS_ORG_ID` in both `.dev.vars` (CF Functions) and via `npx convex env set WORKOS_ORG_ID org_...` (Convex).

### Token refresh loop
If you see repeated 401s, check that `WORKOS_CLIENT_ID` in `.dev.vars` matches the one in your WorkOS dashboard for the PKCE app.
