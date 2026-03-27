"use node";
import { createOpenAI } from '@ai-sdk/openai';

/**
 * StripeGatewayProvider
 * Adapts the Vercel AI SDK's createOpenAI adapter to route traffic through the Stripe AI Gateway.
 * Automatically injects the X-Stripe-Customer-Id header for usage billing.
 */
export const createStripeGateway = (stripeCustomerId?: string) => {
    const stripeAIGatewayKey = process.env.STRIPE_AI_GATEWAY_KEY || process.env.STRIPE_SECRET_KEY || "";
    
    // Resolve customer ID: user-level -> deployment-level env var
    const resolvedCustomerId = stripeCustomerId || process.env.STRIPE_CUSTOMER_ID || undefined;

    if (!stripeAIGatewayKey) {
        throw new Error("STRIPE_AI_GATEWAY_KEY is required. All AI calls route through the Stripe AI Gateway.");
    }

    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };

    if (resolvedCustomerId) {
        headers["X-Stripe-Customer-Id"] = resolvedCustomerId;
    }

    return createOpenAI({
        apiKey: stripeAIGatewayKey,
        baseURL: "https://llm.stripe.com",
        compatibility: 'compatible', // Force chat completions format — Stripe does not support the Responses API body format
        headers: headers,
        fetch: async (input: RequestInfo | URL, init?: RequestInit | undefined) => {
            // Unpack input pathing exactly explicitly to bypass edge Request object caching
            const rawUrl = typeof input === 'string' ? input : (input instanceof Request ? input.url : input.toString());
            let urlString = rawUrl;
            
            // Override Vercel AI SDK's new /responses or /v1/chat/completions logic
            if (urlString.includes('/responses') || urlString.includes('/v1/chat/completions') || urlString.includes('/completions')) {
                urlString = "https://llm.stripe.com/chat/completions";
            }

            console.log("STRIPE GATEWAY OVERRIDE:", urlString);

            // Stripe Gateway requires 'max_tokens' for Anthropic models, but AI SDK v3 may send 'max_completion_tokens'
            // However, OpenAI's latest models (like o1, o3, gpt-5) STRICTLY require 'max_completion_tokens' and reject 'max_tokens'.
            if (init && init.body && typeof init.body === 'string') {
                try {
                    const parsedBody = JSON.parse(init.body);
                    const isOpenAI = parsedBody.model && parsedBody.model.startsWith('openai/');
                    
                    if (!isOpenAI) {
                        // For Anthropic/Google via Stripe: inject max_tokens
                        if (parsedBody.max_completion_tokens !== undefined && parsedBody.max_tokens === undefined) {
                            parsedBody.max_tokens = parsedBody.max_completion_tokens;
                        } else if (parsedBody.max_tokens === undefined) {
                            parsedBody.max_tokens = 4096; // Fallback default
                        }
                    } else {
                        // For OpenAI via Stripe: ensure max_completion_tokens is used and max_tokens is removed
                        if (parsedBody.max_tokens !== undefined && parsedBody.max_completion_tokens === undefined) {
                            parsedBody.max_completion_tokens = parsedBody.max_tokens;
                            delete parsedBody.max_tokens;
                        } else if (parsedBody.max_tokens !== undefined) {
                            delete parsedBody.max_tokens;
                        }

                        // OpenAI Reasoning Models (o1, o3, gpt-5) do NOT support temperature, top_p, top_logprobs, or frequency penalties
                        const isReasoningModel = parsedBody.model.includes('o1') || parsedBody.model.includes('o3') || parsedBody.model.includes('gpt-5');
                        if (isReasoningModel) {
                            delete parsedBody.temperature;
                            delete parsedBody.top_p;
                            delete parsedBody.presence_penalty;
                            delete parsedBody.frequency_penalty;
                            delete parsedBody.logit_bias;
                            delete parsedBody.top_logprobs;
                            delete parsedBody.logprobs;
                        }
                    }
                    
                    init.body = JSON.stringify(parsedBody);
                } catch (e) {
                    console.error("Failed to map token payload", e);
                }
            }

            // Create a STERILIZED RequestInit explicitly mapping only safe HTTP layer properties
            const safeInit: RequestInit = {
                method: init?.method || "POST",
                headers: init?.headers,
                body: init?.body,
                ...(init?.body ? { duplex: 'half' } : {})
            } as RequestInit;

            const response = await fetch(urlString, safeInit);
            
            // If the request was not for a stream or failed, return directly
            if (!response.ok || !init?.body) return response;
            
            let isStream = false;
            try {
                const b = typeof init.body === 'string' ? JSON.parse(init.body) : {};
                isStream = !!b.stream;
            } catch (e) {}

            if (!isStream || !response.body) return response;

            // Intercept and fix SSE stream chunking
            // Stripe Gateway (e.g. for Gemini) sometimes sends `delta.content` AND `finish_reason` in the exact same chunk.
            // Vercel AI SDK's OpenAI provider sees `finish_reason` and drops the `content`.
            // We must split them into two separate chunks to adhere to OpenAI's strict spec.
            let buffer = '';
            const transformStream = new TransformStream({
                transform(chunk, controller) {
                    buffer += new TextDecoder().decode(chunk, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                            try {
                                const data = JSON.parse(line.slice(6));
                                const choice = data.choices?.[0];
                                
                                if (choice?.delta?.content && choice?.finish_reason) {
                                    // 1. Emit just the content
                                    const contentChunk = structuredClone(data);
                                    delete contentChunk.choices[0].finish_reason;
                                    delete contentChunk.usage; // Usage goes with finish
                                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(contentChunk)}\n\n`));
                                    
                                    // 2. Emit just the finish_reason
                                    const finishChunk = structuredClone(data);
                                    finishChunk.choices[0].delta = {};
                                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(finishChunk)}\n\n`));
                                    continue; // Skip the original combined line
                                }
                            } catch (e) {
                                // Ignore unparseable lines
                            }
                        }
                        // Pass through normally
                        if (line.trim() || line === '') {
                            controller.enqueue(new TextEncoder().encode(line + '\n'));
                        }
                    }
                },
                flush(controller) {
                    if (buffer.trim()) {
                        controller.enqueue(new TextEncoder().encode(buffer + '\n'));
                    }
                }
            });

            return new Response(response.body.pipeThrough(transformStream), {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
            });
        }
    });
};
