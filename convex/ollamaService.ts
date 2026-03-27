"use node";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

export const SYSTEM_INSTRUCTION = `You are an expert startup consultant and venture capitalist. 
Your goal is to help founders refine their business models using the Lean Canvas framework and create compelling pitch decks.
Be concise, punchy, and professional.`;

// Canonical model names for the Stripe AI Gateway (provider/model format).
const CANONICAL_MODELS: Record<string, string> = {
    // Gemini
    'gemini-2.0-flash': 'google/gemini-2.0-flash',
    'gemini-2.0-flash-lite': 'google/gemini-2.0-flash-lite',
    'gemini-2.5-flash': 'google/gemini-2.5-flash',
    'gemini-2.5-flash-lite': 'google/gemini-2.5-flash-lite',
    'gemini-2.5-pro': 'google/gemini-2.5-pro',
    'gemini-3-flash': 'google/gemini-3-flash',
    // Anthropic
    'claude-sonnet-4': 'anthropic/claude-sonnet-4',
    'claude-haiku-4.5': 'anthropic/claude-haiku-4.5',
    'claude-opus-4': 'anthropic/claude-opus-4',
    // OpenAI
    'gpt-4.1': 'openai/gpt-4.1',
    'gpt-4.1-mini': 'openai/gpt-4.1-mini',
    'o3-mini': 'openai/o3-mini',
    // OSS
    'gpt-oss-120b': 'openai/gpt-oss-120b',
    'gpt-oss-20b': 'openai/gpt-oss-20b',
    'gpt-oss:120b': 'openai/gpt-oss-120b',
    'gpt-oss:20b': 'openai/gpt-oss-20b',
    'gpt-oss:120b-cloud': 'openai/gpt-oss-120b',
    'gpt-oss:20b-cloud': 'openai/gpt-oss-20b',
};

export function canonicalize(model: string): string {
    if (model in CANONICAL_MODELS) return CANONICAL_MODELS[model];
    if (model.includes('/')) return model;
    return model;
}

export function resolveModelName(requestedModel: string, defaultModel: string): string {
    const canonicalDefault = canonicalize(defaultModel);
    const legacyAliases: Record<string, string> = {
        'ollama': canonicalDefault,
        'cloud': canonicalDefault,
        'gemini-3-flash-preview': canonicalDefault,
        'ollama/gemini-3-flash-preview': canonicalDefault,
        '': canonicalDefault,
        'gemma3:12b': canonicalDefault,
        'gemma3:4b': canonicalDefault,
        'gemma3:1b': canonicalDefault,
    };
    if (requestedModel in legacyAliases) {
        return legacyAliases[requestedModel];
    }
    return canonicalize(requestedModel);
}

function maxTokensForModel(model: string): number {
    if (model === 'anthropic/claude-3-haiku' || model.includes('claude-3-haiku')) return 4096;
    return 8192;
}

export function resolveThinkingModel(thinkingLevel?: 'none' | 'low' | 'high'): string {
    switch (thinkingLevel) {
        case 'high': return 'google/gemini-2.5-pro';
        case 'low': return 'google/gemini-2.5-flash';
        case 'none':
        default: return 'google/gemini-2.0-flash';
    }
}

function normalizeToolsToVercel(legacyTools?: any[] | Record<string, any>) {
    if (!legacyTools) return undefined;
    if (Array.isArray(legacyTools)) {
        const vercelTools: Record<string, any> = {};
        for (const t of legacyTools) {
            if (t.type === 'function' && t.function) {
                // We pass the raw parameters. If it's a Zod object, the Vercel SDK accepts it.
                // If it's a JSON schema object, we can wrap it or pass it. In Vercel ai core, tools can accept { parameters: jsonSchema(t.function.parameters) }, 
                // but since we are compiling custom APIs natively to Zod, we pass it natively.
                // For legacy UI_TOOLS JSON schema format, Vercel natively accepts JSON schema in CoreTool if passed appropriately.
                // Actually `ai` exposes `tool({ description, parameters })` but since `ai` SDK 3.1+ 
                // `{ description, parameters }` is a valid CoreTool if parameters is Zod.
                // To be safe and support both JSON Schema and Zod objects, we pass them down.
                vercelTools[t.function.name] = {
                    description: t.function.description,
                    parameters: t.function.parameters
                };
            }
        }
        // Vercel SDK requires at least 1 tool to not error 
        return Object.keys(vercelTools).length > 0 ? vercelTools : undefined;
    }
    return legacyTools as Record<string, any>;
}

export const callStripeAI = async (
    modelName: string,
    prompt: string | { role: string, parts: any[] }[],
    systemInstruction?: string,
    responseFormat?: "json" | object,
    apiKey?: string,
    tools?: any,
    stripeCustomerId?: string,
    ctx?: any
): Promise<string> => {
    const { createStripeGateway } = await import("./stripeGateway");
    
    let configModel = "google/gemini-2.0-flash";
    if (ctx) {
        try {
            const { internal } = await import("./_generated/api");
            const config = await ctx.runQuery(internal.model_config.getConfig, { orgId: "_global" });
            if (config?.selectedModels?.length) {
                const defaultEntry = config.selectedModels.find((m: any) => m.isDefault) || config.selectedModels[0];
                if (defaultEntry?.modelId) {
                    configModel = defaultEntry.modelId;
                }
            }
        } catch { /* ignore */ }
    }

    const finalModelName = resolveModelName(modelName, configModel);

    const provider = createStripeGateway(stripeCustomerId);

    let sdkMessages: any[] = [];
    if (systemInstruction) sdkMessages.push({ role: 'system', content: systemInstruction });
    
    if (typeof prompt === 'string') {
        sdkMessages.push({ role: 'user', content: prompt });
    } else {
        for (const msg of prompt) {
            let role = 'user';
            if (msg.role === 'model' || msg.role === 'assistant') role = 'assistant';
            else if (msg.role === 'system') role = 'system';
            else if (msg.role === 'tool') role = 'tool';

            const contentParts: any[] = [];
            for (const p of msg.parts) {
                if (p.text) contentParts.push({ type: "text", text: p.text });
                else if (p.inlineData) contentParts.push({ type: "image", image: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` });
                else if (p.url) contentParts.push({ type: "image", image: p.url });
            }

            if (contentParts.length === 1 && contentParts[0].type === "text") {
                sdkMessages.push({ role, content: contentParts[0].text });
            } else {
                sdkMessages.push({ role, content: contentParts });
            }
        }
    }

    const capabilities = await checkModelCapabilities(finalModelName);
    const supportsTools = capabilities.includes('tools');
    
    const vercelTools = supportsTools ? normalizeToolsToVercel(tools) : undefined;

    try {
        const { generateText, jsonSchema } = await import("ai");
        
        // Wrap legacy JSON Schema parameters in the `jsonSchema()` helper if they aren't already Zod objects
        let formattedTools: Record<string, any> | undefined = undefined;
        if (vercelTools) {
            formattedTools = {};
            for (const [key, val] of Object.entries(vercelTools)) {
                formattedTools[key] = {
                    description: val.description,
                    // If parse does not exist, it's a raw JSON schema. Vercel SDK wants `jsonSchema(val.parameters)`
                    parameters: typeof val.parameters?.parse === 'function' ? val.parameters : jsonSchema(val.parameters)
                };
            }
        }

        const { text } = await (generateText as any)({
            model: provider.chat(finalModelName),
            messages: sdkMessages,
            tools: formattedTools,
            maxSteps: formattedTools ? 5 : 1,
            temperature: 0,
            maxTokens: maxTokensForModel(finalModelName),
            experimental_onToolCallFinish: ({ toolCall, durationMs, success, error }: any) => {
                if (!success) console.error(`[ToolCall Failed] ${toolCall.toolName}`, error);
            }
        });

        if (responseFormat === 'json') {
            return text.replace(/```json\n?|\n?```/g, "").trim();
        }
        return text;
    } catch (error) {
        throw error;
    }
};

export const streamChat = async function* (
    modelName: string,
    prompt: string | { role: string, parts: any[] }[],
    systemInstruction?: string,
    apiKey?: string,
    tools?: any,
    think?: boolean,
    stripeCustomerId?: string
): AsyncGenerator<{ delta?: string; thinking?: string; toolCallDelta?: any; usage?: any }> {
    
    const { createStripeGateway } = await import("./stripeGateway");
    const { streamText } = await import("ai");

    const defaultModel = "google/gemini-2.0-flash";
    const finalModelName = resolveModelName(modelName, defaultModel);

    const provider = createStripeGateway(stripeCustomerId);

    let sdkMessages: any[] = [];
    if (systemInstruction) sdkMessages.push({ role: 'system', content: systemInstruction });
    
    if (typeof prompt === 'string') {
        sdkMessages.push({ role: 'user', content: prompt });
    } else {
        for (const msg of prompt) {
            let role = 'user';
            if (msg.role === 'model' || msg.role === 'assistant') role = 'assistant';
            else if (msg.role === 'system') role = 'system';
            
            const contentParts: any[] = [];
            for (const p of msg.parts) {
                if (p.text) contentParts.push({ type: "text", text: p.text });
                else if (p.inlineData) contentParts.push({ type: "image", image: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` });
                else if (p.url) contentParts.push({ type: "image", image: p.url });
            }

            if (contentParts.length === 1 && contentParts[0].type === "text") {
                sdkMessages.push({ role, content: contentParts[0].text });
            } else {
                sdkMessages.push({ role, content: contentParts });
            }
        }
    }

    const capabilities = await checkModelCapabilities(finalModelName);
    const supportsTools = capabilities.includes('tools');
    const vercelTools = supportsTools ? normalizeToolsToVercel(tools) : undefined;

    // Build provider-specific options to enable thinking/reasoning output
    const isGoogleModel = finalModelName.startsWith('google/') || finalModelName.startsWith('gemini');
    const isAnthropicModel = finalModelName.startsWith('anthropic/') || finalModelName.startsWith('claude');

    let providerOptions: Record<string, any> | undefined;
    let temperature = 0.7;

    if (think) {
        if (isGoogleModel) {
            providerOptions = {
                google: {
                    thinkingConfig: {
                        thinkingBudget: finalModelName.includes('2.5-pro') ? 16000 : 8000,
                    },
                },
            };
        } else if (isAnthropicModel) {
            // Anthropic extended thinking requires temperature=1
            temperature = 1;
            providerOptions = {
                anthropic: {
                    thinking: {
                        type: 'enabled',
                        budgetTokens: 10000,
                    },
                },
            };
        }
    }

    try {
        const { streamText, jsonSchema } = await import("ai");
        
        let formattedTools: Record<string, any> | undefined = undefined;
        if (vercelTools) {
            formattedTools = {};
            for (const [key, val] of Object.entries(vercelTools)) {
                formattedTools[key] = {
                    description: val.description,
                    parameters: typeof val.parameters?.parse === 'function' ? val.parameters : jsonSchema(val.parameters)
                };
            }
        }

        const stream = await (streamText as any)({
            model: provider.chat(finalModelName),
            messages: sdkMessages,
            tools: formattedTools,
            temperature,
            maxTokens: maxTokensForModel(finalModelName),
            ...(providerOptions ? { providerOptions } : {}),
        });

        for await (const part of stream.fullStream) {
            if (part.type === 'text-delta') {
                yield { delta: (part as any).textDelta || (part as any).text };
            } else if ((part as any).type === 'reasoning') {
                yield { thinking: (part as any).textDelta };
            } else if ((part as any).type === 'tool-call') {
                yield { toolCallDelta: { type: 'function', function: { name: (part as any).toolName, arguments: (part as any).argsTextDelta || (part as any).args } } };
            } else if (part.type === 'finish') {
                yield { usage: (part as any).usage };
            }
        }
    } catch (error) {
        throw error;
    }
};

export const callOllama = action({
    args: {
        model: v.string(),
        messages: v.array(v.object({
            role: v.string(),
            content: v.string()
        })),
        jsonMode: v.optional(v.boolean())
    },
    handler: async (_ctx, args) => {
        const prompt = args.messages.map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        }));

        const systemMsg = args.messages.find(m => m.role === 'system');
        const systemInstruction = systemMsg?.content;
        const filteredPrompt = prompt.filter(m => m.role !== 'system');

        return callStripeAI(args.model, filteredPrompt.length > 0 ? filteredPrompt : "", systemInstruction, args.jsonMode ? "json" : undefined);
    }
});

export const ollamaWebSearch = async (query: string): Promise<{ results: Array<{ title: string; url: string; content: string }> }> => {
    const ollamaApiKey = process.env.OLLAMA_API_KEY || "";
    const ollamaEndpoint = process.env.OLLAMA_BASE_URL || "https://ollama.com";

    if (!ollamaApiKey) return { results: [] };

    const response = await fetch(`${ollamaEndpoint}/api/web_search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ollamaApiKey}` },
        body: JSON.stringify({ query })
    });

    if (!response.ok) return { results: [] };

    const data = await response.json();
    return {
        results: (data.results || []).map((r: any) => ({
            title: r.title || "", url: r.url || r.link || "", content: r.content || r.snippet || ""
        }))
    };
};

export const searchWithGrounding = async (query: string, systemInstruction?: string) => {
    let webSearchData = "";
    let webSources: Array<{ title: string; uri: string }> = [];

    try {
        const webResults = await ollamaWebSearch(query);
        if (webResults.results.length > 0) {
            webSearchData = webResults.results.map((r, i) => `[${i + 1}] ${r.title}\n${r.content}\nSource: ${r.url}`).join("\n\n");
            webSources = webResults.results.map(r => ({ title: r.title, uri: r.url }));
        }
    } catch (e) {}

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey && !webSearchData) throw new Error("No search provider configured.");

    let geminiText = "";
    let groundingMetadata: any = undefined;

    if (geminiApiKey) {
        try {
            const model = process.env.GEMINI_SEARCH_MODEL || "gemini-2.0-flash";
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

            const enrichedQuery = webSearchData ? `${query}\n\n[Additional web research data]:\n${webSearchData}` : query;

            const body: any = {
                contents: [{ role: "user", parts: [{ text: enrichedQuery }] }],
                tools: [{ google_search_retrieval: { dynamic_retrieval_config: { mode: "MODE_DYNAMIC", dynamic_threshold: 0.3 } } }],
                generationConfig: { temperature: 0.4, maxOutputTokens: 4096 }
            };

            if (systemInstruction) body.system_instruction = { parts: [{ text: systemInstruction }] };

            const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

            if (response.ok) {
                const data = await response.json();
                const candidate = data.candidates?.[0];
                geminiText = candidate?.content?.parts?.map((p: any) => p.text).join("") || "";
                groundingMetadata = candidate?.groundingMetadata;

                if (webSources.length > 0 && groundingMetadata) {
                    const existingChunks = groundingMetadata.groundingChunks || [];
                    groundingMetadata.groundingChunks = [...existingChunks, ...webSources.map(s => ({ web: { title: s.title, uri: s.uri } }))];
                }
            }
        } catch (e) {}
    }

    const combinedText = [geminiText, webSearchData].filter(Boolean).join("\n\n---\n\n");
    if (!combinedText) return { text: "", groundingMetadata: undefined };

    if (!groundingMetadata && webSources.length > 0) {
        groundingMetadata = { groundingChunks: webSources.map(s => ({ web: { title: s.title, uri: s.uri } })) };
    }

    return { text: combinedText, groundingMetadata };
};

export const checkModelCapabilities = async (rawModelName: string): Promise<string[]> => {
    const modelName = canonicalize(rawModelName);

    if (['cloud', 'gemini-2.0-flash', 'gemini-3-flash-preview', 'ollama/gemini-3-flash-preview', 'gpt-oss:120b-cloud', 'gpt-oss:20b-cloud', 'gemma3:12b'].includes(modelName)) {
        return ['tools', 'vision', 'completion'];
    }

    if (modelName.includes('/')) {
        const capabilities = ['completion'];
        const provider = modelName.split('/')[0].toLowerCase();
        
        if (['anthropic', 'google', 'openai'].includes(provider)) capabilities.push('tools', 'vision');
        if (modelName.includes('thinking') || modelName.includes('o3') || modelName.includes('qwen')) capabilities.push('thinking');
        return capabilities;
    }

    try {
        const ollamaEndpoint = process.env.OLLAMA_BASE_URL || "https://ollama.com";
        const response = await fetch(`${ollamaEndpoint}/api/show`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: modelName })
        });
        if (!response.ok) return [];
        return (await response.json()).capabilities || [];
    } catch (e) { return []; }
};

export const getCapabilities = action({
    args: { modelName: v.string() },
    handler: async (_ctx, { modelName }) => checkModelCapabilities(modelName)
});

export const listModels = action({
    args: {},
    handler: async () => {
        try {
            const endpoint = process.env.OLLAMA_BASE_URL || "https://ollama.com";
            const response = await fetch(`${endpoint}/api/tags`);
            if (!response.ok) return [];
            return (await response.json()).models;
        } catch (e) { return []; }
    }
});

export const generateAppImage = action({
    args: {
        model: v.optional(v.string()), 
        prompt: v.string(),
        size: v.optional(v.string()),
        n: v.optional(v.number()),
        quality: v.optional(v.string())
    },
    handler: async (ctx, args): Promise<any> => {
        const user: any = await ctx.runQuery((api as any).users.getUser).catch(() => null);
        const stripeCustomerId: string | undefined = user?.stripeCustomerId || undefined;

        const stripeAIGatewayKey = process.env.STRIPE_AI_GATEWAY_KEY || process.env.STRIPE_SECRET_KEY || "";
        const endpoint = "https://llm.stripe.com/v1/images/generations";
        
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${stripeAIGatewayKey}`,
                    ...(stripeCustomerId ? { "X-Stripe-Customer-Id": stripeCustomerId } : {})
                },
                body: JSON.stringify({
                    model: args.model || "openai/dall-e-3",
                    prompt: args.prompt,
                    n: args.n || 1,
                    size: args.size || '1024x1024',
                    quality: args.quality || 'standard',
                    response_format: 'url'
                }),
            });
            if (!res.ok) throw new Error(await res.text());
            return await res.json();
        } catch (error: any) {
            throw new Error(error.message || "Failed to generate image");
        }
    }
});

export const callOllamaInternal = callStripeAI;
