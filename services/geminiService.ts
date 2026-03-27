import { Type } from "@google/genai";
import { CanvasSection, StartupData, Slide, AISettings, CompetitorAnalysisData, CustomerInterview, Goal, KeyResult } from "../types";
import { convex } from "../convexClient";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

// Helper for delay
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to determine which AI provider to use
const callAI = async (
    prompt: string | { role: string, parts: any[] }[],
    settings: AISettings,
    systemInstruction: string,
    responseMimeType?: string,
    responseSchema?: any,
    retryCount = 0,
    tools: any[] = [] // Support for tools
): Promise<string> => {

    try {
        // Call Convex Backend Action
        // This secures the API key on the server side
        const result = await convex.action(api.ai.chat, {
            prompt: prompt,
            systemInstruction: systemInstruction,
            responseMimeType: responseMimeType,
            responseSchema: responseSchema,
            tools: tools,
            modelName: settings.modelName,
            provider: settings.provider,
            ollamaApiKey: settings.ollamaApiKey
        });

        return result;

    } catch (error: any) {
        // Detect 429 or Quota Exceeded errors
        const errorCode = error.status || error.code || error?.error?.code;
        const errorMessage = error.message || JSON.stringify(error);

        const isRateLimit =
            errorCode === 429 ||
            errorCode === 'RESOURCE_EXHAUSTED' ||
            errorMessage.includes('429') ||
            errorMessage.includes('quota') ||
            errorMessage.includes('RESOURCE_EXHAUSTED');

        if (isRateLimit && retryCount < 3) {
            const delay = Math.pow(2, retryCount + 1) * 1000 + Math.random() * 500;
            await wait(delay);
            return callAI(prompt, settings, systemInstruction, responseMimeType, responseSchema, retryCount + 1, tools);
        }

        // Show toast for user-facing limits
        if (errorMessage.toLowerCase().includes("limit exceeded") || isRateLimit) {
            // Safe extraction of message
            const displayMessage = errorMessage.length < 200 ? errorMessage : "Usage limit exceeded. Please upgrade or try again later.";
            toast.error(displayMessage);
        }

        throw error;
    }
};

const SYSTEM_INSTRUCTION = `You are an expert startup consultant and venture capitalist. 
Your goal is to help founders refine their business models using the Lean Canvas framework and create compelling pitch decks.
Be concise, punchy, and professional.`;

export const suggestCanvasSection = async (
    section: CanvasSection,
    currentData: StartupData,
    settings: AISettings
): Promise<string> => {
    try {
        // Use the dedicated backend action for Canvas suggestions
        // This action is hard-coded to use the NVIDIA Nemotron path
        const result = await convex.action(api.ai.suggestCanvasSection, {
            section,
            startupName: currentData.name,
            hypothesis: currentData.hypothesis,
            canvasContext: JSON.stringify(currentData.canvas),
            modelName: settings.modelName // This will be ignored/overridden by the backend for Canvas
        });
        return result;
    } catch (error) {
        throw error;
    }
};

export const generatePitchDeck = async (data: StartupData, settings: AISettings): Promise<Slide[]> => {
    // Include financial data in the prompt context
    const financialContext = `
    Financial Model:
    - Type: ${data.revenueModel.businessModelType}
    - Revenue Streams: ${data.revenueModel.revenueStreams.map(s => s.name + " ($" + s.price + ")").join(", ")}
    - Cost Structure: ${data.revenueModel.costStructure.map(c => c.name + " ($" + c.amount + ")").join(", ")}
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
    - Competitors: ${data.competitorAnalysis.competitors.map(c => c.name).join(', ')}
    - Differentiation/Summary: ${data.competitorAnalysis.analysisSummary}
  `;

    const prompt = `
    Create a professional 10-slide pitch deck for the following startup.
    Use all provided context to make it specific and data-driven.

    Startup Name: ${data.name}
    Hypothesis: ${data.hypothesis}
    
    DATA SOURCES:
    Lean Canvas: ${JSON.stringify(data.canvas)}
    ${financialContext}
    ${marketContext}
    ${competitorContext}
    
    Return a valid JSON array of objects. Each object should have:
    - id: string (unique)
    - title: string (slide headline)
    - content: string (bullet points or main text, formatted with Markdown)
    - notes: string (speaker notes)
    - imagePrompt: string (a description of a visual to accompany this slide)
    
    SLIDE STRUCTURE:
    1. Title Slide
    2. Problem (Use Canvas data)
    3. Solution (Use Canvas data)
    4. Market Size (Use TAM/SAM/SOM from Market Research)
    5. Competition (Use Competitor Analysis)
    6. Business Model (Use Financial/Revenue data)
    7. Go-To-Market (Use Channels from Canvas)
    8. Traction/Roadmap
    9. Team (Placeholder)
    10. The Ask / Financial Projections

    IMPORTANT: The response MUST be a raw JSON array. Do not wrap in markdown code blocks.
  `;

    try {
        const text = await callAI(prompt, settings, SYSTEM_INSTRUCTION, "application/json",
            settings.provider === 'google' ? {
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
            } : undefined
        );

        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText) as Slide[];
    } catch (error) {
        return [];
    }
};

export const analyzeRevenueModel = async (data: StartupData, settings: AISettings, useOllama: boolean = false, ollamaModelName?: string): Promise<string> => {
    try {
        // Call dedicated backend action that supports Ollama
        const result = await convex.action(api.ai.analyzeFinancialModel, {
            startupData: data,
            useOllama: useOllama,
            ollamaModelName: ollamaModelName
        });
        return result;
    } catch (error: any) {

        // Show toast for user-facing errors
        const displayMessage = error.message?.length < 200 ? error.message : "Analysis failed. Please try again.";
        toast.error(displayMessage);

        return "Analysis failed. Please check your configuration.";
    }
};

export const generateMarketResearch = async (data: StartupData, settings: AISettings, attachedFiles: { name: string, data: string, mimeType: string }[] = [], keywords: string[] = [], signal?: AbortSignal): Promise<{ report: string, tam: number, sam: number, som: number }> => {

    try {
        // Create a promise that rejects on abort
        const abortPromise = new Promise((_, reject) => {
            if (signal?.aborted) reject(new DOMException('Aborted', 'AbortError'));
            signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        });

        // Call Convex Backend Action with keywords
        const actionPromise = convex.action(api.ai.generateMarketResearch, {
            startupData: data,
            attachedFiles: attachedFiles,
            keywords: keywords,
            modelName: settings.modelName
        });

        // Race against the abort signal
        const result = await Promise.race([actionPromise, abortPromise]) as any;

        return result;

    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw error; // Propagate abort error
        }
        return {
            report: "Error generating report. Please check your configuration.",
            tam: 0,
            sam: 0,
            som: 0
        };
    }
};

export const generateCompetitorAnalysis = async (data: StartupData, settings: AISettings): Promise<CompetitorAnalysisData> => {
    try {
        // We are now delegating the heavy lifting to the Convex Action which will call the AI
        // The Convex Action needs to be updated to handle the new schema, but for now, 
        // let's assume the action returns the correct structure or we adapt it here.
        // However, since the user wants specific subtabs (General, Niche, Details), 
        // we should probably update the prompt logic. 
        // Since the actual AI call happens in `convex/ai.ts` (via `api.ai.generateCompetitorAnalysis`),
        // we should actually be updating THAT file. 
        // But wait, the previous code called `convex.action`. 
        // Let's check `convex/ai.ts` first.

        const result = await convex.action(api.ai.generateCompetitorAnalysis, {
            startupData: data,
            modelName: settings.modelName
        });
        return result;
    } catch (error) {
        return {
            attributes: ["Price", "Features"],
            competitors: [],
            analysisSummary: "Error generating analysis. Please try again.",
            subTabs: []
        };
    }
}

// Fill empty cells in existing competitors (for when AI times out or returns partial data)
export const fillEmptyCompetitorCells = async (
    data: StartupData,
    competitors: any[],
    attributes: string[],
    settings: AISettings
): Promise<{ competitors: any[], message: string }> => {
    try {
        const result = await convex.action(api.ai.fillEmptyCompetitorCells, {
            startupData: data,
            competitors: competitors,
            attributes: attributes,
            modelName: settings.modelName
        });
        return result;
    } catch (error) {
        return { competitors, message: "Error filling cells. Please try again." };
    }
}


export const analyzeCustomerFeedback = async (interview: CustomerInterview, settings: AISettings): Promise<{ sentiment: 'Positive' | 'Neutral' | 'Negative', aiAnalysis: string }> => {
    try {
        const result = await convex.action(api.ai.analyzeCustomerFeedback, {
            interview: interview,
            modelName: settings.modelName
        });
        return result;
    } catch (e) {
        return { sentiment: 'Neutral', aiAnalysis: 'Analysis failed.' };
    }
}

export const generateProjectReport = async (data: StartupData, settings: AISettings): Promise<string> => {
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

    return callAI(prompt, settings, "You are a Chief Strategy Officer writing a report for stakeholders.");
};

export const generateBusinessPlan = async (data: StartupData, settings: AISettings): Promise<string> => {
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
        6. Competitors: ${JSON.stringify(data.competitorAnalysis.competitors.map(c => c.name).join(', '))}
        
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

    return callAI(prompt, settings, "You are a senior business consultant and venture capitalist writing a formal business plan for potential investors.");
};

export const generateOKRProposal = async (data: StartupData, settings: AISettings): Promise<{ rationale: string, goals: Goal[] }> => {
    // Gather context from all modules
    const marketGap = data.market.tam === 0;
    const revenueGap = data.revenueModel.revenueStreams.length === 0;
    const canvasGap = Object.values(data.canvas).some(v => !v);

    // Find potential customers
    const potentialCustomers = data.customerInterviews.filter(c => c.customerStatus === 'Potential Fit');

    const prompt = `
        Generate a strategic OKR proposal for this startup for the next quarter.
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
        1. Analyze the startups current position and identify the most critical 3-5 objectives.
        2. Provide a brief "Rationale" explaining WHY these goals were chosen.
        3. Define the Objectives and Key Results.
        4. CRITICAL: Ensure each Objective is uniquely distinct from the others. Do NOT generate duplicate or highly similar objectives. Each Objective should focus on a completely different area of the business (e.g., Product, Marketing, Fundraising, Validation).
        
        Return RAW JSON object:
        {
            "rationale": "Brief explanation of the strategy...",
            "goals": [
                {
                    "title": "Objective Title",
                    "type": "Strategic",
                    "timeframe": "Quarterly",
                    "status": "Upcoming",
                    "keyResults": [
                        { "description": "Achieve 100 signups", "target": 100, "unit": "users" }
                    ]
                }
            ]
        }
    `;

    try {
        const text = await callAI(prompt, settings, "You are a product manager setting OKRs.", "application/json",
            settings.provider === 'google' ? {
                type: Type.OBJECT,
                properties: {
                    rationale: { type: Type.STRING },
                    goals: {
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
                    }
                },
                required: ['rationale', 'goals']
            } : undefined
        );


        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const response = JSON.parse(cleanText);

        // Add IDs and defaults
        const goals = response.goals.map((g: any) => ({
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
                unit: kr.unit,
                status: 'Not Started', // Default status
                updateType: 'automatic', // Default to auto
                metricSource: 'revenue' // Default suggestion
            }))
        }));

        return { rationale: response.rationale, goals };

    } catch (e) {
        return { rationale: "Failed to generate proposal.", goals: [] };
    }
};

export const generateStartupJourneyStory = async (data: StartupData, settings: AISettings): Promise<string> => {
    try {
        const result = await convex.action(api.ai.generateStartupJourneyStory, {
            startupData: data,
            modelName: settings.modelName
        });
        return result;
    } catch (error) {
        return "Failed to generate story.";
    }
};

export const generateIdeas = async (prompt: string): Promise<string[]> => {
    try {
        const text = await callAI(
            `Generate 5 creative brainstorming ideas or concepts as short, punchy sticky notes based on this prompt: "${prompt}". Return ONLY a JSON array of strings. Example: ["Idea 1", "Idea 2"]`,
            { provider: 'google', modelName: 'gemini-3-flash-preview', apiKey: '' }, // Default settings for ideation
            "You are a creative director and brainstorming expert."
        );
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (e) {
        return ["Error generating ideas", "Please try again"];
    }
}


// Schema for Canvas Actions (Structured Output)
const CanvasActionSchema = {
    type: "object",
    properties: {
        thought_process: { type: "string", description: "Brief reasoning for the chosen actions." },
        actions: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    action: { type: "string", enum: ["create", "update", "delete"] },
                    itemType: { type: "string", enum: ["note", "text", "shape", "image"] },
                    content: { type: "string" },
                    visuals: {
                        type: "object",
                        properties: {
                            color: { type: "string" },
                            shape: { type: "string" }
                        }
                    },
                    position: {
                        type: "object",
                        properties: {
                            x: { type: "number" },
                            y: { type: "number" }
                        }
                    },
                    targetId: { type: "string", description: "ID of the item to update or delete." }
                },
                required: ["action"]
            }
        }
    },
    required: ["actions", "thought_process"]
};

export interface CanvasAction {
    action: 'create' | 'update' | 'delete';
    itemType?: 'note' | 'text' | 'shape' | 'image';
    content?: string;
    visuals?: {
        color?: string;
        shape?: string;
    };
    position?: {
        x: number;
        y: number;
    };
    targetId?: string;
}

export const generateCanvasActions = async (prompt: string, currentContext: string): Promise<{ thought_process: string, actions: CanvasAction[] }> => {
    try {
        const fullPrompt = `
        You are an intelligent canvas assistant (Magic Maker).
        Your goal is to help the user organize thoughts, create content, or restructure the board.
        
        CURRENT CONTEXT:
        ${currentContext}

        USER REQUEST:
        "${prompt}"

        INSTRUCTIONS:
        1. Analyze the user's request and the current context.
        2. Decide on a sequence of actions (create new items, update existing ones, etc.).
        3. Return a tailored JSON object matching the schema.
        `;

        const responseText = await callAI(
            fullPrompt,
            { provider: 'google', modelName: 'gemini-3-flash-preview', apiKey: '' },
            "You are a helpful AI assistant that controls a whiteboard canvas.",
            undefined,
            CanvasActionSchema // Pass schema for structured output
        );


        // Parse the response (Ollama/Gemini should return valid JSON now, but safe parsing is good)
        // If the proxy returns a stringified JSON inside a code block, clean it (though callAI should handle this via Structured Config)
        let cleanText = responseText;
        if (cleanText.includes('```json')) {
            cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '');
        }

        return JSON.parse(cleanText);

    } catch (e) {
        return { thought_process: "Failed to generate actions.", actions: [] };
    }
}


export const chatWithAIAnalyst = async (
    data: StartupData,
    module: 'competitors' | 'revenue',
    history: { role: 'user' | 'assistant', content: string }[],
    userQuestion: string,
    settings: AISettings
): Promise<string> => {
    try {
        const result = await convex.action(api.ai.chatWithAIAnalyst, {
            startupData: data,
            module: module,
            history: history,
            userQuestion: userQuestion,
            modelName: settings.modelName
        });
        return result;
    } catch (error: any) {
        const displayMessage = error.message?.length < 200 ? error.message : "Chat failed. Please try again.";
        toast.error(displayMessage);
        throw error;
    }
};

export const generateBottomUpSizing = async (data: StartupData, settings: AISettings, signal?: AbortSignal): Promise<{ report: string, tam: number, sam: number, som: number, naicsCode?: string, traceLogs?: any[] }> => {
    try {
        // Create a promise that rejects on abort
        const abortPromise = new Promise((_, reject) => {
            if (signal?.aborted) reject(new DOMException('Aborted', 'AbortError'));
            signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        });

        // Call Convex Backend Action
        const actionPromise = convex.action(api.ai.generateBottomUpSizing, {
            data: data,
            model: settings.modelName
        });

        // Race against the abort signal
        const result = await Promise.race([actionPromise, abortPromise]) as any;

        return result;

    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw error; // Propagate abort error
        }
        return {
            report: "Error generating report. Please check your configuration.",
            tam: 0,
            sam: 0,
            som: 0
        };
    }
};

export const generateBusinessPlanContent = async (
    sectionTitle: string,
    canvasContext: string,
    specificInstruction?: string
): Promise<string> => {
    try {
        const instruction = specificInstruction
            ? specificInstruction
            : `Write content for the "${sectionTitle}" section of a business plan. NOT INSTRUCTION - JUST WRITE THE CONTENT FOR THE SECTION.`;

        const prompt = `
            You are a professional business consultant AI assistant. 
            
            TASK: ${instruction}
            
            CONTEXT (Business Model Canvas Data):
            ${canvasContext}
            
            FORMATTING RULES:
            - Return ONLY clean HTML suitable for Tiptap editor.
            - Use tags: <p>, <ul>, <li>, <strong>, <em>.
            - **CRITICAL**: If the content involves lists of data, personnel, pricing, or comparisons (like competitor analysis), you MUST use an HTML <table> with <thead> and <tbody>.
            - Do NOT use nested tables.
            - Do NOT use Markdown code blocks (\`\`\`html).
            - **TAGGING**: For every section header or key description you generate, prepend the HTML: <span data-type="mention" class="mention mention-ai" data-id="AI" data-label="AI">@AI</span> 
            - Example: <h3><span data-type="mention" class="mention mention-ai" data-id="AI" data-label="AI">@AI</span> Market Analysis</h3>
            - Tone: Professional, persuasive, and concise.
        `;

        const responseText = await callAI(
            prompt,
            { provider: 'google', modelName: 'gemini-3-flash-preview', apiKey: '' },
            "You are an expert startup consultant helping write a business plan."
        );

        // Clean up response if it contains markdown blocks
        let cleanText = responseText;
        if (cleanText.includes('```html')) {
            cleanText = cleanText.replace(/```html/g, '').replace(/```/g, '');
        } else if (cleanText.includes('```')) {
            cleanText = cleanText.replace(/```/g, '');
        }

        return cleanText.trim();

    } catch (e) {
        throw e;
    }
}

export const analyzeCustomerFit = async (
    data: StartupData,
    interviews: any[],
    settings: AISettings,
    customInstructions?: string
): Promise<string> => {
    const prompt = `
        Analyze the following customer interviews to determine Product-Market Fit based on the Lean Startup methodology.

        # STARTUP CONTEXT
        - **Business:** ${data.name}
        - **Value Proposition:** ${data.canvas[CanvasSection.UNIQUE_VALUE_PROPOSITION]}
        - **Problem Statement:** ${data.canvas[CanvasSection.PROBLEM]}
        - **Solution:** ${data.canvas[CanvasSection.SOLUTION]}
        - **Target Segments:** ${data.canvas[CanvasSection.CUSTOMER_SEGMENTS]}

        # INTERVIEW DATA (${interviews.length} interviews)
        ${interviews.map((iv, i) => `
        ## Interview ${i + 1}: ${iv.Name || 'Unknown'}
        - **Role:** ${iv.Role || 'N/A'}
        - **Organization:** ${iv.Organization || 'N/A'}
        - **Industry:** ${iv.Industry || 'N/A'}
        - **Status:** ${iv.Status || 'N/A'}
        - **Pain Points:** ${iv['Pain Points'] || 'None recorded'}
        - **Survey Feedback:** ${iv['Survey Feedback'] || 'None'}
        - **Full Notes & Q/A:**
        ${iv.Notes || 'No notes recorded'}
        `).join('\n---\n')}

        # ANALYSIS INSTRUCTIONS
        You MUST analyze the actual interview content — questions asked, answers given, pain points mentioned, and any insights in the notes. Do NOT just summarize metadata.

        Structure your output as professional Markdown with these sections:

        ## Executive Summary
        A 2-3 sentence fit verdict with an overall score (Strong Fit / Moderate Fit / Weak Fit / No Fit).

        ## Individual Customer Fit Scores
        For each customer, provide:
        - **Fit Rating** (🟢 Strong / 🟡 Moderate / 🔴 Weak)
        - Key evidence from their interview (quote or paraphrase specific answers)
        - Alignment/misalignment with the Value Proposition

        ## Cross-Reference Matrix
        A comparison across all interviews:
        - Common pain points validated
        - Recurring themes in responses
        - Conflicting signals
        - Willingness to pay signals

        ## Actionable Recommendations
        - Which customer segments to double down on
        - Suggested pivots or refinements to the Value Proposition
        - Follow-up questions to ask in the next round

        > Use blockquotes to cite specific interview excerpts that support your analysis.

        CRITICAL: Do NOT include any introductory text like "Okay, let's analyze..." or "Here's the analysis...". Start DIRECTLY with the first heading. Output ONLY the analysis content.

        Format the response in well-structured, professional Markdown.
    `;

    const instructions = customInstructions?.trim() 
        ? `You are a Lean Startup expert and Product Marketing consultant specializing in customer discovery analysis. The user has provided these strict override instructions for formatting or focus: ${customInstructions}` 
        : "You are a Lean Startup expert and Product Marketing consultant specializing in customer discovery analysis.";

    return callAI(prompt, settings, instructions);
};

export const generateInterviewQuestions = async (
    data: StartupData,
    targetRole: string,
    targetDomain: string,
    targetIndustry: string,
    settings: AISettings
): Promise<string> => {
    const prompt = `
        Generate a list of 7-10 customer discovery interview questions based on the Lean Startup methodology ("Get Out of the Building").
        
        Startup Name: ${data.name}
        Value Proposition: ${data.canvas[CanvasSection.UNIQUE_VALUE_PROPOSITION]}
        Problem to Validate: ${data.canvas[CanvasSection.PROBLEM]}

        TARGET CUSTOMER PROFILE:
        Role: ${targetRole || 'Not specified'}
        Domain: ${targetDomain || 'Not specified'}
        Industry: ${targetIndustry || 'Not specified'}

        INSTRUCTIONS:
        1. The goal of these questions is to VALIDATE THE PROBLEM, not pitch the solution.
        2. Focus on discovering the customer's current pain points, how they currently solve the problem, and what their day-to-day looks like.
        3. Avoid leading questions (e.g., "Would you use a product that...").
        4. Ask open-ended questions that encourage storytelling (e.g., "Tell me about the last time you tried to...").
        5. Structure the output into sections: Introduction/Context, Discovering the Problem, Current Solutions & Budgets, and Wrap-up.
        
        Format the response in professional Markdown.
    `;

    return callAI(prompt, settings, "You are a Customer Discovery expert and Lean Startup coach.");
};
