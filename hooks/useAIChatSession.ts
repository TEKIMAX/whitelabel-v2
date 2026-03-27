import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { useAISendMessage } from "./useAI";
import { useCreateChat } from "./useCreate";

export type ChatChannel = "adaptive" | "calculator" | "roadmap";

interface UseAIChatSessionOptions {
    /** Channel scoping: 'adaptive' | 'calculator' | 'roadmap' */
    channel: ChatChannel;
    /** Project ID for scoping chats */
    projectId: string | null;
    /** localStorage key prefix for persisting active chat */
    storagePrefix: string;
}

interface SendOptions {
    thinkingEnabled?: boolean;
    agentId?: Id<"ai_agents">;
    modelName?: string;
}

/**
 * Shared hook: Manages AI chat session lifecycle.
 * Handles chat creation, message sending, deletion, history, and localStorage persistence.
 *
 * Used by: ChatApp (Adaptive), CalculatorChat (Financial), RoadmapAIAssistant (Objectives)
 */
export function useAIChatSession({ channel, projectId, storagePrefix }: UseAIChatSessionOptions) {
    // --- Active Chat ID (persisted to localStorage) ---
    const [activeChatId, setActiveChatId] = useState<Id<"chats"> | null>(() => {
        const key = `${storagePrefix}${projectId || "default"}`;
        const saved = localStorage.getItem(key);
        return saved ? (saved as Id<"chats">) : null;
    });

    const [isLoading, setIsLoading] = useState(false);

    // Persist activeChatId
    useEffect(() => {
        const key = `${storagePrefix}${projectId || "default"}`;
        if (activeChatId) {
            localStorage.setItem(key, activeChatId);
        } else {
            localStorage.removeItem(key);
        }
    }, [activeChatId, projectId, storagePrefix]);

    // --- Convex Hooks ---
    const createChat = useCreateChat();
    const sendMessageAction = useAISendMessage();
    const deleteChatMutation = useMutation(api.aiChat.deleteChat);

    // --- Chat History ---
    const chatHistory = useQuery(
        api.aiChat.listChats,
        projectId
            ? { projectId, channel }
            : { channel }
    );

    // Auto-load latest chat if no saved activeChatId
    useEffect(() => {
        if (!activeChatId && chatHistory && chatHistory.length > 0) {
            setActiveChatId(chatHistory[0]._id);
        }
    }, [chatHistory, activeChatId]);

    // --- Send Message ---
    const handleSend = useCallback(
        async (text: string, pageContext: string, options?: SendOptions) => {
            if (!text.trim() || isLoading) return;
            try {
                setIsLoading(true);
                let chatId = activeChatId;

                if (!chatId) {
                    chatId = await createChat({
                        projectId: projectId ? (projectId as unknown as string) : undefined,
                        title: text.substring(0, 100),
                        channel,
                    });
                    setActiveChatId(chatId);
                }

                await sendMessageAction({
                    chatId: chatId!,
                    content: text,
                    pageContext,
                    projectId: projectId ? (projectId as unknown as string) : undefined,
                    thinkingEnabled: options?.thinkingEnabled ?? true,
                    agentId: options?.agentId,
                    modelName: options?.modelName,
                });

                return chatId;
            } finally {
                setIsLoading(false);
            }
        },
        [isLoading, activeChatId, createChat, projectId, channel, sendMessageAction]
    );

    // --- New Session ---
    const handleNewSession = useCallback(
        async (title?: string) => {
            try {
                const chatId = await createChat({
                    projectId: projectId ? (projectId as unknown as string) : undefined,
                    title: title || "New Session",
                    channel,
                });
                setActiveChatId(chatId);
                return chatId;
            } catch (e) {
                console.error(`[${channel}] New session error:`, e);
                return null;
            }
        },
        [createChat, projectId, channel]
    );

    // --- Delete Session ---
    const handleDeleteChat = useCallback(
        async (chatId: Id<"chats">) => {
            try {
                await deleteChatMutation({ chatId });
                if (activeChatId === chatId) {
                    setActiveChatId(null);
                }
            } catch (e) {
                console.error(`[${channel}] Delete error:`, e);
            }
        },
        [deleteChatMutation, activeChatId, channel]
    );

    return {
        activeChatId,
        setActiveChatId,
        isLoading,
        chatHistory,
        handleSend,
        handleNewSession,
        handleDeleteChat,
    };
}
