"use node";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { callAI } from "./shared";

/**
 * AI Competitor Discovery
 * Auto-discovers 3-5 competitors from the business description
 * and pre-fills competitor data ready for the competitive matrix.
 */
export const discoverCompetitors = action({
    args: {
        businessDescription: v.string(),
        industry: v.optional(v.string()),
        segments: v.optional(v.string()),
        modelName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const prompt = `
You are a competitive intelligence analyst helping an early-stage startup understand their competitive landscape.

**Business Description:** ${args.businessDescription}
${args.industry ? `**Industry:** ${args.industry}` : ''}
${args.segments ? `**Target Segments:** ${args.segments}` : ''}

Identify 5 real competitors (both direct and indirect) for this startup. For each competitor, provide:
1. Company name (real company, not fictional)
2. A 1-2 sentence description of what they do
3. Their key differentiator / unique value proposition
4. Estimated company stage (Startup, Growth, Enterprise)
5. Website URL if known
6. Why they're a relevant competitor to this startup

Rules:
- Include a mix of direct competitors (same solution) and indirect competitors (different approach to same problem)
- Prioritize well-known, real companies that the founder can actually research
- If you're not sure about a URL, set it to null
- Be specific about differentiators — avoid generic statements

Return as JSON: { "competitors": [{ "name": "...", "description": "...", "differentiator": "...", "stage": "Startup|Growth|Enterprise", "url": "..." | null, "relevance": "..." }] }
        `.trim();

        try {
            const text = await callAI(
                ctx,
                prompt,
                "You are a competitive intelligence analyst with deep knowledge of startup ecosystems across industries.",
                "application/json",
                undefined,
                0,
                [],
                args.modelName || "cloud"
            );
            const parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
            return parsed;
        } catch (e) {
            return {
                competitors: [],
                error: "Unable to discover competitors at this time. Please try again."
            };
        }
    }
});
