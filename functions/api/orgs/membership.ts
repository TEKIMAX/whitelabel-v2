import { WorkOS } from '@workos-inc/node';

export async function onRequestGet(context: {
  request: Request;
  env: {
    WORKOS_API_KEY: string;
    WORKOS_CLIENT_ID: string;
    /** Set by provisioner — restricts org selector to this deployment's linked org only */
    WORKOS_ORG_ID?: string;
  };
}) {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  const corsHeaders = {
    'Access-Control-Allow-Origin': new URL(request.url).origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // token is optional — email-only lookups are allowed for authenticated users
  // who need to see their org list without a pending_authentication_token
  const qEmail = url.searchParams.get('email');
  if (!token && !qEmail) {
    return new Response(
      JSON.stringify({ error: 'Missing token or email parameter' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  try {
    const workos = new WorkOS(env.WORKOS_API_KEY);
    
    const qUserId = url.searchParams.get('userId');
    
    let userId = qUserId;
    
    // If no explicit userId but we have an email, we can query WorkOS for the user profile
    if (!userId && qEmail) {
      const users = await workos.userManagement.listUsers({ email: qEmail });
      if (users.data.length > 0) {
        userId = users.data[0].id;
      }
    }

    if (!userId) {
        return new Response(
            JSON.stringify({ error: 'Missing userId or valid email parameter' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
    }

    // Fetch the list of organization memberships for this user
    const memberships = await workos.userManagement.listOrganizationMemberships({
      userId,
    });

    // Fetch the actual Organization names
    const organizations = await Promise.all(memberships.data.map(async (membership) => {
      try {
        const org = await workos.organizations.getOrganization(membership.organizationId);
        return {
          id: org.id,
          name: org.name || 'Workspace ' + org.id.slice(-4),
        };
      } catch (e) {
        return {
          id: membership.organizationId,
          name: 'Workspace ' + membership.organizationId.slice(-4),
        };
      }
    }));

    // If WORKOS_ORG_ID is set, restrict to the deployment's linked org only
    const linkedOrgId = env.WORKOS_ORG_ID;
    const filtered = linkedOrgId
      ? organizations.filter(org => org.id === linkedOrgId)
      : organizations;

    return new Response(JSON.stringify({ organizations: filtered }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch organizations', message: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}

export async function onRequestOptions(context: { request: Request }) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': new URL(context.request.url).origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
