"use node";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { Type } from "@google/genai";
import { SYSTEM_INSTRUCTION, getPitchDeckPrompt } from "./prompts";
import { callAI } from "./shared";

export const generatePitchDeck = action({
    args: {
        startupData: v.any(), // Passing full object for simplicity, or we can pass JSON string
        modelName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const data = args.startupData;

        // Include financial data in the prompt context
        const financialContext = `
            Financial Model:
            - Type: ${data.revenueModel.businessModelType}
            - Revenue Streams: ${data.revenueModel.revenueStreams.map((s: any) => s.name + " ($" + s.price + ")").join(", ")}
            - Cost Structure: ${data.revenueModel.costStructure.map((c: any) => c.name + " ($" + c.amount + ")").join(", ")}
            - Key Metrics: Growth ${data.revenueModel.monthlyGrowthRate}%, Churn ${data.revenueModel.churnRate}%, CAC $${data.revenueModel.cac}
        `;

        // Include Market Data
        const marketContext = `
            Market Research:
            - TAM (Total Addressable Market): ${data.market.tam}
            - SAM (Serviceable Available Market): ${data.market.sam}
            - SOM (Serviceable Obtainable Market): ${data.market.som}
        `;

        // Include Competitor Data
        const competitorContext = `
            Competitor Analysis:
            - Competitors: ${data.competitorAnalysis.competitors.map((c: any) => c.name).join(', ')}
            - Differentiation/Summary: ${data.competitorAnalysis.analysisSummary}
        `;

        const prompt = getPitchDeckPrompt(
            data.name,
            data.hypothesis,
            data.canvas,
            financialContext,
            marketContext,
            competitorContext
        );

        try {
            const text = await callAI(ctx, prompt, SYSTEM_INSTRUCTION, "application/json",
                {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            content: { type: Type.STRING },
                            notes: { type: Type.STRING },
                            imagePrompt: { type: Type.STRING },
                        },
                        required: ["id", "title", "content", "notes"],
                    },
                },
                0, [], args.modelName
            );

            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);
        } catch (error) {
            return [];
        }
    }
});
