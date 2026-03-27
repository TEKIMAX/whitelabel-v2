import React, { useState } from 'react';
import { Copy, Check, Terminal, ChevronDown, ChevronUp, Building2, DollarSign, Users } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ActionCard from './ActionCard';
import OKRCard from './OKRCard';
import RecommendationCard from './RecommendationCard';
import DataTable from './DataTable';
import SWOTAnalysisCard from './SWOTAnalysisCard';
import ProcessFlowCard from './ProcessFlowCard';
import ExecutionAudit from './ExecutionAudit';

// Parse tool_code blocks: renderActionCard(title="...", description="...", ...) or renderActionCard { ... }
function parseToolCode(raw: string): { name: string; args: Record<string, any> } | null {
    const text = raw.trim();

    // 1. Try format: functionName { ... } (commonly used by AI)
    const blockMatch = text.match(/^(\w+)\s*(\{[\s\S]*\}?)/);
    if (blockMatch) {
        const name = blockMatch[1];
        let argsStr = blockMatch[2].trim();

        // Try strict JSON parse first
        try {
            return { name, args: JSON.parse(argsStr) };
        } catch {
            // If it fails (e.g. unquoted keys or missing trailing quote), we extract key-value pairs
            const args: Record<string, any> = {};
            // Match `key: "value"` or `key: 'value'` or `key: value`
            const pairRegex = /(\w+)\s*:\s*(?:"([^"]*?)"|'([^']*?)'|([^,}\n]+))/g;
            let match;
            while ((match = pairRegex.exec(argsStr)) !== null) {
                args[match[1]] = (match[2] ?? match[3] ?? match[4])?.trim();
            }
            if (Object.keys(args).length > 0) {
                return { name, args };
            }
        }
    }

    // 2. Try format: functionName(key="value", ...)
    const fnMatch = text.match(/^(\w+)\s*\(/);
    if (!fnMatch) return null;

    const name = fnMatch[1];
    const argsStr = text.slice(fnMatch[0].length, text.lastIndexOf(')'));

    // Try JSON parse first (if the args look like a JSON object)
    if (argsStr.trim().startsWith('{')) {
        try {
            return { name, args: JSON.parse(argsStr.trim()) };
        } catch { /* fall through */ }
    }

    // Parse keyword-style: key="value", key2="value2"
    const args: Record<string, any> = {};
    const pairRegex = /(\w+)\s*=\s*(?:"([^"]*?)"|'([^']*?)'|(\S+?))\s*(?:,|$)/g;
    let match;
    while ((match = pairRegex.exec(argsStr)) !== null) {
        args[match[1]] = match[2] ?? match[3] ?? match[4];
    }

    if (Object.keys(args).length === 0 && argsStr.trim().length > 0) {
        args._raw = argsStr.trim();
    }

    return { name, args };
}

interface CodeBlockProps {
    className?: string;
    children: React.ReactNode;
    inline?: boolean;
    onNavigate?: (page: string) => void;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ className, children, inline, onNavigate }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    if (inline) {
        return (
            <code className="bg-nobel-gold/10 text-nobel-gold px-1.5 py-0.5 rounded text-[13px] font-mono font-bold">
                {children}
            </code>
        );
    }

    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : 'text';
    const isJson = language === 'json';
    const isToolCode = language === 'tool_code' || language === 'tool';

    // Known tool function names that the AI may use as the code block language
    const TOOL_LANGUAGE_MAP: Record<string, string> = {
        'renderactioncard': 'renderActionCard',
        'rendertable': 'renderTable',
        'renderchart': 'renderChart',
        'renderpitchdeck': 'renderPitchDeck',
        'rendermodelcanvas': 'renderModelCanvas',
        'renderswotanalysis': 'renderSWOTAnalysis',
        'renderokrcard': 'renderOKRCard',
        'renderprocessflow': 'renderProcessFlow',
        'renderrecommendation': 'renderRecommendation',
        'renderfinancialsnapshot': 'renderFinancialSnapshot',
        'rendermarketsizing': 'renderMarketSizing',
        'renderlegalriskassessment': 'renderLegalRiskAssessment',
        'renderexpenseanalysis': 'renderExpenseAnalysis',
        'rendercustomercards': 'renderCustomerCards',
        'generateimage': 'generateImage',
        'updatestartupjourney': 'updateStartupJourney',
        'renderexecutionaudit': 'renderExecutionAudit',
    };

    const languageLower = language.toLowerCase();
    const isToolLanguage = languageLower in TOOL_LANGUAGE_MAP;

    // Handle tool calls: either ```tool_code renderActionCard(...) or ```renderActionCard \n key=value
    if (isToolCode || isToolLanguage) {
        const raw = String(children).trim();
        let toolName: string | null = null;
        let toolArgs: Record<string, any> = {};

        if (isToolLanguage) {
            // Language IS the function name. Body contains args as key="value" pairs or raw content.
            toolName = TOOL_LANGUAGE_MAP[languageLower];

            // Try parsing body as JSON first
            try {
                toolArgs = JSON.parse(raw);
            } catch {
                // Try key="value" pairs
                const pairRegex = /(\w+)\s*=\s*(?:"([^"]*?)"|'([^']*?)'|(\S+?))\s*(?:,|$)/g;
                let m;
                while ((m = pairRegex.exec(raw)) !== null) {
                    toolArgs[m[1]] = m[2] ?? m[3] ?? m[4];
                }
                // If no key-value pairs found, store body as _raw
                if (Object.keys(toolArgs).length === 0 && raw.length > 0) {
                    toolArgs._raw = raw;
                }
            }
        } else {
            // tool_code language: body is functionName(key="value", ...)
            const parsed = parseToolCode(raw);
            if (parsed) {
                toolName = parsed.name;
                toolArgs = parsed.args;
            }
        }

        if (toolName) {
            const normalizedName = toolName.toLowerCase();

            if (normalizedName === 'renderactioncard') {
                return (
                    <ActionCard
                        title={toolArgs.title || 'Action Required'}
                        description={toolArgs.description || ''}
                        buttonLabel={toolArgs.buttonLabel || 'Go'}
                        navigationTarget={toolArgs.navigationTarget || ''}
                        onNavigate={onNavigate}
                    />
                );
            }
            if (normalizedName === 'renderrecommendation') {
                return (
                    <RecommendationCard
                        title={toolArgs.title || 'Recommendation'}
                        content={toolArgs.content || ''}
                        type={toolArgs.type || 'insight'}
                        priority={toolArgs.priority}
                    />
                );
            }
            if (normalizedName === 'rendertable') {
                // If body has columns/rows as JSON, render DataTable
                if (toolArgs.columns && toolArgs.rows) {
                    return <DataTable columns={toolArgs.columns} rows={toolArgs.rows} />;
                }
                // If body is raw markdown table, render it as markdown
                if (toolArgs._raw) {
                    return (
                        <div className="my-4 overflow-hidden border border-nobel-gold/10 rounded-2xl bg-white shadow-sm">
                            <div className="prose prose-sm max-w-none p-4">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{toolArgs._raw}</ReactMarkdown>
                            </div>
                        </div>
                    );
                }
            }
            if (normalizedName === 'renderswotanalysis') {
                return (
                    <SWOTAnalysisCard
                        strengths={toolArgs.strengths || []}
                        weaknesses={toolArgs.weaknesses || []}
                        opportunities={toolArgs.opportunities || []}
                        threats={toolArgs.threats || []}
                        competitorName={toolArgs.competitorName}
                    />
                );
            }
            if (normalizedName === 'renderprocessflow') {
                return (
                    <ProcessFlowCard
                        title={toolArgs.title || 'Process'}
                        steps={toolArgs.steps || []}
                    />
                );
            }
            if (normalizedName === 'renderokrcard') {
                return (
                    <OKRCard
                        objective={toolArgs.objective || toolArgs.title || 'Objective'}
                        timeline={toolArgs.timeline || ''}
                        status={toolArgs.status || 'In Progress'}
                        progress={Number(toolArgs.progress) || 0}
                        keyResults={toolArgs.keyResults || []}
                    />
                );
            }
            if (normalizedName === 'renderexecutionaudit') {
                return (
                    <ExecutionAudit
                        status={toolArgs.status || 'Unknown'}
                        missingDataPoints={toolArgs.missingDataPoints || []}
                        executiveSummary={toolArgs.executiveSummary}
                    />
                );
            }

            // NAICS Lookup Result
            if (normalizedName === 'lookupnaicscode' || normalizedName === 'getnaicscodedetails') {
                const naicsResults = toolArgs._naicsResult;
                if (!naicsResults) {
                    return (
                        <div className="my-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
                            <p className="text-stone-500 text-sm">No NAICS results found.</p>
                        </div>
                    );
                }

                const isArray = Array.isArray(naicsResults);
                const results = isArray ? naicsResults : [naicsResults];

                return (
                    <div className="my-6 w-full">
                        <div className="bg-gradient-to-r from-purple-50 to-stone-50 rounded-2xl border border-purple-100 overflow-hidden">
                            <div className="p-4 bg-purple-600 text-white flex items-center gap-3">
                                <Building2 className="w-5 h-5" />
                                <span className="font-bold">NAICS Code Lookup</span>
                                <span className="ml-auto text-sm opacity-80">{results.length} result(s)</span>
                            </div>
                            <div className="divide-y divide-stone-100">
                                {results.slice(0, 5).map((code: any, idx: number) => (
                                    <div key={idx} className="p-4 hover:bg-purple-50/50 transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <span className="font-mono font-bold text-purple-700">{code.id}</span>
                                                <p className="text-stone-900 font-medium mt-1">{code.description}</p>
                                                <p className="text-xs text-stone-500 mt-1">
                                                    Sector {code.sectorId}: {code.sectorDescription}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                {code.employeeCountLimit ? (
                                                    <div className="flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">
                                                        <Users className="w-3 h-3" />
                                                        <span className="text-xs font-bold">{code.employeeCountLimit.toLocaleString()} employees</span>
                                                    </div>
                                                ) : code.revenueLimit ? (
                                                    <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                                                        <DollarSign className="w-3 h-3" />
                                                        <span className="text-xs font-bold">${(code.revenueLimit * 1000000).toLocaleString()} revenue</span>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {results.length > 5 && (
                                <div className="p-3 bg-stone-50 text-center text-sm text-stone-500">
                                    +{results.length - 5} more results
                                </div>
                            )}
                        </div>
                    </div>
                );
            }

            // Fallback: show as a styled card with parsed args
            return (
                <div className="my-4 p-5 bg-stone-50 rounded-2xl border border-stone-200">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">{toolName}</div>
                    {toolArgs._raw ? (
                        <div className="prose prose-sm max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{toolArgs._raw}</ReactMarkdown>
                        </div>
                    ) : (
                        <pre className="text-xs font-mono text-stone-600 whitespace-pre-wrap">
                            {JSON.stringify(toolArgs, null, 2)}
                        </pre>
                    )}
                </div>
            );
        }
    }

    // Attempt to render UI components for specific JSON structures
    if (isJson) {
        try {
            const content = String(children).replace(/\n/g, '');
            const parsed = JSON.parse(content);

            // Check for ActionCard structure
            if (parsed.title && parsed.description && parsed.buttonLabel && parsed.navigationTarget) {
                return (
                    <ActionCard
                        title={parsed.title}
                        description={parsed.description}
                        buttonLabel={parsed.buttonLabel}
                        navigationTarget={parsed.navigationTarget}
                        onNavigate={onNavigate}
                    />
                );
            }

            // Check for OKR structure
            if (parsed.keyResults && Array.isArray(parsed.keyResults) && (parsed.objective || parsed.title)) {
                // Calculate progress if not provided
                let progress = parsed.progress;
                if (progress === undefined && parsed.keyResults.length > 0) {
                    const totalProgress = parsed.keyResults.reduce((acc: number, kr: any) => acc + (kr.progress || 0), 0);
                    progress = Math.round(totalProgress / parsed.keyResults.length);
                }

                // Map Key Results
                const mappedKRs = parsed.keyResults.map((kr: any) => {
                    // Determine status
                    let status: 'completed' | 'in-progress' | 'pending' = 'pending';
                    if (kr.progress >= 100) status = 'completed';
                    else if (kr.progress > 0) status = 'in-progress';

                    return {
                        label: kr.description || kr.label || "Key Result",
                        target: `${kr.target}${kr.unit || ''}`,
                        current: `${kr.progress}${kr.unit || ''}`,
                        status: status
                    };
                });

                // Format Overall Status
                let statusLabel = parsed.status || "In Progress";
                if (statusLabel === "NOT_STARTED") statusLabel = "Not Started";
                if (statusLabel === "IN_PROGRESS") statusLabel = "On Track"; // Default to positive mapping for demo

                return (
                    <OKRCard
                        objective={parsed.objective || parsed.title}
                        timeline={parsed.title || "Quarterly Goal"} // Use title as timeline/header if objective is separate
                        status={statusLabel}
                        progress={progress || 0}
                        keyResults={mappedKRs}
                    />
                );
            }

        } catch (e) {
            // Not valid JSON or doesn't match schema, fall through to default code block
        }
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(String(children));
        setIsCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setIsCopied(false), 2000);
    };

    // Special handling for plain text/markdown blocks (Light Theme)
    const isText = ['text', 'txt', 'markdown', 'md'].includes(language);

    if (isText) {
        return (
            <div className="my-4 relative group">
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                        onClick={handleCopy}
                        className="p-1.5 bg-white border border-stone-200 hover:border-nobel-gold rounded-md shadow-sm text-stone-400 hover:text-nobel-gold transition-colors"
                        title="Copy content"
                    >
                        {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                </div>
                <div className="bg-stone-50 border border-stone-100 rounded-xl p-5 text-sm text-stone-700 leading-relaxed font-serif shadow-sm whitespace-pre-wrap">
                    {children}
                </div>
            </div>
        );
    }

    // Default Dark Terminal for Code
    return (
        <div className="my-6 rounded-xl overflow-hidden bg-[#1e1e1e] border border-white/10 shadow-lg group">
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-white/5 cursor-pointer select-none"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-gray-400" />
                    <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">
                        {language}
                    </span>
                    {isJson && (
                        <span className="text-[9px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded ml-2 font-bold uppercase tracking-wider">
                            Data Object
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCopy();
                        }}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
                        title="Copy"
                    >
                        {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                    <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDown size={16} className="text-gray-500" />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'opacity-100 max-h-[800px]' : 'opacity-0 max-h-0'} overflow-auto custom-scrollbar`}>
                <pre className="p-4 m-0 text-[13px] font-mono leading-relaxed text-gray-300">
                    {children}
                </pre>
            </div>
            {!isExpanded && (
                <div className="px-4 py-2 text-[10px] text-gray-500 font-mono italic">
                    {String(children).slice(0, 50)}...
                </div>
            )}
        </div>
    );
};

export default CodeBlock;
