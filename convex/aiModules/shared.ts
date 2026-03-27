
"use node";
import { ActionCtx } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { callOllamaInternal } from "../ollamaService";

// Helper for delay
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const callAI = async (
    ctx: ActionCtx,
    prompt: string | { role: string, parts: any[] }[],
    systemInstruction: string,
    responseMimeType?: string,
    responseSchema?: any,
    retryCount = 0,
    tools: any[] = [],
    modelName: string = "cloud", // Updated default to 'cloud'
    ollamaApiKey?: string,
    skipAuth: boolean = false
): Promise<string> => {
    try {
        // 1. Check Limits
        const limit = await ctx.runQuery(api.usage.checkLimit, { skipAuth });
        if (!limit.allowed) {
            throw new Error(limit.reason);
        }

        // 2. Inject all workspace RAG docs (uploaded .md files + personality) as system context
        let enrichedSystemInstruction = systemInstruction;
        try {
            const identity = await ctx.auth.getUserIdentity();
            const orgId = (identity as any)?.orgId || "_global";

            const docs = await ctx.runQuery(internal.workspace_personality.listPersonalities, {
                orgId,
            });
            if (docs && docs.length > 0) {
                const ragContext = docs
                    .map((d: any) => `### ${d.title || "Context"}\n${d.content}`)
                    .join("\n\n---\n\n");
                enrichedSystemInstruction = `## Workspace Knowledge & Governance\n${ragContext}\n\n---\n\n${systemInstruction}`;
            }
        } catch {
            // RAG lookup failed — continue without it
        }

        // All calls route through Ollama Service / Tekimax Proxy
        try {
            const format = responseSchema ? responseSchema : ((responseMimeType?.includes('json')) ? "json" : undefined);

            const responseText = await callOllamaInternal(
                modelName,
                prompt,
                enrichedSystemInstruction,
                format,
                ollamaApiKey,
                tools,
                undefined, // stripeCustomerId — resolved from env in ollamaService
                ctx        // pass ctx so model_config can be read
            );

            // Track usage (mock tokens for now)
            await ctx.runMutation(api.usage.trackUsage, {
                model: modelName,
                tokens: 0
            }).catch(() => { });

            return responseText;
        } catch (error) {
            throw error;
        }
    } catch (error: any) {
        const errorCode = error.status || error.code || error?.error?.code;
        const errorMessage = error.message || JSON.stringify(error);

        const isRetryable =
            errorCode === 429 ||
            errorCode === 503 ||
            errorCode === 'RESOURCE_EXHAUSTED' ||
            errorCode === 'UNAVAILABLE' ||
            errorMessage.includes('429') ||
            errorMessage.includes('503') ||
            errorMessage.includes('quota') ||
            errorMessage.includes('overloaded') ||
            errorMessage.includes('RESOURCE_EXHAUSTED') ||
            errorMessage.includes('UNAVAILABLE');

        if (isRetryable && retryCount < 3) {
            const delay = Math.pow(2, retryCount + 1) * 1000 + Math.random() * 1000;
            await wait(delay);
            return callAI(ctx, prompt, systemInstruction, responseMimeType, responseSchema, retryCount + 1, tools, modelName, ollamaApiKey, skipAuth);
        }

        throw error;
    }
};

// Helper to construct adaptive system instruction
export const getSystemInstructionWithContext = async (ctx: ActionCtx, baseInstruction: string) => {
    try {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return baseInstruction;

        // Fetch usage limits and feedback history for context injection
        const [feedback, onboarding] = await Promise.all([
            ctx.runQuery(api.feedback.getFeedbackHistory, {}).catch(() => []),
            ctx.runQuery(api.onboarding.getOnboardingData, {}).catch(() => null)
        ]);

        let adaptiveInstruction = baseInstruction;

        // 1. Inject Persona if set
        if (onboarding?.aiInteractionStyle) {
            adaptiveInstruction += `\n\nUSER PREFERRED STYLE: ${onboarding.aiInteractionStyle}. `;
            if (onboarding.aiInteractionStyle === "Executive") {
                adaptiveInstruction += "Be brief, direct, and focus on ROI. Skip pleasantries.";
            } else if (onboarding.aiInteractionStyle === "Visionary") {
                adaptiveInstruction += "Be creative, exploratory, and suggest bold alternative ideas.";
            } else {
                adaptiveInstruction += "Use the Socratic method to guide the user with probing questions.";
            }
        }

        // 2. Inject Feedback Context (Dynamic Learning)
        if (feedback && feedback.length > 0) {
            const themes = feedback.slice(0, 5).map((f: any) => `- ${f.feedback}`).join('\n');
            adaptiveInstruction += `\n\nPAST USER FEEDBACK (Adapt your behavior based on these preferences):\n${themes}`;
        }

        return adaptiveInstruction;
    } catch (error) {
        return baseInstruction;
    }
};
