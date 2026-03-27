import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { UserProvider } from './contexts/UserContext';
import { CustomAuthProvider, useAuth } from './contexts/CustomAuthProvider';
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import './index.css';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import ErrorBoundary from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { convex } from './convexClient';

const MAX_TOKEN_FAILURES = 3; // Auto-sign-out after this many consecutive failures

function useWorkOSAuthAdapter() {
  const { isLoading, user, getAccessToken, signOut } = useAuth();

  // Track consecutive failures — auto-clear session after MAX_TOKEN_FAILURES
  const failCountRef = React.useRef(0);
  const [sessionDead, setSessionDead] = React.useState(false);

  // Reset on user change
  React.useEffect(() => {
    failCountRef.current = 0;
    setSessionDead(false);
  }, [user]);

  // Proactive Token Refresh (Heartbeat)
  // Silently refresh tokens in the background every 4 minutes.
  // AuthKitProvider's built-in refresh handles the heavy lifting;
  // this is a secondary heartbeat for resilience.
  React.useEffect(() => {
    if (!user) return;

    const REFRESH_INTERVAL = 4 * 60 * 1000; // 4 minutes

    const refreshToken = async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          failCountRef.current = 0;
        } else {
          console.warn("[Auth] Background refresh returned null token (silent)");
        }
      } catch (e) {
        console.warn("[Auth] Background refresh error (silent):", e);
      }
    };

    const intervalId = setInterval(refreshToken, REFRESH_INTERVAL);

    // Re-validate session when user returns to the tab after backgrounding
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshToken();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, getAccessToken]);

  return React.useMemo(() => ({
    isLoading,
    // User presence = authenticated, BUT only if we haven't detected a dead session.
    // After MAX_TOKEN_FAILURES consecutive null tokens, we clear the session
    // to break the infinite Convex loading loop.
    isAuthenticated: !!user && !sessionDead,
    fetchAccessToken: async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      try {
        const token = await getAccessToken();

        if (token) {
          failCountRef.current = 0;
          return token;
        }

        // No token but user exists — session might be refreshing
        if (user) {
          failCountRef.current++;
          console.warn(`[Auth] Token fetch returned null (attempt ${failCountRef.current}/${MAX_TOKEN_FAILURES})`);

          // After repeated failures, the session is dead — force sign-out
          // so the user sees the login page instead of an infinite spinner
          if (failCountRef.current >= MAX_TOKEN_FAILURES) {
            console.error('[Auth] Session expired — too many consecutive token failures. Clearing session.');
            setSessionDead(true);
            signOut();
            return null;
          }
        }

        return null;
      } catch (e) {
        console.error("[Auth] Error fetching access token:", e);
        if (user) {
          failCountRef.current++;
          if (failCountRef.current >= MAX_TOKEN_FAILURES) {
            console.error('[Auth] Session expired — too many consecutive token failures. Clearing session.');
            setSessionDead(true);
            signOut();
            return null;
          }
        }
        return null;
      }
    },
  }), [isLoading, user, getAccessToken, sessionDead, signOut]);
}

function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithAuth
      client={convex}
      useAuth={useWorkOSAuthAdapter}
    >
      {children}
    </ConvexProviderWithAuth>
  );
}

import { HelmetProvider } from 'react-helmet-async';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <CustomAuthProvider
          clientId={import.meta.env.VITE_WORKOS_CLIENT_ID}
          {...(import.meta.env.VITE_WORKOS_API_HOSTNAME ? { apiHostname: import.meta.env.VITE_WORKOS_API_HOSTNAME } : {})}
        >
          <ConvexClientProvider>
            <Theme accentColor="gold" grayColor="sand" radius="large" scaling="100%">
              <UserProvider>
                <App />
              </UserProvider>
            </Theme>
          </ConvexClientProvider>
        </CustomAuthProvider>
      </ErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>
);