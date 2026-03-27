import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";

/**
 * Centralized AI Creation Hooks
 * 
 * This file contains wrappers for AI-related actions that generate content 
 * and save it directly to the database.
 * 
 * Grouping these here helps distinguish between general AI queries and 
 * actions that modify project state.
 */

// Daily Memo & Strategy
/** Generates a daily memo and saves it to the database */
export const useAIGenerateDailyMemo = () => useAction(api.ai.generateDailyMemo);
/** Generates a comprehensive strategy summary for the startup */
export const useAIGenerateStartupSummary = () => useAction(api.ai.generateStartupSummary);




