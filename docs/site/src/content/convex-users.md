# Convex — Users & Roles

## User Sync (`users.ts`)

WorkOS is the source of truth for user identity. Convex keeps a local `users` record for each signed-in user, synced from the WorkOS token claims.

### `api.users.store`

Called by the React app on every sign-in and also called inside `project_actions.ts` before creating a venture to ensure the user exists before any mutation references their `_id`.

```typescript
// Upserts the current user from their WorkOS token
await ctx.runMutation(api.users.store, {})
```

### `api.users.getUser`

Returns the full user record including `orgIds`, `roles`, and `currentOrgId`.

```typescript
const user = useQuery(api.users.getUser)
```

### `api.users.setCurrentOrg`

Updates the user's active org. Used when switching workspaces.

```typescript
await ctx.runMutation(api.users.setCurrentOrg, { orgId: "org_..." })
```

## WorkOS Sync (`workos.ts`, `workos_events.ts`)

WorkOS fires webhooks when org memberships change. The webhook handler (`convex/http.ts` → `convex/webhooks.ts`) updates the user's `orgIds` array in Convex to stay in sync.

Webhook events handled:

| Event | Action |
|---|---|
| `organization_membership.created` | Add `orgId` to user's `orgIds` |
| `organization_membership.deleted` | Remove `orgId` from `orgIds` |

## Roles (`roles.ts`, `permissions.ts`)

Roles are stored on the `users` record as an array:

```typescript
roles: [
  { orgId: "org_...", role: "Founder" },
  // more orgs if user belongs to multiple
]
```

### Permission Evaluation

`convex/permissions.ts` defines what each role can do. The `useAccessControl` hook in the React app evaluates permissions client-side for UI gating, and Convex mutations/queries do server-side enforcement.

```typescript
// Hook usage
const { canEdit, canDelete, canInvite } = useAccessControl({ projectId, orgId })
```

### Role Hierarchy

| Role | Create | Edit | Delete Venture | Invite |
|---|---|---|---|---|
| Founder | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ❌ | ✅ |
| Member | ❌ | ✅ | ❌ | ❌ |
| Viewer | ❌ | ❌ | ❌ | ❌ |

## Team Invitations (`invites.ts`)

Invitations are sent via WorkOS. The provisioner portal's WorkOS integration creates invitations; the whitelabel app's `/accept-invite` route handles acceptance.

```typescript
// Accepting an invite
await ctx.runAction(api.invites.acceptInvite, { invitationToken, email })
// Calls POST /api/auth/accept-invite → workos.userManagement.acceptInvitation
```

## `UserContext` (React)

**File:** `contexts/UserContext.tsx`

Provides the current user to the React tree:

```typescript
const { user, currentOrgId, switchOrg } = useUser()
```

- `user` — the Convex user record (from `api.users.getUser`)
- `currentOrgId` — active org (from `user.currentOrgId`, persisted in Convex)
- `switchOrg` — updates `currentOrgId` and triggers re-auth with new org scope
