"use node";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { Type } from "@google/genai";
import { callAI } from "./shared";

export const analyzeCustomerFeedback = action({
    args: {
        interview: v.any(),
        modelName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const interview = args.interview;
        const prompt = `
            Analyze this customer interview/feedback notes.
            
            Data: ${JSON.stringify(interview)}
            
            1. Determine sentiment (Positive, Neutral, Negative).
            2. Extract a 1-sentence insight or persona summary.
            3. Extract 2-3 key tags.
            
            Return JSON: { "sentiment": "...", "aiAnalysis": "Summary... [Tag1, Tag2]" }
        `;

        try {
            const text = await callAI(ctx, prompt, "You are a UX researcher.", "application/json",
                {
                    type: Type.OBJECT,
                    properties: {
                        sentiment: { type: Type.STRING, enum: ["Positive", "Neutral", "Negative"] },
                        aiAnalysis: { type: Type.STRING }
                    },
                    required: ["sentiment", "aiAnalysis"]
                },
                0, [], args.modelName
            );
            return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
        } catch (e) {
            return { sentiment: 'Neutral', aiAnalysis: 'Analysis failed.' };
        }
    }
});
