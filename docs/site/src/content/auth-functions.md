# CF Functions — Auth Endpoints

All auth endpoints are Cloudflare Pages Functions in `functions/api/auth/`. They run at the edge and have access to secrets via `env`.

## `POST /api/auth/signup`

**File:** `functions/api/auth/signup.ts`

Creates a new user (if needed) and sends a Magic Auth code.

### Request

```json
{ "email": "user@example.com", "firstName": "Jane", "lastName": "Doe" }
```

### Step 1 — Send Code

1. Calls `POST https://api.workos.com/user_management/users` to create user
2. If `WORKOS_ORG_ID` is set and user was newly created — adds them to the tenant org:
   ```
   POST https://api.workos.com/user_management/organization_memberships
   { user_id, organization_id: WORKOS_ORG_ID }
   ```
3. Calls `POST https://api.workos.com/user_management/magic_auth` to send code

### Step 2 — Verify Code

```json
{ "email": "user@example.com", "code": "123456" }
```

Calls `workos.userManagement.authenticateWithMagicAuth`. Returns access/refresh tokens or `organization_selection_required` error.

---

## `POST /api/auth/login`

**File:** `functions/api/auth/login.ts`

Same as signup step 2 (verify code path) but skips user creation.

---

## `POST /api/auth/login-org`

**File:** `functions/api/auth/login-org.ts`

Exchanges a `pending_authentication_token` for a token scoped to a specific org.

### Request

```json
{
  "pending_authentication_token": "pat_...",
  "organization_id": "org_..."
}
```

Calls `workos.userManagement.authenticateWithOrganizationSelection`. Returns full auth session.

---

## `POST /api/auth/refresh`

**File:** `functions/api/auth/refresh.ts`

Refreshes an expired access token using the refresh token.

### Request

```json
{ "refreshToken": "rt_..." }
```

Calls `workos.userManagement.refreshAccessToken`. Returns new `accessToken` + `refreshToken`.

---

## `POST /api/auth/request-access`

**File:** `functions/api/auth/request-access.ts`

Sends an access request email to the provisioner admin (via Resend).

### Request

```json
{ "name": "Jane Doe", "email": "jane@example.com", "message": "I need access..." }
```

Requires `RESEND_API_KEY` and `ADMIN_EMAIL` env vars.

---

## `POST /api/auth/accept-invite`

**File:** `functions/api/auth/accept-invite.ts`

Accepts a WorkOS organization invitation.

### Request

```json
{ "invitation_token": "inv_token_...", "email": "jane@example.com" }
```

Calls `workos.userManagement.acceptInvitation`. Redirects to app on success.

---

## `GET /api/orgs/membership`

**File:** `functions/api/orgs/membership.ts`

Returns the list of WorkOS orgs a user belongs to, filtered to `WORKOS_ORG_ID` when set.

### Query Params

| Param | Required | Description |
|---|---|---|
| `token` | ⬜ | `pending_authentication_token` from a failed auth |
| `email` | ⬜ | User's email — used to look up userId if no token |
| `userId` | ⬜ | WorkOS user ID — skips email lookup if provided |

Either `token` or `email` must be provided.

### Response

```json
{ "organizations": [{ "id": "org_...", "name": "Acme Workspace" }] }
```

When `WORKOS_ORG_ID` is set, always returns 0 or 1 organizations. The auth page auto-selects when exactly 1 is returned.

---

## Env Variables Required

| Variable | Functions that use it |
|---|---|
| `WORKOS_API_KEY` | All |
| `WORKOS_CLIENT_ID` | signup, login, login-org, refresh |
| `WORKOS_ORG_ID` | signup (org add), membership (filter) |
| `RESEND_API_KEY` | request-access |
| `ADMIN_EMAIL` | request-access |
