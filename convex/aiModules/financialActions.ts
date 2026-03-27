"use node";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { getRevenueModelAnalysisPrompt } from "./prompts";
import { callAI } from "./shared";
import { callOllamaInternal } from "../ollamaService";

export const analyzeRevenueModel = action({
    args: {
        startupData: v.any(),
        modelName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const data = args.startupData;
        const prompt = getRevenueModelAnalysisPrompt(
            data.name,
            data.revenueModel.businessModelType,
            data.revenueModel.revenueStreams,
            data.revenueModel.costStructure,
            data.revenueModel.monthlyGrowthRate,
            data.revenueModel.churnRate,
            data.revenueModel.cac
        );

        return callAI(ctx, prompt, "You are a helpful startup advisor.", undefined, undefined, 0, [], args.modelName);
    }
});

export const analyzeFinancialModel = action({
    args: {
        startupData: v.any(),
        useOllama: v.optional(v.boolean()),
        ollamaModelName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const data = args.startupData;

        const prompt = `
            Analyze the financial projections for this startup.
            
            Startup: ${data.name}
            Business Model: ${data.revenueModel.businessModelType}
            Revenue Streams: ${JSON.stringify(data.revenueModel.revenueStreams)}
            Cost Structure: ${JSON.stringify(data.revenueModel.costStructure)}
            Metrics: Growth ${data.revenueModel.monthlyGrowthRate}%, Churn ${data.revenueModel.churnRate}%, CAC $${data.revenueModel.cac}.
            
            Provide a 2-sentence summary of the financial health and 1 key recommendation.
            Focus on when they might become profitable or if the burn rate is sustainable.
        `;

        const systemInstruction = "You are an expert startup consultant and venture capitalist. Be concise and professional. IMPORTANT: Always wrap key financial metrics like dollar amounts ($1,000), percentages (15%), 'Churn', 'CAC', and 'Growth' in **bold** (e.g., **$5,000** or **12% churn**) so the UI can render them as badges.";

        // If Ollama is requested, use Ollama Cloud service
        if (args.useOllama) {
            try {
                const response = await callOllamaInternal("", prompt, systemInstruction);
                return response;
            } catch (error: any) {
                throw new Error("Ollama Cloud analysis failed: " + (error.message || "Unknown error"));
            }
        }

        // Default: Use Gemini via callAI
        return callAI(ctx, prompt, systemInstruction, undefined, undefined, 0, [], "gemini-3-flash-preview");
    }
});

export const explainScenario = action({
    args: {
        scenario: v.any(),
        style: v.string(), // "Analogy", "Simplify", "Professional"
        modelName: v.optional(v.string()),
        useOllama: v.optional(v.boolean())
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const { scenario, style } = args;

        let styleInstruction = "";
        switch (style) {
            case "Analogy":
                styleInstruction = "Use a creative analogy (like slicing a pizza, sharing a harvest, or building a house) to explain the concepts. Keep it fun but accurate.";
                break;
            case "Simplify":
                styleInstruction = "Explain it like I'm 5 years old. Use simple language, short sentences, and avoid jargon.";
                break;
            case "Professional":
            default:
                styleInstruction = "Use professional venture capital terminology. Focus on the financial implications, dilution, and cap table impact.";
                break;
        }

        const systemInstruction = "You are a helpful startup advisor.";

        // MODE 1: TERMS ANALYSIS
        if (scenario.type === 'terms') {
            const prompt = `
                Analyze these fundraising investment terms for a founder.
                
                TERMS:
                - Valuation Cap: $${scenario.valuationCap.toLocaleString()}
                - Discount Rate: ${scenario.discountRate}%
                - Target Raise: $${scenario.amountRaising.toLocaleString()}
                - Type: ${scenario.postMoney ? 'Post-Money' : 'Pre-Money'}
                
                INSTRUCTIONS:
                1. ${styleInstruction}
                2. Analyze if these terms are "founder friendly", "investor friendly", or "market standard".
                3. Explain the relationship between the Cap and the Discount.
                4. Highlight any major dilution risks.
                5. Keep it under 200 words.
                
                Format: Markdown.
            `;
            return callAI(ctx, prompt, systemInstruction, undefined, undefined, 0, [], args.modelName);
        }

        // MODE 2: VESTING ANALYSIS
        if (scenario.type === 'vesting') {
            const { recipient, shares, period, cliff } = scenario.vestingDetails;
            const prompt = `
                Analyze this Vesting Schedule for ${recipient}.
                
                DETAILS:
                - Shares: ${shares.toLocaleString()}
                - Total Period: ${period} months
                - Cliff: ${cliff} months
                
                INSTRUCTIONS:
                1. ${styleInstruction}
                2. Explain the "Cliff" concept and what happens if they leave before ${cliff} months.
                3. Is this a standard "4-year/1-year cliff" schedule? (Compare to standard).
                4. Advice on why vesting is important for company stability.
                5. Keep it under 200 words.
                
                Format: Markdown.
            `;
            return callAI(ctx, prompt, systemInstruction, undefined, undefined, 0, [], args.modelName);
        }

        // MODE 3: CAP TABLE ANALYSIS
        if (scenario.type === 'captable') {
            const prompt = `
                Analyze this Pro-Forma Cap Table summary.
                
                CONTEXT:
                - Valuation Cap: $${scenario.valuationCap.toLocaleString()}
                - Amount Raising: $${scenario.amountRaising.toLocaleString()}
                - Projected Post-Money Ownership balance.
                
                INSTRUCTIONS:
                1. ${styleInstruction}
                2. Explain the impact of the SAFE conversion on the existing cap table.
                3. Are the founders retaining enough equity (usually >80% after Seed)?
                4. Explain "Post-Money" vs "Pre-Money" dilution in this specific context.
                5. Keep it under 200 words.
                
                Format: Markdown.
            `;
            return callAI(ctx, prompt, systemInstruction, undefined, undefined, 0, [], args.modelName);
        }

        // MODE 4: MULTI-SCENARIO SIMULATION
        if (scenario.type === 'simulation') {
            const scenariosStr = scenario.scenarios.map((s: any) => `- ${s.name}: $${s.amountRaising.toLocaleString()} at $${s.valuationCap.toLocaleString()} Cap`).join("\n");
            const prompt = `
                Analyze these fundraising scenarios and their strategic impact.
                
                SCENARIOS:
                ${scenariosStr}
                
                EXIT VALUE: $${scenario.exitValuation.toLocaleString()}
                
                INSTRUCTIONS:
                1. ${styleInstruction}
                2. Compare the scenarios. Which one offers the best balance of capital vs dilution?
                3. Explain the "Waterfall" impact at a $${scenario.exitValuation.toLocaleString()} exit.
                4. Which term (Cap or Raise) has the biggest impact on the founder's final payout?
                5. Keep it under 200 words.
                
                Format: Markdown.
            `;
            return callAI(ctx, prompt, systemInstruction, undefined, undefined, 0, [], args.modelName);
        }

        // MODE 5: DEFAULT / EXIT SCENARIO
        const prompt = `
            Explain this fundraising scenario to a founder.
            
            SCENARIO DETAILS:
            - Amount Raising: $${scenario.amountRaising.toLocaleString()}
            - Valuation Cap: $${scenario.valuationCap.toLocaleString()}
            - Projected Exit Valuation: $${scenario.exitValuation.toLocaleString()}
            
            RESULTS:
            - Investor Ownership: ${scenario.investorOwnership?.toFixed(2)}%
            - Founder Ownership: ${scenario.founderOwnership?.toFixed(2)}%
            - Investor Payout: $${scenario.investorPayout?.toLocaleString()}
            - Founder Payout: $${scenario.founderPayout?.toLocaleString()}
            - Dilution: ${scenario.dilution?.toFixed(2)}%
            
            INSTRUCTIONS:
            1. ${styleInstruction}
            2. Explain what this means for the founder's control and financial outcome.
            3. Highlight if this is a "good" or "bad" deal based on market norms.
            4. Keep the explanation under 200 words.
            
            Format: Markdown.
        `;

        // Use Ollama if requested
        if (args.useOllama) {
            try {
                return await callOllamaInternal("", prompt, systemInstruction);
            } catch (error: any) {
                throw new Error("Ollama analysis failed: " + (error.message || "Unknown error"));
            }
        }

        return callAI(ctx, prompt, systemInstruction, undefined, undefined, 0, [], args.modelName);
    }
});
