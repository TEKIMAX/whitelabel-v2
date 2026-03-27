/**
 * Cloudflare Pages Function: Password Reset Proxy
 * POST /api/auth/forgot-password → WorkOS send password reset
 */
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
    const body = await request.json() as { email: string };

    if (!body.email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const res = await fetch('https://api.workos.com/user_management/password_reset/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.WORKOS_API_KEY}`,
      },
      body: JSON.stringify({
        email: body.email,
      }),
    });

    // Always return success to prevent email enumeration
    return new Response(
      JSON.stringify({ success: true, message: 'If an account exists, a reset link has been sent.' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (e: any) {
    // Still return success to prevent enumeration
    return new Response(
      JSON.stringify({ success: true, message: 'If an account exists, a reset link has been sent.' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
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
