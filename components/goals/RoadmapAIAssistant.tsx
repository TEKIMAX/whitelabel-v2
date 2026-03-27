import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Goal, Message } from '../../types';
import {
    X, Send, Loader2, Sparkles, Target, TrendingUp, Calendar,
    MessageSquare, Clock, Plus, Trash2, History, BarChart3, Zap,
    ChevronDown, Lightbulb, AlertTriangle, CheckCircle2
} from 'lucide-react';
import MessageList from '../nobel_chat/components/MessageList';
import { Id } from '../../convex/_generated/dataModel';
import { useAIChatMessages } from '../../hooks/useAIChatMessages';
import { useAIChatSession } from '../../hooks/useAIChatSession';
import { useCreateGoal, useUpdateGoal, useCreateKeyResult } from '../../hooks/useCreate';
import { toast } from 'sonner';

// --- Goal JSON Parser ---
interface ParsedGoalSuggestion {
    title: string;
    quarter: string;
    type: string;
    status: string;
    description: string;
    keyResults: { description: string; target: number; unit: string }[];
}

const parseGoalSuggestions = (content: string): ParsedGoalSuggestion[] => {
    const regex = /<!-- GOAL_JSON\s+(\{[^]*?\})\s*-->/g;
    const goals: ParsedGoalSuggestion[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        try {
            const parsed = JSON.parse(match[1]);
            goals.push({
                title: parsed.title || 'Untitled Goal',
                quarter: parsed.quarter || 'Q1',
                type: parsed.type || 'Strategic',
                status: parsed.status || 'Upcoming',
                description: parsed.description || '',
                keyResults: parsed.keyResults || [],
            });
        } catch { }
    }
    return goals;
};

// --- Goal Action Card Component ---
const GoalActionCard: React.FC<{
    goal: ParsedGoalSuggestion;
    projectId: string | null;
    year: number;
}> = ({ goal, projectId, year }) => {
    const createGoal = useCreateGoal();
    const updateGoal = useUpdateGoal();
    const createKR = useCreateKeyResult();
    const [isAdding, setIsAdding] = useState(false);
    const [isAdded, setIsAdded] = useState(false);

    const quarterColors: Record<string, string> = {
        Q1: 'bg-blue-50 text-blue-700 border-blue-200',
        Q2: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        Q3: 'bg-amber-50 text-amber-700 border-amber-200',
        Q4: 'bg-purple-50 text-purple-700 border-purple-200',
    };

    const handleAdd = async () => {
        if (!projectId || isAdding || isAdded) return;
        setIsAdding(true);
        try {
            const goalId = await createGoal({
                projectId,
                title: goal.title,
                description: goal.description,
                type: goal.type,
                timeframe: 'Quarterly',
                status: goal.status || 'Upcoming',
            });

            // Set quarter and year
            if (goalId) {
                await updateGoal({
                    id: goalId as any,
                    updates: {
                        quarter: goal.quarter,
                        year: year,
                    }
                });

                // Add key results
                for (const kr of goal.keyResults) {
                    await createKR({
                        goalId: goalId as any,
                        description: kr.description,
                        target: kr.target,
                        current: 0,
                        unit: kr.unit || '%',
                    });
                }
            }

            setIsAdded(true);
            toast.success(`Added "${goal.title}" to ${goal.quarter} ${year}`);
        } catch (e: any) {
            toast.error('Failed to add goal: ' + (e.message || 'Unknown error'));
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className={`group relative rounded-xl border ${isAdded ? 'border-emerald-200 bg-emerald-50/30' : 'border-stone-200 bg-white'} p-3 transition-all hover:shadow-md`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${quarterColors[goal.quarter] || quarterColors.Q1}`}>
                            {goal.quarter}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-stone-100 text-stone-500 border border-stone-200">
                            {goal.type}
                        </span>
                    </div>
                    <h4 className="text-sm font-bold text-stone-900 leading-tight mb-1">{goal.title}</h4>
                    {goal.description && (
                        <p className="text-[11px] text-stone-500 leading-relaxed mb-2">{goal.description}</p>
                    )}
                    {goal.keyResults.length > 0 && (
                        <div className="space-y-1">
                            {goal.keyResults.map((kr, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-[10px] text-stone-400">
                                    <Target size={9} className="text-stone-300 shrink-0" />
                                    <span className="truncate">{kr.description}</span>
                                    <span className="text-stone-300 shrink-0">({kr.target} {kr.unit})</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    onClick={handleAdd}
                    disabled={isAdding || isAdded || !projectId}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${isAdded
                        ? 'bg-emerald-100 text-emerald-600 cursor-default'
                        : 'bg-stone-900 text-white hover:bg-stone-800 active:scale-95'
                        } disabled:opacity-50`}
                >
                    {isAdded ? (
                        <><CheckCircle2 size={11} /> Added</>
                    ) : isAdding ? (
                        <><Loader2 size={11} className="animate-spin" /> Adding...</>
                    ) : (
                        <><Plus size={11} /> Add</>
                    )}
                </button>
            </div>
        </div>
    );
};

interface RoadmapAIAssistantProps {
    isOpen: boolean;
    onClose: () => void;
    goals: Goal[];
    projectId: string | null;
    onAddGoal: (status?: string) => void;
    calculateProgress: (goal: Goal) => number;
}

const THINKING_OPTIONS = [
    { value: 'low', label: 'Quick', desc: 'Fast response' },
    { value: 'medium', label: 'Balanced', desc: 'Thoughtful' },
    { value: 'high', label: 'Deep', desc: 'Full analysis' },
];

const QUICK_PROMPTS = [
    {
        icon: Calendar,
        label: 'Plan Q1 objectives',
        prompt: 'Based on my current roadmap, suggest 3 strategic objectives for Q1 with measurable key results. Consider my existing goals and identify gaps.',
        color: 'from-blue-500/10 to-blue-600/10 text-blue-600 border-blue-200/50'
    },
    {
        icon: Target,
        label: 'Generate full-year plan',
        prompt: 'Create a comprehensive quarterly roadmap for the full year (Q1-Q4). For each quarter, suggest 2-3 strategic objectives with specific KRs. Make sure goals build on each other progressively.',
        color: 'from-emerald-500/10 to-emerald-600/10 text-emerald-600 border-emerald-200/50'
    },
    {
        icon: AlertTriangle,
        label: 'Analyze roadmap gaps',
        prompt: 'Analyze my current quarterly roadmap for gaps and risks. Which quarters are empty? Which goals are behind schedule? What areas of the business am I neglecting? Provide actionable recommendations.',
        color: 'from-amber-500/10 to-amber-600/10 text-amber-600 border-amber-200/50'
    },
    {
        icon: BarChart3,
        label: 'Suggest KRs for my goals',
        prompt: 'Review each of my existing goals and suggest 2-3 measurable key results for goals that have zero KRs. Make them specific, measurable, and time-bound.',
        color: 'from-purple-500/10 to-purple-600/10 text-purple-600 border-purple-200/50'
    },
    {
        icon: TrendingUp,
        label: 'Quarterly health check',
        prompt: 'Perform a health check on my current quarter\'s goals. Which are on track, at risk, or behind? What should I prioritize this week to stay on target?',
        color: 'from-rose-500/10 to-rose-600/10 text-rose-600 border-rose-200/50'
    },
    {
        icon: Zap,
        label: 'OKR best practices',
        prompt: 'Review my roadmap goals and key results against OKR best practices. Are my objectives ambitious enough? Are my key results measurable and specific? Suggest improvements.',
        color: 'from-teal-500/10 to-teal-600/10 text-teal-600 border-teal-200/50'
    },
];

// --- Suggested Goals Accordion ---
const SuggestedGoalsAccordion: React.FC<{
    suggestions: ParsedGoalSuggestion[];
    projectId: string | null;
    year: number;
}> = ({ suggestions, projectId, year }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="border-t border-stone-100 bg-stone-50/50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-100/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-amber-500/10">
                        <Sparkles size={10} className="text-amber-500" />
                    </div>
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                        Suggested Goals
                    </span>
                    <span className="text-[9px] font-bold text-stone-400 bg-stone-200/60 px-1.5 py-0.5 rounded-full">
                        {suggestions.length}
                    </span>
                </div>
                <ChevronDown
                    size={12}
                    className={`text-stone-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
            {isOpen && (
                <div className="px-4 pb-3 grid grid-cols-2 gap-2">
                    {suggestions.map((goal, i) => (
                        <GoalActionCard
                            key={`${goal.title}-${i}`}
                            goal={goal}
                            projectId={projectId}
                            year={year}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
export const RoadmapAIAssistant: React.FC<RoadmapAIAssistantProps> = ({
    isOpen,
    onClose,
    goals,
    projectId,
    onAddGoal,
    calculateProgress,
}) => {
    const currentYear = new Date().getFullYear();
    const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;

    // --- Shared Hooks ---
    const {
        activeChatId, setActiveChatId, isLoading, chatHistory,
        handleSend: sendMessage, handleNewSession, handleDeleteChat,
    } = useAIChatSession({
        channel: 'roadmap',
        projectId,
        storagePrefix: 'roadmap_ai_active_chat_',
    });

    const { messages, isStreaming, rawMessages } = useAIChatMessages(activeChatId);

    // --- Local UI State ---
    const [text, setText] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Thinking mode
    const [thinkingMode, setThinkingMode] = useState<string>(() => {
        return localStorage.getItem('roadmap_ai_thinking_mode') || 'high';
    });
    const [isThinkMenuOpen, setIsThinkMenuOpen] = useState(false);
    const thinkMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        localStorage.setItem('roadmap_ai_thinking_mode', thinkingMode);
    }, [thinkingMode]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (thinkMenuRef.current && !thinkMenuRef.current.contains(event.target as Node)) {
                setIsThinkMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentThinkOption = THINKING_OPTIONS.find(o => o.value === thinkingMode) || THINKING_OPTIONS[2];

    // Derive busy state
    const isBusy = isLoading || isStreaming;

    // --- Build Roadmap Context ---
    const buildPageContext = useCallback(() => {
        const activeGoals = goals.filter(g => !g.archived);
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

        let context = `You are the Strategic Roadmap AI Assistant for Adaptive Startup.
You have full context of the user's quarterly OKR roadmap and can help them:
1. CREATE new quarterly objectives and key results
2. ANALYZE their current roadmap for gaps and risks
3. SUGGEST improvements to existing goals
4. GENERATE strategic plans for upcoming quarters
5. PROVIDE best practices for OKR management

Current Year: ${currentYear}
Current Quarter: ${currentQuarter}

--- CURRENT ROADMAP STATE ---
Total Goals: ${activeGoals.length}
Overall Progress: ${activeGoals.length > 0 ? Math.round(activeGoals.reduce((acc, g) => acc + calculateProgress(g), 0) / activeGoals.length) : 0}%

`;

        quarters.forEach(q => {
            const quarterGoals = activeGoals.filter(g => g.quarter === q);
            context += `\n### ${q} ${currentYear} (${quarterGoals.length} goals)\n`;

            if (quarterGoals.length === 0) {
                context += `  ⚠ No objectives set for ${q}\n`;
            } else {
                quarterGoals.forEach(g => {
                    const progress = calculateProgress(g);
                    const health = g.health || (progress >= 70 ? 'on-track' : progress >= 40 ? 'at-risk' : 'behind');
                    const krCount = g.keyResults?.length || 0;
                    context += `  - [${g.type || 'Strategic'}] "${g.title}" | Progress: ${progress}% | Health: ${health} | Status: ${g.status} | ${krCount} KRs\n`;

                    if (g.keyResults && g.keyResults.length > 0) {
                        g.keyResults.forEach(kr => {
                            context += `    • KR: "${kr.description}" — ${kr.current}/${kr.target} ${kr.unit} (${Math.round((kr.current / kr.target) * 100)}%)\n`;
                        });
                    }
                });
            }
        });

        // Gap Analysis
        const emptyQuarters = quarters.filter(q => activeGoals.filter(g => g.quarter === q).length === 0);
        const behindGoals = activeGoals.filter(g => {
            const progress = calculateProgress(g);
            return progress < 40;
        });
        const noKRGoals = activeGoals.filter(g => !g.keyResults || g.keyResults.length === 0);

        if (emptyQuarters.length > 0 || behindGoals.length > 0 || noKRGoals.length > 0) {
            context += `\n--- GAP ANALYSIS ---\n`;
            if (emptyQuarters.length > 0) context += `Empty quarters: ${emptyQuarters.join(', ')}\n`;
            if (behindGoals.length > 0) context += `Behind-schedule goals: ${behindGoals.map(g => `"${g.title}"`).join(', ')}\n`;
            if (noKRGoals.length > 0) context += `Goals without KRs: ${noKRGoals.map(g => `"${g.title}"`).join(', ')}\n`;
        }

        context += `\n--- INSTRUCTIONS ---
When suggesting new goals, you MUST format EACH goal suggestion using BOTH:
1. A human-readable markdown block
2. A machine-readable JSON marker immediately after, wrapped in an HTML comment like this:

### Objective: [Goal Title]
- **Quarter**: Q1/Q2/Q3/Q4
- **Type**: Strategic / Revenue / Product / Team
- **Key Results**:
  - KR1: [description] (target: [number] [unit])
  - KR2: [description] (target: [number] [unit])

<!-- GOAL_JSON {"title":"Goal Title","quarter":"Q1","type":"Strategic","status":"Upcoming","description":"Brief description","keyResults":[{"description":"KR description","target":100,"unit":"%"}]} -->

CRITICAL: Always include the <!-- GOAL_JSON {...} --> marker after each goal suggestion. This enables the user to add goals directly from the chat.

Be specific, actionable, and tie recommendations to the user's existing roadmap context.
Use markdown formatting for clarity.`;

        return context;
    }, [goals, currentYear, currentQuarter, calculateProgress]);

    // --- Send Message ---
    const handleSend = useCallback(async () => {
        if (!text.trim() || isBusy) return;
        try {
            const pageContext = buildPageContext();
            await sendMessage(text, pageContext, {
                thinkingEnabled: thinkingMode !== 'off',
            });
            setText('');
        } catch (error: any) {
            console.error('[RoadmapAI] Send error:', error);
        }
    }, [text, isBusy, buildPageContext, sendMessage, thinkingMode]);

    // --- Quick Start ---
    const handleQuickStart = useCallback(async (prompt: string) => {
        setText(prompt);
        setTimeout(async () => {
            try {
                const pageContext = buildPageContext();
                await sendMessage(prompt, pageContext, {
                    thinkingEnabled: thinkingMode !== 'off',
                });
                setText('');
            } catch (error: any) {
                console.error('[RoadmapAI] Quick start error:', error);
            }
        }, 100);
    }, [buildPageContext, sendMessage, thinkingMode]);

    // --- New Session wrapper ---
    const handleNewSessionClick = useCallback(async () => {
        await handleNewSession('Roadmap Session');
        setShowHistory(false);
    }, [handleNewSession]);

    // --- Delete Session wrapper ---
    const handleDeleteChatClick = useCallback(async (chatId: Id<"chats">) => {
        await handleDeleteChat(chatId);
    }, [handleDeleteChat]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [text]);

    const isInitialState = messages.length === 0;

    // Roadmap stats for the header badge
    const activeGoals = goals.filter(g => !g.archived);
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const emptyQuarters = quarters.filter(q => activeGoals.filter(g => g.quarter === q).length === 0);

    if (!isOpen) return null;

    return (
        <div className="fixed right-0 top-0 h-full w-[85vw] md:w-[65vw] lg:w-[50vw] max-w-3xl bg-white border-l border-stone-200 shadow-2xl z-50 flex flex-col animate-slide-in-right">
            {/* Header */}
            <div className="px-5 py-4 border-b border-stone-100 shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-nobel-gold/20 to-amber-500/10 text-nobel-gold shadow-sm border border-nobel-gold/20">
                            <Sparkles size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-stone-900 tracking-tight">Roadmap AI</h3>
                            <p className="text-[10px] text-stone-400 uppercase tracking-widest font-medium">
                                Strategic Assistant
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className={`p-2 rounded-lg transition-all ${showHistory ? 'bg-stone-900 text-white' : 'text-stone-400 hover:bg-stone-100 hover:text-stone-600'}`}
                            title="Session History"
                        >
                            <History size={14} />
                        </button>
                        <button
                            onClick={handleNewSessionClick}
                            className="p-2 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-all"
                            title="New Session"
                        >
                            <Plus size={14} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-all"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Context Badge */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                        <Target size={10} /> {activeGoals.length} Goals
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                        <Calendar size={10} /> {currentQuarter} {currentYear}
                    </span>
                    {emptyQuarters.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-[10px] font-bold text-amber-600 uppercase tracking-wider border border-amber-200/50">
                            <AlertTriangle size={10} /> {emptyQuarters.length} Empty Q
                        </span>
                    )}
                </div>
            </div>

            {/* History Panel (Overlay) */}
            {showHistory && (
                <div className="absolute left-0 right-0 top-[120px] bottom-0 bg-white z-10 flex flex-col border-t border-stone-100">
                    <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                        <p className="text-xs font-bold text-stone-900">Session History</p>
                        <button
                            onClick={() => setShowHistory(false)}
                            className="text-[10px] font-bold text-stone-400 hover:text-stone-600 uppercase tracking-wider"
                        >
                            Close
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1">
                        {(!chatHistory || chatHistory.length === 0) ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mb-3">
                                    <MessageSquare size={20} className="text-stone-300" />
                                </div>
                                <p className="text-xs font-medium text-stone-400">No sessions yet</p>
                                <p className="text-[10px] text-stone-300 mt-1">Start a conversation to create your first session</p>
                            </div>
                        ) : (
                            chatHistory.map((chat) => (
                                <div
                                    key={chat._id}
                                    className={`group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${activeChatId === chat._id
                                        ? 'bg-stone-900 text-white shadow-lg'
                                        : 'hover:bg-stone-50 text-stone-700'
                                        }`}
                                    onClick={() => {
                                        setActiveChatId(chat._id);
                                        setShowHistory(false);
                                    }}
                                >
                                    <div className={`p-1.5 rounded-lg ${activeChatId === chat._id ? 'bg-white/10' : 'bg-stone-100'}`}>
                                        <Sparkles size={12} className={activeChatId === chat._id ? 'text-white/70' : 'text-stone-400'} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-semibold truncate ${activeChatId === chat._id ? 'text-white' : ''}`}>
                                            {chat.title || 'Untitled Session'}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <Clock size={9} className={activeChatId === chat._id ? 'text-white/40' : 'text-stone-300'} />
                                            <span className={`text-[10px] ${activeChatId === chat._id ? 'text-white/50' : 'text-stone-400'}`}>
                                                {new Date(chat.lastMessageAt || chat.createdAt).toLocaleDateString('en-US', {
                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteChatClick(chat._id);
                                        }}
                                        className={`p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${activeChatId === chat._id
                                            ? 'hover:bg-white/10 text-white/40 hover:text-red-300'
                                            : 'hover:bg-red-50 text-stone-300 hover:text-red-500'
                                            }`}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Messages / Initial State */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {isInitialState ? (
                    <div className="flex-1 overflow-y-auto">
                        <div className="flex flex-col items-center text-center px-5 pt-8 pb-4">
                            {/* Hero */}
                            <div className="relative mb-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-stone-900 to-stone-700 rounded-2xl rotate-3 flex items-center justify-center shadow-xl">
                                    <Target size={28} className="text-white/90" />
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-br from-nobel-gold to-amber-500 rounded-xl border-3 border-white flex items-center justify-center shadow-lg -rotate-6">
                                    <Sparkles size={14} className="text-white" />
                                </div>
                            </div>

                            <h3 className="text-xl font-serif text-stone-900 tracking-tight mb-2">
                                Roadmap AI
                            </h3>
                            <p className="text-stone-400 text-xs leading-relaxed max-w-[280px] mb-6">
                                Your strategic planning assistant. I can see your full roadmap and help create quarterly objectives, analyze gaps, and suggest improvements.
                            </p>

                            {/* Quick Start Grid */}
                            <div className="w-full space-y-2">
                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest text-left px-1">Quick Actions</p>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {QUICK_PROMPTS.map((item) => (
                                        <button
                                            key={item.label}
                                            onClick={() => handleQuickStart(item.prompt)}
                                            disabled={isBusy}
                                            className="group flex items-center gap-2.5 px-3 py-2.5 bg-white border border-stone-100 rounded-xl text-left hover:border-stone-200 hover:shadow-sm transition-all disabled:opacity-50"
                                        >
                                            <div className={`p-1.5 rounded-lg bg-gradient-to-r ${item.color} border`}>
                                                <item.icon size={12} />
                                            </div>
                                            <span className="text-xs font-medium text-stone-600 group-hover:text-stone-900 transition-colors">
                                                {item.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <MessageList
                            messages={messages}
                            onSendMessage={(text) => { setText(text); setTimeout(() => handleSend(), 0); }}
                            onNavigate={() => { }}
                            projectId={projectId}
                            onLoadMore={undefined}
                            status={rawMessages === undefined ? 'LoadingFirstPage' as const : 'Exhausted' as const}
                            thinkingEnabled={thinkingMode !== 'off'}
                        />
                        {/* Action Cards for AI-suggested goals — Accordion */}
                        {(() => {
                            // Use rawMessages for goal parsing since display messages have GOAL_JSON stripped
                            const lastRawAssistant = rawMessages ? [...rawMessages].reverse().find(m => m.role === 'assistant' && m.status !== 'streaming') : null;
                            if (!lastRawAssistant) return null;
                            const suggestions = parseGoalSuggestions(lastRawAssistant.content || '');
                            if (suggestions.length === 0) return null;
                            return (
                                <SuggestedGoalsAccordion
                                    suggestions={suggestions}
                                    projectId={projectId}
                                    year={currentYear}
                                />
                            );
                        })()}
                    </>
                )}
            </div>

            {/* Input Area */}
            <div className="border-t border-stone-100 bg-white shrink-0">
                <div className="px-4 pt-3 pb-4">
                    {/* Thinking Mode Selector */}
                    <div className="flex items-center gap-2 mb-2">
                        <div className="relative" ref={thinkMenuRef}>
                            <button
                                type="button"
                                onClick={() => setIsThinkMenuOpen(!isThinkMenuOpen)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all border ${thinkingMode !== 'off'
                                    ? 'bg-stone-900 text-white border-stone-800'
                                    : 'bg-stone-100 text-stone-400 border-stone-200'
                                    }`}
                            >
                                <Lightbulb size={10} />
                                {currentThinkOption.label}
                                <ChevronDown size={8} className={`transition-transform ${isThinkMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isThinkMenuOpen && (
                                <div className="absolute bottom-full left-0 mb-2 w-40 bg-white rounded-xl shadow-2xl border border-stone-100 py-1 z-50">
                                    <div className="px-3 py-1 text-[9px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-50 mb-1">
                                        Reasoning
                                    </div>
                                    {THINKING_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => {
                                                setThinkingMode(option.value);
                                                setIsThinkMenuOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2 ${thinkingMode === option.value
                                                ? 'bg-stone-100 text-stone-900 font-semibold'
                                                : 'text-stone-500 hover:bg-stone-50'
                                                }`}
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full ${thinkingMode === option.value ? 'bg-stone-900' : 'bg-stone-200'}`} />
                                            <div className="flex flex-col">
                                                <span className="font-medium">{option.label}</span>
                                                <span className="text-[9px] text-stone-400 font-normal">{option.desc}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Input */}
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                        className="flex items-end gap-2 bg-stone-50 rounded-2xl border border-stone-200 focus-within:border-stone-300 transition-all px-3 py-2"
                    >
                        <textarea
                            ref={textareaRef}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Ask about your roadmap, plan quarters..."
                            rows={1}
                            className="flex-1 bg-transparent py-1.5 outline-none text-sm text-stone-700 placeholder-stone-400 resize-none max-h-[100px]"
                        />
                        <button
                            type="submit"
                            disabled={!text.trim() || isBusy}
                            className={`p-2 rounded-xl transition-all shrink-0 ${text.trim() && !isBusy
                                ? 'bg-stone-900 text-white hover:bg-stone-800'
                                : 'bg-stone-200 text-stone-400'
                                }`}
                        >
                            {isBusy ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Send size={14} />
                            )}
                        </button>
                    </form>

                    <p className="text-[9px] text-stone-300 text-center mt-2 font-medium">
                        Powered by Adaptive AI · Full roadmap context
                    </p>
                </div>
            </div>
        </div>
    );
};
