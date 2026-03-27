# Convex — Projects (Ventures)

## Files

| File | Purpose |
|---|---|
| `convex/projects.ts` | Queries, mutations — CRUD for venture records |
| `convex/project_actions.ts` | Actions — creates/deletes ventures, triggers redeploy, generates WorkOS portal links |

## `project_actions.create`

Creates a new venture. This is the public entry point called from the React app.

```typescript
const projectId = await ctx.runAction(api.project_actions.create, {
  name: "My Startup",
  hypothesis: "We believe...",
  localId: undefined,
  foundingDate: Date.now(),
})
```

**What it does:**
1. Reads `WORKOS_ORG_ID` from Convex env (`process.env.WORKOS_ORG_ID`)
2. Throws if not set — the deployment is not properly configured
3. Calls `api.users.store` to force-sync the user before any insert
4. Calls `internal.projects.createInternal` with `orgId` + `deploymentId`

No WorkOS API calls are made.

## `internal.projects.createInternal`

Internal mutation — not callable from the browser.

```typescript
// args
{
  name: string
  hypothesis: string
  orgId: string
  tokenIdentifier: string
  localId?: string
  foundingDate?: number
  logo?: string
  businessStructure?: string
  deploymentId?: string
}
```

**Steps:**
1. Looks up the Convex user by `tokenIdentifier`
2. Adds `orgId` to `user.orgIds` if not already present
3. Adds `{ orgId, role: "Founder" }` to `user.roles`
4. Generates a unique URL slug from the venture name
5. Inserts the `projects` record
6. Inserts a default `canvases` record
7. Links canvas to project via `currentCanvasId`
8. Inserts creator as `Founder` in `team_members`

## `project_actions.deleteProject`

Permanently deletes a venture. Only the creator can call this.

```typescript
await ctx.runAction(api.project_actions.deleteProject, { projectId })
```

**What it does:**
1. Verifies the caller is the project creator
2. Calls `internal.projects.markDeleted` to cascade deletion in Convex
3. No WorkOS API calls — ventures are Convex-only

## `project_actions.generatePortalLink`

Generates a WorkOS admin portal link for the tenant org (SSO, DSync, audit logs).

```typescript
const link = await ctx.runAction(api.project_actions.generatePortalLink, {
  orgId: "org_...",
  intent: "sso", // "sso" | "dsync" | "audit_logs"
})
```

## `project_actions.redeployProject`

Triggers a re-deployment via the provisioner Go API.

```typescript
await ctx.runAction(api.project_actions.redeployProject, { deploymentId })
```

Calls `POST {MASTER_API_URL}/api/deployments/{id}/redeploy` with the caller's JWT.

## Querying Projects

```typescript
// All ventures for current org
const ventures = useQuery(api.projects.list, { orgId })

// Single venture
const venture = useQuery(api.projects.get, { projectId })

// By slug (public)
const venture = useQuery(api.projects.getBySlug, { slug })
```

## Canvas Versions

Each venture has a `currentCanvasId` pointing to the active canvas. Previous versions are kept in the `canvases` table for history. Canvas updates go through `convex/canvas.ts`.
