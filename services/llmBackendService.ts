
import { StartupData, AISettings, CompetitorAnalysisData, CustomerInterview, Slide, Goal } from "../types";

const LLM_BACKEND_URL = (import.meta as any).env?.VITE_LLM_BACKEND_URL || "http://localhost:8000";
const API_KEY = (import.meta as any).env?.VITE_LLM_API_KEY || "";

async function callBackend(endpoint: string, data: any) {
    const response = await fetch(`${LLM_BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': API_KEY
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`LLM Backend Error (${response.status}): ${errText}`);
    }

    return await response.json();
}

export const llmBackendService = {
    chat: async (content: string, history: any[], projectContext?: any, founderProfile?: any, modelName?: string) => {
        return await callBackend('/chat', {
            content,
            history,
            projectContext,
            founderProfile,
            modelName
        });
    },

    marketResearch: async (startupData: StartupData, attachedFiles: any[], keywords: string[], modelName?: string) => {
        return await callBackend('/market/research', {
            startupData,
            attachedFiles,
            keywords,
            modelName
        });
    },

    competitorAnalysis: async (startupData: StartupData, modelName?: string, competitorCount?: number) => {
        return await callBackend('/competitors/analysis', {
            startupData,
            modelName,
            competitorCount
        });
    },

    generateDeck: async (startupData: StartupData, modelName?: string) => {
        return await callBackend('/deck/generate', {
            startupData,
            modelName
        });
    },

    canvasSuggest: async (section: string, startupName: string, hypothesis: string, canvasContext: string, modelName?: string) => {
        return await callBackend('/canvas/suggest', {
            section,
            startupName,
            hypothesis,
            canvasContext,
            modelName
        });
    },

    generateOKRs: async (startupData: StartupData, modelName?: string) => {
        return await callBackend('/okrs/generate', {
            startupData,
            modelName
        });
    },

    analyzeFinancials: async (startupData: StartupData, modelName?: string, useOllama: boolean = false) => {
        return await callBackend('/financial/analyze', {
            startupData,
            modelName,
            useOllama
        });
    },

    analyzeCustomerFeedback: async (interview: CustomerInterview, modelName?: string) => {
        return await callBackend('/customer/analyze', {
            interview,
            modelName
        });
    },

    generateJourneyStory: async (startupData: StartupData, modelName?: string) => {
        return await callBackend('/journey/story', {
            startupData,
            modelName
        });
    }
};
