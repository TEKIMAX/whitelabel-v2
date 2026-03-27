"use node";
import { v } from "convex/values";
import { action } from "../../_generated/server";
import {
    SYSTEM_INSTRUCTION,
    getSuggestCanvasSectionPrompt
} from "../prompts";
import { callAI } from "../shared";

export const suggestCanvasSection = action({
    args: {
        section: v.string(),
        startupName: v.string(),
        hypothesis: v.string(),
        canvasContext: v.string(), // JSON string of canvas
        modelName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const prompt = getSuggestCanvasSectionPrompt(
            args.section,
            args.startupName,
            args.hypothesis,
            args.canvasContext
        );

        // Use the requested model or default to the standard working model
        return callAI(ctx, prompt, SYSTEM_INSTRUCTION, undefined, undefined, 0, [], args.modelName || "cloud");
    }
});
