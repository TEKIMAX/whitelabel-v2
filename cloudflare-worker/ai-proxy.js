// Cloudflare Worker: Secure Proxy for AI Backend
// Deploy to: ai.adaptivestartup.io

// --- CONFIGURATION ---
// Store this in Cloudflare Worker Secrets (wrangler secret put API_KEY)
const EXPECTED_API_KEY = "AS_prod_dtZx6NGgJBt9c5gjmfW3mB91Olu4knUjCL8T1XokjT1atC4VWaiMgrxTuOZuEV";
const TARGET_URL = "https://llm-backend-922336218060.us-central1.run.app";

// Allowed origins (CORS)
const ALLOWED_ORIGINS = [
    "https://adaptivestartup.io",
    "https://www.adaptivestartup.io",
    "https://pillaros.pages.dev",
    "https://hidden-gecko-710.convex.cloud",
    "https://hidden-gecko-710.convex.cloud",
    "http://localhost:3000",
    "http://localhost:5173"
];

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Handle CORS preflight
        if (request.method === "OPTIONS") {
            return handleCORS(request);
        }

        // --- API KEY VALIDATION ---
        const apiKey = request.headers.get("X-API-KEY");
        const expectedKey = env.API_KEY || EXPECTED_API_KEY;

        if (!apiKey || apiKey !== expectedKey) {
            return new Response(JSON.stringify({ detail: "Unauthorized" }), {
                status: 401,
                headers: {
                    "Content-Type": "application/json",
                    ...getCORSHeaders(request)
                }
            });
        }

        // --- RATE LIMITING (optional - use Cloudflare's built-in) ---
        // You can enable Rate Limiting in Cloudflare dashboard

        // --- PROXY REQUEST TO GOOGLE CLOUD RUN ---
        const targetUrl = TARGET_URL + url.pathname + url.search;

        const newRequest = new Request(targetUrl, {
            method: request.method,
            headers: new Headers(request.headers),
            body: request.body
        });

        // Set the Host header for Google Cloud Run
        newRequest.headers.set("Host", "llm-backend-922336218060.us-central1.run.app");

        try {
            const response = await fetch(newRequest);

            // Clone response and add CORS headers
            const newResponse = new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
            });

            // Add CORS headers
            const corsHeaders = getCORSHeaders(request);
            Object.entries(corsHeaders).forEach(([key, value]) => {
                newResponse.headers.set(key, value);
            });

            return newResponse;
        } catch (error) {
            return new Response(JSON.stringify({ detail: "Backend error", error: error.message }), {
                status: 502,
                headers: {
                    "Content-Type": "application/json",
                    ...getCORSHeaders(request)
                }
            });
        }
    }
};

function getCORSHeaders(request) {
    const origin = request.headers.get("Origin") || "";

    // Check if origin is allowed
    const isAllowed = ALLOWED_ORIGINS.some(allowed =>
        origin === allowed || origin.endsWith(".convex.cloud")
    );

    return {
        "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-API-KEY, Authorization",
        "Access-Control-Max-Age": "86400"
    };
}

function handleCORS(request) {
    return new Response(null, {
        status: 204,
        headers: getCORSHeaders(request)
    });
}
