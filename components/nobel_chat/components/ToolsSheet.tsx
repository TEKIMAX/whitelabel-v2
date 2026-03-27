import React, { useState, useEffect, useRef } from 'react';
import {
    X, Wrench, Table2, LayoutGrid,
    Users, DollarSign, ListChecks,
    TrendingUp, Lightbulb, ChevronDown, ChevronRight, ToggleLeft, ToggleRight, Building2, Cpu
} from 'lucide-react';

// ===== TOOL REGISTRY =====
// Human-readable metadata for each tool the Adaptive AI can use
export interface ToolMeta {
    id: string;          // Matches function.name in tools.ts
    label: string;       // Human-readable name
    description: string; // Short description
    icon: React.ElementType;
    category: 'visualization' | 'strategy' | 'financial' | 'analysis' | 'content' | 'integrations';
}

export const TOOL_REGISTRY: ToolMeta[] = [
    // Visualization
    { id: 'renderTable', label: 'Data Tables', description: 'Render styled data tables with columns and rows', icon: Table2, category: 'visualization' },

    // Strategy
    { id: 'renderModelCanvas', label: 'Model Canvas', description: 'Update sections of the Lean Business Model Canvas', icon: LayoutGrid, category: 'strategy' },
    { id: 'renderActionCard', label: 'Action Cards', description: 'Prompt user actions when data is missing', icon: ListChecks, category: 'strategy' },

    // Financial
    { id: 'renderFinancialSnapshot', label: 'Financial Snapshot', description: 'Display unit economics (CAC, LTV, ARPU) and P&L', icon: DollarSign, category: 'financial' },
    { id: 'renderExpenseAnalysis', label: 'Expense Analysis', description: 'Break down monthly burn and cost categories', icon: TrendingUp, category: 'financial' },

    // Analysis
    { id: 'renderCustomerCards', label: 'Customer Profiles', description: 'Render customer profiles and interview cards', icon: Users, category: 'analysis' },
    { id: 'lookupNAICSCode', label: 'NAICS Lookup', description: 'Search SBA size standards and small business eligibility', icon: Building2, category: 'analysis' },
    { id: 'getNAICSCodeDetails', label: 'NAICS Details', description: 'Get detailed info for a specific NAICS code', icon: Building2, category: 'analysis' },

    // Content
    { id: 'renderRecommendation', label: 'Recommendations', description: 'Styled advice, warnings, audits, or insights', icon: Lightbulb, category: 'content' },
];

const CATEGORY_LABELS: Record<string, string> = {
    visualization: 'Visualization',
    strategy: 'Strategy & Planning',
    financial: 'Financial',
    analysis: 'Analysis & Research',
    content: 'Content Generation',
    research: 'Research',
    integrations: 'Custom Integrations',
};

const CATEGORY_ORDER = ['visualization', 'strategy', 'financial', 'analysis', 'content', 'research', 'integrations'];

const STORAGE_KEY = 'adaptive_engine_enabled_tools';

// ===== Helper: Get enabled tools from localStorage =====
export function getEnabledTools(): Set<string> {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return new Set(parsed);
        }
    } catch { }
    // Default: enable all tools
    return new Set(TOOL_REGISTRY.map(t => t.id));
}

export function getEnabledToolIds(): string[] {
    return Array.from(getEnabledTools());
}

// ===== COMPONENT =====
interface ToolsSheetProps {
    isOpen: boolean;
    onClose: () => void;
    enabledTools: Set<string>;
    onToggleTool: (toolId: string) => void;
    onToggleAll: (enabled: boolean) => void;
    customTools?: ToolMeta[];
}

const ToolsSheet: React.FC<ToolsSheetProps> = ({ isOpen, onClose, enabledTools, onToggleTool, onToggleAll, customTools = [] }) => {
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
    const sheetRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    const toggleCategory = (cat: string) => {
        setCollapsedCategories(prev => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    };

    const ALL_TOOLS = [...TOOL_REGISTRY, ...customTools];
    const allEnabled = enabledTools.size >= ALL_TOOLS.length && ALL_TOOLS.length > 0;
    const noneEnabled = enabledTools.size === 0;
    const enabledCount = enabledTools.size;

    // Group tools by category
    const grouped = CATEGORY_ORDER.map(cat => ({
        category: cat,
        label: CATEGORY_LABELS[cat],
        tools: ALL_TOOLS.filter(t => t.category === cat),
    })).filter(g => g.tools.length > 0);

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            />

            {/* Sheet */}
            <div
                ref={sheetRef}
                className={`fixed right-0 top-0 h-full w-[420px] bg-white border-l border-stone-200 shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-stone-100 shrink-0">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-stone-900 rounded-lg">
                                <Wrench size={16} className="text-white" />
                            </div>
                            <h2 className="font-serif text-lg font-bold text-stone-900">AI Tool Access</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-all"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <p className="text-xs text-stone-400 leading-relaxed">
                        Control which tools the Adaptive Engine can use. Disabled tools won't be available to the AI.
                    </p>

                    {/* Master Toggle */}
                    <div className="flex items-center justify-between mt-3 px-3 py-2.5 bg-stone-50 rounded-xl border border-stone-100">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                                {enabledCount}/{ALL_TOOLS.length} Active
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onToggleAll(false)}
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md transition-all ${noneEnabled ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'}`}
                            >
                                None
                            </button>
                            <button
                                onClick={() => onToggleAll(true)}
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md transition-all ${allEnabled ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'}`}
                            >
                                All
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tool List */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {grouped.map(({ category, label, tools }) => {
                        const isCollapsed = collapsedCategories.has(category);
                        const categoryEnabledCount = tools.filter(t => enabledTools.has(t.id)).length;

                        return (
                            <div key={category} className="space-y-1">
                                {/* Category Header */}
                                <button
                                    onClick={() => toggleCategory(category)}
                                    className="w-full flex items-center justify-between py-1.5 group"
                                >
                                    <div className="flex items-center gap-2">
                                        {isCollapsed ? (
                                            <ChevronRight size={14} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
                                        ) : (
                                            <ChevronDown size={14} className="text-stone-400" />
                                        )}
                                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                                            {label}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-stone-300 font-medium">
                                        {categoryEnabledCount}/{tools.length}
                                    </span>
                                </button>

                                {/* Tools */}
                                {!isCollapsed && (
                                    <div className="space-y-1 ml-1">
                                        {tools.map(tool => {
                                            const isEnabled = enabledTools.has(tool.id);
                                            return (
                                                <button
                                                    key={tool.id}
                                                    onClick={() => onToggleTool(tool.id)}
                                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200 text-left group ${isEnabled
                                                        ? 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-sm'
                                                        : 'bg-stone-50/50 border-stone-100 opacity-60 hover:opacity-80'
                                                        }`}
                                                >
                                                    <div className={`p-1.5 rounded-lg transition-colors ${isEnabled ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-400'}`}>
                                                        <tool.icon size={14} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs font-semibold text-stone-800 truncate">{tool.label}</div>
                                                        <div className="text-[10px] text-stone-400 truncate">{tool.description}</div>
                                                    </div>
                                                    {/* Toggle */}
                                                    <div className={`shrink-0 transition-colors ${isEnabled ? 'text-nobel-gold' : 'text-stone-300'}`}>
                                                        {isEnabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-stone-100 shrink-0">
                    <p className="text-[10px] text-stone-400 text-center leading-relaxed">
                        Tool changes take effect on your next message.
                        <br />
                        The AI is aware of which tools are currently active.
                    </p>
                </div>
            </div>
        </>
    );
};

export default ToolsSheet;
