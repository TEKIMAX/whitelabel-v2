# Deployment

## Overview

The whitelabel app is deployed as a **Cloudflare Pages** project. The provisioner handles initial deployment automatically — this page covers manual deployment and re-deployment.

## Build

```bash
npm run build
# Runs: npx convex deploy && vite build
```

This:
1. Deploys the Convex schema and functions to the production Convex project
2. Builds the React app to `dist/`

## Deploy to Cloudflare Pages

### Via Wrangler (manual)

```bash
npx wrangler pages deploy dist --project-name <your-project-name>
```

Or with account ID:

```bash
CLOUDFLARE_ACCOUNT_ID=<account_id> npx wrangler pages deploy dist --project-name <name>
```

### Via deploy.sh

```bash
./deploy.sh prod
```

### Via GitHub Actions

The `.github/` directory contains a workflow that deploys on push to `main`.

## Environment Variables in CF Pages

Set these in the Cloudflare Pages dashboard under **Settings → Environment Variables**:

| Variable | Where | Description |
|---|---|---|
| `WORKOS_API_KEY` | Production + Preview | WorkOS API key |
| `WORKOS_CLIENT_ID` | Production + Preview | WorkOS client ID |
| `WORKOS_ORG_ID` | Production | Tenant org ID (injected by provisioner) |

{% callout type="info" title="Provisioner manages WORKOS_ORG_ID" %}
In a provisioned deployment, `WORKOS_ORG_ID` is set automatically by the Go worker. Only set it manually for self-hosted or development deployments.
{% /callout %}

## Convex Deployment

Deploy the Convex backend separately:

```bash
npx convex deploy
```

Set env vars in Convex dashboard or via CLI:

```bash
npx convex env set WORKOS_ORG_ID org_...
npx convex env set DEPLOYMENT_ID <cf_pages_deployment_id>
npx convex env set GEMINI_API_KEY AIza...
npx convex env set STRIPE_SECRET_KEY sk_live_...
```

## Docker (Self-Hosted)

A `Dockerfile` is provided for self-hosted deployments:

```bash
docker build -t whitelabel-app .
docker run -p 3000:3000 \
  -e VITE_CONVEX_URL=https://... \
  -e VITE_WORKOS_CLIENT_ID=... \
  whitelabel-app
```

See `cloudbuild.yaml` for the Google Cloud Build pipeline.

## Re-deploy a Provisioned Deployment

From the provisioner portal, navigate to the deployment and click **Redeploy**. This calls:

```
POST /provision-api/api/deployments/{id}/redeploy
```

Which re-runs the provisioner worker — rebuilds the CF Pages deployment and syncs model config.

Alternatively, from the whitelabel app's settings (if `redeployProject` action is wired to the UI), call:

```typescript
await ctx.runAction(api.project_actions.redeployProject, { deploymentId })
```
