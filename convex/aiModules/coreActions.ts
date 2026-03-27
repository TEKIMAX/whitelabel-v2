"use node";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { SYSTEM_INSTRUCTION } from "./prompts";
import { callAI } from "./shared";

export const chat = action({
    args: {
        prompt: v.union(v.string(), v.array(v.any())),
        systemInstruction: v.optional(v.string()),
        responseMimeType: v.optional(v.string()),
        responseSchema: v.optional(v.any()),
        tools: v.optional(v.any()),
        modelName: v.optional(v.string()),
        provider: v.optional(v.string()),
        ollamaApiKey: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const modelName = args.modelName || "cloud";
        const systemInstruction = args.systemInstruction || SYSTEM_INSTRUCTION;

        return await callAI(
            ctx,
            args.prompt,
            systemInstruction,
            args.responseMimeType,
            args.responseSchema,
            0,
            args.tools || [],
            modelName,
            args.ollamaApiKey
        );
    }
});

export const getModelPricing = action({
    args: {
        provider: v.optional(v.string()),
        query: v.optional(v.string()),
        limit: v.optional(v.number()),
        offset: v.optional(v.number()),
        requires_image_input: v.optional(v.boolean()),
        requires_tool_call: v.optional(v.boolean())
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        try {
            const response = await fetch('https://models.dev/api.json');
            if (!response.ok) {
                throw new Error("Failed to fetch models from models.dev");
            }
            const data = await response.json();

            // Flatten Models
            const allModels: any[] = [];
            Object.entries(data).forEach(([providerId, provider]: [string, any]) => {
                if (provider.models) {
                    Object.values(provider.models).forEach((model: any) => {
                        allModels.push({
                            ...model,
                            provider_id: provider.id,
                            provider_name: provider.name || provider.id
                        });
                    });
                }
            });

            // Filter
            let filtered = allModels.filter(m => {
                // Provider Filter
                if (args.provider) {
                    const p = args.provider.toLowerCase();
                    if (!m.provider_name.toLowerCase().includes(p) && !m.provider_id.toLowerCase().includes(p)) {
                        return false;
                    }
                }

                // Query Filter (Name)
                if (args.query) {
                    const q = args.query.toLowerCase();
                    if (!m.name.toLowerCase().includes(q) && !m.id.toLowerCase().includes(q)) {
                        return false;
                    }
                }

                // Capability Filters
                if (args.requires_image_input) {
                    if (!m.modalities?.input?.includes('image')) return false;
                }

                return true;
            });

            // Sort (Alphabetical by Provider then Name)
            filtered.sort((a, b) => {
                if (a.provider_name < b.provider_name) return -1;
                if (a.provider_name > b.provider_name) return 1;
                return a.name.localeCompare(b.name);
            });

            const total_matched = filtered.length;

            // Pagination
            const limit = args.limit || 60;
            const offset = args.offset || 0;
            const paged = filtered.slice(offset, offset + limit);

            // Map to Interface
            const models = paged.map(m => ({
                model_id: m.id,
                name: m.name,
                provider_name: m.provider_name,
                // Cost is already in USD per 1M tokens (e.g. 0.5 for $0.50/1M)
                cost_per_1m_input: (m.cost?.input || 0),
                cost_per_1m_output: (m.cost?.output || 0),
                context_window: m.limit?.context || m.limit?.max_tokens || 0,
                capabilities: [
                    ...(m.modalities?.input || []),
                    ...(m.modalities?.output || [])
                ].map((s: string) => s.toUpperCase())
            }));

            return {
                models,
                total_matched
            };

        } catch (error: any) {
            // Fallback to empty if external API fails, or rethrow
            throw new Error(`Failed to fetch model pricing: ${error.message}`);
        }
    }
});
