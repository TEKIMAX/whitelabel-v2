import React from 'react';
import { X, Sliders, Search, Users, GitCompare, Check, MapPin, TrendingUp, Loader2, AlertCircle, Info, Calculator, Download, Zap, ExternalLink, ChevronDown, MessageSquare, Swords, Copy, CheckCircle2, Plus, Sparkles } from 'lucide-react';

// API Base URL


const ACRONYMS = {
    TAM: { title: "Total Addressable Market", desc: "The total market demand for your product or service if 100% market share was achieved." },
    SAM: { title: "Serviceable Available Market", desc: "The portion of TAM that is within your geographical reach and matches your product capabilities." },
    SOM: { title: "Serviceable Obtainable Market", desc: "The portion of SAM that you can realistically capture in the short term." },
    NAICS: { title: "North American Industry Classification System", desc: "The standard used by Federal statistical agencies in classifying business establishments." },
    ARPU: { title: "Annual Revenue Per User", desc: "The average revenue generated per customer or user on an annual basis." }
};

interface ConfidenceData {
    score: number;
    level: string;
    factors: string[];
}

interface SizingConfigSheetProps {
    isOpen: boolean;
    onClose: () => void;
    config: SizingConfig;
    onConfigChange: (config: SizingConfig) => void;
    canvasSegments: string[];
    topDownData?: { tam: number; sam: number; som: number; status?: string };
    bottomUpData?: { tam: number; sam: number; som: number };
    arpu: number;
    confidenceData?: ConfidenceData;
    convexClient?: { action: (ref: any, args: any) => Promise<any> };
    canvasData?: { problem?: string; segments?: string; businessName?: string; businessDescription?: string };
    onAddCompetitor?: (competitor: { name: string; description: string; differentiator: string; url?: string | null }) => void;
}

const formatCurrency = (value: number): string => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toLocaleString()}`;
};

const TAB_DESCRIPTIONS: Record<string, string> = {
    naics: "1. Industry: Select a specific NAICS industry code to pull real-world establishment and employment data.",
    geography: "2. Geography: Refine your sizing calculation by targeting specific US states or the entire country.",
    trends: "3. Trends: View historical trajectory and projected growth rates for your selected industry.",
    config: "4. Assumptions: Set your core market capture percentages (SAM/SOM) and see the impact on results.",
    segments: "5. Segments: Map your validated customer segments from the Lean Canvas to your sizing model.",
    compare: "6. Compare: See how your validated bottom-up data stacks up against top-down industry estimates.",
    interview: "7. Interview: AI-generated customer interview script based on your Canvas problem and segments.",
    discover: "8. Discover: AI-powered competitor discovery to auto-populate your competitive matrix."
};

import { useSizingConfigLogic, SizingConfig, NaicsCode } from '../hooks/useSizingConfigLogic';

const SizingConfigSheet: React.FC<SizingConfigSheetProps> = ({
    isOpen,
    onClose,
    config,
    onConfigChange,
    canvasSegments,
    topDownData,
    bottomUpData,
    arpu,
    confidenceData,
    convexClient,
    canvasData,
    onAddCompetitor
}) => {
    const [copiedIdx, setCopiedIdx] = React.useState<number | null>(null);
    const [addedCompetitors, setAddedCompetitors] = React.useState<Set<string>>(new Set());

    const {
        activeTab, setActiveTab,
        localConfig, setLocalConfig,
        handleApply,
        naicsSearch, setNaicsSearch,
        naicsResults, naicsLoading,
        states, statesLoading,
        trends, trendsLoading, trendsError, availableYearRange,
        dailyIntel, intelLoading, intelError,
        localConfidence, confidenceLoading,
        showAssumptionsHelp, setShowAssumptionsHelp,
        showTrendsHelp, setShowTrendsHelp,
        showSegmentHelp, setShowSegmentHelp,
        showDailyIntel, setShowDailyIntel,
        interviewQuestions, interviewLoading, interviewError, generateInterviewQuestions,
        discoveredCompetitors, competitorLoading, competitorError, discoverCompetitors
    } = useSizingConfigLogic(config, onConfigChange, onClose, arpu, convexClient, canvasData);

    const handleCopyQuestion = (question: string, idx: number) => {
        navigator.clipboard.writeText(question);
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 2000);
    };

    const handleAddCompetitor = (comp: any) => {
        if (onAddCompetitor) {
            onAddCompetitor({
                name: comp.name,
                description: comp.description,
                differentiator: comp.differentiator,
                url: comp.url
            });
            setAddedCompetitors(prev => new Set(prev).add(comp.name));
        }
    };


    const tabs = [
        { id: 'naics', label: 'Industry', icon: Search },
        { id: 'geography', label: 'Geography', icon: MapPin },
        { id: 'trends', label: 'Trends', icon: TrendingUp },
        { id: 'config', label: 'Assumptions', icon: Sliders },
        { id: 'segments', label: 'Segments', icon: Users },
        { id: 'compare', label: 'Compare', icon: GitCompare },
        { id: 'interview', label: 'Interview', icon: MessageSquare },
        { id: 'discover', label: 'Discover', icon: Swords },
    ] as const;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />

            {/* Sheet */}
            <div className="relative w-1/2 h-full bg-stone-900 shadow-2xl flex flex-col animate-slide-in-right text-stone-300">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-stone-800 bg-stone-950/50">
                    <div>
                        <h2 className="font-serif text-2xl text-white flex items-center gap-3">
                            Market Intelligence
                            {topDownData?.status === 'analyzing' && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-nobel-gold/10 rounded-full border border-nobel-gold/20 animate-in fade-in zoom-in duration-300">
                                    <div className="relative">
                                        <div className="w-2 h-2 bg-nobel-gold rounded-full animate-ping absolute inset-0" />
                                        <div className="w-2 h-2 bg-nobel-gold rounded-full relative" />
                                    </div>
                                    <span className="text-[10px] font-bold text-nobel-gold uppercase tracking-wider">Analysis Running</span>
                                </div>
                            )}
                        </h2>
                        <p className="text-sm text-stone-500 mt-1">Configure parameters for sizing & research</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-stone-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-8 pt-4 pb-0 bg-stone-950/30">
                    <div className="flex items-center gap-1 overflow-x-auto pb-4">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-nobel-gold text-white shadow-sm'
                                    : 'text-stone-400 hover:bg-stone-800 hover:text-white'
                                    }`}
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Description Area */}
                    <div className="pb-6 pt-2 border-t border-stone-800 animate-in fade-in slide-in-from-top-1 duration-300">
                        <p className="text-sm text-stone-400 font-medium leading-relaxed italic">
                            "{TAB_DESCRIPTIONS[activeTab]}"
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 border-t border-stone-800">
                    {/* Configuration Tab */}
                    {activeTab === 'config' && (
                        <div className="max-w-2xl space-y-8">
                            {/* Educational Accordion */}
                            <div className="bg-stone-900 rounded-xl border border-stone-800 shadow-sm overflow-hidden transition-all">
                                <button
                                    onClick={() => setShowAssumptionsHelp(!showAssumptionsHelp)}
                                    className="w-full px-5 py-4 flex justify-between items-center text-xs font-bold uppercase tracking-widest text-stone-400 bg-stone-950/30 hover:bg-stone-800 hover:text-white transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <Info className="w-3.5 h-3.5 text-nobel-gold/70" />
                                        Understanding SAM & SOM Assumptions
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform duration-300 ${showAssumptionsHelp ? 'rotate-180 text-nobel-gold' : ''}`} />
                                </button>

                                {showAssumptionsHelp && (
                                    <div className="px-6 pb-6 pt-2 bg-stone-950 text-stone-300 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-4">
                                            <div className="p-3 bg-stone-900 rounded-lg border border-stone-800">
                                                <p className="text-[11px] leading-relaxed">
                                                    Assumptions allow you to drill down from the <strong className="text-white">total industry</strong> to the specific <strong className="text-white">dollars you can capture</strong> using percentages.
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3">
                                                <div className="flex gap-3">
                                                    <div className="w-6 h-6 rounded bg-nobel-gold/20 flex items-center justify-center text-nobel-gold text-[10px] font-bold shrink-0">1</div>
                                                    <div>
                                                        <span className="block text-[10px] font-bold text-white uppercase tracking-wider mb-0.5 text-nobel-gold">SAM %</span>
                                                        <p className="text-[10px] text-stone-400">The portion of the total market that physically matches your product and geography. Usually 20-40%.</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-6 h-6 rounded bg-nobel-gold/20 flex items-center justify-center text-nobel-gold text-[10px] font-bold shrink-0">2</div>
                                                    <div>
                                                        <span className="block text-[10px] font-bold text-white uppercase tracking-wider mb-0.5 text-nobel-gold">SOM %</span>
                                                        <p className="text-[10px] text-stone-400">The percentage of that SAM you expect to capture in 2-3 years. Industry standard is 1-5%.</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-6 h-6 rounded bg-nobel-gold/20 flex items-center justify-center text-nobel-gold text-[10px] font-bold shrink-0">3</div>
                                                    <div>
                                                        <span className="block text-[10px] font-bold text-white uppercase tracking-wider mb-0.5 text-nobel-gold">Confidence</span>
                                                        <p className="text-[10px] text-stone-400">The AI constantly evaluates these percentages against your industry trends to score your model's reliability.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Confidence Score */}
                            {(localConfidence || confidenceLoading) && (
                                <div className={`p-4 rounded-xl border transition-colors ${confidenceLoading ? 'bg-stone-900 border-stone-800 opacity-50' :
                                    localConfidence?.level === 'High' ? 'bg-emerald-950/30 border-emerald-900/50' :
                                        localConfidence?.level === 'Medium' ? 'bg-amber-950/30 border-amber-900/50' :
                                            'bg-red-950/30 border-red-900/50'
                                    }`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">Data Confidence</span>
                                            {confidenceLoading && <Loader2 className="w-3 h-3 text-stone-400 animate-spin" />}
                                            <div className="group relative">
                                                <Info className="w-3 h-3 text-stone-400 cursor-help" />
                                                <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-stone-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                                    Calculated based on data source quality, NAICS specificity, and interview volume.
                                                </div>
                                            </div>
                                        </div>
                                        {localConfidence && (
                                            <span className={`text-sm font-bold ${localConfidence.level === 'High' ? 'text-emerald-400' :
                                                localConfidence.level === 'Medium' ? 'text-amber-400' :
                                                    'text-red-400'
                                                }`}>
                                                {(localConfidence.score * 100).toFixed(0)}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${confidenceLoading ? 'bg-stone-700' :
                                                localConfidence?.level === 'High' ? 'bg-emerald-500' :
                                                    localConfidence?.level === 'Medium' ? 'bg-amber-500' :
                                                        'bg-red-500'
                                                }`}
                                            style={{ width: `${(localConfidence?.score || 0) * 100}%` }}
                                        />
                                    </div>
                                    {localConfidence?.factors && localConfidence.factors.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {localConfidence.factors.map((f, i) => (
                                                <span key={i} className="text-[9px] px-1.5 py-0.5 bg-stone-900/50 border border-stone-800 rounded-full text-stone-400 font-medium">{f}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="p-6 bg-stone-900 rounded-xl border border-stone-800">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-bold uppercase tracking-wider text-stone-400">ARPU</label>
                                    <span className="text-xs text-stone-500">From Revenue Model</span>
                                </div>
                                <div className="text-3xl font-serif font-bold text-white">
                                    ${arpu.toLocaleString()}<span className="text-sm font-sans font-normal text-stone-500 ml-2">/year</span>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-sm font-bold uppercase tracking-wider text-stone-400">SAM %</label>
                                        <span className="text-lg font-bold text-nobel-gold">{localConfig.samPercentage}%</span>
                                    </div>
                                    <input
                                        type="range" min="1" max="50" value={localConfig.samPercentage}
                                        onChange={(e) => setLocalConfig({ ...localConfig, samPercentage: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-stone-800 rounded-full appearance-none cursor-pointer accent-nobel-gold"
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-sm font-bold uppercase tracking-wider text-stone-400">SOM %</label>
                                        <span className="text-lg font-bold text-white">{localConfig.somPercentage}%</span>
                                    </div>
                                    <input
                                        type="range" min="1" max="20" value={localConfig.somPercentage}
                                        onChange={(e) => setLocalConfig({ ...localConfig, somPercentage: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-stone-800 rounded-full appearance-none cursor-pointer accent-stone-300"
                                    />
                                </div>
                            </div>

                            {(localConfig.naicsCode || localConfig.geography) && (
                                <div className="flex gap-3">
                                    {localConfig.naicsCode && (
                                        <div className="flex-1 p-3 bg-emerald-950/30 rounded-lg border border-emerald-900/50">
                                            <div className="text-[10px] font-bold uppercase text-emerald-500">Industry</div>
                                            <div className="text-xs text-emerald-300 truncate">{localConfig.naicsCode} - {localConfig.naicsTitle}</div>
                                        </div>
                                    )}
                                    {localConfig.geography && (
                                        <div className="flex-1 p-3 bg-blue-950/30 rounded-lg border border-blue-900/50">
                                            <div className="text-[10px] font-bold uppercase text-blue-500">Geography</div>
                                            <div className="text-xs text-blue-300">{localConfig.geography}</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* NAICS Search Tab */}
                    {activeTab === 'naics' && (
                        <div className="max-w-2xl space-y-6">
                            <div className="p-4 bg-stone-900 rounded-xl border border-stone-800 mb-6">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">What is NAICS?</span>
                                </div>
                                <p className="text-xs text-stone-400 leading-relaxed italic">
                                    <strong className="text-white">{ACRONYMS.NAICS.title}</strong>: {ACRONYMS.NAICS.desc} Selecting one allows us to pull Census data for total establishments.
                                </p>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                                <input
                                    type="text"
                                    placeholder="Search industry by name (e.g. 'Software' or 'Dental')..."
                                    value={naicsSearch}
                                    onChange={(e) => setNaicsSearch(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 border border-stone-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-nobel-gold focus:border-nobel-gold bg-stone-950/30 text-white placeholder-stone-600"
                                />
                                {naicsLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-nobel-gold animate-spin" />}
                            </div>

                            <div className="space-y-2">
                                {naicsResults.map(naics => (
                                    <button
                                        key={naics.code}
                                        onClick={() => setLocalConfig({ ...localConfig, naicsCode: naics.code, naicsTitle: naics.title })}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${localConfig.naicsCode === naics.code
                                            ? 'border-nobel-gold bg-nobel-gold/[0.05] ring-1 ring-nobel-gold'
                                            : 'border-stone-800 hover:border-stone-700 hover:bg-stone-900 bg-stone-950/30'
                                            }`}
                                    >
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="font-mono text-[10px] font-bold text-nobel-gold mb-1">{naics.code}</div>
                                            <div className="text-sm font-bold text-white truncate">{naics.title}</div>
                                            {naics.description && <div className="text-[11px] text-stone-400 mt-1 line-clamp-1">{naics.description}</div>}
                                        </div>
                                        {localConfig.naicsCode === naics.code && <Check className="w-4 h-4 text-nobel-gold" />}
                                    </button>
                                ))}
                                {naicsSearch && naicsResults.length === 0 && !naicsLoading && (
                                    <div className="text-center py-12">
                                        <Calculator className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                                        <p className="text-sm text-stone-400">No industries found for "{naicsSearch}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Geography Tab */}
                    {activeTab === 'geography' && (
                        <div className="max-w-2xl space-y-6">
                            <div className="p-4 bg-stone-900 rounded-xl border border-stone-800 mb-6">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">Market Filtering</span>
                                <p className="text-xs text-stone-400 italic mt-1 leading-relaxed">
                                    Limit the sizing calculation to a specific state or keep it national for the full TAM model.
                                </p>
                            </div>

                            {statesLoading ? (
                                <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-nobel-gold animate-spin" /></div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setLocalConfig({ ...localConfig, geography: 'US' })}
                                        className={`p-4 rounded-xl border text-left flex items-center justify-between group transition-all ${localConfig.geography === 'US' || !localConfig.geography
                                            ? 'border-nobel-gold bg-nobel-gold/[0.05] ring-1 ring-nobel-gold'
                                            : 'border-stone-800 hover:border-stone-700 hover:bg-stone-900 bg-stone-950/30'
                                            }`}
                                    >
                                        <div>
                                            <div className="font-bold text-sm tracking-tight text-white">United States</div>
                                            <div className={`text-[10px] text-stone-500`}>National Coverage</div>
                                        </div>
                                        <Check className={`w-4 h-4 text-nobel-gold ${localConfig.geography === 'US' ? 'opacity-100' : 'opacity-0'}`} />
                                    </button>
                                    {states.map(state => (
                                        <button
                                            key={state.fips}
                                            onClick={() => setLocalConfig({ ...localConfig, geography: state.abbreviation })}
                                            className={`p-4 rounded-xl border text-left flex items-center justify-between group transition-all ${localConfig.geography === state.abbreviation
                                                ? 'border-nobel-gold bg-nobel-gold/[0.05] ring-1 ring-nobel-gold'
                                                : 'border-stone-800 hover:border-stone-700 hover:bg-stone-900 bg-stone-950/30'
                                                }`}
                                        >
                                            <div>
                                                <div className="font-bold text-sm text-white tracking-tight">{state.name}</div>
                                                <div className="text-[10px] text-stone-500 uppercase font-bold tracking-widest">{state.abbreviation}</div>
                                            </div>
                                            {localConfig.geography === state.abbreviation && <Check className="w-4 h-4 text-nobel-gold" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Trends Tab */}
                    {activeTab === 'trends' && (
                        <div className="max-w-sm space-y-6">
                            {/* Educational Accordion */}
                            <div className="bg-stone-900 rounded-xl border border-stone-800 shadow-sm overflow-hidden transition-all">
                                <button
                                    onClick={() => setShowTrendsHelp(!showTrendsHelp)}
                                    className="w-full px-5 py-4 flex justify-between items-center text-xs font-bold uppercase tracking-widest text-stone-400 bg-stone-950/30 hover:bg-stone-800 hover:text-white transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <Info className="w-3.5 h-3.5 text-nobel-gold/70" />
                                        How Trends & Intelligence Sourcing Works
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-stone-500 transition-transform duration-300 ${showTrendsHelp ? 'rotate-180 text-nobel-gold' : ''}`} />
                                </button>

                                {showTrendsHelp && (
                                    <div className="px-6 pb-6 pt-2 bg-stone-950 text-stone-300 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-4">
                                            <div className="p-3 bg-stone-900 rounded-lg border border-stone-800">
                                                <p className="text-[11px] leading-relaxed">
                                                    Trends combine <strong className="text-white">historical data</strong> from the Bureau of Labor Statistics with <strong className="text-white">real-time AI signals</strong> from current market reports.
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3">
                                                <div className="flex gap-3">
                                                    <div className="w-6 h-6 rounded bg-nobel-gold/20 flex items-center justify-center text-nobel-gold text-[10px] font-bold shrink-0">1</div>
                                                    <div>
                                                        <span className="block text-[10px] font-bold text-white uppercase tracking-wider mb-0.5 text-nobel-gold">The pulse</span>
                                                        <p className="text-[10px] text-stone-400">Growth rates are dynamically calculated based on the year range you select on the sliders.</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-6 h-6 rounded bg-nobel-gold/20 flex items-center justify-center text-nobel-gold text-[10px] font-bold shrink-0">2</div>
                                                    <div>
                                                        <span className="block text-[10px] font-bold text-white uppercase tracking-wider mb-0.5 text-nobel-gold">Intelligence signals</span>
                                                        <p className="text-[10px] text-stone-400">Daily Intel scans for sector-specific sentiment and news releases to provide immediate context.</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-6 h-6 rounded bg-nobel-gold/20 flex items-center justify-center text-nobel-gold text-[10px] font-bold shrink-0">3</div>
                                                    <div>
                                                        <span className="block text-[10px] font-bold text-white uppercase tracking-wider mb-0.5 text-nobel-gold">Verification</span>
                                                        <p className="text-[10px] text-stone-400">Direct OEWS links and CSV downloads ensure your pitch deck is backed by official source records.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!localConfig.naicsCode ? (
                                <div className="p-12 text-center bg-stone-900 rounded-2xl border border-dashed border-stone-800">
                                    <div className="w-16 h-16 bg-stone-950 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-stone-800">
                                        <Search className="w-6 h-6 text-stone-500" />
                                    </div>
                                    <h4 className="font-serif text-lg text-white mb-2">Identify Industry First</h4>
                                    <p className="text-sm text-stone-400 max-w-xs mx-auto">We need an industry code to pull BLS establishment trends and growth rates.</p>
                                    <button onClick={() => setActiveTab('naics')} className="mt-6 text-xs font-bold uppercase tracking-widest text-nobel-gold hover:text-yellow-500 transition-colors">
                                        Go to NAICS Tab →
                                    </button>
                                </div>
                            ) : (trendsLoading && !trends) ? (
                                <div className="flex items-center justify-center py-24"><Loader2 className="w-10 h-10 text-nobel-gold animate-spin" /></div>
                            ) : trendsError ? (
                                <div className="p-4 bg-red-950/30 text-red-400 rounded-xl border border-red-900/50 text-sm flex items-center gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-500" /> {trendsError}
                                </div>
                            ) : trends ? (
                                <div className={`space-y-6 transition-opacity duration-300 ${trendsLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                    <div className="p-8 bg-stone-900 rounded-2xl relative overflow-hidden">
                                        <TrendingUp className="absolute right-[-20px] top-[-20px] w-48 h-48 text-white/5 rotate-12" />
                                        <div className="relative z-10">
                                            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-nobel-gold mb-4 block">Market Trajectory</span>
                                            <h3 className="font-serif text-2xl text-white mb-2 leading-tight">{trends.industry_title}</h3>
                                            <div className="flex items-center gap-4">
                                                <div className="px-2 py-1 bg-stone-800 rounded text-[10px] font-mono text-stone-400">NAICS {trends.naics_code}</div>
                                                <div className="h-4 w-px bg-stone-700" />
                                                <div className="flex items-center gap-3">
                                                    <a href={trends.source_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-stone-500 hover:text-white transition-colors underline underline-offset-4">Source: BLS.gov</a>
                                                    {trends.reference_url && (
                                                        <>
                                                            <div className="h-4 w-px bg-stone-700" />
                                                            <a href={trends.reference_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-stone-500 hover:text-white transition-colors underline underline-offset-4">Reference: OEWS</a>
                                                        </>
                                                    )}
                                                    {trends.download_url && (
                                                        <a
                                                            href={trends.download_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 text-[10px] font-bold text-nobel-gold hover:text-yellow-500 transition-colors uppercase tracking-wider"
                                                        >
                                                            <Download className="w-3 h-3" />
                                                            CSV Data
                                                        </a>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-8 flex items-baseline gap-2">
                                                <div className={`text-4xl font-serif font-bold ${trends.growth_rate_5yr && trends.growth_rate_5yr >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {trends.growth_rate_5yr && trends.growth_rate_5yr >= 0 ? '+' : ''}{trends.growth_rate_5yr?.toFixed(1)}%
                                                </div>
                                                <div className="text-stone-400 text-xs font-medium">
                                                    {localConfig.yearRange?.start && localConfig.yearRange?.end
                                                        ? `${localConfig.yearRange.end - localConfig.yearRange.start}-Year Projected Growth`
                                                        : '5-Year Projected Growth'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Industry Summary */}
                                    {trends.summary && (
                                        <div className="p-6 bg-stone-900 rounded-2xl border border-stone-800">
                                            <div className="flex items-start gap-3">
                                                <Info className="w-4 h-4 text-stone-500 mt-1 shrink-0" />
                                                <div className="space-y-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 block">Industry Definition</span>
                                                    <p className="text-sm text-stone-400 leading-relaxed italic">
                                                        "{trends.summary}"
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Year Range Filter */}
                                    <div className="p-4 bg-stone-900 rounded-xl border border-stone-800">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">Year Range Filter</span>
                                            <span className="text-xs font-bold text-nobel-gold">
                                                {localConfig.yearRange?.start || availableYearRange?.start || 2018} — {localConfig.yearRange?.end || availableYearRange?.end || 2023}
                                            </span>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <input
                                                    type="range"
                                                    min={availableYearRange?.start || 2010}
                                                    max={localConfig.yearRange?.end || availableYearRange?.end || 2023}
                                                    value={localConfig.yearRange?.start || availableYearRange?.start || 2010}
                                                    onChange={(e) => setLocalConfig({
                                                        ...localConfig,
                                                        yearRange: {
                                                            start: parseInt(e.target.value),
                                                            end: localConfig.yearRange?.end || availableYearRange?.end || 2023
                                                        }
                                                    })}
                                                    className="w-full h-1.5 bg-stone-800 rounded-full appearance-none cursor-pointer accent-nobel-gold"
                                                />
                                                <div className="flex justify-between mt-1 text-[9px] text-stone-500 font-bold uppercase">
                                                    <span>Start Year</span>
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <input
                                                    type="range"
                                                    min={localConfig.yearRange?.start || availableYearRange?.start || 2010}
                                                    max={availableYearRange?.end || 2023}
                                                    value={localConfig.yearRange?.end || availableYearRange?.end || 2023}
                                                    onChange={(e) => setLocalConfig({
                                                        ...localConfig,
                                                        yearRange: {
                                                            start: localConfig.yearRange?.start || availableYearRange?.start || 2010,
                                                            end: parseInt(e.target.value)
                                                        }
                                                    })}
                                                    className="w-full h-1.5 bg-stone-200 rounded-full appearance-none cursor-pointer accent-stone-900"
                                                />
                                                <div className="flex justify-between mt-1 text-[9px] text-stone-400 font-bold uppercase">
                                                    <span>End Year</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 block px-2">Data History</span>
                                        {trends.trends
                                            .slice(-10) // Show up to 10 points (backend already filters by year)
                                            .map((point, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-4 bg-stone-900 rounded-xl border border-stone-800 group hover:border-stone-700 transition-all">
                                                    <span className="font-serif font-bold text-white">{point.year}</span>
                                                    <div className="flex items-center gap-6">
                                                        <div className="text-right">
                                                            <div className="text-[9px] font-bold text-stone-500 uppercase tracking-tighter">{point.metric}</div>
                                                            <div className="text-sm font-bold text-stone-300">{point.value.toLocaleString()}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>

                                    {/* Daily Market Intelligence */}
                                    <div className="space-y-4 pt-4 border-t border-stone-800 w-full overflow-hidden">
                                        <button
                                            onClick={() => setShowDailyIntel(!showDailyIntel)}
                                            className="w-full flex items-center justify-between group py-2"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Zap className={`w-4 h-4 transition-colors ${showDailyIntel ? 'text-nobel-gold' : 'text-stone-500'}`} />
                                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 group-hover:text-white transition-colors">Market Intelligence</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {dailyIntel?.sentiment && !showDailyIntel && (
                                                    <div className="flex items-center gap-2 px-2 py-0.5 bg-stone-900 rounded text-[8px] border border-stone-800">
                                                        <span className="font-bold text-stone-500 uppercase">Sentiment:</span>
                                                        <span className="font-bold text-stone-300 uppercase tracking-tighter">{dailyIntel.sentiment}</span>
                                                    </div>
                                                )}
                                                <ChevronDown className={`w-3.5 h-3.5 text-stone-500 transition-all duration-300 group-hover:text-nobel-gold ${showDailyIntel ? 'rotate-180 text-nobel-gold' : ''}`} />
                                            </div>
                                        </button>

                                        {showDailyIntel && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 pb-4">
                                                {dailyIntel?.sentiment && (
                                                    <div className="flex items-center gap-2 px-4 py-2 bg-stone-900 rounded-xl border border-stone-800">
                                                        <span className="text-[9px] font-bold text-stone-500 uppercase">Current Sector Sentiment:</span>
                                                        <span className="text-[9px] font-bold text-stone-300 uppercase tracking-wider">{dailyIntel.sentiment}</span>
                                                    </div>
                                                )}

                                                {intelLoading ? (
                                                    <div className="flex items-center justify-center py-8 bg-stone-900/50 rounded-2xl border border-dashed border-stone-800">
                                                        <div className="flex items-center gap-3 text-stone-400">
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            <span className="text-xs font-medium">Gathering market signals...</span>
                                                        </div>
                                                    </div>
                                                ) : intelError ? (
                                                    <div className="p-4 text-xs text-stone-400 italic text-center">
                                                        {intelError}
                                                    </div>
                                                ) : dailyIntel?.updates ? (
                                                    <div className="grid gap-3">
                                                        {dailyIntel.updates.map((update, idx) => (
                                                            <div key={idx} className="p-4 bg-stone-900 rounded-xl border border-stone-800 hover:border-stone-700 transition-all group">
                                                                <div className="flex items-start justify-between gap-4 mb-2">
                                                                    <h5 className="text-sm font-bold text-white group-hover:text-nobel-gold transition-colors">{update.title}</h5>
                                                                    <span className="text-[9px] font-bold text-stone-400 uppercase shrink-0 px-1.5 py-0.5 bg-stone-950/50 border border-stone-800 rounded">{update.source}</span>
                                                                </div>
                                                                <p className="text-[11px] text-stone-400 leading-relaxed break-words mb-3">
                                                                    {update.summary}
                                                                </p>
                                                                {update.url && (
                                                                    <a
                                                                        href={update.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-[10px] font-bold text-stone-400 hover:text-nobel-gold flex items-center gap-1 uppercase tracking-tighter"
                                                                    >
                                                                        Read Full Report <ExternalLink className="w-3 h-3" />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="p-8 text-center bg-stone-900/50 rounded-2xl border border-dashed border-stone-800">
                                                        <p className="text-xs text-stone-400">No recent market signals found for this sector.</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}

                    {/* Segments Tab */}
                    {activeTab === 'segments' && (
                        <div className="max-w-2xl space-y-6">
                            {/* Educational Accordion */}
                            <div className="bg-stone-900 rounded-xl border border-stone-800 shadow-sm overflow-hidden transition-all">
                                <button
                                    onClick={() => setShowSegmentHelp(!showSegmentHelp)}
                                    className="w-full px-5 py-4 flex justify-between items-center text-xs font-bold uppercase tracking-widest text-stone-400 bg-stone-950/30 hover:bg-stone-800 hover:text-white transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <Info className="w-3.5 h-3.5 text-nobel-gold/70" />
                                        How Segments Drive Calculations
                                    </span>
                                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showSegmentHelp ? 'rotate-180 text-nobel-gold' : 'text-stone-500'}`} />
                                </button>

                                {showSegmentHelp && (
                                    <div className="px-6 pb-6 pt-2 bg-stone-950 text-stone-300 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-4">
                                            <div className="p-3 bg-stone-900 rounded-lg border border-stone-800">
                                                <p className="text-[11px] leading-relaxed">
                                                    Segments are pulled directly from your <strong className="text-white">Lean Canvas</strong>. They act as the primary filter for your market math.
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3">
                                                <div className="flex gap-3">
                                                    <div className="w-6 h-6 rounded bg-nobel-gold/20 flex items-center justify-center text-nobel-gold text-[10px] font-bold shrink-0">1</div>
                                                    <div>
                                                        <span className="block text-[10px] font-bold text-white uppercase tracking-wider mb-0.5 text-nobel-gold">The Source</span>
                                                        <p className="text-[10px] text-stone-400">Picks up the target audiences you defined in the Customer Segments block.</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-6 h-6 rounded bg-nobel-gold/20 flex items-center justify-center text-nobel-gold text-[10px] font-bold shrink-0">2</div>
                                                    <div>
                                                        <span className="block text-[10px] font-bold text-white uppercase tracking-wider mb-0.5 text-nobel-gold">The Multiplier</span>
                                                        <p className="text-[10px] text-stone-400">The Sizing Engine estimates the specific population of these groups to calculate your SAM.</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-6 h-6 rounded bg-nobel-gold/20 flex items-center justify-center text-nobel-gold text-[10px] font-bold shrink-0">3</div>
                                                    <div>
                                                        <span className="block text-[10px] font-bold text-white uppercase tracking-wider mb-0.5 text-nobel-gold">Precision</span>
                                                        <p className="text-[10px] text-stone-400">Selecting only launch-relevant segments ensures your SOM isn't over-inflated.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-stone-900 rounded-xl border border-stone-800">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">Segmentation Linkage</span>
                                <p className="text-xs text-stone-400 italic mt-1 leading-relaxed">
                                    Selecting segments ensures the sizing narrative focuses on your actual target audience defined in the Lean Canvas.
                                </p>
                            </div>

                            {canvasSegments.length === 0 ? (
                                <div className="p-12 text-center bg-stone-900/50 rounded-2xl border border-dashed border-stone-800">
                                    <Users className="w-12 h-12 text-stone-500 mx-auto mb-4" />
                                    <p className="text-sm text-stone-400">No segments defined in your Business Model Canvas yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2">
                                    {canvasSegments.map((segment, idx) => {
                                        const isSelected = localConfig.selectedSegments.includes(segment);
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    const newSegments = isSelected
                                                        ? localConfig.selectedSegments.filter(s => s !== segment)
                                                        : [...localConfig.selectedSegments, segment];
                                                    setLocalConfig({ ...localConfig, selectedSegments: newSegments });
                                                }}
                                                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${isSelected ? 'border-nobel-gold bg-nobel-gold/[0.05] text-white ring-1 ring-nobel-gold' : 'border-stone-800 hover:border-stone-700 hover:bg-stone-900 bg-stone-950/30'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${isSelected ? 'border-nobel-gold bg-nobel-gold' : 'border-stone-600'}`}>
                                                        {isSelected && <Check className="w-3 h-3 text-stone-900" />}
                                                    </div>
                                                    <span className="text-sm font-bold tracking-tight">{segment}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Compare Tab */}
                    {activeTab === 'compare' && (
                        <div className="max-w-4xl space-y-8">
                            <div className="p-4 bg-stone-900 rounded-xl border border-stone-800">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">Variance Analysis</span>
                                <p className="text-xs text-stone-400 italic mt-1 leading-relaxed">
                                    Triangulate your market size by comparing bottom-up establishment data against broad industry top-down estimates.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 bg-stone-950/50 rounded-2xl border border-stone-800">
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="w-1.5 h-1.5 rounded-full bg-stone-500" />
                                        <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.3em]">Top-Down Estimate</h3>
                                    </div>
                                    {['TAM', 'SAM', 'SOM'].map(m => (
                                        <div key={m} className="mb-4 last:mb-0">
                                            <div className="text-[9px] text-stone-500 font-bold uppercase mb-1">{m}</div>
                                            <div className="text-2xl font-serif font-bold text-stone-300">
                                                {topDownData ? formatCurrency(topDownData[m.toLowerCase() as 'tam' | 'sam' | 'som']) : '—'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-6 bg-stone-900 rounded-2xl border-2 border-nobel-gold/50 shadow-lg shadow-nobel-gold/5">
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="w-1.5 h-1.5 rounded-full bg-nobel-gold animate-pulse" />
                                        <h3 className="text-[10px] font-bold text-nobel-gold uppercase tracking-[0.3em]">Bottom-Up Validated</h3>
                                    </div>
                                    {['TAM', 'SAM', 'SOM'].map(m => (
                                        <div key={m} className="mb-4 last:mb-0">
                                            <div className="text-[9px] text-stone-500 font-bold uppercase mb-1">{m}</div>
                                            <div className="text-2xl font-serif font-bold text-white">
                                                {bottomUpData ? formatCurrency(bottomUpData[m.toLowerCase() as 'tam' | 'sam' | 'som']) : '—'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Interview Script Generator Tab */}
                    {activeTab === 'interview' && (
                        <div className="max-w-2xl space-y-6">
                            {/* Canvas Context */}
                            <div className="p-4 bg-stone-900 rounded-xl border border-stone-800">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">Canvas Context</span>
                                <div className="mt-3 space-y-2">
                                    <div>
                                        <span className="text-[9px] font-bold uppercase text-stone-500">Problem</span>
                                        <p className="text-xs text-stone-400 mt-0.5">{canvasData?.problem || <span className="italic text-stone-600">Not defined — add a Problem to your Canvas</span>}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-bold uppercase text-stone-500">Segments</span>
                                        <p className="text-xs text-stone-400 mt-0.5">{canvasData?.segments || <span className="italic text-stone-600">Not defined — add Customer Segments to your Canvas</span>}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Generate Button */}
                            <button
                                onClick={generateInterviewQuestions}
                                disabled={interviewLoading || (!canvasData?.problem && !canvasData?.segments)}
                                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-stone-50 text-stone-900 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg shadow-white/5"
                            >
                                {interviewLoading ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating Questions...</>
                                ) : (
                                    <><Sparkles className="w-4 h-4" /> Generate Interview Script</>
                                )}
                            </button>

                            {/* Error */}
                            {interviewError && (
                                <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-900/50 rounded-lg">
                                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                    <p className="text-xs text-red-400">{interviewError}</p>
                                </div>
                            )}

                            {/* Questions List */}
                            {interviewQuestions.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">{interviewQuestions.length} Questions Generated</span>
                                        <button
                                            onClick={() => {
                                                const allText = interviewQuestions.map((q, i) => `${i + 1}. ${q.question}\n   → ${q.rationale}`).join('\n\n');
                                                navigator.clipboard.writeText(allText);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-stone-500 hover:text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors"
                                        >
                                            <Copy className="w-3 h-3" /> Copy All
                                        </button>
                                    </div>
                                    {interviewQuestions.map((q, idx) => (
                                        <div key={idx} className="group p-4 bg-stone-900 rounded-xl border border-stone-800 hover:border-stone-700 hover:bg-stone-800/50 transition-all">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="w-6 h-6 rounded-lg bg-nobel-gold/10 flex items-center justify-center text-[10px] font-bold text-nobel-gold">{idx + 1}</span>
                                                        <span className="text-[8px] font-bold uppercase tracking-widest text-stone-400 px-2 py-0.5 bg-stone-950/50 border border-stone-800 rounded-full">{q.category}</span>
                                                    </div>
                                                    <p className="text-sm text-white font-medium leading-relaxed">{q.question}</p>
                                                    <p className="text-[11px] text-stone-500 mt-2 italic">→ {q.rationale}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleCopyQuestion(q.question, idx)}
                                                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-stone-800 rounded-lg transition-all"
                                                >
                                                    {copiedIdx === idx ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-stone-400" />}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Empty State */}
                            {interviewQuestions.length === 0 && !interviewLoading && !interviewError && (
                                <div className="text-center py-12 bg-stone-900/50 rounded-2xl border border-dashed border-stone-800">
                                    <MessageSquare className="w-10 h-10 text-stone-600 mx-auto mb-4" />
                                    <p className="text-sm text-stone-400 font-medium">Generate AI-powered interview questions</p>
                                    <p className="text-xs text-stone-500 mt-1">Based on your Canvas problem statement and target segments</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* AI Competitor Discovery Tab */}
                    {activeTab === 'discover' && (
                        <div className="max-w-2xl space-y-6">
                            {/* Business Context */}
                            <div className="p-4 bg-stone-900 rounded-xl border border-stone-800">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">Business Context</span>
                                <p className="text-xs text-stone-400 mt-2">
                                    {canvasData?.businessDescription || canvasData?.problem || <span className="italic text-stone-600">Add a business description or Problem to your Canvas</span>}
                                </p>
                            </div>

                            {/* Discover Button */}
                            <button
                                onClick={discoverCompetitors}
                                disabled={competitorLoading || (!canvasData?.businessDescription && !canvasData?.problem)}
                                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-stone-50 text-stone-900 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg shadow-white/5"
                            >
                                {competitorLoading ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Discovering Competitors...</>
                                ) : (
                                    <><Swords className="w-4 h-4" /> Find Competitors</>
                                )}
                            </button>

                            {/* Error */}
                            {competitorError && (
                                <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-900/50 rounded-lg">
                                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                    <p className="text-xs text-red-400">{competitorError}</p>
                                </div>
                            )}

                            {/* Discovered Competitors */}
                            {discoveredCompetitors.length > 0 && (
                                <div className="space-y-3">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">{discoveredCompetitors.length} Competitors Found</span>
                                    {discoveredCompetitors.map((comp, idx) => (
                                        <div key={idx} className="p-5 bg-stone-900 rounded-xl border border-stone-800 hover:border-stone-700 hover:bg-stone-800/50 transition-all">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h4 className="text-sm font-bold text-white">{comp.name}</h4>
                                                        <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${comp.stage === 'Enterprise' ? 'bg-blue-950/50 text-blue-400 border-blue-900/50' : comp.stage === 'Growth' ? 'bg-emerald-950/50 text-emerald-400 border-emerald-900/50' : 'bg-amber-950/50 text-amber-400 border-amber-900/50'}`}>
                                                            {comp.stage}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-stone-400 leading-relaxed">{comp.description}</p>
                                                    <div className="mt-2 flex items-start gap-1.5">
                                                        <Zap className="w-3 h-3 text-nobel-gold mt-0.5 shrink-0" />
                                                        <p className="text-[11px] text-stone-500 italic">{comp.differentiator}</p>
                                                    </div>
                                                    {comp.url && (
                                                        <a href={comp.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-[10px] text-blue-400 hover:text-blue-300 font-medium tracking-wide">
                                                            <ExternalLink className="w-3 h-3" /> {comp.url}
                                                        </a>
                                                    )}
                                                    <p className="text-[10px] text-stone-500 mt-2">Why relevant: {comp.relevance}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleAddCompetitor(comp)}
                                                    disabled={addedCompetitors.has(comp.name)}
                                                    className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${addedCompetitors.has(comp.name) ? 'bg-emerald-950/30 text-emerald-500 border border-emerald-900/50' : 'bg-nobel-gold text-stone-900 hover:bg-yellow-600 shadow-sm'}`}
                                                >
                                                    {addedCompetitors.has(comp.name) ? (
                                                        <><CheckCircle2 className="w-3 h-3" /> Added</>
                                                    ) : (
                                                        <><Plus className="w-3 h-3" /> Add to Matrix</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Empty State */}
                            {discoveredCompetitors.length === 0 && !competitorLoading && !competitorError && (
                                <div className="text-center py-12 bg-stone-900/50 rounded-2xl border border-dashed border-stone-800">
                                    <Swords className="w-10 h-10 text-stone-600 mx-auto mb-4" />
                                    <p className="text-sm text-stone-400 font-medium">Discover your competitive landscape</p>
                                    <p className="text-xs text-stone-500 mt-1">AI will find 3-5 real competitors based on your business description</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-4 px-8 py-6 border-t border-stone-800 bg-stone-950/50">
                    <div className="flex items-center gap-2 text-stone-400">
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-white transition-colors">Cancel</button>
                        <button onClick={handleApply} className="px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] text-stone-900 bg-nobel-gold hover:bg-yellow-600 rounded-lg shadow-xl shadow-nobel-gold/10 transition-all active:scale-95">
                            Apply Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default SizingConfigSheet;
