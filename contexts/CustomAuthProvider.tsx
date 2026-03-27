/**
 * Custom Auth Context — replaces @workos-inc/authkit-react AuthKitProvider.
 *
 * Uses WorkOS User Management APIs with PKCE (Proof Key for Code Exchange)
 * for secure client-side authentication without exposing client_secret.
 *
 * Flow:
 *  1. Generate code_verifier + code_challenge
 *  2. Redirect to WorkOS /authorize with code_challenge
 *  3. On callback, exchange code using code_verifier (no client_secret)
 *  4. Store tokens, refresh in background
 *
 * Dynamic redirect_uri via window.location.origin — works on any tenant subdomain.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  emailVerified?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: () => void;
  signUp: () => void;
  signOut: () => void;
  getAccessToken: () => Promise<string | null>;
  switchToOrganization: (params: { organizationId: string }) => Promise<void>;
  authenticateDirectly: (data: { user: any; accessToken: string; refreshToken: string }) => void;
}

const STORAGE_KEY = 'workos_auth_session';
const TOKEN_EXPIRY_KEY = 'workos_token_expiry';
const PKCE_VERIFIER_KEY = 'workos_pkce_verifier';

// ── PKCE Helpers ─────────────────────────────────────────────────────────────

/** Generate a cryptographically random code verifier (43-128 chars, URL-safe) */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/** SHA-256 hash the verifier and base64url-encode for code_challenge */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/** Base64url encode (RFC 7636) */
function base64UrlEncode(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// ── Session Helpers ──────────────────────────────────────────────────────────

function getStoredSession(): { user: AuthUser; accessToken: string; refreshToken: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function storeSession(user: AuthUser, accessToken: string, refreshToken: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, accessToken, refreshToken }));
  // Keep session alive locally for 55 minutes — proactive refresh will renew before this
  localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + 55 * 60 * 1000));
}

function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
}

// ── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

interface CustomAuthProviderProps {
  clientId: string;
  apiHostname?: string;
  children: React.ReactNode;
}

export function CustomAuthProvider({ clientId, apiHostname, children }: CustomAuthProviderProps) {
  const [state, setState] = useState<AuthState>(() => {
    const stored = getStoredSession();
    
    // Self-healing: If we have a session but it's missing the actual access token, it's corrupted.
    if (stored && (!stored.accessToken || stored.accessToken === 'undefined')) {
      console.warn("[Auth] Detected corrupted local session (missing accessToken). Force clearing.");
      clearStoredSession();
      return {
        user: null,
        accessToken: null,
        refreshToken: null,
        isLoading: false,
        isAuthenticated: false,
      };
    }

    return {
      user: stored?.user || null,
      accessToken: stored?.accessToken || null,
      refreshToken: stored?.refreshToken || null,
      isLoading: true,
      isAuthenticated: !!stored?.user,
    };
  });

  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // WorkOS authorization base URL
  const workosBase = apiHostname
    ? `https://${apiHostname}`
    : 'https://api.workos.com';

  // Dynamic redirect URI: always the current origin
  const redirectUri = `${window.location.origin}/callback`;

  // ── Build authorization URL with PKCE ────────────────────────────────────

  const startAuthFlow = useCallback(
    async (screenHint?: 'sign-in' | 'sign-up') => {
      // Generate PKCE pair
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Store verifier for the callback exchange
      sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier);

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        provider: 'authkit',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

      if (screenHint) {
        params.set('screen_hint', screenHint);
      }

      return `${workosBase}/user_management/authorize?${params.toString()}`;
    },
    [clientId, redirectUri, workosBase]
  );

  // ── Sign in / Sign up / Sign out ────────────────────────────────────────

  const signIn = useCallback(() => {
    // Store current URL for post-auth redirect
    sessionStorage.setItem('founderstack_return_url', window.location.href);
    startAuthFlow('sign-in').then(url => {
      window.location.href = url;
    });
  }, [startAuthFlow]);

  const signUp = useCallback(() => {
    sessionStorage.setItem('founderstack_return_url', window.location.href);
    startAuthFlow('sign-up').then(url => {
      window.location.href = url;
    });
  }, [startAuthFlow]);

  const signOut = useCallback(() => {
    clearStoredSession();
    setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,
    });
    window.location.href = '/';
  }, []);

  // ── Parse user from API response ────────────────────────────────────────

  const parseUser = (data: any): AuthUser => ({
    id: data.user.id,
    email: data.user.email,
    firstName: data.user.first_name,
    lastName: data.user.last_name,
    profilePictureUrl: data.user.profile_picture_url,
    emailVerified: data.user.email_verified,
  });

  // ── Get access token (with background refresh & deduplication lock) ──
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    const session = getStoredSession();

    if (!session) return null;

    // If token is still valid, return it
    if (expiry && Date.now() < Number(expiry)) {
      return session.accessToken;
    }

    // Token expired — return existing refresh promise if already refreshing
    if (refreshPromiseRef.current) {
        return refreshPromiseRef.current;
    }

    // Token expired — try to refresh via server-side proxy
    // Uses CF Pages Function which has client_secret server-side
    if (session.refreshToken) {
      refreshPromiseRef.current = (async () => {
         try {
           const res = await fetch('/api/auth/refresh', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               refresh_token: session.refreshToken,
             }),
           });

           if (res.ok) {
             const data = await res.json();
             const user = parseUser(data);
             storeSession(user, data.access_token, data.refresh_token);
             setState(prev => ({
               ...prev,
               user,
               accessToken: data.access_token,
               refreshToken: data.refresh_token,
             }));
             return data.access_token;
           } else {
             console.warn('[Auth] Token refresh returned', res.status);
              // If refresh fails, silently keep using the existing token.
              // Will retry on the next heartbeat or tab focus.
              // Extend local expiry so user isn't interrupted.
              localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + 55 * 60 * 1000));
             }
         } catch (e) {
           console.warn('[Auth] Token refresh failed:', e);
         }
         return session.accessToken; // fallback
      })();

      try {
          const newAccessToken = await refreshPromiseRef.current;
          return newAccessToken;
      } finally {
          refreshPromiseRef.current = null;
      }
    }

    return session.accessToken; // Return last known token as fallback
  }, [clientId, workosBase]);

  // ── Handle OAuth callback (PKCE code exchange) ──────────────────────────

  useEffect(() => {
    const handleCallback = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const invitationToken = url.searchParams.get('invitation_token');

      if (window.location.pathname !== '/callback') {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // ── Invitation token flow (WorkOS invitation acceptance) ────────────
      if (invitationToken && !code) {
        try {
          const res = await fetch('/api/auth/accept-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invitation_token: invitationToken }),
          });

          if (!res.ok) {
            const errorBody = await res.text();
            throw new Error(`Invitation auth failed (${res.status}): ${errorBody}`);
          }

          const data = await res.json();
          const user = parseUser(data);

          storeSession(user, data.access_token, data.refresh_token);
          setState({
            user,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            isLoading: false,
            isAuthenticated: true,
          });

          window.location.href = '/accept-invite';
        } catch (error) {
          console.error('[Auth] Invitation acceptance error:', error);
          clearStoredSession();
          setState({
            user: null,
            accessToken: null,
            refreshToken: null,
            isLoading: false,
            isAuthenticated: false,
          });
          window.history.replaceState({}, document.title, '/');
        }
        return;
      }

      // ── PKCE authorization code flow ────────────────────────────────────
      if (!code) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Retrieve the PKCE verifier stored before redirect
      const codeVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
      if (!codeVerifier) {
        console.error('[Auth] Missing PKCE code_verifier — cannot exchange code');
        setState(prev => ({ ...prev, isLoading: false }));
        window.history.replaceState({}, document.title, '/');
        return;
      }

      try {
        // Exchange code for tokens using code_verifier (no client_secret needed)
        const res = await fetch(`${workosBase}/user_management/authenticate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            grant_type: 'authorization_code',
            code,
            code_verifier: codeVerifier,
          }),
        });

        // Clean up PKCE verifier
        sessionStorage.removeItem(PKCE_VERIFIER_KEY);

        if (!res.ok) {
          const errorBody = await res.text();
          throw new Error(`Auth failed (${res.status}): ${errorBody}`);
        }

        const data = await res.json();
        const user = parseUser(data);

        storeSession(user, data.access_token, data.refresh_token);
        setState({
          user,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          isLoading: false,
          isAuthenticated: true,
        });

        // If invitation_token is also present with code, redirect to welcome page
        const returnUrl = sessionStorage.getItem('founderstack_return_url');
        if (invitationToken) {
          sessionStorage.removeItem('founderstack_return_url');
          window.location.href = '/accept-invite';
        } else if (returnUrl) {
          sessionStorage.removeItem('founderstack_return_url');
          window.location.href = returnUrl;
        } else {
          window.history.replaceState({}, document.title, '/');
        }
      } catch (error) {
        console.error('[Auth] Callback error:', error);
        sessionStorage.removeItem(PKCE_VERIFIER_KEY);
        clearStoredSession();
        setState({
          user: null,
          accessToken: null,
          refreshToken: null,
          isLoading: false,
          isAuthenticated: false,
        });
        window.history.replaceState({}, document.title, '/');
      }
    };

    handleCallback();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Proactive token refresh (heartbeat) ──────────────────────────────────

  useEffect(() => {
    if (!state.user) return;

    const REFRESH_INTERVAL = 50 * 60 * 1000; // 50 minutes — proactively refresh well before 55-min local expiry

    const refresh = async () => {
      try {
        await getAccessToken();
      } catch (e) {
        console.warn('[Auth] Background refresh error:', e);
      }
    };

    refreshTimerRef.current = setInterval(refresh, REFRESH_INTERVAL);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [state.user, getAccessToken]);

  // ── Switch organization (for WorkOS widgets compat) ─────────────────────

  const switchToOrganization = useCallback(async ({ organizationId }: { organizationId: string }) => {
    // Use the existing refresh token to get an org-scoped access token —
    // no redirect needed, user stays in the app.
    const session = getStoredSession();
    if (session?.refreshToken) {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refresh_token: session.refreshToken,
            organization_id: organizationId,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const user = parseUser(data);
          storeSession(user, data.access_token, data.refresh_token);
          setState({
            user,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            isLoading: false,
            isAuthenticated: true,
          });
          // Reload so Convex re-authenticates with the new org-scoped token
          window.location.href = '/';
          return;
        }
      } catch {
        // fall through to PKCE redirect below
      }
    }

    // Fallback: PKCE redirect (no refresh token available)
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      provider: 'authkit',
      organization_id: organizationId,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    window.location.href = `${workosBase}/user_management/authorize?${params.toString()}`;
  }, [clientId, redirectUri, workosBase]);

  // ── Direct auth (from custom AuthPage forms) ───────────────────────────

  const authenticateDirectly = useCallback((data: { user: any; accessToken: string; refreshToken: string }) => {
    const user: AuthUser = {
      id: data.user.id,
      email: data.user.email,
      firstName: data.user.first_name || data.user.firstName,
      lastName: data.user.last_name || data.user.lastName,
      profilePictureUrl: data.user.profile_picture_url || data.user.profilePictureUrl,
      emailVerified: data.user.email_verified || data.user.emailVerified,
    };
    storeSession(user, data.accessToken, data.refreshToken);
    setState({
      user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  // ── Context value ────────────────────────────────────────────────────────

  const value: AuthContextValue = {
    ...state,
    signIn,
    signUp,
    signOut,
    getAccessToken,
    switchToOrganization,
    authenticateDirectly,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within a CustomAuthProvider');
  }
  return ctx;
}
