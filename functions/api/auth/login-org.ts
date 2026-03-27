import { WorkOS } from '@workos-inc/node';

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
      pending_authentication_token: string;
      organization_id: string;
    };

    if (!body.pending_authentication_token || !body.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const workos = new WorkOS(env.WORKOS_API_KEY);
    
    // Authenticate with the selected organization
    const data = await workos.userManagement.authenticateWithOrganizationSelection({
      clientId: env.WORKOS_CLIENT_ID,
      pendingAuthenticationToken: body.pending_authentication_token,
      organizationId: body.organization_id,
      ipAddress: request.headers.get('CF-Connecting-IP') || undefined,
      userAgent: request.headers.get('User-Agent') || undefined,
    });

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: 'Organization selection failed', message: e.message, rawData: e.rawData }),
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
