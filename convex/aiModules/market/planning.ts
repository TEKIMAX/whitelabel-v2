"use node";
import { v } from "convex/values";
import { action } from "../../_generated/server";
import { api } from "../../_generated/api";
import { Type } from "@google/genai";
import {
    SYSTEM_INSTRUCTION
} from "../prompts";
import { callAI } from "../shared";

export const generateOKRs = action({
    args: {
        startupData: v.any(),
        modelName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const data = args.startupData;
        // Gather context from all modules
        const marketGap = data.market.tam === 0;
        const revenueGap = data.revenueModel.revenueStreams.length === 0;
        const canvasGap = Object.values(data.canvas).some(v => !v);

        // Find potential customers
        const potentialCustomers = data.customerInterviews.filter((c: any) => c.customerStatus === 'Potential Fit');

        const prompt = `
            Generate 3-5 strategic OKRs (Objectives and Key Results) for this startup for the next quarter.
            Review all available data to identify gaps and opportunities.
            
            Startup Name: ${data.name}
            Hypothesis: ${data.hypothesis}
            
            CURRENT STATUS:
            - Market Research: ${marketGap ? "Missing TAM/SAM/SOM" : `TAM $${data.market.tam}`}
            - Revenue Model: ${revenueGap ? "Missing Revenue Streams" : `Defined`}
            - Canvas: ${canvasGap ? "Incomplete" : "Complete"}
            - Customer Pipeline: ${potentialCustomers.length} Potential Fits identified.
            - Build: ${data.features.length} features in roadmap.
            
            INSTRUCTIONS:
            1. If Market/Revenue/Canvas data is missing, prioritize goals to complete them.
            2. If 'Potential Fit' customers exist, create a goal to convert them (e.g., "Close 3 Potential Fits").
            3. Include a Product goal based on the roadmap.
            4. Include a Growth goal based on customer discovery.
            
            Return RAW JSON array of objects:
            [
                {
                    "title": "Objective Title",
                    "type": "Strategic",
                    "timeframe": "Quarterly",
                    "status": "Upcoming",
                    "keyResults": [
                        { "description": "Achieve 100 signups", "target": 100, "unit": "users" },
                        { "description": "Launch MVP", "target": 1, "unit": "launch" }
                    ]
                }
            ]
        `;

        try {
            const text = await callAI(ctx, prompt, "You are a product manager setting OKRs.", "application/json",
                {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ['Strategic', 'Objective'] },
                            timeframe: { type: Type.STRING, enum: ['Weekly', 'Monthly', 'Quarterly'] },
                            status: { type: Type.STRING, enum: ['Upcoming', 'In Progress', 'Completed'] },
                            keyResults: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        description: { type: Type.STRING },
                                        target: { type: Type.NUMBER },
                                        unit: { type: Type.STRING }
                                    },
                                    required: ['description', 'target', 'unit']
                                }
                            }
                        },
                        required: ['title', 'type', 'timeframe', 'status', 'keyResults']
                    }
                },
                0, [], args.modelName
            );

            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const rawGoals = JSON.parse(cleanText);

            // Add IDs and defaults
            return rawGoals.map((g: any) => ({
                id: Date.now().toString() + Math.random(),
                title: g.title,
                type: g.type,
                timeframe: g.timeframe,
                status: g.status || 'Upcoming',
                linkedCustomerIds: [], // Default empty
                keyResults: g.keyResults.map((kr: any) => ({
                    id: Date.now().toString() + Math.random(),
                    description: kr.description,
                    target: kr.target,
                    current: 0,
                    unit: kr.unit
                }))
            }));

        } catch (e) {
            return [];
        }
    }
});

export const generateProjectReport = action({
    args: {
        startupData: v.any(),
        modelName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const data = args.startupData;
        const prompt = `
            Generate a comprehensive White Paper report for this startup.
            The report should look like a professional business document (using Markdown).
            
            Startup Name: ${data.name}
            Original Idea: ${data.hypothesis}
            
            DATA TO ANALYZE:
            1. Canvas Evolution (Pivots):
               They have saved ${data.canvasVersions.length} versions of their business model.
               Summarize the evolution if possible.
               Current Canvas State: ${JSON.stringify(data.canvas)}
               
            2. Customer Discovery:
               They have conducted ${data.customerInterviews.length} interviews.
               Interview Data: ${JSON.stringify(data.customerInterviews.slice(0, 10))}
               Synthesize the findings. What pain points were validated?
               
            STRUCTURE OF THE REPORT:
            - Executive Summary
            - The Journey (Detailing the pivots and evolution of the business model)
            - Customer Insights (Findings from the "Get out of the building" phase)
            - Strategic Outlook (Based on the current canvas and financial model)
            
            Tone: Professional, narrative, and insightful.
            Format: Markdown.
        `;

        return callAI(ctx, prompt, "You are a Chief Strategy Officer writing a report for stakeholders.", undefined, undefined, 0, [], args.modelName);
    }
});

export const generateBusinessPlan = action({
    args: {
        startupData: v.any(),
        modelName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const data = args.startupData;
        const prompt = `
            Generate a formal, comprehensive Business Plan for this startup based on all available data.
            
            Startup Name: ${data.name}
            Hypothesis: ${data.hypothesis}
            
            DATA SOURCES:
            1. Lean Canvas: ${JSON.stringify(data.canvas)}
            2. Market Research: TAM ${data.market.tam}, SAM ${data.market.sam}, SOM ${data.market.som}.
            3. Financials: 
               - Business Model: ${data.revenueModel.businessModelType}
               - Description: ${data.revenueModel.modelDescription}
               - Projections: Growth ${data.revenueModel.monthlyGrowthRate}%, Churn ${data.revenueModel.churnRate}%
            4. Customer Discovery: ${data.customerInterviews.length} interviews conducted.
            5. Roadmap: ${JSON.stringify(data.features)}
            6. Competitors: ${JSON.stringify(data.competitorAnalysis.competitors.map((c: any) => c.name).join(', '))}
            
            REQUIRED STRUCTURE:
            1. Executive Summary
            2. Company Overview (Mission, Vision, Value Proposition)
            3. Market Analysis (Industry Trends, Target Market, Competition)
            4. Products & Services (Solution Description, Development Roadmap)
            5. Operational Plan (Go-to-Market Strategy)
            6. Financial Plan (Revenue Model, Unit Economics, Projections)
            7. Conclusion
            
            Format: Markdown. Tone: Professional, Investment-grade, Formal.
        `;

        return callAI(ctx, prompt, "You are a senior business consultant and venture capitalist writing a formal business plan for potential investors.", undefined, undefined, 0, [], args.modelName);
    }
});

export const generateStartupJourneyStory = action({
    args: {
        startupData: v.any(),
        modelName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const data = args.startupData;
        const prompt = `
            Write a compelling, narrative "Startup Journey Story" for this venture.
            This story should dramatize the timeline of events, pivots, and milestones.

            Startup Name: ${data.name}
            Mission: ${data.hypothesis}
            
            TIMELINE MILESTONES:
            ${data.milestones.map((m: any) =>
            `- ${new Date(m.date).toLocaleDateString()}: ${m.title} (${m.type}) - ${m.description} [${m.tractionType || 'Normal'}]`
        ).join('\n')}

            INSTRUCTIONS:
            1. Write in a journalistic or biographical style (e.g., "It all started in 2024 when...").
            2. Highlight the "Moments of Truth" (Pivots, Funding, Big Launches).
            3. Use the "Year Themes" if available to structure the narrative.
            4. Be inspiring but grounded in the data provided.
            5. Structure with Markdown headers (use # for Main Title, ## for Chapters).
            6. Use bullet points (* or -) for lists.

            Format: Markdown (Strict compatibility with TipTap/ProseMirror).
        `;

        try {
            const story = await callAI(ctx, prompt, "You are a tech journalist profiling a startup.", undefined, undefined, 0, [], args.modelName);

            // Persist the story
            if (data.id) {
                await ctx.runMutation(api.projects.update, {
                    id: data.id,
                    updates: {
                        journeyStoryContent: story
                    }
                });
            }

            return story;
        } catch (e) {
            return "Could not generate story.";
        }
    }
});
