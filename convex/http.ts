import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, components, internal } from "./_generated/api";
import { registerStaticRoutes } from "@convex-dev/static-hosting";

const http = httpRouter();

// Fallback logic to serve React SPA artifacts seamlessly
registerStaticRoutes(http, (components as any).selfHosting);

// ── CORS Origin Allowlist ─────────────────────────────────────────────────────
// Only these origins may make cross-origin browser requests to our HTTP actions.
// Server-to-server calls (Go API, etc.) don't send Origin headers, so CORS
// doesn't apply to them — they're protected by BRAIN_SHARED_SECRET instead.
const ALLOWED_ORIGINS = [
    "https://whitelabel.tekimax.ai",
    "https://provision.tekimax.ai",
    "https://brain-adaptive.adaptivestartup.io",
    "http://localhost:5173",
    "http://localhost:3000",
];

/**
 * Returns the request's Origin if it is in the allowlist, or null.
 * Also checks process.env.CLIENT_ORIGIN (Convex env var) as a fallback.
 * When the request has no Origin header (server-to-server), returns "*" for
 * compatibility — the auth layer (BRAIN_SHARED_SECRET) handles security.
 */
function getAllowedOrigin(request: Request): string | null {
    const origin = request.headers.get("Origin");
    if (!origin) return "*"; // Server-to-server (no browser Origin)
    if (ALLOWED_ORIGINS.includes(origin)) return origin;
    // Check Convex env var as additional allowed origin
    const clientOrigin = process.env.CLIENT_ORIGIN;
    if (clientOrigin && origin === clientOrigin) return origin;
    return null; // Unknown origin — block
}

/** Build CORS headers for a given request. Returns null if origin is blocked. */
function corsHeaders(request: Request, extraHeaders?: Record<string, string>): Record<string, string> | null {
    const origin = getAllowedOrigin(request);
    if (!origin) return null;
    return {
        "Access-Control-Allow-Origin": origin,
        "Vary": "Origin",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Content-Type": "application/json",
        ...(extraHeaders || {}),
    };
}

/** Return 403 if the origin is not allowed, or the CORS-safe OPTIONS response. */
function corsOptionsResponse(request: Request): Response {
    const headers = corsHeaders(request, { "Access-Control-Max-Age": "86400" });
    if (!headers) {
        return new Response("Origin not allowed", { status: 403 });
    }
    return new Response(null, { status: 204, headers });
}

// ── Share Link Download Route ──
http.route({
    pathPrefix: "/api/share/",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
        const url = new URL(request.url);
        const pathParts = url.pathname.split("/");
        const token = pathParts[pathParts.length - 1];

        if (!token) {
            return new Response("Missing token", { status: 400 });
        }

        // Look up the share link
        const link = await ctx.runQuery(internal.shareLinks.getByToken, { token });
        if (!link) {
            return new Response("Link not found or expired", { status: 404 });
        }

        // Check expiration
        if (link.expiresAt && link.expiresAt < Date.now()) {
            return new Response("Link expired", { status: 410 });
        }

        // Check max uses
        if (link.maxUses && link.useCount >= link.maxUses) {
            return new Response("Link has reached maximum downloads", { status: 410 });
        }

        // Check password
        if (link.password) {
            const providedPassword = url.searchParams.get("password") ||
                request.headers.get("x-download-password");
            if (!providedPassword || providedPassword !== link.password) {
                return new Response(
                    JSON.stringify({ error: "password_required", message: "This link requires a password" }),
                    { status: 401, headers: { "Content-Type": "application/json" } }
                );
            }
        }

        // Get the file URL — prefer R2 if available, fallback to Convex storage
        let fileUrl: string | null = null;

        if (link.r2Key) {
            // Serve from R2 (presigned URL, 15-minute expiry)
            try {
                fileUrl = await ctx.runAction(internal.r2.getR2DownloadUrl, {
                    r2Key: link.r2Key,
                    expiresIn: 900,
                });
            } catch {
                // R2 failed, fall back to Convex storage
            }
        }

        if (!fileUrl) {
            fileUrl = await ctx.storage.getUrl(link.storageId as any);
        }

        if (!fileUrl) {
            return new Response("File not found", { status: 404 });
        }

        // Increment use count and log download event
        await ctx.runMutation(internal.shareLinks.incrementUseCount, { id: link._id });
        await ctx.runMutation(internal.shareLinks.logDownload, {
            shareLinkId: link._id,
            token: link.token,
            ipAddress: request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || undefined,
            userAgent: request.headers.get("user-agent") || undefined,
        });

        // Check if watermark is enabled for this file
        const isImage = (link.contentType || "").startsWith("image/");
        if (isImage) {
            try {
                const watermarkStatus = await ctx.runQuery(internal.shareLinks.getWatermarkStatus, {
                    storageId: link.storageId as string,
                });
                if (watermarkStatus.watermarkEnabled) {
                    // Serve an HTML page with the image and a CSS watermark overlay
                    const watermarkText = link.fileName || "CONFIDENTIAL";
                    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${link.fileName || "Shared File"}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #111; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: system-ui, sans-serif; }
  .container { position: relative; display: inline-block; max-width: 95vw; max-height: 95vh; }
  .container img { max-width: 95vw; max-height: 95vh; object-fit: contain; display: block; border-radius: 8px; }
  .watermark-overlay {
    position: absolute; inset: 0; overflow: hidden; pointer-events: none; border-radius: 8px;
  }
  .watermark-overlay::before {
    content: "${watermarkText.replace(/"/g, '\\"')}    ${watermarkText.replace(/"/g, '\\"')}    ${watermarkText.replace(/"/g, '\\"')}    ${watermarkText.replace(/"/g, '\\"')}    ${watermarkText.replace(/"/g, '\\"')}    ${watermarkText.replace(/"/g, '\\"')}    ${watermarkText.replace(/"/g, '\\"')}    ${watermarkText.replace(/"/g, '\\"')}    ${watermarkText.replace(/"/g, '\\"')}    ${watermarkText.replace(/"/g, '\\"')}    ${watermarkText.replace(/"/g, '\\"')}    ${watermarkText.replace(/"/g, '\\"')}    ${watermarkText.replace(/"/g, '\\"')}    ${watermarkText.replace(/"/g, '\\"')}    ${watermarkText.replace(/"/g, '\\"')}    ${watermarkText.replace(/"/g, '\\"')}    ${watermarkText.replace(/"/g, '\\"')}    ${watermarkText.replace(/"/g, '\\"')}    ${watermarkText.replace(/"/g, '\\"')}    ${watermarkText.replace(/"/g, '\\"')}    ";
    position: absolute;
    top: -50%; left: -50%;
    width: 200%; height: 200%;
    font-size: 18px; font-weight: 600; letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.12);
    white-space: pre-wrap; word-break: break-all;
    transform: rotate(-35deg);
    line-height: 3.5em;
    pointer-events: none;
    user-select: none;
    -webkit-user-select: none;
  }
  .meta { color: #888; text-align: center; margin-top: 12px; font-size: 13px; }
</style>
</head>
<body>
  <div>
    <div class="container">
      <img src="${fileUrl}" alt="${link.fileName || "Shared image"}" />
      <div class="watermark-overlay"></div>
    </div>
    <p class="meta">${link.fileName || "Shared File"}</p>
  </div>
</body>
</html>`;
                    return new Response(html, {
                        status: 200,
                        headers: {
                            "Content-Type": "text/html; charset=utf-8",
                            "Cache-Control": "private, no-store",
                        },
                    });
                }
            } catch {
                // If watermark check fails, fall through to normal redirect
            }
        }

        return Response.redirect(fileUrl);
    }),
});

// ── Authenticated File Serving Route ──
// Files are served via signed URLs: /api/file/{storageId}?expires={ts}&sig={hash}
// The signature is generated by authenticated Convex queries using fileSigning.ts
http.route({
    pathPrefix: "/api/file/",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
        const url = new URL(request.url);
        const pathParts = url.pathname.split("/");
        const storageId = pathParts[pathParts.length - 1];
        const expires = url.searchParams.get("expires");
        const sig = url.searchParams.get("sig");

        if (!storageId || !expires || !sig) {
            return new Response("Missing parameters", { status: 400 });
        }

        // Import and validate signature
        const { validateFileSignature } = await import("./fileSigning");
        const result = validateFileSignature(storageId, Number(expires), sig);

        if (!result.valid) {
            return new Response(
                result.reason === "expired" ? "URL expired" : "Forbidden",
                { status: 403 }
            );
        }

        // Get the actual storage URL
        const fileUrl = await ctx.storage.getUrl(storageId as any);
        if (!fileUrl) {
            return new Response("File not found", { status: 404 });
        }

        // Redirect with cache headers (the signed URL has its own expiry)
        return new Response(null, {
            status: 302,
            headers: {
                Location: fileUrl,
                "Cache-Control": "private, max-age=3600",
            },
        });
    }),
});


http.route({
    path: "/workos-webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const signatureHeader = request.headers.get("WorkOS-Signature");
        const brainSecret = request.headers.get("X-Brain-Secret");
        const payload = await request.text();

        // Accept either: (1) BRAIN relay with shared secret, or (2) direct WorkOS signature
        const expectedBrainSecret = process.env.BRAIN_SHARED_SECRET;
        const isBrainRelay = brainSecret && expectedBrainSecret && brainSecret === expectedBrainSecret;

        if (!isBrainRelay && !signatureHeader) {
            return new Response("Missing signature", { status: 401 });
        }

        try {
            await ctx.runAction(api.workos.handleWebhook, {
                signature: signatureHeader || "brain-relay",
                payload: payload,
                isBrainRelay: !!isBrainRelay,
            });
            return new Response("Webhook processed", { status: 200 });
        } catch (error) {
            return new Response("Webhook failed", { status: 400 });
        }
    }),
});

http.route({
    path: "/api/storage",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
        const url = new URL(request.url);
        const storageId = url.searchParams.get("storageId");

        if (!storageId) {
            return new Response("Missing storageId", { status: 400 });
        }

        const link = await ctx.storage.getUrl(storageId);
        if (!link) {
            return new Response("File not found", { status: 404 });
        }

        return Response.redirect(link);
    }),
});


// ... (existing storage route)

http.route({
    path: "/api/ingest_usage",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return new Response("Missing API Key", { status: 401 });
        }
        const apiKey = authHeader.split(" ")[1];

        // Validate Key (Note: In prod, use a dedicated index or lookup function)
        const keyRecord = await ctx.runQuery(internal.apiKeys.validate, { key: apiKey });
        if (!keyRecord) {
            return new Response("Invalid API Key", { status: 403 });
        }

        const body = await request.json();
        const { userId, model, inputTokens, outputTokens, cost, metadata } = body;

        // Basic Validation
        if (!userId || !model || inputTokens === undefined || outputTokens === undefined) {
            return new Response("Missing required fields", { status: 400 });
        }

        await ctx.runMutation(internal.externalUsage.log, {
            projectId: keyRecord.projectId,
            apiKeyId: keyRecord._id,
            externalUserId: userId,
            model,
            inputTokens,
            outputTokens,
            cost,
            metadata: metadata ? JSON.stringify(metadata) : undefined
        });

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    }),
});

import { getRssFeed } from "./blog_rss";

http.route({
    path: "/api/sync-subscription",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const authHeader = request.headers.get("Authorization");
        const brainSecret = process.env.BRAIN_SHARED_SECRET;

        if (!brainSecret || authHeader !== `Bearer ${brainSecret}`) {
            return new Response("Unauthorized", { status: 401 });
        }

        const { status, tier, endsOn, userId } = await request.json();

        if (!userId) {
            return new Response(JSON.stringify({ error: "userId is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        // Use an internal mutation to update the user's subscription status
        await ctx.runMutation(internal.stripe.updateSubscriptionStatus, {
            userId,
            subscriptionStatus: status,
            endsOn,
            tier,
        });

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    }),
});

// ── Provisioning endpoint: called by BRAIN Control Plane to seed user data ──
http.route({
    path: "/api/provisioning",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        // SA-005: Require BRAIN_SHARED_SECRET if configured.
        // On first deploy the secret may not be set yet, so we allow through
        // only when it is genuinely absent — but reject a wrong token.
        const brainSecret = process.env.BRAIN_SHARED_SECRET;
        if (brainSecret) {
            const authHeader = request.headers.get("Authorization");
            if (authHeader !== `Bearer ${brainSecret}`) {
                return new Response("Unauthorized", { status: 401 });
            }
        }
        const body = await request.json();

        const {
            workosId, email, organizationId, organizationName,
            features, models, stripeCustomerId,
            subscriptionStatus
        } = body;

        if (!workosId || !email) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: workosId, email" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        let tenantWorkosOrgId = organizationId || "";

        try {
            // Phase 2: No longer creating new WorkOS orgs during provisioning.
            // Instead, create a Convex venture_workspace under the parent org.
            // The user will be added to the parent org's membership (which already exists).
            if (organizationName && tenantWorkosOrgId) {
                try {
                    await ctx.runMutation(internal.ventureWorkspaces_internal.upsertWorkspace, {
                        parentOrgId: tenantWorkosOrgId,
                        name: organizationName,
                        createdBy: email || "provisioner",
                    });
                } catch (wsErr: any) {
                    console.error("Convex venture workspace creation failed (non-fatal):", wsErr.message);
                }
            }

            const result = await ctx.runMutation(internal.users.provisionFromBrain, {
                workosId,
                email,
                organizationId: tenantWorkosOrgId,
                organizationName: organizationName || "",
                features: features || [],
                models: models || [],
                stripeCustomerId: stripeCustomerId || "free",
                subscriptionStatus: subscriptionStatus || "active",
            });

            return new Response(
                JSON.stringify({ success: true, ...result, tenantWorkosOrgId }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        } catch (error: any) {
            return new Response(
                JSON.stringify({ error: error.message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
    }),
});

// ── Config sync endpoint: called by BRAIN to push model/billing config ──
http.route({
    path: "/api/sync-config",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const authHeader = request.headers.get("Authorization");
        const brainSecret = process.env.BRAIN_SHARED_SECRET;

        if (!brainSecret || authHeader !== `Bearer ${brainSecret}`) {
            return new Response("Unauthorized", { status: 401 });
        }

        const body = await request.json();
        const { action, orgId, models, billingConfig, billingCycle } = body;

        if (!orgId) {
            return new Response(
                JSON.stringify({ error: "Missing orgId" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        try {
            const result: Record<string, any> = { success: true };

            // Save model config
            if (action === "sync_models" && models) {
                await ctx.runMutation(internal.model_config.saveModelConfig, {
                    orgId,
                    selectedModels: models,
                    ...(billingCycle ? { billingCycle } : {}),
                });
                result.modelsSaved = true;
            }

            // Save billing config
            if (action === "sync_billing" && billingConfig) {
                await ctx.runMutation(internal.billing.upsertConfig, {
                    orgId,
                    ...billingConfig,
                });
                result.billingSaved = true;
            }

            // Full reconciliation — return current state
            if (action === "reconcile") {
                const [currentBilling, currentModels] = await Promise.all([
                    ctx.runQuery(internal.billing.getConfig, { orgId }),
                    ctx.runQuery(internal.model_config.getConfig, { orgId }),
                ]);
                result.billing = currentBilling;
                result.models = currentModels;
            }

            return new Response(
                JSON.stringify(result),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        } catch (error: any) {
            return new Response(
                JSON.stringify({ error: error.message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
    }),
});

// ── Health endpoint: returns deployment status for reconciliation ──
http.route({
    path: "/api/health",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
        try {
            // Check what providers are configured by checking env vars
            const configuredProviders: string[] = [];
            if (process.env.GEMINI_API_KEY) configuredProviders.push("gemini");
            if (process.env.OPENAI_API_KEY) configuredProviders.push("openai");
            if (process.env.ANTHROPIC_API_KEY) configuredProviders.push("anthropic");
            if (process.env.OLLAMA_API_KEY || process.env.OLLAMA_BASE_URL) configuredProviders.push("ollama");

            const hasStripeAccount = !!process.env.STRIPE_ACCOUNT_ID;
            const hasBrainSecret = !!process.env.BRAIN_SHARED_SECRET;

            return new Response(
                JSON.stringify({
                    status: "healthy",
                    timestamp: Date.now(),
                    configured: {
                        providers: configuredProviders,
                        stripe_connected: hasStripeAccount,
                        brain_secret_set: hasBrainSecret,
                    },
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "no-store",
                    },
                }
            );
        } catch (error: any) {
            return new Response(
                JSON.stringify({ status: "unhealthy", error: error.message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
    }),
});

http.route({
    path: "/sync-page-configs",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const cors = corsHeaders(request);
        if (!cors) {
            return new Response("Origin not allowed", { status: 403 });
        }

        try {
            const body = await request.json();
            const { deploymentId, orgId, pages } = body;

            if (!orgId) {
                return new Response(
                    JSON.stringify({ error: "orgId required" }),
                    { status: 400, headers: cors }
                );
            }

            // Mode 1: Pages pushed directly from Customer Portal
            if (pages && Array.isArray(pages) && pages.length > 0) {
                await ctx.runMutation(internal.pageConfigs.syncFromProvisioning, {
                    orgId,
                    pages: pages.map((p: any) => ({
                        pageKey: p.pageKey,
                        category: p.category,
                        label: p.label,
                        icon: p.icon,
                        sortOrder: p.sortOrder,
                        visible: p.visible,
                        customLabel: p.customLabel,
                        customIcon: p.customIcon,
                    })),
                });

                return new Response(
                    JSON.stringify({ success: true, mode: "push", count: pages.length }),
                    { status: 200, headers: cors }
                );
            }

            // Mode 2: Pull from Go provisioning API (existing behavior)
            if (!deploymentId) {
                return new Response(
                    JSON.stringify({ error: "deploymentId required (pull mode) or pages array required (push mode)" }),
                    { status: 400, headers: cors }
                );
            }

            const provisionApiUrl = process.env.VITE_API_URL || process.env.PROVISION_API_URL;
            if (!provisionApiUrl) {
                return new Response(
                    JSON.stringify({ error: "PROVISION_API_URL not configured" }),
                    { status: 500, headers: cors }
                );
            }

            const apiUrl = `${provisionApiUrl}/deployments/${deploymentId}/pages`;
            const response = await fetch(apiUrl, {
                credentials: "include",
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                return new Response(
                    JSON.stringify({ error: `API returned ${response.status}` }),
                    { status: response.status, headers: cors }
                );
            }

            const data = await response.json();
            const fetchedPages = data.items || data;

            if (fetchedPages.length > 0) {
                await ctx.runMutation(internal.pageConfigs.syncFromProvisioning, {
                    orgId,
                    pages: fetchedPages.map((p: any) => ({
                        pageKey: p.pageKey,
                        category: p.category,
                        label: p.label,
                        icon: p.icon,
                        sortOrder: p.sortOrder,
                        visible: p.visible,
                        customLabel: p.customLabel,
                        customIcon: p.customIcon,
                    })),
                });
            }

            return new Response(
                JSON.stringify({ success: true, mode: "pull", count: fetchedPages.length }),
                { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
            );
        } catch (error: any) {
            return new Response(
                JSON.stringify({ error: error.message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
    }),
});

// CORS preflight for sync-page-configs
http.route({
    path: "/sync-page-configs",
    method: "OPTIONS",
    handler: httpAction(async (_, request) => {
        return corsOptionsResponse(request);
    }),
});

// ── Sync Model Config (push from Customer Portal during provisioning) ──
http.route({
    path: "/api/sync-model-config",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const cors = corsHeaders(request);
        if (!cors) {
            return new Response("Origin not allowed", { status: 403 });
        }

        // Auth: reject wrong tokens, but allow no-token calls (CF proxy)
        const authHeader = request.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "");
        const brainSecret = process.env.BRAIN_SHARED_SECRET;
        if (brainSecret && token && token !== brainSecret) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...cors, "Content-Type": "application/json" },
            });
        }

        try {
            const body = await request.json() as {
                orgId: string;
                models: Array<{ provider: string; modelId: string; isDefault: boolean }>;
                billingCycle?: string;
            };

            if (!body.orgId || !body.models?.length) {
                return new Response(JSON.stringify({ error: "orgId and models required" }), {
                    status: 400,
                    headers: { ...cors, "Content-Type": "application/json" },
                });
            }

            // Save to model_config table
            await ctx.runMutation(internal.model_config.saveModelConfig, {
                orgId: body.orgId,
                selectedModels: body.models,
                ...(body.billingCycle ? { billingCycle: body.billingCycle } : {}),
            });

            // Also save as _global fallback so all users see models
            await ctx.runMutation(internal.model_config.saveModelConfig, {
                orgId: "_global",
                selectedModels: body.models,
                ...(body.billingCycle ? { billingCycle: body.billingCycle } : {}),
            });

            return new Response(JSON.stringify({ success: true, count: body.models.length }), {
                status: 200,
                headers: { ...cors, "Content-Type": "application/json" },
            });
        } catch (err: any) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: { ...cors, "Content-Type": "application/json" },
            });
        }
    }),
});

http.route({
    path: "/api/sync-model-config",
    method: "OPTIONS",
    handler: httpAction(async (_, request) => {
        return corsOptionsResponse(request);
    }),
});

// ── Sync API Tools Config (push from Customer Portal during provisioning) ──
http.route({
    path: "/api/sync-api-tools",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const cors = corsHeaders(request);
        if (!cors) {
            return new Response("Origin not allowed", { status: 403 });
        }

        const authHeader = request.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "");
        const brainSecret = process.env.BRAIN_SHARED_SECRET;
        if (brainSecret && token && token !== brainSecret) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...cors, "Content-Type": "application/json" },
            });
        }

        try {
            const body = await request.json() as {
                orgId: string;
                enabledApis: string[];
            };

            if (!body.orgId || !body.enabledApis) {
                return new Response(JSON.stringify({ error: "orgId and enabledApis required" }), {
                    status: 400,
                    headers: { ...cors, "Content-Type": "application/json" },
                });
            }

            // Save to api_tools_config table
            await ctx.runMutation(internal.apiTools.saveToolsConfig, {
                orgId: body.orgId,
                toolIds: body.enabledApis,
            });

            // Also save as _global fallback so default tools are visible in previews
            await ctx.runMutation(internal.apiTools.saveToolsConfig, {
                orgId: "_global",
                toolIds: body.enabledApis,
            });

            return new Response(JSON.stringify({ success: true, count: body.enabledApis.length }), {
                status: 200,
                headers: { ...cors, "Content-Type": "application/json" },
            });
        } catch (err: any) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: { ...cors, "Content-Type": "application/json" },
            });
        }
    }),
});

http.route({
    path: "/api/sync-api-tools",
    method: "OPTIONS",
    handler: httpAction(async (_, request) => {
        return corsOptionsResponse(request);
    }),
});

// ── Custom API Integrations Proxy (push from Customer Portal during provisioning) ──
http.route({
    path: "/api/custom-api-proxy",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const cors = corsHeaders(request);
        if (!cors) {
            return new Response("Origin not allowed", { status: 403 });
        }

        const authHeader = request.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "");
        const brainSecret = process.env.BRAIN_SHARED_SECRET;
        if (brainSecret && token && token !== brainSecret) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...cors, "Content-Type": "application/json" },
            });
        }

        try {
            const body = await request.json() as any;
            const { action, orgId, payload, integrationId } = body;

            if (!orgId) {
                return new Response(JSON.stringify({ error: "orgId required" }), {
                    status: 400,
                    headers: { ...cors, "Content-Type": "application/json" },
                });
            }

            if (action === "list") {
                let integrations;
                if (orgId === "_all" || orgId === "all") {
                    integrations = await ctx.runQuery(internal.apiIntegrations.getAllIntegrationsInternal);
                } else {
                    integrations = await ctx.runQuery(internal.apiIntegrations.getIntegrationsInternal, { orgId });
                }
                // Strip api keys for frontend safety
                const safeIntegrations = integrations.map((i: any) => ({
                    _id: i._id,
                    name: i.name,
                    endpoint: i.endpoint,
                    description: i.description,
                    method: i.method,
                    requiresAuth: !!i.apiKey,
                    createdAt: i.createdAt
                }));
                return new Response(JSON.stringify({ success: true, integrations: safeIntegrations }), {
                    status: 200,
                    headers: { ...cors, "Content-Type": "application/json" },
                });
            }

            if (action === "add") {
                if (!payload || !payload.name || !payload.endpoint) {
                    return new Response(JSON.stringify({ error: "Invalid payload for adding integration" }), {
                        status: 400,
                        headers: { ...cors, "Content-Type": "application/json" },
                    });
                }
                await ctx.runMutation(internal.apiIntegrations.addIntegrationInternal, {
                    orgId,
                    name: payload.name,
                    endpoint: payload.endpoint,
                    apiKey: payload.apiKey,
                    description: payload.description || "",
                    method: payload.method || "POST"
                });
                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: { ...cors, "Content-Type": "application/json" },
                });
            }

            if (action === "update") {
                if (!integrationId || !payload) {
                    return new Response(JSON.stringify({ error: "Invalid payload or missing ID for updating integration" }), {
                        status: 400,
                        headers: { ...cors, "Content-Type": "application/json" },
                    });
                }
                const updateArgs: any = {
                    integrationId,
                    orgId,
                    name: payload.name,
                    endpoint: payload.endpoint,
                    description: payload.description,
                    method: payload.method
                };
                if (payload.apiKey && payload.apiKey.trim() !== "") {
                    updateArgs.apiKey = payload.apiKey;
                }
                await ctx.runMutation(internal.apiIntegrations.updateIntegrationInternal, updateArgs);
                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: { ...cors, "Content-Type": "application/json" },
                });
            }

            if (action === "remove") {
                if (!integrationId) {
                    return new Response(JSON.stringify({ error: "integrationId required for remove action" }), {
                        status: 400,
                        headers: { ...cors, "Content-Type": "application/json" },
                    });
                }
                await ctx.runMutation(internal.apiIntegrations.removeIntegrationInternal, { integrationId });
                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: { ...cors, "Content-Type": "application/json" },
                });
            }

            return new Response(JSON.stringify({ error: "Invalid action" }), {
                status: 400,
                headers: { ...cors, "Content-Type": "application/json" },
            });
        } catch (err: any) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: { ...cors, "Content-Type": "application/json" },
            });
        }
    }),
});

http.route({
    path: "/api/custom-api-proxy",
    method: "OPTIONS",
    handler: httpAction(async (_, request) => {
        return corsOptionsResponse(request);
    }),
});

// ── Workspace Personality / LLM Governance ──
http.route({
    path: "/api/personality",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const brainSecret = process.env.BRAIN_SHARED_SECRET;
        const authHeader = request.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "");

        // Auth check: if a Bearer token is provided it must match BRAIN_SHARED_SECRET.
        // When no token is sent (CF proxy calls), allow through — the proxy enforces WorkOS auth.
        if (brainSecret && token && token !== brainSecret) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        try {
            const body = await request.json() as any;
            const { action, orgId, workspaceId, title, content } = body;

            if (action === "list") {
                const items = await ctx.runQuery(internal.workspace_personality.listPersonalities, {
                    orgId: orgId || "_global",
                });
                return new Response(JSON.stringify({ success: true, items }), {
                    headers: { "Content-Type": "application/json" },
                });
            }

            if (action === "get") {
                const personality = await ctx.runQuery(internal.workspace_personality.getPersonality, {
                    orgId: orgId || "_global",
                    workspaceId,
                });
                return new Response(JSON.stringify({ success: true, personality }), {
                    headers: { "Content-Type": "application/json" },
                });
            }

            if (action === "save") {
                if (!content) {
                    return new Response(JSON.stringify({ error: "content is required" }), {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                const id = await ctx.runMutation(internal.workspace_personality.savePersonality, {
                    orgId: orgId || "_global",
                    workspaceId,
                    title,
                    content,
                });
                return new Response(JSON.stringify({ success: true, id }), {
                    headers: { "Content-Type": "application/json" },
                });
            }

            if (action === "delete") {
                const id = body.id;
                if (!id) {
                    return new Response(JSON.stringify({ error: "id is required" }), {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                await ctx.runMutation(internal.workspace_personality.deletePersonality, { id });
                return new Response(JSON.stringify({ success: true }), {
                    headers: { "Content-Type": "application/json" },
                });
            }

            return new Response(JSON.stringify({ error: "Unknown action" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        } catch (err: any) {
            return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    }),
});

http.route({
    path: "/api/personality",
    method: "OPTIONS",
    handler: httpAction(async (_, request) => {
        return corsOptionsResponse(request);
    }),
});

// ── Workspaces (Projects) CRUD — called from Customer Portal ──
http.route({
    path: "/api/workspaces",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const brainSecret = process.env.BRAIN_SHARED_SECRET;
        const authHeader = request.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "");

        // Allow CF proxy calls (no token) — only reject wrong tokens
        if (brainSecret && token && token !== brainSecret) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        try {
            const body = await request.json() as any;
            const { action } = body;

            if (action === "create") {
                const { orgId, name, hypothesis, businessStructure, industry, yearsInBusiness, userId, adminEmail, adminName } = body;
                if (!name) {
                    return new Response(JSON.stringify({ error: "name is required" }), {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                    });
                }

                // ── Phase 2: No longer creating WorkOS orgs for workspaces ──
                // Use the provided orgId or resolve from existing orgs.
                let workosOrgId = orgId || "_global";

                // ── Step 2: Resolve org and admin user in Convex ──
                const orgs = await ctx.runQuery(internal.workspace_personality.listOrgs, {});
                let resolvedOrgId = workosOrgId;
                let resolvedUserId = userId || "portal-admin";

                // If no WorkOS org was created and orgId is _global, use first available
                if (!resolvedOrgId.startsWith("org_") && orgs.length > 0 && (resolvedOrgId === "_global" || !orgs.includes(resolvedOrgId))) {
                    resolvedOrgId = orgs[0];
                }

                // Ensure the portal user exists as Admin in Convex
                if (adminEmail) {
                    try {
                        await ctx.runMutation(internal.workspace_personality.ensureAdminUser, {
                            email: adminEmail,
                            name: adminName || undefined,
                            orgId: resolvedOrgId,
                        });
                    } catch (err: any) {
                        console.error("ensureAdminUser failed:", err.message);
                    }
                }

                // ── Step 3: Create the Convex project ──
                try {
                    const users = await ctx.runQuery(internal.workspace_personality.listUsers, {});
                    if (users.length > 0) {
                        const adminUser = adminEmail
                            ? users.find((u: any) => u.tokenIdentifier === `portal|${adminEmail}`)
                            : null;
                        const targetUser = adminUser || users[0];
                        resolvedUserId = targetUser.tokenIdentifier;

                        const projectId = await ctx.runMutation(internal.projects.createInternal, {
                            orgId: resolvedOrgId,
                            tokenIdentifier: resolvedUserId,
                            name,
                            hypothesis: hypothesis || "",
                            businessStructure: businessStructure || undefined,
                            industry: industry || undefined,
                            yearsInBusiness: yearsInBusiness || undefined,
                            organizationDetails: body.organizationDetails || undefined,
                        });

                        return new Response(JSON.stringify({ success: true, projectId, orgId: resolvedOrgId }), {
                            status: 200,
                            headers: { "Content-Type": "application/json" },
                        });
                    }
                } catch (err: any) {
                    console.error("createInternal failed, falling back to lite create:", err.message);
                }

                // Fallback: use lite create if no users exist yet
                const projectId = await ctx.runMutation(internal.workspace_personality.createProject, {
                    orgId: resolvedOrgId,
                    userId: resolvedUserId,
                    name,
                    hypothesis: hypothesis || "",
                    businessStructure: businessStructure || undefined,
                    industry: industry || undefined,
                    yearsInBusiness: yearsInBusiness || undefined,
                });

                return new Response(JSON.stringify({ success: true, projectId, orgId: resolvedOrgId }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }

            if (action === "get-orgs") {
                const orgs = await ctx.runQuery(internal.workspace_personality.listOrgs, {});
                return new Response(JSON.stringify({ orgs }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }

            if (action === "list-all") {
                const items = await ctx.runQuery(internal.workspace_personality.listAllProjects, {});
                return new Response(JSON.stringify({ items }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }

            if (action === "list") {
                const { orgId } = body;
                const items = await ctx.runQuery(internal.workspace_personality.listProjects, {
                    orgId: orgId || "_global",
                });

                return new Response(JSON.stringify({ items }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }

            if (action === "delete") {
                const { id } = body;
                if (!id) {
                    return new Response(JSON.stringify({ error: "id is required" }), {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                await ctx.runMutation(internal.workspace_personality.deleteProject, { id });
                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // ── seed-venture: link an existing WorkOS org as a venture (worker calls this after provisioning) ──
            if (action === "seed-venture") {
                const { workosOrgId, name } = body;
                if (!workosOrgId || !name) {
                    return new Response(JSON.stringify({ error: "workosOrgId and name are required" }), {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                    });
                }

                // Ensure an admin placeholder user exists for this org
                try {
                    await ctx.runMutation(internal.workspace_personality.ensureAdminUser, {
                        email: `admin@${workosOrgId}.venture`,
                        orgId: workosOrgId,
                    });
                } catch { /* best-effort */ }

                // Create the Convex project linked to the existing WorkOS org
                let projectId: string | null = null;
                try {
                    const users = await ctx.runQuery(internal.workspace_personality.listUsers, {});
                    if (users.length > 0) {
                        projectId = await ctx.runMutation(internal.projects.createInternal, {
                            orgId: workosOrgId,
                            tokenIdentifier: users[0].tokenIdentifier,
                            name,
                            hypothesis: "",
                        });
                    }
                } catch { /* fall through to lite create */ }

                if (!projectId) {
                    projectId = await ctx.runMutation(internal.workspace_personality.createProject, {
                        orgId: workosOrgId,
                        userId: "portal-admin",
                        name,
                        hypothesis: "",
                    });
                }

                return new Response(JSON.stringify({ success: true, projectId, orgId: workosOrgId }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }

            return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        } catch (err: any) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    }),
});

http.route({
    path: "/api/workspaces",
    method: "OPTIONS",
    handler: httpAction(async (_, request) => {
        return corsOptionsResponse(request);
    }),
});

// ── Deployment status push — called by Go worker after provisioning succeeds ──
// The worker POSTs to https://{deploymentName}.convex.site/api/deployment-status
// authenticated with BRAIN_SHARED_SECRET so the frontend can reactively update.
http.route({
    path: "/api/deployment-status",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const authHeader = request.headers.get("Authorization");
        const brainSecret = process.env.BRAIN_SHARED_SECRET;

        if (!brainSecret || authHeader !== `Bearer ${brainSecret}`) {
            return new Response("Unauthorized", { status: 401 });
        }

        const body = await request.json();
        const { deploymentId, status, projectName, customDomain, convexUrl } = body;

        if (!deploymentId || !status) {
            return new Response(
                JSON.stringify({ error: "deploymentId and status are required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        try {
            await ctx.runMutation(internal.deploymentStatus.upsertStatus, {
                deploymentId,
                status,
                projectName: projectName || undefined,
                customDomain: customDomain || undefined,
                convexUrl: convexUrl || undefined,
            });

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        } catch (error: any) {
            return new Response(
                JSON.stringify({ error: error.message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
    }),
});

http.route({
    path: "/api/deployment-status",
    method: "OPTIONS",
    handler: httpAction(async (_, request) => {
        return corsOptionsResponse(request);
    }),
});

// ── Sync Venture Workspaces (push from Customer Portal) ──
http.route({
    path: "/api/sync-venture-workspaces",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const cors = corsHeaders(request);
        if (!cors) {
            return new Response("Origin not allowed", { status: 403 });
        }

        // Auth: reject wrong tokens, allow no-token CF proxy calls
        const authHeader = request.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "");
        const brainSecret = process.env.BRAIN_SHARED_SECRET;
        if (brainSecret && token && token !== brainSecret) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: cors,
            });
        }

        try {
            const body = await request.json() as any;
            const { action } = body;

            if (action === "link") {
                const { parentOrgId, deploymentId, name, description, createdBy } = body;
                if (!parentOrgId || !name) {
                    return new Response(JSON.stringify({ error: "parentOrgId and name required" }), {
                        status: 400, headers: cors,
                    });
                }
                const id = await ctx.runMutation(internal.ventureWorkspaces_internal.upsertWorkspace, {
                    parentOrgId,
                    deploymentId: deploymentId || undefined,
                    name,
                    description: description || undefined,
                    createdBy: createdBy || "provisioner",
                });
                return new Response(JSON.stringify({ success: true, id }), {
                    status: 200, headers: cors,
                });
            }

            if (action === "unlink") {
                const { parentOrgId, deploymentId } = body;
                if (!parentOrgId) {
                    return new Response(JSON.stringify({ error: "parentOrgId required" }), {
                        status: 400, headers: cors,
                    });
                }
                const count = await ctx.runMutation(internal.ventureWorkspaces_internal.unlinkWorkspace, {
                    parentOrgId,
                    deploymentId: deploymentId || undefined,
                });
                return new Response(JSON.stringify({ success: true, removed: count }), {
                    status: 200, headers: cors,
                });
            }

            if (action === "sync-members") {
                const { parentOrgId, deploymentId, members } = body;
                if (!parentOrgId || !members) {
                    return new Response(JSON.stringify({ error: "parentOrgId and members required" }), {
                        status: 400, headers: cors,
                    });
                }
                await ctx.runMutation(internal.ventureWorkspaces_internal.syncMembers, {
                    parentOrgId,
                    deploymentId: deploymentId || undefined,
                    members,
                });
                return new Response(JSON.stringify({ success: true }), {
                    status: 200, headers: cors,
                });
            }

            if (action === "list") {
                const { parentOrgId, deploymentId } = body;
                let items;
                if (deploymentId) {
                    items = await ctx.runQuery(internal.ventureWorkspaces_internal.listByDeployment, { deploymentId });
                } else if (parentOrgId) {
                    items = await ctx.runQuery(internal.ventureWorkspaces_internal.listByOrg, { parentOrgId });
                } else {
                    return new Response(JSON.stringify({ error: "parentOrgId or deploymentId required" }), {
                        status: 400, headers: cors,
                    });
                }
                return new Response(JSON.stringify({ success: true, items }), {
                    status: 200, headers: cors,
                });
            }

            return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
                status: 400, headers: cors,
            });
        } catch (err: any) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500, headers: { "Content-Type": "application/json" },
            });
        }
    }),
});

http.route({
    path: "/api/sync-venture-workspaces",
    method: "OPTIONS",
    handler: httpAction(async (_, request) => {
        return corsOptionsResponse(request);
    }),
});

// ── Sync Branding (push from Customer Portal) ──
http.route({
    path: "/api/sync-branding",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const cors = corsHeaders(request);
        if (!cors) {
            return new Response("Origin not allowed", { status: 403 });
        }

        // Auth: reject wrong tokens, but allow no-token calls (CF proxy)
        const authHeader = request.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "");
        const brainSecret = process.env.BRAIN_SHARED_SECRET;
        if (brainSecret && token && token !== brainSecret) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401, headers: cors,
            });
        }

        try {
            const body = await request.json() as {
                orgId: string;
                action?: string;
                appName?: string;
                primaryColor?: string;
                logoUrl?: string;
                isLogoTransparent?: boolean;
                logoStorageId?: string;
                removeLogo?: boolean;
            };

            if (!body.orgId) {
                return new Response(JSON.stringify({ error: "orgId required" }), {
                    status: 400, headers: cors,
                });
            }

            if (body.action === 'get') {
                const branding = await ctx.runQuery(api.branding.getBranding, { orgId: body.orgId });
                return new Response(JSON.stringify({ success: true, branding }), {
                    status: 200, headers: cors,
                });
            }

            // Build args for saveBranding mutation
            const saveArgs: any = { orgId: body.orgId };
            if (body.appName !== undefined) saveArgs.appName = body.appName;
            if (body.primaryColor !== undefined) saveArgs.primaryColor = body.primaryColor;
            if (body.logoUrl !== undefined) saveArgs.logoUrl = body.logoUrl;
            if (body.isLogoTransparent !== undefined) saveArgs.isLogoTransparent = body.isLogoTransparent;
            if (body.logoStorageId !== undefined) saveArgs.logoStorageId = body.logoStorageId;
            if (body.removeLogo !== undefined) saveArgs.removeLogo = body.removeLogo;

            await ctx.runMutation(api.branding.saveBranding, saveArgs);

            return new Response(JSON.stringify({ success: true }), {
                status: 200, headers: cors,
            });
        } catch (err: any) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500, headers: cors,
            });
        }
    }),
});

http.route({
    path: "/api/sync-branding",
    method: "OPTIONS",
    handler: httpAction(async (_, request) => {
        return corsOptionsResponse(request);
    }),
});

// ── Branding Upload URL (generate Convex storage upload URL for logo) ──
http.route({
    path: "/api/branding-upload-url",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const cors = corsHeaders(request);
        if (!cors) {
            return new Response("Origin not allowed", { status: 403 });
        }

        const authHeader = request.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "");
        const brainSecret = process.env.BRAIN_SHARED_SECRET;
        if (brainSecret && token && token !== brainSecret) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401, headers: cors,
            });
        }

        try {
            const uploadUrl = await ctx.runMutation(api.branding.generateUploadUrl, {});
            return new Response(JSON.stringify({ uploadUrl }), {
                status: 200, headers: cors,
            });
        } catch (err: any) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500, headers: cors,
            });
        }
    }),
});

http.route({
    path: "/api/branding-upload-url",
    method: "OPTIONS",
    handler: httpAction(async (_, request) => {
        return corsOptionsResponse(request);
    }),
});

export default http;
