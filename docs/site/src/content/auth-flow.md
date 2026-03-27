# Auth Flow

## Overview

Authentication uses **WorkOS Magic Auth** — users enter their email, receive a 6-digit code, and verify it. No passwords. The token exchange uses PKCE (Proof Key for Code Exchange) so no client secret is ever sent from the browser.

## Sequence Diagram

```
Browser                   CF Function            WorkOS
  │                           │                     │
  ├─POST /api/auth/signup──►  │                     │
  │  { email, firstName }     │                     │
  │                           ├─CREATE user──────►  │
  │                           ├─ADD to org (WORKOS_ORG_ID)
  │                           ├─POST magic_auth───► │
  │  ◄─{ success: true }─────┤                     │
  │                           │                     │
  │ (User checks email)       │                     │
  │                           │                     │
  ├─POST /api/auth/signup──►  │                     │
  │  { email, code: "123456" }│                     │
  │                           ├─authenticateMagicAuth►│
  │                           │  ◄─ org_selection_required ┤
  │                           │     pending_token         │
  │                           │                     │
  │  ◄─{ error: "org_selection_required",           │
  │       pending_authentication_token }──────────  │
  │                           │                     │
  ├─GET /api/orgs/membership?token=...&email=...    │
  │                           ├─listOrganizationMemberships
  │                           │  (filtered to WORKOS_ORG_ID)
  │  ◄─{ organizations: [{ id, name }] }────────── │
  │                           │                     │
  │ (1 org → auto-select)     │                     │
  ├─POST /api/auth/login-org──►                     │
  │  { pending_token, org_id }│                     │
  │                           ├─authenticateWithOrganizationSelection►│
  │                           │  ◄─{ accessToken, refreshToken, user }┤
  │  ◄─{ accessToken, user }──┤                     │
  │                           │                     │
  │ (React stores tokens, initializes Convex)       │
```

## Auth Steps in `AuthPage.tsx`

The `AuthPage` component manages a step state machine:

| Step | What the user sees |
|---|---|
| `email` | Email (+ name for signup) input |
| `code` | 6-digit code input boxes |
| `loading_orgs` | "Loading workspaces..." spinner |
| `org_selection` | Org picker (shown only if >1 org) |
| `success` | "You're in" — auto-redirect after 800ms |
| `no_org` | No org found — "Request Access" form |

### Auto-Select Behavior

When `WORKOS_ORG_ID` is set (all provisioned deployments), the membership API returns exactly 1 org. The auth page detects this and skips the picker:

```typescript
useEffect(() => {
  if (step === 'org_selection' && organizations.length === 1) {
    selectOrganization(organizations[0].id);
  }
}, [step, organizations]);
```

## Token Management (`CustomAuthProvider.tsx`)

After successful login:

1. `accessToken` and `refreshToken` are stored in `localStorage`
2. A refresh heartbeat runs every **4 minutes** (tokens expire in ~5 min)
3. On browser tab visibility change → refresh immediately
4. After **3 consecutive refresh failures** → auto-sign-out

Token refresh calls `POST /api/auth/refresh` which calls `workos.userManagement.refreshAccessToken`.

## Login vs Signup

Both `login` and `signup` go through the same Magic Auth flow. The only difference:
- **Signup** (`POST /api/auth/signup`): Creates the WorkOS user if they don't exist, then adds them to the tenant org
- **Login** (`POST /api/auth/login`): Skips user creation, sends magic code directly

If a user signs up with an existing email, the API treats it as a login (returns the existing user).

## Already-Authenticated Users Without an Active Org

If a user's token has no org context (`isAuthenticatedWithoutOrg` prop is true), the auth page fetches their orgs via email and lets them pick one. This handles the edge case where a user's org membership was added after they last logged in.

## Invite Acceptance (`/accept-invite`)

WorkOS invitations are accepted via:

```
POST /api/auth/accept-invite
{ invitation_token, email }
```

This calls `workos.userManagement.acceptInvitation`. On success, the user is redirected to the main app.
