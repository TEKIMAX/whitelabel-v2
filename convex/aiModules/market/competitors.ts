"use node";
import { v } from "convex/values";
import { action } from "../../_generated/server";
import {
    getCompetitorAnalysisPrompt,
    getCompetitorFillPrompt
} from "../prompts";
import { callAI } from "../shared";

export const generateCompetitorAnalysis = action({
    args: {
        startupData: v.any(),
        modelName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const data = args.startupData;

        // Check if user has already defined columns/competitors
        const existingAttributes = data.competitorAnalysis.attributes;
        const existingCompetitors = data.competitorAnalysis.competitors;

        const prompt = getCompetitorAnalysisPrompt(
            data.name,
            data.hypothesis,
            data.canvas['Problem'],
            data.canvas['Solution'],
            data.canvas['Unique Value Proposition'],
            data.market.tam,
            data.market.sam,
            data.market.som,
            data.revenueModel.businessModelType,
            data.revenueModel.revenueStreams
        );

        try {
            const { createStripeGateway } = await import("../../stripeGateway");
            const { checkModelCapabilities, resolveModelName, ollamaWebSearch } = await import("../../ollamaService");
            const { generateObject, tool } = await import("ai");
            const { z } = await import("zod");

            const finalModelName = resolveModelName(args.modelName || "google/gemini-2.0-flash", "google/gemini-2.0-flash");
            const capabilities = await checkModelCapabilities(finalModelName);
            const supportsTools = capabilities.includes('tools');

            const provider = createStripeGateway(undefined); // Could pass stripeCustomerId if available
            const options: any = {
                model: provider(finalModelName),
                system: "You are a strategic analyst. You must use real-world data found via your googleSearch tool. In the 'analysisSummary' field, use markdown formatting and wrap key metrics (amounts, %, growth, churn) in **bold** to highlight them.",
                prompt: prompt,
                maxSteps: supportsTools ? 5 : 1,
                temperature: 0.1,
                tools: supportsTools ? {
                    googleSearch: tool({
                        description: "Search Google to find competitor information, feature sets, recent financing rounds, and market share data.",
                        parameters: z.object({ query: z.string() }),
                        execute: async ({ query }: { query: string }) => {
                            const res = await ollamaWebSearch(query);
                            return res.results;
                        }
                    } as any)
                } : undefined,
                schema: z.object({
                    analysisSummary: z.string().describe("Executive markdown summary of the competitive landscape"),
                    subTabs: z.array(z.object({
                        id: z.string().describe("Unique identifier like 'tab_1'"),
                        name: z.string().describe("Tab name like 'General' or 'Financing'"),
                        attributes: z.array(z.string()).describe("List of table column headers (e.g., Price, Features)"),
                        competitors: z.array(z.object({
                            name: z.string(),
                            Description: z.string().optional(),
                            Focus: z.string().optional(),
                            Technology: z.string().optional(),
                            Differentiation: z.string().optional(),
                            "Match Probability": z.string().optional(),
                            "Total Raised": z.string().optional(),
                            "Latest Stage": z.string().optional(),
                            "Lead Investors": z.string().optional(),
                            "Last Financing Date": z.string().optional()
                        }).catchall(z.string().optional())) // Allowing flexible keys for dynamic attributes
                    }))
                })
            };
            const structuredResult = await (generateObject as any)(options);

            const result = structuredResult.object;

            // Post-process to ensure IDs
            if (result.subTabs && Array.isArray(result.subTabs)) {
                result.subTabs.forEach((tab: any) => {
                    if (tab.competitors && Array.isArray(tab.competitors)) {
                        tab.competitors = tab.competitors.map((c: any) => ({
                            ...c,
                            id: c.id || Date.now() + Math.random().toString()
                        }));
                    } else {
                        tab.competitors = [];
                    }
                });
            } else {
                result.subTabs = [];
            }

            const generalTab = result.subTabs.find((t: any) => t.name.includes("General")) || result.subTabs[0];

            return {
                attributes: generalTab ? generalTab.attributes : ["Price", "Features"],
                competitors: generalTab ? generalTab.competitors : [],
                analysisSummary: result.analysisSummary || "Analysis generated.",
                subTabs: result.subTabs
            };

        } catch (error) {
            return {
                attributes: existingAttributes.length > 0 ? existingAttributes : ["Price", "Features"],
                competitors: existingCompetitors,
                analysisSummary: "Error generating analysis. Check API limits.",
                subTabs: []
            };
        }
    }
});

// Fill empty cells in existing competitors when AI times out or partial data exists
export const fillEmptyCompetitorCells = action({
    args: {
        startupData: v.any(),
        competitors: v.array(v.any()),
        attributes: v.array(v.string()),
        modelName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const data = args.startupData;
        const competitors = args.competitors;
        const attributes = args.attributes;

        // Find competitors with empty cells
        const competitorsWithEmptyCells: { name: string; emptyAttributes: string[] }[] = [];

        competitors.forEach((comp: any) => {
            try {
                const attrData = typeof comp.attributesData === 'string'
                    ? JSON.parse(comp.attributesData)
                    : comp.attributesData || {};

                const emptyAttrs = attributes.filter(attr =>
                    !attrData[attr] || attrData[attr] === '' || attrData[attr] === 'Empty'
                );

                if (emptyAttrs.length > 0) {
                    competitorsWithEmptyCells.push({
                        name: comp.name,
                        emptyAttributes: emptyAttrs
                    });
                }
            } catch (e) {
                // If parsing fails, all attributes are empty
                competitorsWithEmptyCells.push({
                    name: comp.name,
                    emptyAttributes: attributes
                });
            }
        });

        if (competitorsWithEmptyCells.length === 0) {
            return { competitors, message: "No empty cells to fill" };
        }

        const prompt = getCompetitorFillPrompt(
            data.name,
            data.hypothesis,
            data.canvas,
            competitorsWithEmptyCells.map(c => `- ${c.name}: Need data for [${c.emptyAttributes.join(', ')}]`).join('\n'),
            attributes.join(', ')
        );

        try {
            const tools = [{ googleSearch: {} }];

            const text = await callAI(ctx, prompt, "You are a strategic analyst filling in missing competitive data. Use Google Search for real data. Return ONLY valid JSON.", undefined, undefined, 0, tools, args.modelName);

            // Robust JSON Extraction
            let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/) || text.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                cleanText = jsonMatch[1] || jsonMatch[0];
            }

            let result;
            try {
                result = JSON.parse(cleanText);
            } catch (e) {
                throw new Error("Failed to parse AI response.");
            }

            // Merge updates into existing competitors
            const updatedCompetitors = competitors.map((comp: any) => {
                const update = result.updates?.find((u: any) =>
                    u.name.toLowerCase() === comp.name.toLowerCase()
                );

                if (update) {
                    let attrData: any = {};
                    try {
                        attrData = typeof comp.attributesData === 'string'
                            ? JSON.parse(comp.attributesData)
                            : comp.attributesData || {};
                    } catch (e) {
                        attrData = {};
                    }

                    // Merge new data
                    Object.keys(update.data).forEach(key => {
                        if (!attrData[key] || attrData[key] === '' || attrData[key] === 'Empty') {
                            attrData[key] = update.data[key];
                        }
                    });

                    return {
                        ...comp,
                        attributesData: JSON.stringify(attrData)
                    };
                }
                return comp;
            });

            return {
                competitors: updatedCompetitors,
                message: `Filled data for ${result.updates?.length || 0} competitors`
            };

        } catch (error) {
            return { competitors, message: "Error filling cells. Try again." };
        }
    }
});
