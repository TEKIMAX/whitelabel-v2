# CustomAuthProvider

**File:** `contexts/CustomAuthProvider.tsx`

## Overview

`CustomAuthProvider` is the WorkOS PKCE auth context for the app. It manages the access token lifecycle and provides auth state to the entire React tree.

## What It Does

1. **PKCE Exchange** — Handles the `?code=` callback from WorkOS, exchanging the code for tokens
2. **Token Storage** — Stores `accessToken` and `refreshToken` in `localStorage`
3. **Token Refresh** — Runs a heartbeat every 4 minutes to proactively refresh before expiry
4. **Session Death Detection** — After 3 consecutive refresh failures, clears tokens and redirects to sign-in
5. **Convex Integration** — Provides `fetchAccessToken` callback to `ConvexProviderWithAuth`, which injects the WorkOS JWT into every Convex request

## Interface

```typescript
interface AuthContextValue {
  isSignedIn: boolean
  isLoading: boolean
  user: WorkOSUser | null
  accessToken: string | null
  orgId: string | null
  signOut: () => void
  refreshTokens: () => Promise<boolean>
}
```

## Usage

```typescript
import { useAuth } from '../contexts/CustomAuthProvider'

function MyComponent() {
  const { isSignedIn, user, orgId, signOut } = useAuth()

  if (!isSignedIn) return <AuthPage />
  return <Dashboard user={user} />
}
```

## Provider Setup (`index.tsx`)

```typescript
<CustomAuthProvider>
  <ConvexProviderWithAuth client={convex} useAuth={useWorkOSAuth}>
    <UserProvider>
      <App />
    </UserProvider>
  </ConvexProviderWithAuth>
</CustomAuthProvider>
```

`useWorkOSAuth` is a thin adapter that maps `CustomAuthProvider`'s `fetchAccessToken` to the interface Convex expects.

## Token Refresh Heartbeat

```typescript
// Runs every 4 minutes (tokens expire ~5 min)
const REFRESH_INTERVAL_MS = 4 * 60 * 1000

useEffect(() => {
  const interval = setInterval(refreshTokens, REFRESH_INTERVAL_MS)
  return () => clearInterval(interval)
}, [])

// Also refresh when tab becomes visible
useEffect(() => {
  const onVisibility = () => {
    if (document.visibilityState === 'visible') refreshTokens()
  }
  document.addEventListener('visibilitychange', onVisibility)
  return () => document.removeEventListener('visibilitychange', onVisibility)
}, [])
```

## Organization Switching

When a user switches workspace (org), `signOut` is called to clear the current session, then the user is redirected back to the auth flow which will pick up the new org via the auto-select mechanism.

```typescript
// In UserContext.tsx
const switchOrg = async (newOrgId: string) => {
  await ctx.runMutation(api.users.setCurrentOrg, { orgId: newOrgId })
  // Trigger WorkOS org-scoped re-auth via AuthPage
  authCtx.signOut()
}
```
