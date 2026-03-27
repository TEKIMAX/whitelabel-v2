
import React, { useState, useCallback, useRef, useEffect } from 'react';
import ChatInput from './components/ChatInput';
import MessageList from './components/MessageList';
import { SaveToFilesDialog } from './SaveToFilesDialog';
import { PageType, Message, ToolResult, GroundingSource, StartupData, ViewState } from '../../types';
import { Plus, MessageSquare, History, X, Trash2, Zap, ArrowRight, Wrench, Bot, ChevronDown, UserCog, Settings, Cpu } from 'lucide-react';
import Toast, { ToastType } from './components/Toast';
import ToolsSheet, { TOOL_REGISTRY, getEnabledTools, ToolMeta } from './components/ToolsSheet';
import { DeleteConfirmationDialog } from '../DeleteConfirmationDialog';

import TabNavigation from '../TabNavigation';
import ProjectSelector from '../ProjectSelector';
import { Logo } from '../Logo';
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAIChatMessages } from "../../hooks/useAIChatMessages";
import { useAIChatSession } from "../../hooks/useAIChatSession";
import { useCreateDocument, useTrackFeedback, useGenerateUploadUrl, useSaveFile } from "../../hooks/useCreate";
import { useUpdateChatTitle } from "../../hooks/useUpdate";
import { Id } from "../../convex/_generated/dataModel";
import { marked } from 'marked';
import { ModelSelector } from './components/ModelSelector';
import ChatHome from './ChatHome';

interface ChatAppProps {
  onNavigate: (view: any) => void;
  currentView: any;
  allProjects: any[];
  currentProjectId: string | null;
  onSwitchProject: (id: string) => void;
  onNewProject: () => void;
  allowedPages?: any[];
  orgId?: string;
  userId?: string;
}

const ChatApp: React.FC<ChatAppProps> = ({ onNavigate, currentView, allProjects, currentProjectId, onSwitchProject, onNewProject, allowedPages, orgId, userId }) => {
  const [activePage, setActivePage] = useState<PageType>(() => {
    return Object.values(PageType).includes(currentView as PageType)
      ? currentView as PageType
      : PageType.BUSINESS_PLAN;
  });

  const [showIntro, setShowIntro] = useState(() => {
    return localStorage.getItem('chat_show_intro') !== 'false';
  });

  const [thinkingMode, setThinkingMode] = useState<string>(() => {
    return localStorage.getItem('chat_thinking_mode') || 'low';
  });

  useEffect(() => {
    localStorage.setItem('chat_show_intro', showIntro.toString());
  }, [showIntro]);

  useEffect(() => {
    localStorage.setItem('chat_thinking_mode', thinkingMode);
  }, [thinkingMode]);

  // Agent State
  const [activeAgentId, setActiveAgentId] = useState<string | null>(() => {
    return localStorage.getItem('chat_active_agent') || null;
  });

  useEffect(() => {
    if (activeAgentId) {
      localStorage.setItem('chat_active_agent', activeAgentId);
    } else {
      localStorage.removeItem('chat_active_agent');
    }
  }, [activeAgentId]);

  const [activeModelId, setActiveModelId] = useState<string | null>(() => {
    return localStorage.getItem('activeAIModel') || null;
  });

  useEffect(() => {
    if (activeModelId) {
      localStorage.setItem('activeAIModel', activeModelId);
    }
  }, [activeModelId]);

  const modelConfig = useQuery(api.model_config.getModelConfig);
  const availableModels = modelConfig?.selectedModels || [];

  // Auto-select first model if nothing is persisted
  useEffect(() => {
    if (!activeModelId && availableModels.length > 0) {
      const defaultModel = availableModels.find((m: any) => m.isDefault);
      const fallback = defaultModel?.modelId || availableModels[0]?.modelId;
      if (fallback) setActiveModelId(fallback);
    }
  }, [availableModels, activeModelId]);

  const customAgents = useQuery(
    api.aiAgents.listAgents,
    currentProjectId
      ? { projectId: currentProjectId as Id<"projects"> }
      : "skip"
  );

  const getCapabilities = useAction(api.ollamaService.getCapabilities);
  const [modelCapabilities, setModelCapabilities] = useState<string[]>(['tools', 'vision', 'completion']);

  useEffect(() => {
    const modelToQuery = activeAgentId 
      ? customAgents?.find(a => a._id === activeAgentId)?.modelName 
      : activeModelId;

    if (modelToQuery) {
      getCapabilities({ modelName: modelToQuery })
        .then(caps => setModelCapabilities(caps))
        .catch(e => console.error(e));
    } else {
      setModelCapabilities(['tools', 'vision', 'completion']);
    }
  }, [activeModelId, activeAgentId, customAgents, getCapabilities]);

  const customIntegrations = useQuery(api.apiIntegrations.listIntegrations, orgId ? { orgId } : "skip");

  const customTools = React.useMemo<ToolMeta[]>(() => {
    if (!customIntegrations) return [];
    return customIntegrations.map(api => ({
      id: `custom_api_${api._id}`,
      label: api.name,
      description: api.description || `Custom endpoint: ${api.endpoint}`,
      icon: Cpu,
      category: 'integrations' as const,
    }));
  }, [customIntegrations]);

  // Tool Management State
  const [isToolsSheetOpen, setIsToolsSheetOpen] = useState(false);
  const [enabledTools, setEnabledTools] = useState<Set<string>>(() => getEnabledTools());

  // Auto-enable newly discovered Custom APIs
  useEffect(() => {
    if (customTools.length > 0) {
      setEnabledTools(prev => {
        let changed = false;
        const next = new Set(prev);
        
        let knownTools = new Set<string>();
        try {
          const stored = localStorage.getItem('known_custom_tools_v1');
          if (stored) knownTools = new Set(JSON.parse(stored));
        } catch {}

        customTools.forEach(tool => {
          if (!knownTools.has(tool.id)) {
            next.add(tool.id);
            knownTools.add(tool.id);
            changed = true;
          }
        });

        if (changed) {
          localStorage.setItem('known_custom_tools_v1', JSON.stringify(Array.from(knownTools)));
          localStorage.setItem('adaptive_engine_enabled_tools', JSON.stringify(Array.from(next)));
          return next;
        }
        return prev;
      });
    }
  }, [customTools]);

  const handleToggleTool = useCallback((toolId: string) => {
    setEnabledTools(prev => {
      const next = new Set(prev);
      if (next.has(toolId)) next.delete(toolId);
      else next.add(toolId);
      localStorage.setItem('adaptive_engine_enabled_tools', JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const handleToggleAllTools = useCallback((enabled: boolean) => {
    const allIds = [...TOOL_REGISTRY, ...customTools].map(t => t.id);
    const next = enabled ? new Set(allIds) : new Set<string>();
    setEnabledTools(next);
    localStorage.setItem('adaptive_engine_enabled_tools', JSON.stringify(Array.from(next)));
  }, [customTools]);

  // Convex Hooks
  const chats = useQuery(api.aiChat.listChats, { projectId: currentProjectId ? currentProjectId as Id<"projects"> : undefined, channel: 'adaptive' });
  const updateChatTitle = useUpdateChatTitle();
  const trackFeedback = useTrackFeedback();
  const generateUploadUrl = useGenerateUploadUrl();
  const createDocument = useCreateDocument();

  // --- Shared Hooks ---
  const {
    activeChatId, setActiveChatId, isLoading,
    handleSend: sendMessage, handleNewSession, handleDeleteChat: deleteSession,
  } = useAIChatSession({
    channel: 'adaptive',
    projectId: currentProjectId,
    storagePrefix: 'chat_active_id_',
  });

  const { messages, isStreaming, isLoadingMessages } = useAIChatMessages(activeChatId);

  const [toast, setToast] = useState<{ message: string, type: ToastType, isVisible: boolean }>({ message: '', type: 'info', isVisible: false });
  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type, isVisible: true });
  };

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleNewChat = useCallback(async () => {
    try {
      const chatId = await handleNewSession('New Conversation');
      setIsHistoryOpen(false);
    } catch (e) {
    }
  }, [handleNewSession]);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<{ id: Id<"chats">, title: string } | null>(null);

  const [isLimitDialogOpen, setIsLimitDialogOpen] = useState(false);
  const [limitDialogData, setLimitDialogData] = useState<{ message: string, isPro: boolean, limitType: string } | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, chat: { _id: Id<"chats">, title: string }) => {
    e.stopPropagation();
    setChatToDelete({ id: chat._id, title: chat.title });
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!chatToDelete) return;

    try {
      await deleteSession(chatToDelete.id);
      showToast("Chat deleted successfully", 'success');
    } catch (error) {
      showToast("Failed to delete chat", 'error');
    } finally {
      setIsDeleteDialogOpen(false);
      setChatToDelete(null);
    }
  };

  // If streaming, we might want to optimistically show "thinking" or handle partials.
  // Convex query updates automatically, so "streaming" text will appear chunk by chunk as DB updates!
  // We just need to handle the "Pending" state if we want better UX.

  // Save Dialog State
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [contentToSave, setContentToSave] = useState<{ content: string, type: 'doc' | 'image' | 'file', metadata?: any } | null>(null);

  const saveFile = useSaveFile();

  const handleSaveRequest = (content: string, type: 'doc' | 'image' | 'file' = 'doc', metadata?: any) => {
    setContentToSave({ content, type, metadata });
    setIsSaveOpen(true);
  };

  const handleSaveFile = async (folderId: string | null, filename: string) => {
    if (!currentProjectId || !contentToSave) return;

    // Prepare tags if present
    let tags: { name: string, color: string }[] | undefined = undefined;
    if (contentToSave.metadata?.tags && Array.isArray(contentToSave.metadata.tags)) {
      tags = contentToSave.metadata.tags.map((t: string) => ({
        name: t,
        color: t === 'AI Assisted' ? '#C5A059' : '#888888' // Nobel Gold for AI
      }));
    }

    try {
      if (contentToSave.type === 'image') {
        // 1. Fetch the image blob
        // Note: We might need a proxy or backend action if CORS blocks this.
        // Pollinations usually allows CORS.
        const response = await fetch(contentToSave.content);
        if (!response.ok) throw new Error("Failed to download image");

        const blob = await response.blob();

        // Ensure filename ends with .png
        let finalFilename = filename;
        if (!finalFilename.toLowerCase().endsWith('.png')) {
          finalFilename += '.png';
        }

        // 2. Generate Upload URL
        const postUrl = await generateUploadUrl();

        // 3. Upload to Convex Storage
        // Explicitly set type to image/png for consistency
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": "image/png" },
          body: blob,
        });

        if (!result.ok) throw new Error("Failed to upload image to storage");

        const { storageId } = await result.json();

        // 4. Create File Record
        await saveFile({
          projectId: currentProjectId, // passed as string in files.ts
          folderId: folderId ? folderId as Id<"folders"> : undefined,
          name: finalFilename,
          type: 'image/png', // Correct MIME type for previewer
          storageId: storageId as Id<"_storage">,
          size: blob.size,
          tags: tags
        });

      } else {
        // Default Text Document
        // Ensure filename ends with .md for text documents
        let finalFilename = filename;
        if (!finalFilename.toLowerCase().endsWith('.md')) {
          finalFilename += '.md';
        }

        // Tiptap Compatibility: Convert Markdown to HTML so editor initializes with formatting
        const htmlContent = await marked.parse(contentToSave.content);

        await createDocument({
          projectId: currentProjectId as Id<"projects">,
          folderId: folderId ? folderId as Id<"folders"> : undefined,
          title: finalFilename,
          content: htmlContent, // Save as HTML
          type: contentToSave.type === 'doc' ? 'doc' : 'file',
          tags: tags
        });
      }
      showToast(`Saved to ${folderId ? 'folder' : 'Documents'} successfully!`, 'success');
    } catch (e) {
      showToast("Failed to save file. Please try again.", 'error');
    }
  };

  const handleFeedback = async (messageId: string, rating: number) => {
    if (!currentProjectId || !activeChatId) return;
    try {
      await trackFeedback({
        userId: userId || "unknown_user",
        orgId: orgId || "unknown_org",
        projectId: currentProjectId,
        targetType: "message",
        targetId: messageId,
        rating,
      });
      showToast("Feedback submitted", 'success');
    } catch (e) {
    }
  };

  const handleSendMessage = useCallback(async (text: string, files?: File[]) => {
    try {
      // Smart Context Switching (Auto-Detection)
      let contextToUse = activePage;
      const lowerText = text.toLowerCase();

      const contextKeywords: Record<string, PageType> = {
        'customer': PageType.CUSTOMERS,
        'interview': PageType.CUSTOMERS,
        'persona': PageType.CUSTOMERS,
        'market': PageType.MARKET_RESEARCH,
        'competitor': PageType.COMPETITOR_ANALYSIS,
        'competition': PageType.COMPETITOR_ANALYSIS,
        'business plan': PageType.BUSINESS_PLAN,
        'executive summary': PageType.BUSINESS_PLAN,
        'financial': PageType.REVENUE,
        'revenue': PageType.REVENUE,
        'cost': PageType.REVENUE,
        'pricing': PageType.REVENUE,
        'pitch deck': PageType.PITCH_DECK,
        'slide': PageType.PITCH_DECK,
        'journey': PageType.JOURNEY,
        'milestone': PageType.JOURNEY,
      };

      for (const [keyword, pageType] of Object.entries(contextKeywords)) {
        if (lowerText.includes(keyword)) {
          if (contextToUse !== pageType) {
            contextToUse = pageType;
            setActivePage(pageType);
          }
          break;
        }
      }

      // Build pageContext, including enabled tools info
      const enabledToolNames = Array.from(enabledTools);
      const totalAvailableLength = TOOL_REGISTRY.length + customTools.length;
      const toolContextSuffix = enabledToolNames.length < totalAvailableLength
        ? `\n\n[ENABLED TOOLS]\nYou may ONLY use the following tools: ${enabledToolNames.join(', ')}. Do NOT use any tools not in this list.`
        : '';

      const selectedAgentModel = activeAgentId ? customAgents?.find(a => a._id === activeAgentId)?.modelName : undefined;
      // Use activeModelId if no agent is selected
      const finalModelName = selectedAgentModel || activeModelId || undefined;
      const pageContext = contextToUse + toolContextSuffix;

      const chatId = await sendMessage(text, pageContext, {
        thinkingEnabled: thinkingMode !== 'off',
        agentId: activeAgentId ? activeAgentId as Id<"ai_agents"> : undefined,
        modelName: finalModelName,
      });

      // Dynamic Title Update
      if (chatId) {
        const currentChat = chats?.find(c => c._id === chatId);
        if (currentChat && currentChat.title === "New Conversation") {
          updateChatTitle({
            chatId: chatId,
            title: text.substring(0, 100)
          });
        }
      }

    } catch (error: any) {
      let errorMsg = error.message || "";
      if (errorMsg.includes("LIMIT_EXCEEDED")) {
        try {
          const jsonStart = errorMsg.indexOf('{');
          const jsonEnd = errorMsg.lastIndexOf('}') + 1;
          if (jsonStart >= 0 && jsonEnd > jsonStart) {
            const limitData = JSON.parse(errorMsg.substring(jsonStart, jsonEnd));
            setLimitDialogData(limitData);
            setIsLimitDialogOpen(true);
            return;
          }
        } catch (e) {
        }
      }
      showToast("Failed to send message. Please try again.", 'error');
    }
  }, [activeChatId, sendMessage, activePage, currentProjectId, chats, updateChatTitle, enabledTools, activeAgentId, customAgents, thinkingMode]);

  if (showIntro) {
    return (
      <ChatHome
        onStartChat={() => {
          setShowIntro(false);
          if (!activeChatId && (!chats || chats.length === 0)) {
            handleNewChat();
          }
        }}
        allProjects={allProjects}
        currentProjectId={currentProjectId}
        onSwitchProject={onSwitchProject}
        onNewProject={onNewProject}
        currentView={currentView}
        onNavigate={onNavigate}
        allowedPages={allowedPages}
      />
    );
  }

  const isInitialState = messages.length === 0 && !isLoadingMessages;

  return (
    <div className="h-screen flex flex-col text-stone-900 bg-[#F9F8F4] relative overflow-hidden">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
      {/* Header */}
      <header className="px-6 py-3 bg-white/80 backdrop-blur-sm sticky top-0 z-50 flex items-center justify-between border-b border-stone-200 shrink-0">
        <div className="flex items-center gap-4">
          <Logo imageClassName="h-8 w-auto" />
          <div className="h-6 w-px bg-stone-200" />
          <TabNavigation
            currentView={currentView}
            onNavigate={onNavigate}
            allowedPages={allowedPages}
          />
        </div>

        <div className="flex items-center gap-3">

          <ModelSelector 
            availableModels={availableModels}
            activeModelId={activeModelId}
            onModelChange={setActiveModelId}
            customAgents={customAgents || []}
            activeAgentId={activeAgentId}
            onAgentChange={setActiveAgentId}
          />

          {/* Tools Button — Black */}
          <button
            onClick={() => setIsToolsSheetOpen(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm transition-all ${
              modelCapabilities.includes('tools')
                ? 'bg-stone-900 text-white hover:bg-stone-800'
                : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
            }`}
            title={modelCapabilities.includes('tools') ? "Manage AI Tools" : "Current model does not support tools"}
          >
            <Wrench size={15} />
            <span className="hidden sm:inline">Tools</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
              modelCapabilities.includes('tools') ? 'bg-white/20 text-white/80' : 'bg-red-200 text-red-800'
            }`}>
              {modelCapabilities.includes('tools') ? `${enabledTools.size}/${TOOL_REGISTRY.length + customTools.length}` : 'Off'}
            </span>
          </button>

          {/* History Button */}
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="p-2 bg-nobel-gold text-white hover:brightness-90 rounded-lg transition-all shadow-sm flex items-center justify-center"
            title="Chat History"
          >
            <History size={18} />
          </button>

          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 hover:text-stone-900 text-sm font-medium shadow-sm transition-all"
          >
            <Plus size={16} /> New Chat
          </button>
        </div>
      </header>

      {/* History Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-80 bg-white border-r border-stone-200 transform transition-transform duration-300 ease-in-out z-40 ${isHistoryOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl`}>
        <div className="flex items-center justify-between p-4 border-b border-stone-100">
          <h2 className="font-serif text-lg font-bold text-stone-900">History</h2>
          <button onClick={() => setIsHistoryOpen(false)} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100vh-60px)]">
          <button
            onClick={handleNewChat}
            className="w-full mb-6 flex items-center gap-3 px-4 py-3 bg-stone-900 text-white rounded-xl hover:bg-nobel-gold transition-colors shadow-lg"
          >
            <Plus size={18} /> <span className="font-medium">New Chat</span>
          </button>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2 px-2">Recent</p>
            {chats?.map((chat) => (
              <div
                key={chat._id}
                onClick={() => { setActiveChatId(chat._id); setIsHistoryOpen(false); }}
                className={`group px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${activeChatId === chat._id ? 'bg-nobel-gold/10 text-nobel-dark' : 'text-stone-600 hover:bg-stone-100'}`}
              >
                <div className="flex items-center gap-3 overflow-hidden w-full">
                  <MessageSquare size={16} className={`flex-shrink-0 ${activeChatId === chat._id ? 'text-nobel-gold' : 'text-stone-400 group-hover:text-stone-600'}`} />
                  <span className="text-sm font-medium line-clamp-2 leading-tight break-words" title={chat.title}>{chat.title || "Untitled Conversation"}</span>
                </div>

                <button
                  onClick={(e) => handleDeleteClick(e, { _id: chat._id, title: chat.title })}
                  className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all font-sans"
                  title="Delete Chat"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {(!chats || chats.length === 0) && (
              <div className="text-center py-8 text-stone-400 text-sm italic">
                No history yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay to close sidebar */}
      {
        isHistoryOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-30 transition-opacity backdrop-blur-[1px]"
            onClick={() => setIsHistoryOpen(false)}
          />
        )
      }

      {/* Tools Sheet */}
      <ToolsSheet
        isOpen={isToolsSheetOpen}
        onClose={() => setIsToolsSheetOpen(false)}
        enabledTools={enabledTools}
        onToggleTool={handleToggleTool}
        onToggleAll={handleToggleAllTools}
        customTools={customTools}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Conversation"
        description="Are you sure you want to delete this conversation? All messages and context will be permanently removed."
        itemTitle={chatToDelete?.title || "Untitled Conversation"}
      />

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header removed as requested */}

        <MessageList
          messages={messages}
          onSave={handleSaveRequest}
          onSendMessage={handleSendMessage}
          onNavigate={onNavigate}
          projectId={currentProjectId}
          onFeedback={handleFeedback}
          onLoadMore={undefined}
          status={isLoadingMessages ? "LoadingFirstPage" as const : "Exhausted" as const}
          thinkingEnabled={thinkingMode !== 'off'}
          isLoading={isLoading}
        />

        {currentProjectId && (
          <SaveToFilesDialog
            isOpen={isSaveOpen}
            onClose={() => setIsSaveOpen(false)}
            projectId={currentProjectId}
            onSave={handleSaveFile}
            title="Save to Documents"
          />
        )}

        {/* Limit Exceeded Dialog */}
        {isLimitDialogOpen && limitDialogData && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative border border-nobel-gold/20">
              <div className="flex items-center gap-4 mb-4 text-nobel-gold">
                <div className="bg-nobel-gold/10 p-3 rounded-full">
                  <Zap size={24} className="text-nobel-gold" />
                </div>
                <h3 className="text-xl font-bold text-stone-900">Usage Limit Reached</h3>
              </div>
              <p className="text-stone-600 mb-6 leading-relaxed">
                {limitDialogData.message}
              </p>
              <div className="bg-stone-50 p-4 rounded-xl mb-6 border border-stone-100">
                <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Recommendation</p>
                <p className="text-sm font-medium text-stone-800">
                  {limitDialogData.isPro
                    ? "You've hit the Pro limit. Build your custom token pack to continue scaling."
                    : "Unlock 4M+ tokens/month and priority processing by upgrading to Pro."}
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsLimitDialogOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-medium text-stone-500 hover:bg-stone-100 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setIsLimitDialogOpen(false);
                    onNavigate(PageType.SUBSCRIPTION);
                  }}
                  className="px-5 py-2.5 rounded-xl font-bold text-white bg-nobel-gold hover:bg-[#B3904D] shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  {limitDialogData.isPro ? 'Buy Tokens' : 'Upgrade Plan'} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-nobel-cream pt-12 px-4 shrink-0">
          <ChatInput
            onSend={handleSendMessage}
            isLoading={isLoading}
            activePage={activePage}
            onPageChange={setActivePage}
            thinkingMode={thinkingMode}
            onThinkingModeChange={setThinkingMode}
            customAgents={customAgents || []}
            activeAgentId={activeAgentId}
            onAgentChange={setActiveAgentId}
            availableModels={availableModels}
            activeModelId={activeModelId}
            onModelChange={setActiveModelId}
            modelCapabilities={modelCapabilities}
          />
          {/* Footer branding removed as requested */}
          <div className="pb-4"></div>
        </div>
      </main>
    </div>
  );
};

export default ChatApp;
