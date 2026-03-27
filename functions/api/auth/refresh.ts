/**
 * Cloudflare Pages Function: Token Refresh Proxy
 * POST /api/auth/refresh → WorkOS refresh token exchange
 *
 * Keeps client_secret server-side for secure token refresh.
 */
// Memory cache to deduplicate simultaneous refresh requests from multiple browser tabs.
// Stores the previous refresh token and the new tokens it resolved to.
interface TokenCache {
  data: any;
  expiresAt: number; // Date.now() + 60s
}

const refreshCache = new Map<string, TokenCache>();

function cleanCache() {
  const now = Date.now();
  for (const [key, val] of refreshCache.entries()) {
    if (now > val.expiresAt) refreshCache.delete(key);
  }
}

export async function onRequestPost(context: {
  request: Request;
  env: {
    WORKOS_API_KEY: string;
    WORKOS_CLIENT_ID: string;
  };
}) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': new URL(request.url).origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = await request.json() as { refresh_token: string; organization_id?: string };

    if (!body.refresh_token) {
      return new Response(
        JSON.stringify({ error: 'Refresh token is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // --- EDGE CACHE DEDUPLICATION ---
    // If multiple tabs request a refresh at the same time, return the cached result
    // to prevent WorkOS throwing an "invalid_grant" on the reused refresh_token.
    cleanCache();
    const cached = refreshCache.get(body.refresh_token);
    if (cached && Date.now() < cached.expiresAt) {
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const res = await fetch('https://api.workos.com/user_management/authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: env.WORKOS_CLIENT_ID,
        client_secret: env.WORKOS_API_KEY,
        grant_type: 'refresh_token',
        refresh_token: body.refresh_token,
        ...(body.organization_id ? { organization_id: body.organization_id } : {}),
      }),
    });

    const data = await res.json();

    // Cache successful refreshes for 60 seconds
    if (res.ok && data.access_token) {
      refreshCache.set(body.refresh_token, {
        data,
        expiresAt: Date.now() + 60 * 1000,
      });
    }

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: 'Token refresh failed', message: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}

export async function onRequestOptions(context: { request: Request }) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': new URL(context.request.url).origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
