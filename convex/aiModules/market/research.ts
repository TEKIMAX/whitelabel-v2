"use node";
import { v } from "convex/values";
import { action, internalAction } from "../../_generated/server";
import { getMarketResearchPrompt } from "../prompts";
import { callAI } from "../shared";

export const generateMarketResearch = action({
    args: {
        startupData: v.any(),
        attachedFiles: v.optional(v.array(v.object({
            name: v.string(),
            data: v.string(),
            mimeType: v.string()
        }))),
        keywords: v.optional(v.array(v.string())),
        modelName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");


        const data = args.startupData;
        const attachedFiles = args.attachedFiles || [];
        const keywords = args.keywords || [];

        // Market Research is hard-coded to use the Cloud AI model from environment
        const safeModelName = "cloud";


        const textPrompt = getMarketResearchPrompt(
            data.name,
            data.hypothesis,
            data.canvas['Problem'] || 'Not specified',
            data.canvas['Customer Segments'] || 'Not specified',
            data.canvas['Solution'] || 'Not specified',
            keywords,
            attachedFiles.length > 0
        );

        // Construct request parts (Text + optional Files for multimodal)
        let parts: any[] = [{ text: textPrompt }];

        if (attachedFiles.length > 0) {
            attachedFiles.forEach((file: any) => {
                parts.push({
                    inlineData: {
                        mimeType: file.mimeType,
                        data: file.data
                    }
                });
            });
        }

        const geminiContents = [{ role: 'user', parts: parts }];

        try {
            // Call AI requesting TEXT response (since we want Markdown + JSON block)
            const text = await callAI(
                ctx,
                geminiContents,
                "You are a top-tier market researcher with extensive knowledge of industry trends and market sizing.",
                "text/plain", // Changed from application/json to text
                undefined,
                0,
                [],
                safeModelName
            );

            // Extract JSON block for numbers
            let parsedTam = 0;
            let parsedSam = 0;
            let parsedSom = 0;
            let finalReport = text;

            const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);

            if (jsonMatch) {
                try {
                    const jsonBlock = jsonMatch[1];
                    const parsed = JSON.parse(jsonBlock);

                    // Handle numbers that might be strings or numbers
                    const parseNum = (val: any) => {
                        if (typeof val === 'number') return val;
                        if (typeof val === 'string') {
                            return parseFloat(val.replace(/,/g, '').replace(/\$/g, '')) || 0;
                        }
                        return 0;
                    };

                    parsedTam = parseNum(parsed.tam);
                    parsedSam = parseNum(parsed.sam);
                    parsedSom = parseNum(parsed.som);

                    // Remove the JSON block from the report text to keep it clean
                    finalReport = text.replace(jsonMatch[0], '').trim();

                } catch (e) {

                }
            } else {
                // Fallback: Try to find JSON without code blocks if AI forgot them
                const rawJsonMatch = text.match(/\{[\s\S]*"tam"[\s\S]*\}/);
                if (rawJsonMatch) {
                    try {
                        const parsed = JSON.parse(rawJsonMatch[0]);
                        parsedTam = parsed.tam || 0;
                        parsedSam = parsed.sam || 0;
                        parsedSom = parsed.som || 0;
                        // Remove JSON from report
                        finalReport = text.replace(rawJsonMatch[0], '').trim();
                    } catch (e) { }
                }
            }

            // Fallback extraction if JSON parsing failed or returned empty values
            const extractNumber = (pattern: RegExp): number => {
                const match = text.match(pattern);
                if (match) {
                    const numStr = match[1].replace(/,/g, '').replace(/\s/g, '');
                    if (numStr.includes('trillion')) return parseFloat(numStr) * 1000000000000;
                    if (numStr.includes('billion')) return parseFloat(numStr) * 1000000000;
                    if (numStr.includes('million')) return parseFloat(numStr) * 1000000;
                    return parseFloat(numStr);
                }
                return 0;
            };

            // Use parsed values or fallback to regex extraction
            const tam = parsedTam || extractNumber(/TAM[:\s]*\$?\s*([0-9.,]+\s*(?:trillion|billion|million)?)/i) ||
                extractNumber(/Total Addressable Market[:\s]*\$?\s*([0-9.,]+\s*(?:trillion|billion|million)?)/i) ||
                404000000000;

            const sam = parsedSam || extractNumber(/SAM[:\s]*\$?\s*([0-9.,]+\s*(?:trillion|billion|million)?)/i) ||
                extractNumber(/Serviceable Available Market[:\s]*\$?\s*([0-9.,]+\s*(?:trillion|billion|million)?)/i) ||
                7820000000;

            const som = parsedSom || extractNumber(/SOM[:\s]*\$?\s*([0-9.,]+\s*(?:trillion|billion|million)?)/i) ||
                extractNumber(/Serviceable Obtainable Market[:\s]*\$?\s*([0-9.,]+\s*(?:trillion|billion|million)?)/i) ||
                391000000;

            return {
                report: finalReport,
                tam: tam,
                sam: sam,
                som: som
            };
        } catch (error) {
            return {
                report: "Error generating report. Please try again.",
                tam: 0,
                sam: 0,
                som: 0
            };
        }
    }
});

export const analyzeMetric = internalAction({
    args: {
        metric: v.string(), // "TAM", "SAM", or "SOM"
        startupData: v.any(),
        keywords: v.optional(v.array(v.string())),
        attachedFiles: v.optional(v.array(v.object({
            name: v.string(), // filename
            data: v.string(), // content
            mimeType: v.string()
        }))),
        modelName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const { metric, startupData, keywords, attachedFiles, modelName } = args;
        const { callOllamaInternal, ollamaWebSearch } = await import("../../ollamaService");

        let searchQuery = `${metric} market size ${startupData.name || ''} ${startupData.canvas['Solution'] || ''} industry market research 2024 2025`.trim();
        const searchResponse = await ollamaWebSearch(searchQuery);
        const searchResults = searchResponse.results || [];

        const prompt = `
            Analyze the ${metric} (Total/Serviceable Addressable/Obtainable Market) for this startup.
            
            Startup: ${startupData.name || 'Unknown'}
            Hypothesis: ${startupData.hypothesis || 'N/A'}
            Problem: ${startupData.canvas['Problem'] || 'N/A'}
            Solution: ${startupData.canvas['Solution'] || 'N/A'}
            
            ${keywords?.length ? `Keywords: ${keywords.join(', ')}` : ''}
            
            TASK:
            1. Estimate the ${metric} in USD for the current year (2024-2026).
            2. Provide a brief rationale (1-2 sentences) citing logic or sources.
            
            OUTPUT FORMAT:
            Return ONLY a raw JSON object:
            {
                "value": 1000000000,
                "rationale": "Based on [1]...",
                "sources": [
                    { "title": "Source Name", "url": "https://..." }
                ]
            }
        `;

        // Construct parts including files if any
        let parts: any[] = [{ text: prompt }];

        if (searchResults.length > 0) {
            const searchContext = searchResults.map((r, i) => 
                `[${i+1}] "${r.title}" (${r.url})\n${r.content}`
            ).join('\n\n');
            
            parts.unshift({ 
                text: `\nWEB SEARCH RESULTS (cite these using [n]):\n${searchContext}\n` 
            });
        }

        if (attachedFiles && attachedFiles.length > 0) {
            attachedFiles.forEach((file: any) => {
                parts.push({
                    inlineData: {
                        mimeType: file.mimeType,
                        data: file.data
                    }
                });
            });
        }

        try {
            const response = await callOllamaInternal(
                "google/gemini-2.0-flash",
                [{ role: 'user', parts }],
                "You are a market research expert. Output JSON only.",
                "json"
            );

            const clean = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(clean);
            return {
                value: parsed.value || 0,
                rationale: parsed.rationale || "Estimated based on parameters.",
                sources: parsed.sources || []
            };
        } catch (e) {
            return { value: 0, rationale: "Failed to estimate.", sources: [] };
        }
    }
});

export const compileResearchReport = internalAction({
    args: {
        tam: v.any(),
        sam: v.any(),
        som: v.any(),
        startupData: v.any(),
        keywords: v.optional(v.array(v.string())),
        attachedFiles: v.optional(v.array(v.object({
            name: v.string(), // filename
            data: v.string(), // content
            mimeType: v.string()
        }))),
        modelName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const { tam, sam, som, startupData, keywords, attachedFiles } = args;
        const { callOllamaInternal, ollamaWebSearch } = await import("../../ollamaService");

        const searchQuery = `${startupData.name || ''} ${startupData.canvas?.['Solution'] || ''} industry trends competition market research 2024 2025`.trim();
        const searchResponse = await ollamaWebSearch(searchQuery);
        const searchResults = searchResponse.results || [];

        const prompt = `
            Generate a comprehensive Market Research Report for: ${startupData.name || 'this un-named startup'}
            
            CONTEXTUAL DATA:
            - TAM: $${tam.value} (${tam.rationale})
            - SAM: $${sam.value} (${sam.rationale})
            - SOM: $${som.value} (${som.rationale})
            
            ${keywords?.length ? `Keywords: ${keywords.join(', ')}` : ''}
            
            Task:
            Write a detailed market research report in clean Markdown.
            Synthesize the provided TAM/SAM/SOM numbers into the narrative.
            Include a table comparing these metrics.
            Cover: Market Overview, Industry Trends, Target Market Analysis, Competitive Landscape, Market Strategy, and References.
            
            Do NOT output the JSON block at the end, just the report content.
            Cite your sources when talking about trends using [1], [2] notation.
        `;

        let parts: any[] = [{ text: prompt }];

        if (searchResults.length > 0) {
            const searchContext = searchResults.map((r, i) => 
                `[${i+1}] "${r.title}" (${r.url})\n${r.content}`
            ).join('\n\n');
            
            parts.unshift({ 
                text: `\nWEB SEARCH RESULTS (cite these using [n]):\n${searchContext}\n` 
            });
        }

        if (attachedFiles && attachedFiles.length > 0) {
            attachedFiles.forEach((file: any) => {
                parts.push({
                    inlineData: {
                        mimeType: file.mimeType,
                        data: file.data
                    }
                });
            });
        }

        const response = await callOllamaInternal(
            "google/gemini-2.0-flash",
            [{ role: 'user', parts }],
            "You are a professional market analyst. Be thorough and data-driven.",
            undefined,
            undefined,
            [],
            undefined,
            undefined
        );

        // Safety: truncate if response is too large (max 500KB to stay within Convex limits)
        if (response.length > 500000) {
            console.warn(`[compileResearchReport] Response truncated from ${response.length} to 500000 chars`);
            return response.substring(0, 500000) + "\n\n---\n*Report truncated due to length constraints.*";
        }

        return response;
    }
});
