"use node";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { callAI } from "./shared";

export const explainAdaptiveStatus = action({
    args: {
        topic: v.string(),
        metrics: v.any(),
        modelName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const { topic, metrics } = args;

        const systemInstruction = `You are an Adaptive Learning System. Your goal is to explain the status of a specific module (${topic}) using the provided metrics. 
        Tone: Encouraging, data-driven, and brief.
        Format: Markdown. 
        Wrap key numbers and accomplishments in **bold**.`;

        const prompt = `Explain the status of the "${topic}" module. 
        Metrics provided: ${JSON.stringify(metrics)}.
        
        Focus on:
        1. What has been accomplished.
        2. What are the key gaps.
        3. One immediate next step for the founder.
        
        Keep the explanation under 100 words.`;

        return callAI(ctx, prompt, systemInstruction, undefined, undefined, 0, [], args.modelName);
    }
});
