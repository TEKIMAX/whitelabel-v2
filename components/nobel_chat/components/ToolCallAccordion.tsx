import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Wrench, Sparkles, Loader2 } from 'lucide-react';

interface ToolCall {
    type: string;
    data: Record<string, any>;
}

interface ToolCallAccordionProps {
    toolCalls?: ToolCall[];
    isLoading?: boolean;
}

const TOOL_ICONS: Record<string, React.ElementType> = {
    table: Wrench,
    chart: Wrench,
    pitch_deck: Wrench,
    image: Wrench,
    model_canvas: Wrench,
    startup_journey: Wrench,
    customer_cards: Wrench,
    financial_snapshot: Wrench,
    swot_analysis: Wrench,
    okr_card: Wrench,
    market_sizing: Wrench,
    legal_risk: Wrench,
    process_flow: Wrench,
    action_card: Wrench,
    execution_audit: Wrench,
    expense_analysis: Wrench,
    recommendation: Wrench,
    naics_lookup: Sparkles,
    unknown: Wrench,
};

const TOOL_LABELS: Record<string, string> = {
    table: 'Data Table',
    chart: 'Chart',
    pitch_deck: 'Pitch Deck',
    image: 'Image Generation',
    model_canvas: 'Business Model Canvas',
    startup_journey: 'Startup Journey',
    customer_cards: 'Customer Profiles',
    financial_snapshot: 'Financial Snapshot',
    swot_analysis: 'SWOT Analysis',
    okr_card: 'OKR Card',
    market_sizing: 'Market Sizing',
    legal_risk: 'Legal Risk',
    process_flow: 'Process Flow',
    action_card: 'Action Card',
    execution_audit: 'Execution Audit',
    expense_analysis: 'Expense Analysis',
    recommendation: 'Recommendation',
    naics_lookup: 'NAICS Lookup',
    unknown: 'Tool Call',
};

export const ToolCallAccordion: React.FC<ToolCallAccordionProps> = ({ 
    toolCalls = [], 
    isLoading = false 
}) => {
    const [expandedTools, setExpandedTools] = useState<Set<number>>(new Set([0]));

    if (toolCalls.length === 0 && !isLoading) {
        return null;
    }

    const toggleExpand = (index: number) => {
        const newExpanded = new Set(expandedTools);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedTools(newExpanded);
    };

    const isExpanded = (index: number) => expandedTools.has(index);

    return (
        <div className="w-full mt-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-wider px-1">
                <Sparkles size={14} className="text-nobel-gold" />
                <span>Tool Calls</span>
                <span className="text-stone-300">({toolCalls.length})</span>
            </div>

            {isLoading && (
                <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-xl border border-stone-200">
                    <Loader2 size={16} className="text-purple-600 animate-spin" />
                    <span className="text-sm text-stone-600">Calling tools...</span>
                </div>
            )}

            {toolCalls.map((tool, idx) => {
                const Icon = TOOL_ICONS[tool.type] || Wrench;
                const label = TOOL_LABELS[tool.type] || tool.type;
                const isOpen = isExpanded(idx);

                return (
                    <div 
                        key={idx} 
                        className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden transition-all"
                    >
                        <button
                            onClick={() => toggleExpand(idx)}
                            className="w-full flex items-center justify-between p-3 hover:bg-stone-100 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <Icon size={14} className="text-purple-600" />
                                </div>
                                <div className="text-left">
                                    <span className="text-sm font-medium text-stone-700">{label}</span>
                                    {tool.data?._originalToolName && (
                                        <span className="ml-2 text-xs text-stone-400">
                                            ({tool.data._originalToolName})
                                        </span>
                                    )}
                                </div>
                            </div>
                            {isOpen ? (
                                <ChevronUp size={18} className="text-stone-400" />
                            ) : (
                                <ChevronDown size={18} className="text-stone-400" />
                            )}
                        </button>

                        {isOpen && (
                            <div className="px-4 pb-4 border-t border-stone-200">
                                <div className="pt-3">
                                    {tool.data?._naicsResult ? (
                                        <NAICSToolResult data={tool.data._naicsResult} />
                                    ) : tool.data?._error ? (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                            <span className="text-sm text-red-700">{tool.data._error}</span>
                                        </div>
                                    ) : (
                                        <pre className="text-xs font-mono bg-white p-3 rounded-lg border border-stone-200 overflow-x-auto max-h-60">
                                            {JSON.stringify(tool.data, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const NAICSToolResult: React.FC<{ data: any }> = ({ data }) => {
    const results = Array.isArray(data) ? data : [data];
    
    return (
        <div className="space-y-2">
            {results.slice(0, 5).map((code: any, idx: number) => (
                <div key={idx} className="p-3 bg-white rounded-lg border border-stone-200">
                    <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-purple-700">{code.id}</span>
                        {code.employeeCountLimit ? (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                {code.employeeCountLimit.toLocaleString()} employees
                            </span>
                        ) : code.revenueLimit ? (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                                ${(code.revenueLimit * 1000000).toLocaleString()} revenue
                            </span>
                        ) : null}
                    </div>
                    <p className="text-sm text-stone-700 mt-1">{code.description}</p>
                    <p className="text-xs text-stone-400 mt-1">
                        Sector {code.sectorId}: {code.sectorDescription}
                    </p>
                </div>
            ))}
            {results.length > 5 && (
                <p className="text-xs text-stone-500 text-center">+{results.length - 5} more results</p>
            )}
        </div>
    );
};

export default ToolCallAccordion;
