# Create & Manage Ventures

## What Is a Venture?

A Venture (called "project" in the codebase) is the primary unit of work in the app. Each venture represents a startup, project, or initiative a user is working on. It contains:

- Business Model Canvas (lean canvas)
- OKR goals and roadmap
- Customer discovery interviews
- Market research and sizing
- Pitch deck
- Financial model
- Team members
- AI chat history
- Documents and blog

## Creating a Venture

**File:** `convex/project_actions.ts` → `create`

```typescript
const projectId = await ctx.runAction(api.project_actions.create, {
  name: "My Startup",
  hypothesis: "We believe that...",
  localId: undefined,       // optional: for migrating from local storage
  foundingDate: Date.now(), // optional
})
```

On success returns a `projectId` (`Id<"projects">`).

### What Gets Created

1. **`projects`** record with `orgId`, `deploymentId`, venture metadata
2. **`canvases`** record — default lean canvas linked to the project
3. **`team_members`** record — creator added as Founder

## Listing Ventures

**File:** `convex/projects.ts` → `list` (or similar query)

Ventures are scoped to `orgId` (the tenant org). The UI fetches all ventures for the current user's org and displays them in the venture selector sidebar.

## Deleting a Venture

**File:** `convex/project_actions.ts` → `deleteProject`

```typescript
await ctx.runAction(api.project_actions.deleteProject, { projectId })
```

Only the creator can delete a venture. Deletion:
1. Marks the project as deleted in Convex
2. Cascades to cleanup associated data (canvas, team members, etc.)

No WorkOS API calls are made on deletion (ventures are Convex-only).

## Switching Between Ventures

The `ProjectSelector` component (`components/ProjectSelector.tsx`) lists all ventures and lets the user switch. The selected `projectId` is stored in React state (`App.tsx`) and passed as context throughout the app.

## Venture Onboarding

New ventures go through an onboarding flow (`components/OnboardingFlow.tsx`):

1. Venture name + hypothesis
2. Business model canvas
3. Target market
4. Team setup

The `story.ts` Convex module manages the onboarding step state.

## Roles & Permissions

Team members on a venture have roles:

| Role | Permissions |
|---|---|
| `Founder` | Full access, can delete, can invite |
| `Admin` | Full access, can invite |
| `Member` | Read + write access |
| `Viewer` | Read only |

RBAC is evaluated via `useAccessControl` hook which calls `convex/permissions.ts`.

## Workspace Linking (Provisioner → Whitelabel)

The provisioner portal links **venture workspaces** (WorkOS orgs) to a deployment during the provisioning wizard (Step 2). After linking, workspace members can access the deployed whitelabel app.

The linked workspace is visible in the **Workspaces** tab of the deployment's Manage page in the provisioner portal.

### How It Works

1. Admin selects workspace(s) in Step 2 of the provisioning wizard
2. On deploy, workspace IDs are saved to D1: `deployment_workspaces(deployment_id, workspace_id, workspace_name)`
3. The Convex backend is notified via `POST /api/sync-venture-workspaces`
4. The whitelabel app enforces workspace scoping via `WORKOS_ORG_ID` env var

### Who Can Create Ventures

The `canCreate` flag in `useOnboardingLogic.ts` controls venture creation access:

```typescript
const canCreate = (user?.orgIds?.length ?? 0) > 0   // in any org
    || user?.role === 'Founder'
    || user?.role === 'Admin'
    || user?.role === 'Member'
    || user?.subscriptionStatus === 'active'
    || user?.subscriptionStatus === 'trialing';
```

Any user who belongs to the tenant org can create ventures.
