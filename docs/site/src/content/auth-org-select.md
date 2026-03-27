# Org Auto-Select

## The Problem It Solves

WorkOS requires org-scoped tokens for multi-tenant apps. When a user authenticates, WorkOS returns `organization_selection_required` if the user belongs to more than one org — or in some configurations, even for a single org.

Without any filtering, a user who had been added to multiple WorkOS orgs (e.g. by testing, demos, or an earlier bug where each venture created a WorkOS org) would see all of those listed in the workspace picker.

On a provisioned deployment, users should **never** see a workspace picker. They belong to exactly one org — the tenant org linked to this deployment.

## How It Works

Three mechanisms work together to ensure single-org behavior:

### 1. WORKOS_ORG_ID Filter (Membership API)

`functions/api/orgs/membership.ts` filters the org list to the deployment's linked org:

```typescript
const linkedOrgId = env.WORKOS_ORG_ID;
const filtered = linkedOrgId
  ? organizations.filter(org => org.id === linkedOrgId)
  : organizations;

return Response.json({ organizations: filtered });
```

Result: the membership API always returns exactly 1 org on provisioned deployments.

### 2. Auto-Add on Signup

When a new user signs up, `functions/api/auth/signup.ts` immediately adds them to the tenant org:

```typescript
if (env.WORKOS_ORG_ID && createRes.ok && createData.id) {
  await fetch('https://api.workos.com/user_management/organization_memberships', {
    method: 'POST',
    body: JSON.stringify({ user_id: createData.id, organization_id: env.WORKOS_ORG_ID }),
  })
}
```

This ensures the org appears in the membership list when the magic code is verified.

### 3. Auto-Select in AuthPage

`components/AuthPage.tsx` skips the picker when only 1 org is returned:

```typescript
useEffect(() => {
  if (step === 'org_selection' && organizations.length === 1) {
    selectOrganization(organizations[0].id);
  }
}, [step, organizations]);
```

The user goes directly from code verification → success, with no picker shown.

## Non-Provisioned / Dev Deployments

When `WORKOS_ORG_ID` is **not** set:
- Membership API returns all orgs the user belongs to
- If >1 org → workspace picker is shown
- If 0 orgs → "No Active Workspaces" + "Request Access" screen

This is the expected behavior for development, testing, or standalone deployments that manage their own WorkOS setup.

## Sequence: Provisioned Deployment Login

```
User enters email + code
  └─► WorkOS: "organization_selection_required" + pending_token
  └─► GET /api/orgs/membership?token=...
        └─► WorkOS returns user's full org list
        └─► Filter: only org_... (WORKOS_ORG_ID) passes
        └─► Response: [{ id: "org_...", name: "Acme" }]
  └─► AuthPage: organizations.length === 1
        └─► selectOrganization("org_...") called immediately
  └─► POST /api/auth/login-org { pending_token, org_id: "org_..." }
        └─► WorkOS returns scoped access token
  └─► User is in — no picker shown
```
