// Cloudflare Pages Function: Proxy share links to Convex HTTP endpoint
// URL path: /share/:token → proxies to CONVEX_SITE_URL/api/share/:token
//
// Share links use the customer's own domain:
//   https://myapp.pages.dev/share/TOKEN
// instead of:
//   https://random-name-123.convex.site/api/share/TOKEN

export async function onRequest(context: {
    params: { token: string[] };
    request: Request;
    env: { CONVEX_SITE_URL: string };
}) {
    const { params, request, env } = context;

    const token = (params.token || []).join("/");
    if (!token) {
        return new Response("Missing share token", { status: 400 });
    }

    const convexSiteUrl = env.CONVEX_SITE_URL;
    if (!convexSiteUrl) {
        return new Response("Share service not configured", { status: 500 });
    }

    // Forward to Convex HTTP endpoint
    const targetUrl = new URL(`/api/share/${token}`, convexSiteUrl);

    // Preserve query params (e.g., ?password=xxx)
    const originalUrl = new URL(request.url);
    originalUrl.searchParams.forEach((value, key) => {
        targetUrl.searchParams.set(key, value);
    });

    const headers = new Headers();
    const passwordHeader = request.headers.get("x-download-password");
    if (passwordHeader) {
        headers.set("x-download-password", passwordHeader);
    }

    const response = await fetch(targetUrl.toString(), {
        method: "GET",
        headers,
        redirect: "follow",
    });

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
    });
}
