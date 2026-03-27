import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Message } from "../types";

/**
 * Shared hook: Converts Convex messages → UI Message[] format.
 * Handles thinking tag extraction, grounding metadata, tool results, and streaming status.
 *
 * Used by: ChatApp (Adaptive), CalculatorChat (Financial), RoadmapAIAssistant (Objectives)
 */
export function useAIChatMessages(chatId: Id<"chats"> | null) {
    const rawMessages = useQuery(
        api.aiChat.getRecentMessages,
        chatId ? { chatId } : "skip"
    );

    const messages: Message[] = (rawMessages || []).map((m) => {
        let content = m.content || "";
        let reasoning = m.reasoning;

        // Extract <thinking> tags from content into reasoning field
        const thinkingMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/);
        if (thinkingMatch) {
            const thinkingContent = thinkingMatch[1].trim();
            reasoning = reasoning ? `${reasoning}\n\n${thinkingContent}` : thinkingContent;
            content = content.replace(/<thinking>[\s\S]*?<\/thinking>/, "").trim();
        }

        // Strip machine-readable HTML comment markers (e.g. <!-- GOAL_JSON {...} -->)
        // These are parsed separately by components like GoalActionCard
        content = content.replace(/<!--\s*GOAL_JSON\s*\{[^]*?\}\s*-->/g, "").trim();

        const isStreaming = m.status === "streaming";

        // Parse grounding metadata → groundingSources
        let groundingSources: { title: string; uri: string }[] | undefined;
        if (m.groundingMetadata) {
            try {
                const parsed = JSON.parse(m.groundingMetadata);

                // Try nested groundingChunks (standard Gemini format)
                if (parsed.groundingChunks) {
                    groundingSources = parsed.groundingChunks.map((c: any) => ({
                        title: c.web?.title || "Source",
                        uri: c.web?.uri || "#",
                    }));
                }

                // Try direct array format (legacy)
                if (!groundingSources && Array.isArray(parsed)) {
                    groundingSources = parsed.map((c: any) => ({
                        title: c.title || c.web?.title || "Source",
                        uri: c.uri || c.web?.uri || "#",
                    }));
                }
            } catch { /* ignore parse errors */ }
        }

        return {
            id: m._id,
            role: m.role as "user" | "assistant",
            content,
            reasoning,
            timestamp: new Date(m.createdAt),
            isStreaming,
            toolResults: m.toolResults ? JSON.parse(m.toolResults) : undefined,
            groundingSources,
        };
    });

    const isStreaming = messages.some((m) => m.isStreaming);
    const isLoadingMessages = rawMessages === undefined;

    return { messages, isStreaming, isLoadingMessages, rawMessages };
}
