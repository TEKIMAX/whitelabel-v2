/**
 * Cloudflare Pages Function: Send Magic Auth Code
 * POST /api/auth/login → WorkOS create Magic Auth session (sends code to email)
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
    const body = await request.json() as {
      email: string;
      code?: string;
    };

    if (!body.email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Step 1: If no code provided, send a magic auth code to the email
    if (!body.code) {
      const magicRes = await fetch('https://api.workos.com/user_management/magic_auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.WORKOS_API_KEY}`,
        },
        body: JSON.stringify({
          email: body.email,
        }),
      });

      const magicText = await magicRes.text();
      let magicData: any;
      try {
        magicData = magicText ? JSON.parse(magicText) : {};
      } catch (e) {
        magicData = { error: 'Unknown response', message: magicText };
      }

      if (!magicRes.ok) {
        return new Response(JSON.stringify(magicData), {
          status: magicRes.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Code sent to your email' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Step 2: If code is provided, authenticate with the magic auth code
    const { WorkOS } = await import('@workos-inc/node');
    const workos = new WorkOS(env.WORKOS_API_KEY);
    
    const data = await workos.userManagement.authenticateWithMagicAuth({
      clientId: env.WORKOS_CLIENT_ID,
      code: body.code,
      email: body.email,
      ipAddress: request.headers.get('CF-Connecting-IP') || undefined,
      userAgent: request.headers.get('User-Agent') || undefined,
    });

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e: any) {
    // Check if it's the specific organization selection required error
    const isOrgRequired = e.code === 'organization_selection_required' || 
                          e.error === 'organization_selection_required' || 
                          (e.rawData && e.rawData.error === 'organization_selection_required') || 
                          (e.rawData && e.rawData.code === 'organization_selection_required') ||
                          (e.message && e.message.includes('choose an organization'));
                          
    if (isOrgRequired) {
      const pendingToken = e.pending_authentication_token || 
                           e.rawData?.pending_authentication_token || 
                           e.rawData?.rawData?.pending_authentication_token;
                           
      return new Response(
        JSON.stringify({ 
          error: 'organization_selection_required', 
          message: e.message || 'Organization selection required', 
          pending_authentication_token: pendingToken,
          rawData: e.rawData
        }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    return new Response(
      JSON.stringify({ error: 'Authentication failed', message: e.message, rawData: e.rawData }),
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
