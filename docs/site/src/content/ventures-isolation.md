# Org / Venture Isolation Model

## The Two-Level Hierarchy

| Level | What it is | Where it lives |
|---|---|---|
| **Tenant Org** | One WorkOS organization per deployment | WorkOS |
| **Venture** | An independent project inside a deployment | Convex only |

The provisioner owns the Tenant Org. Ventures are **Convex-only records** — they are never WorkOS organizations.

## Why Ventures Are Not WorkOS Orgs

Before this model, every venture creation called `workos.organizations.createOrganization()`. This caused a critical UX bug: users who created multiple ventures would see all of them listed in the workspace selector on login, because WorkOS returned every org they had ever joined.

The fix:
- The provisioner creates **one** WorkOS org when it deploys a tenant
- That org ID (`WORKOS_ORG_ID`) is injected as an env var into the CF Pages deployment and Convex backend
- Ventures are scoped to that single org inside Convex — no WorkOS API calls on creation

## Venture Creation Flow

```
User clicks "New Venture"
  └─► ctx.runAction(api.project_actions.create, { name })
        └─► orgId = process.env.WORKOS_ORG_ID  // from Convex env, set by provisioner
        └─► if (!orgId) throw "WORKOS_ORG_ID is not configured"
        └─► ctx.runMutation(internal.projects.createInternal, {
              orgId,
              deploymentId: process.env.DEPLOYMENT_ID,
              name,
              ...
            })
              └─► INSERT projects { orgId, deploymentId, ... }
              └─► INSERT canvases (default lean canvas)
              └─► INSERT team_members (founder)
        └─► Returns projectId
```

No WorkOS API calls. No WorkOS org created. The venture is a Convex document.

## Env Vars That Drive Isolation

| Env Var | Set on | What it does |
|---|---|---|
| `WORKOS_ORG_ID` | CF Pages + Convex | Filters org list; scopes venture `orgId` |
| `DEPLOYMENT_ID` | Convex | Stored as `deploymentId` on ventures |

Both are injected by the provisioner Go worker at provisioning time.

## Querying Ventures

```typescript
// All ventures for this deployment
const ventures = await ctx.db
  .query("projects")
  .withIndex("by_org_deployment", q =>
    q.eq("orgId", orgId).eq("deploymentId", deploymentId)
  )
  .collect()

// All ventures for a tenant org (across deployments)
const ventures = await ctx.db
  .query("projects")
  .withIndex("by_org", q => q.eq("orgId", orgId))
  .collect()
```

## What the Provisioner Sees vs What Tenants See

| Actor | Sees |
|---|---|
| **Provisioner admin** | Their own deployments list. Each deployment = 1 tenant. Can view the linked WorkOS org, invite users, delete deployment. |
| **Tenant user** | Only their deployment's workspace. The picker is skipped — auto-selected. Ventures they create are private to this deployment. |

## Schema

```typescript
projects: defineTable({
  orgId: v.string(),                   // WorkOS tenant org ID (= WORKOS_ORG_ID)
  deploymentId: v.optional(v.string()), // CF Pages deployment ID
  userId: v.string(),                  // Creator token identifier
  name: v.string(),
  // ... all other venture fields
})
  .index("by_org", ["orgId"])
  .index("by_deployment", ["deploymentId"])
  .index("by_org_deployment", ["orgId", "deploymentId"])
```
