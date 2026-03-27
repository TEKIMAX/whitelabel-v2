
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ViewState, Message, StartupData } from '../types';
import {
    PanelLeftOpen, PanelLeftClose, Plus, Trash2, Calculator, Settings2, Send, Loader2,
    History, X, Search, TrendingUp, DollarSign, BarChart3, Globe, Clock, MessageSquare, Lightbulb, ChevronDown,
    MapPin, Building2, Calendar
} from 'lucide-react';
import MessageList from './nobel_chat/components/MessageList';
import { Id } from '../convex/_generated/dataModel';
import { useAIChatMessages } from '../hooks/useAIChatMessages';
import { useAIChatSession } from '../hooks/useAIChatSession';
import TabNavigation from './TabNavigation';
import ProjectSelector from './ProjectSelector';
import { Logo } from './Logo';

interface CalculatorChatProps {
    currentProjectId: string | null;
    currentProject?: StartupData;
    allProjects: StartupData[];
    onSwitchProject: (id: string) => void;
    onNewProject: () => void;
    onNavigate: (view: ViewState) => void;
    currentView: ViewState;
    allowedPages?: any[];
    orgId?: string;
    userId?: string;
}

interface Parameter {
    id: string;
    key: string;
    value: string;
}

const STORAGE_KEY_PREFIX = 'calc_ai_';

const THINKING_OPTIONS = [
    { value: 'low', label: 'Low', desc: 'Quick response' },
    { value: 'medium', label: 'Medium', desc: 'Balanced' },
    { value: 'high', label: 'High', desc: 'Deep analysis' },
];

// --- Capability Badges ---
const CAPABILITIES = [
    { icon: Search, label: 'Deep Research', color: 'from-blue-500/10 to-blue-600/10 text-blue-600 border-blue-200/50' },
    { icon: DollarSign, label: 'Cloud Pricing', color: 'from-emerald-500/10 to-emerald-600/10 text-emerald-600 border-emerald-200/50' },
    { icon: MapPin, label: 'Regional Pricing', color: 'from-amber-500/10 to-amber-600/10 text-amber-600 border-amber-200/50' },
    { icon: Building2, label: 'Industry Rates', color: 'from-purple-500/10 to-purple-600/10 text-purple-600 border-purple-200/50' },
    { icon: Calendar, label: 'Workshop & Events', color: 'from-rose-500/10 to-rose-600/10 text-rose-600 border-rose-200/50' },
    { icon: Globe, label: 'Source Citations', color: 'from-teal-500/10 to-teal-600/10 text-teal-600 border-teal-200/50' },
];

const CalculatorChat: React.FC<CalculatorChatProps> = ({
    currentProjectId,
    currentProject,
    allProjects,
    onSwitchProject,
    onNewProject,
    onNavigate,
    currentView,
    allowedPages,
    orgId,
    userId,
}) => {
    // --- Side Sheet State ---
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [systemPrompt, setSystemPrompt] = useState(() => {
        const key = `${STORAGE_KEY_PREFIX}system_${currentProjectId || 'default'}`;
        return localStorage.getItem(key) || '';
    });
    const [parameters, setParameters] = useState<Parameter[]>(() => {
        const key = `${STORAGE_KEY_PREFIX}params_${currentProjectId || 'default'}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try { return JSON.parse(saved); } catch { return []; }
        }
        return [];
    });

    // Persist system prompt and parameters
    useEffect(() => {
        const key = `${STORAGE_KEY_PREFIX}system_${currentProjectId || 'default'}`;
        localStorage.setItem(key, systemPrompt);
    }, [systemPrompt, currentProjectId]);

    useEffect(() => {
        const key = `${STORAGE_KEY_PREFIX}params_${currentProjectId || 'default'}`;
        localStorage.setItem(key, JSON.stringify(parameters));
    }, [parameters, currentProjectId]);

    // --- Thinking Mode (reasoning level) ---
    const [thinkingMode, setThinkingMode] = useState<string>(() => {
        return localStorage.getItem(`${STORAGE_KEY_PREFIX}thinking_mode`) || 'high';
    });
    const [isThinkMenuOpen, setIsThinkMenuOpen] = useState(false);
    const thinkMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}thinking_mode`, thinkingMode);
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

    // --- Shared Hooks ---
    const {
        activeChatId, setActiveChatId, isLoading, chatHistory,
        handleSend: sendMessage, handleNewSession, handleDeleteChat: deleteSession,
    } = useAIChatSession({
        channel: 'calculator',
        projectId: currentProjectId,
        storagePrefix: `${STORAGE_KEY_PREFIX}active_chat_`,
    });

    const { messages, isStreaming, rawMessages } = useAIChatMessages(activeChatId);

    const [text, setText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // --- Parameter Helpers ---
    const addParameter = () => {
        setParameters(prev => [...prev, { id: Date.now().toString(), key: '', value: '' }]);
    };

    const updateParameter = (id: string, field: 'key' | 'value', val: string) => {
        setParameters(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p));
    };

    const removeParameter = (id: string) => {
        setParameters(prev => prev.filter(p => p.id !== id));
    };

    // --- Build Context ---
    const buildPageContext = useCallback(() => {
        let context = `Calculator AI — Deep Research Pricing Engine.
You are a specialized pricing research AI. Your primary capabilities:
1. CLOUD PRICING: Research and compare pricing for AWS, Azure, GCP, and other cloud providers. Include instance types, storage tiers, networking, and reserved/spot pricing.
2. REGIONAL PRICING: Search pricing by state, region, city, or country. Compare cost-of-living adjusted rates.
3. WORKSHOP & EVENT PRICING: Research pricing for workshops, conferences, bootcamps, training sessions, and events by industry, domain, duration, and format (in-person vs virtual).
4. INDUSTRY BENCHMARKS: Find pricing benchmarks by industry vertical or domain (SaaS, consulting, education, healthcare, etc.).

Rules:
- ALWAYS use online search to find current, real-world pricing data.
- Present results in well-formatted markdown tables with specific dollar amounts.
- Cite all sources with links.
- When a user specifies a state or region, search for location-specific data.
- Break down pricing into tiers, categories, and time periods (hourly/daily/monthly/annual).
- Include competitor comparisons where relevant.`;
        if (systemPrompt.trim()) {
            context += `\n\n[CUSTOM INSTRUCTIONS]\n${systemPrompt.trim()}`;
        }
        const activeParams = parameters.filter(p => p.key.trim() && p.value.trim());
        if (activeParams.length > 0) {
            context += '\n\n[RESEARCH PARAMETERS]\n';
            activeParams.forEach(p => {
                context += `- ${p.key}: ${p.value}\n`;
            });
        }
        return context;
    }, [systemPrompt, parameters]);

    // --- Send Message ---
    const handleSend = useCallback(async () => {
        if (!text.trim() || isLoading) return;
        try {
            const pageContext = buildPageContext();
            await sendMessage(text, pageContext, {
                thinkingEnabled: thinkingMode !== 'off',
            });
            setText('');
        } catch (error: any) {
            // error handled in hook
        }
    }, [text, isLoading, buildPageContext, sendMessage, thinkingMode]);

    // --- New Session ---
    const handleNewSession_click = useCallback(async () => {
        await handleNewSession('Calculator Session');
    }, [handleNewSession]);

    // --- Quick Start from Template ---
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
                // error handled in hook
            }
        }, 100);
    }, [buildPageContext, sendMessage, thinkingMode]);

    // --- Is Initial State (show Calculator landing when no messages) ---
    const isInitialState = messages.length === 0;

    return (
        <div className="h-screen flex flex-col text-stone-900 overflow-hidden" style={{ background: 'radial-gradient(circle, #d6d3d1 1px, #F9F8F4 1px)', backgroundSize: '20px 20px' }}>
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
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                        className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm font-medium shadow-sm transition-all ${isHistoryOpen
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                            }`}
                        title="Chat History"
                    >
                        <History size={16} />
                        History
                        {chatHistory && chatHistory.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-stone-200 text-stone-600 text-[10px] font-bold">
                                {chatHistory.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setIsSheetOpen(!isSheetOpen)}
                        className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm font-medium shadow-sm transition-all ${isSheetOpen
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                            }`}
                        title={isSheetOpen ? 'Close Parameters' : 'Open Parameters'}
                    >
                        {isSheetOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                        Parameters
                    </button>
                    <button
                        onClick={handleNewSession_click}
                        className="flex items-center gap-2 px-3 py-1.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 text-sm font-medium shadow-sm transition-all"
                    >
                        <Plus size={16} /> New Session
                    </button>
                </div>
            </header>

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* History Sheet (Right Side Overlay) */}
                {isHistoryOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity"
                            onClick={() => setIsHistoryOpen(false)}
                        />
                        {/* Sheet */}
                        <div className="absolute right-0 top-0 bottom-0 w-[360px] bg-white border-l border-stone-200 z-50 shadow-2xl flex flex-col animate-slide-in-right">
                            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-gradient-to-br from-stone-900 to-stone-700 text-white shadow-lg">
                                        <History size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-stone-900">Session History</h3>
                                        <p className="text-[10px] text-stone-400 uppercase tracking-widest font-medium">
                                            {chatHistory?.length || 0} sessions
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsHistoryOpen(false)}
                                    className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-all"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                                {(!chatHistory || chatHistory.length === 0) ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                        <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
                                            <MessageSquare size={24} className="text-stone-300" />
                                        </div>
                                        <p className="text-sm font-medium text-stone-400">No sessions yet</p>
                                        <p className="text-[11px] text-stone-300 mt-1">Start a calculation to create your first session</p>
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
                                                setIsHistoryOpen(false);
                                            }}
                                        >
                                            <div className={`p-1.5 rounded-lg ${activeChatId === chat._id ? 'bg-white/10' : 'bg-stone-100'}`}>
                                                <Calculator size={14} className={activeChatId === chat._id ? 'text-white/70' : 'text-stone-400'} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs font-semibold truncate ${activeChatId === chat._id ? 'text-white' : ''}`}>
                                                    {chat.title || 'Untitled Session'}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Clock size={10} className={activeChatId === chat._id ? 'text-white/40' : 'text-stone-300'} />
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
                                                    deleteSession(chat._id);
                                                }}
                                                className={`p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${activeChatId === chat._id
                                                    ? 'hover:bg-white/10 text-white/40 hover:text-red-300'
                                                    : 'hover:bg-red-50 text-stone-300 hover:text-red-500'
                                                    }`}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Side Sheet (Parameters) */}
                <div
                    className={`shrink-0 border-r border-stone-200 bg-white overflow-y-auto transition-all duration-300 ease-in-out ${isSheetOpen ? 'w-[380px] opacity-100' : 'w-0 opacity-0 overflow-hidden'
                        }`}
                >
                    <div className="p-5 space-y-6 min-w-[380px]">
                        {/* Title */}
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-stone-900 to-stone-700 text-white shadow-lg">
                                <Settings2 size={18} />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-stone-900 tracking-tight">Configuration</h2>
                                <p className="text-[10px] text-stone-400 uppercase tracking-widest font-medium">System & Parameters</p>
                            </div>
                        </div>

                        {/* System Prompt */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
                                <Calculator size={12} />
                                System Prompt
                            </label>
                            <textarea
                                value={systemPrompt}
                                onChange={(e) => setSystemPrompt(e.target.value)}
                                placeholder="You are a pricing calculator AI. Research and compute costs based on user parameters. Always present results in tables..."
                                rows={6}
                                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 text-sm text-stone-700 px-4 py-3 outline-none focus:border-stone-400 focus:bg-white transition-all resize-none placeholder:text-stone-300"
                            />
                            <p className="text-[10px] text-stone-400 leading-relaxed">
                                Tell the AI what it should do. This gets injected as context for every message.
                            </p>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />

                        {/* Parameters */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                                    Parameters
                                </label>
                                <button
                                    onClick={addParameter}
                                    className="flex items-center gap-1 text-[10px] font-bold text-stone-500 hover:text-stone-900 uppercase tracking-wider px-2 py-1 rounded-lg hover:bg-stone-100 transition-all"
                                >
                                    <Plus size={12} /> Add
                                </button>
                            </div>

                            {parameters.length === 0 && (
                                <div className="text-center py-6 border-2 border-dashed border-stone-200 rounded-xl">
                                    <p className="text-xs text-stone-400 italic">No parameters yet.</p>
                                    <p className="text-[10px] text-stone-300 mt-1">Add key-value pairs like "state: Texas"</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                {parameters.map((param) => (
                                    <div key={param.id} className="group flex items-start gap-2 animate-in slide-in-from-top-1 duration-200">
                                        <div className="flex-1 flex gap-2">
                                            <input
                                                type="text"
                                                value={param.key}
                                                onChange={(e) => updateParameter(param.id, 'key', e.target.value)}
                                                placeholder="Key"
                                                className="w-[120px] shrink-0 rounded-lg border border-stone-200 bg-stone-50/50 text-xs text-stone-700 px-3 py-2 outline-none focus:border-stone-400 focus:bg-white transition-all font-medium placeholder:text-stone-300"
                                            />
                                            <input
                                                type="text"
                                                value={param.value}
                                                onChange={(e) => updateParameter(param.id, 'value', e.target.value)}
                                                placeholder="Value"
                                                className="flex-1 rounded-lg border border-stone-200 bg-stone-50/50 text-xs text-stone-700 px-3 py-2 outline-none focus:border-stone-400 focus:bg-white transition-all placeholder:text-stone-300"
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeParameter(param.id)}
                                            className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {parameters.length > 0 && (
                                <p className="text-[10px] text-stone-400 leading-relaxed">
                                    Parameters are included as context in every message you send.
                                </p>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />

                        {/* Quick Templates */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                                Quick Templates
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                {[
                                    {
                                        label: 'Cloud Pricing Research',
                                        icon: DollarSign,
                                        prompt: 'Focus on cloud infrastructure pricing. Research current rates for AWS, Azure, and GCP. Compare instance types, storage tiers, database pricing, and CDN costs. Present detailed comparison tables with monthly estimates.',
                                        params: [{ key: 'provider', value: '' }, { key: 'workload_type', value: '' }]
                                    },
                                    {
                                        label: 'Workshop & Event Pricing',
                                        icon: Calendar,
                                        prompt: 'Focus on workshop, bootcamp, and event pricing research. Search for current rates by industry, duration, format (virtual/in-person), and location. Include venue costs, speaker fees, materials, and per-attendee pricing benchmarks.',
                                        params: [{ key: 'industry', value: '' }, { key: 'state', value: '' }, { key: 'format', value: '' }]
                                    },
                                    {
                                        label: 'Regional Rate Finder',
                                        icon: MapPin,
                                        prompt: 'Focus on location-specific pricing and rate research. Search for service rates, labor costs, and market pricing by state, city, or region. Adjust for cost-of-living differences and present regional comparison tables.',
                                        params: [{ key: 'state', value: '' }, { key: 'service_type', value: '' }]
                                    },
                                    {
                                        label: 'Industry Benchmarks',
                                        icon: BarChart3,
                                        prompt: 'Focus on industry-specific pricing benchmarks. Research typical pricing models, average rates, and competitive landscapes for the specified domain. Present tier-based pricing tables.',
                                        params: [{ key: 'industry', value: '' }, { key: 'domain', value: '' }]
                                    }
                                ].map((template) => (
                                    <button
                                        key={template.label}
                                        onClick={() => {
                                            setSystemPrompt(template.prompt);
                                            setParameters(template.params.map((p, i) => ({ ...p, id: `t${Date.now()}${i}` })));
                                        }}
                                        className="w-full text-left px-3 py-2.5 rounded-xl border border-stone-100 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:border-stone-200 hover:text-stone-900 transition-all"
                                    >
                                        <span className="flex items-center gap-2">
                                            <template.icon size={12} className="text-stone-400" />
                                            {template.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Calculator Landing (Initial State) */}
                    {isInitialState ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 animate-fade-in-up">
                            {/* Icon */}
                            <div className="relative mb-8">
                                <div className="w-24 h-24 bg-gradient-to-br from-stone-900 to-stone-700 rounded-3xl rotate-6 flex items-center justify-center shadow-2xl">
                                    <Calculator size={40} className="text-white/90" />
                                </div>
                                <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl border-4 border-[#F9F8F4] flex items-center justify-center shadow-xl -rotate-6">
                                    <Search size={20} className="text-white" />
                                </div>
                            </div>

                            {/* Title */}
                            <h2 className="text-4xl font-serif text-stone-900 tracking-tight mb-3">
                                Pricing Research AI
                            </h2>
                            <p className="text-stone-400 text-sm leading-relaxed max-w-sm mb-8">
                                Deep research engine for cloud pricing, workshop & event rates, regional costs, and industry benchmarks — powered by real-time online search.
                            </p>

                            {/* Capability Badges */}
                            <div className="flex flex-wrap justify-center gap-2 mb-10 max-w-2xl">
                                {CAPABILITIES.map((cap) => (
                                    <div
                                        key={cap.label}
                                        className={`flex items-center gap-2 px-3.5 py-2 rounded-full bg-gradient-to-r ${cap.color} border text-xs font-semibold`}
                                    >
                                        <cap.icon size={14} />
                                        {cap.label}
                                    </div>
                                ))}
                            </div>

                            {/* Quick Start Prompts */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                                {[
                                    { icon: DollarSign, label: 'Compare cloud pricing', prompt: 'Compare current pricing between AWS, Google Cloud, and Azure for a standard web app stack. Include compute (EC2/Cloud Run/VMs), managed databases, object storage, CDN, and networking. Present a comparison table with monthly estimates for a startup serving 10K users.' },
                                    { icon: Calendar, label: 'Workshop pricing by state', prompt: 'Research the current market rates for running a 2-day professional development workshop in Texas. Include venue rental costs, speaker fees, materials per attendee, catering, and recommended ticket pricing. Compare Houston, Austin, and Dallas.' },
                                    { icon: MapPin, label: 'Regional SaaS rates', prompt: 'Research average B2B SaaS pricing by region in the US. Compare rates for a project management tool across Northeast, Southeast, Midwest, and West Coast markets. Include per-seat pricing and enterprise tier benchmarks.' },
                                    { icon: Building2, label: 'Industry event pricing', prompt: 'Research current pricing benchmarks for tech industry conferences and bootcamps. Include ticket prices by tier (general, VIP, workshop-only), sponsorship packages, and per-attendee costs for organizers. Compare virtual vs in-person formats.' },
                                ].map((item) => (
                                    <button
                                        key={item.label}
                                        onClick={() => handleQuickStart(item.prompt)}
                                        className="group flex items-center gap-3 px-4 py-3.5 bg-white border border-stone-200 rounded-2xl text-left hover:border-stone-300 hover:shadow-md transition-all"
                                    >
                                        <div className="p-1.5 rounded-lg bg-stone-100 group-hover:bg-stone-200 transition-colors">
                                            <item.icon size={14} className="text-stone-500" />
                                        </div>
                                        <span className="text-xs font-semibold text-stone-600 group-hover:text-stone-900 transition-colors">
                                            {item.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Messages */}
                            <MessageList
                                messages={messages}
                                onSendMessage={(text) => { setText(text); setTimeout(() => handleSend(), 0); }}
                                onNavigate={onNavigate}
                                projectId={currentProjectId}
                                onLoadMore={undefined}
                                status={rawMessages === undefined ? 'LoadingFirstPage' as const : 'Exhausted' as const}
                                thinkingEnabled={thinkingMode !== 'off'}
                            />
                        </>
                    )}

                    {/* Input */}
                    <div className="bg-[#F9F8F4] pt-4 px-4 shrink-0">
                        <div className="max-w-3xl mx-auto w-full px-4 pb-6 space-y-2">
                            <div className="relative flex flex-col bg-white rounded-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-stone-200/60 focus-within:border-stone-300 transition-all">

                                {/* Active Parameters Preview */}
                                {parameters.filter(p => p.key.trim() && p.value.trim()).length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1.5 px-5 pt-3">
                                        {parameters.filter(p => p.key.trim() && p.value.trim()).map(p => (
                                            <span key={p.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-100 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                                                {p.key}: <span className="text-stone-700 normal-case font-medium">{p.value}</span>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Reasoning Level Selector */}
                                <div className="flex items-center gap-2 px-5 pt-2">
                                    <div className="relative" ref={thinkMenuRef}>
                                        <button
                                            type="button"
                                            onClick={() => setIsThinkMenuOpen(!isThinkMenuOpen)}
                                            title={`Reasoning: ${currentThinkOption.label}`}
                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border ${thinkingMode !== 'off'
                                                ? 'bg-stone-900 text-white border-stone-800 shadow-sm'
                                                : 'bg-stone-100 text-stone-400 border-stone-200 hover:bg-stone-200'
                                                }`}
                                        >
                                            <Lightbulb size={12} />
                                            {currentThinkOption.label}
                                            <ChevronDown size={10} className={`transition-transform ${isThinkMenuOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isThinkMenuOpen && (
                                            <div className="absolute bottom-full left-0 mb-3 w-44 bg-white rounded-2xl shadow-2xl border border-stone-100 py-1.5 z-50 animate-fade-in-up">
                                                <div className="px-3 py-1.5 text-[9px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-50 mb-1">
                                                    Reasoning Level
                                                </div>
                                                {THINKING_OPTIONS.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => {
                                                            setThinkingMode(option.value);
                                                            setIsThinkMenuOpen(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2.5 ${thinkingMode === option.value
                                                            ? 'bg-stone-100 text-stone-900 font-semibold'
                                                            : 'text-stone-500 hover:bg-stone-50'
                                                            }`}
                                                    >
                                                        <div className={`w-1.5 h-1.5 rounded-full ${thinkingMode === option.value ? 'bg-stone-900' : 'bg-stone-200'
                                                            }`} />
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

                                <form
                                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                    className="flex items-end px-4 py-3 gap-2"
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
                                        placeholder="Research cloud pricing, workshop rates, regional costs..."
                                        rows={1}
                                        className="flex-1 bg-transparent py-4 outline-none text-sm text-stone-700 placeholder-stone-400 resize-none max-h-32"
                                    />

                                    <button
                                        type="submit"
                                        disabled={!text.trim() || isLoading}
                                        className={`p-3 mb-1 rounded-2xl transition-all ${text.trim() && !isLoading
                                            ? 'bg-stone-900 text-white shadow-xl scale-100 hover:bg-stone-800'
                                            : 'bg-stone-100 text-stone-300 scale-95 opacity-50'
                                            }`}
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Send className="w-5 h-5" />
                                        )}
                                    </button>
                                </form>
                            </div>

                            <p className="text-center text-[10px] text-stone-400 mt-3 mx-auto">
                                Pricing Research AI uses deep online search to find real-time pricing data.<br />
                                Results are AI-generated — always verify critical pricing independently.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalculatorChat;
