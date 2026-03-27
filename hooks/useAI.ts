import { useAction, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

/**
 * Centralized AI Hooks
 * 
 * This file contains wrappers for AI-related actions.
 * Grouping them here helps identify all AI capabilities and ensures consistent usage.
 */

// General Chat & Explanation
export const useAIChat = () => useAction(api.ai.chat);
export const useAISendMessage = () => useMutation(api.aiChatWorkflow.startChat);
export const useAIExplainScenario = () => useAction(api.ai.explainScenario);
export const useAIExplainAdaptiveStatus = () => useAction(api.ai.explainAdaptiveStatus);

// Document & Content Interaction
export const useAIFixDocumentGrammar = () => useAction(api.ai.fixDocumentGrammar);
export const useAIDocumentChat = () => useAction(api.ai.documentAIChat);
export const useAIGenerateCooperationReport = () => useAction(api.ai.generateCooperationReport);

// Pricing
export const useAIGetModelPricing = () => useAction(api.ai.getModelPricing);

// Voice
export const useAIProcessAudioQuestion = () => useAction(api.voice.processAudioQuestion);
