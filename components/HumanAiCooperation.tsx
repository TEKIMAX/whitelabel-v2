
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useAIGenerateCooperationReport } from '../hooks/useAI';
import { useCreateDocument } from '../hooks/useCreate';
import { api } from "../convex/_generated/api";
import { StartupData, AISettings, ViewState, PageAccess } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Loader2, User, Bot, RefreshCw, ShieldCheck, ChevronRight, ChevronLeft, Play, Activity, FileText, X, BarChart3, TrendingUp, Brain, Target, Zap, BarChart, Handshake, Info, FlaskConical } from 'lucide-react';
import { Id } from '../convex/_generated/dataModel';
import { Logo } from './Logo';
import TabNavigation from './TabNavigation';
import ProjectSelector from './ProjectSelector';
import { SaveToFilesDialog } from './nobel_chat/SaveToFilesDialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import DotPatternBackground from './DotPatternBackground';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface HumanAiCooperationProps {
    data: StartupData;
    settings: AISettings;
    allProjects: StartupData[];
    onSwitchProject: (id: string) => void;
    onNewProject: () => void;
    onNavigate: (view: ViewState) => void;
    currentView: ViewState;
    allowedPages: PageAccess[];
    currentUserRole?: string;
}

export const HumanAiCooperation: React.FC<HumanAiCooperationProps> = ({
    data,
    settings,
    allProjects,
    onSwitchProject,
    onNewProject,
    onNavigate,
    currentView,
    allowedPages,
    currentUserRole
}) => {
    const stats = useQuery(api.analytics.getCooperationStats, { projectId: data.id as Id<"projects"> });
    const lastReport = useQuery(api.analytics.getLatestReport, { projectId: data.id as Id<"projects"> });
    const timelineData = useQuery(api.analytics.getCooperationTimeline, { projectId: data.id as Id<"projects"> });
    const generateReport = useAIGenerateCooperationReport();
    const saveReport = useMutation(api.analytics.saveReport);
    const createDocument = useCreateDocument();

    const [report, setReport] = useState<string>("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'philosophy'>('overview');
    const [showHypothesis, setShowHypothesis] = useState(false);

    // Custom Threshold Logic
    const [targetHumanRatio, setTargetHumanRatio] = useState<number>(data.targetHumanRatio ?? 50);
    const [isSavingThreshold, setIsSavingThreshold] = useState(false);
    const updateProject = useMutation(api.projects.update);

    // Sync state if external data changes
    useEffect(() => {
        if (data.targetHumanRatio !== undefined) {
            setTargetHumanRatio(data.targetHumanRatio);
        }
    }, [data.targetHumanRatio]);

    const handleSaveThreshold = async (value: number) => {
        setTargetHumanRatio(value);
        setIsSavingThreshold(true);
        try {
            await updateProject({ id: data.id as Id<"projects">, updates: { targetHumanRatio: value } });
            toast.success("Target ratio updated");
        } catch (error) {
            toast.error("Failed to save target ratio");
        } finally {
            setIsSavingThreshold(false);
        }
    };

    // Load last report when it arrives
    useEffect(() => {
        if (lastReport) {
            setReport(lastReport.content);
        } else {
            setReport("");
        }
    }, [lastReport, data.id]);

    const handleGenerate = async () => {
        if (!stats) return;
        setIsGenerating(true);
        setIsReportOpen(true); // Open the report panel when generating
        try {
            const result = await generateReport({
                startupData: data,
                humanCount: stats.humanCount,
                aiCount: stats.aiCount,
                tagCounts: stats.tagCounts,
                featureUsage: stats.featureUsage,
                modelName: settings.modelName,
                targetHumanRatio: targetHumanRatio
            });
            setReport(result);

            // Persist to Convex
            await saveReport({
                projectId: data.id as Id<"projects">,
                content: result,
                stats: {
                    humanRatio: stats.humanRatio,
                    aiRatio: stats.aiRatio,
                    humanCount: stats.humanCount,
                    aiCount: stats.aiCount
                }
            });
        } catch (e) {
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveToDocs = async (folderId: string | null, filename: string) => {
        if (!report) return;

        try {
            await createDocument({
                projectId: data.id as Id<"projects">,
                folderId: folderId ? folderId as Id<"folders"> : undefined,
                title: filename.endsWith('.md') ? filename : `${filename}.md`,
                content: report,
                type: 'doc'
            });
            toast.success("Report saved to documents");
            setIsSaveDialogOpen(false);
        } catch (error) {
            toast.error("Failed to save report");
        }
    };

    if (!stats) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-nobel-cream">
                <Loader2 className="w-8 h-8 animate-spin text-stone-300" />
            </div>
        );
    }

    const humanPercent = stats.humanRatio;
    const aiPercent = stats.aiRatio;

    return (
        <div className="h-screen flex bg-nobel-cream relative overflow-hidden">
            {/* LEFT SIDE: HERO IMAGE (30%) - Hidden when report is open */}
            <AnimatePresence>
                {!isReportOpen && (
                    <motion.div
                        initial={{ width: '30%', opacity: 1 }}
                        animate={{ width: '30%', opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="h-full relative overflow-hidden bg-stone-900 border-r border-stone-200 shadow-2xl z-20"
                    >
                        {/* Background Image */}
                        <img
                            src="/ProfessionalDiscussion.png"
                            className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105"
                            alt="Human AI Cooperation Hero"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/40 via-transparent to-stone-900/80" />

                        {/* Top Logo */}
                        <div className="absolute top-12 left-12 z-30">
                            <Logo imageClassName="h-10 w-auto brightness-0 invert" />
                        </div>

                        {/* Bottom Overlay Content */}
                        <div className="absolute inset-x-0 bottom-0 p-12 space-y-6 bg-gradient-to-t from-stone-900 via-stone-900/60 to-transparent pt-32">
                            <div className="space-y-4">
                                <h2 className="text-white text-4xl font-serif font-bold leading-tight">
                                    Human-AI <br />
                                    <span className="text-nobel-gold italic underline underline-offset-8 decoration-white/20">Cooperation.</span>
                                </h2>
                                <div className="h-1 w-12 bg-nobel-gold/50 rounded-full" />
                                <p className="text-stone-300 text-sm leading-relaxed max-w-sm font-medium">
                                    Monitor your dependency ratio to ensure you remain the <strong>pilot</strong>. Your target Human Insight is {targetHumanRatio}%.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* RIGHT SIDE: MAIN CONTENT */}
            <motion.div
                animate={{ width: isReportOpen ? '100%' : '70%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="h-full flex flex-col relative z-10"
            >
                <DotPatternBackground color="#a8a29e" />

                {/* Header */}
                <header className="px-10 py-6 flex items-center justify-between relative z-30">
                    <div className="flex items-center gap-6">
                        <TabNavigation currentView={currentView} onNavigate={onNavigate} allowedPages={allowedPages} mode="light" currentUserRole={currentUserRole} />
                    </div>
                    {report && !isReportOpen && (
                        <button
                            onClick={() => setIsReportOpen(true)}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 transition-colors flex items-center gap-2 border border-emerald-500 shadow-lg active:scale-95"
                        >
                            <FileText className="w-4 h-4" /> View Report
                        </button>
                    )}
                </header>

                {/* Main Content */}
                <main className="flex-grow flex relative z-10 overflow-hidden">
                    {/* Visualization Panel */}
                    <div className={`${isReportOpen ? 'w-1/2' : 'w-full'} flex flex-col px-16 pt-4 pb-8 transition-all duration-300 overflow-y-auto`}>
                        <div className="max-w-4xl w-full mx-auto space-y-6">

                            {/* Tab Bar */}
                            <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-full p-1 border border-stone-200 shadow-sm w-fit">
                                {(['overview', 'timeline', 'philosophy'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${activeTab === tab
                                            ? 'bg-stone-900 text-white shadow-md'
                                            : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                                            }`}
                                    >
                                        <span className="flex items-center gap-1.5">
                                            {tab === 'overview' ? <><BarChart3 className="w-3.5 h-3.5" /> Overview</> : tab === 'timeline' ? <><TrendingUp className="w-3.5 h-3.5" /> Timeline</> : <><Brain className="w-3.5 h-3.5" /> Philosophy</>}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* ─── TAB: OVERVIEW ─── */}
                            {activeTab === 'overview' && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                                            <div className="relative z-10 flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-stone-900 text-white rounded-lg">
                                                        <User className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-serif font-bold text-xl text-stone-900">Human Insight</h3>
                                                        <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Core Value</span>
                                                    </div>
                                                </div>
                                                <div className="text-3xl font-bold text-stone-900">{humanPercent.toFixed(1)}%</div>
                                            </div>
                                            <div className="h-3 bg-stone-100 rounded-full overflow-hidden mt-4">
                                                <div className="h-full bg-stone-900 rounded-full transition-all duration-1000 ease-out" style={{ width: `${humanPercent}%` }}></div>
                                            </div>
                                            <div className="flex justify-between mt-2 text-xs font-bold text-stone-400 uppercase tracking-wider">
                                                <span>{stats.humanCount} Actions</span>
                                                <span>Target: &gt;={targetHumanRatio}%</span>
                                            </div>
                                        </div>

                                        <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                                            <div className="relative z-10 flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-nobel-gold/10 text-nobel-gold rounded-lg">
                                                        <Bot className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-serif font-bold text-xl text-stone-600">AI Assisted</h3>
                                                        <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Co-Pilot Support</span>
                                                    </div>
                                                </div>
                                                <div className="text-3xl font-bold text-nobel-gold">{aiPercent.toFixed(1)}%</div>
                                            </div>
                                            <div className="h-3 bg-stone-100 rounded-full overflow-hidden mt-4">
                                                <div className="h-full bg-nobel-gold rounded-full transition-all duration-1000 ease-out" style={{ width: `${aiPercent}%` }}></div>
                                            </div>
                                            <div className="flex justify-between mt-2 text-xs font-bold text-stone-400 uppercase tracking-wider">
                                                <span>{stats.aiCount} Actions</span>
                                                <span>Target: &lt;={100 - targetHumanRatio}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Threshold Slider */}
                                    <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h4 className="font-bold text-stone-900 flex items-center gap-2">
                                                    Target Human Ratio
                                                    {isSavingThreshold && <Loader2 className="w-3 h-3 text-stone-400 animate-spin" />}
                                                </h4>
                                                <p className="text-xs text-stone-500 mt-1">Adjust the minimum percentage of human-originated intelligence for your startup.</p>
                                            </div>
                                            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-lg font-bold">
                                                {targetHumanRatio}%
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs font-bold text-stone-400 w-8">20%</span>
                                            <input
                                                type="range"
                                                min="20"
                                                max="100"
                                                step="5"
                                                value={targetHumanRatio}
                                                onChange={(e) => setTargetHumanRatio(Number(e.target.value))}
                                                onMouseUp={(e) => handleSaveThreshold(Number((e.target as HTMLInputElement).value))}
                                                onTouchEnd={(e) => handleSaveThreshold(Number((e.target as HTMLInputElement).value))}
                                                className="flex-1 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                            />
                                            <span className="text-xs font-bold text-stone-400 w-8">100%</span>
                                        </div>
                                    </div>

                                    {/* Research Hypothesis Disclaimer */}
                                    <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                                        <FlaskConical className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-amber-800">Research Mode</span>
                                                <span className="text-[9px] px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded-full font-bold uppercase tracking-wider">Hypothesis</span>
                                            </div>
                                            <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                                                The 49% threshold is a working hypothesis. We are actively researching the optimal human-AI ratio for early-stage startups.
                                            </p>
                                            <button
                                                onClick={() => setShowHypothesis(!showHypothesis)}
                                                className="text-[10px] font-bold text-amber-800 hover:text-amber-900 mt-2 flex items-center gap-1 uppercase tracking-widest transition-colors"
                                            >
                                                <Info className="w-3 h-3" />
                                                {showHypothesis ? 'Hide details' : `Why 49%?`}
                                            </button>
                                            {showHypothesis && (
                                                <div className="mt-3 pt-3 border-t border-amber-200 text-[11px] text-amber-700 leading-relaxed space-y-2">
                                                    <p>
                                                        <strong className="text-amber-900">Our hypothesis:</strong> Founders who maintain at least 49% human-originated decisions
                                                        build deeper domain expertise, stronger investor narratives, and more resilient businesses.
                                                    </p>
                                                    <p>
                                                        The 49% AI ceiling ensures AI remains a tool, not a crutch. This threshold is being validated
                                                        through ongoing research with early-stage founders and will be adjusted as we gather more data.
                                                    </p>
                                                    <p className="text-[10px] italic text-amber-600">
                                                        This is not a hard limit. Your ideal ratio depends on your stage, industry, and team.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Generate Button */}
                                    {!report && (
                                        <div className="flex justify-center pt-4">
                                            <button
                                                onClick={handleGenerate}
                                                disabled={isGenerating}
                                                className="bg-stone-900 text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-nobel-gold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                                                {isGenerating ? 'Analyzing...' : 'Generate Analysis'}
                                            </button>
                                        </div>
                                    )}

                                    {/* Stats Grid */}
                                    {!isReportOpen && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-stone-900 p-6 rounded-xl border border-stone-800 shadow-lg">
                                                <h4 className="font-serif text-lg text-white mb-4">Most Used Tags</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries(stats.tagCounts).sort(([, a]: [string, any], [, b]: [string, any]) => b - a).slice(0, 10).map(([tag, count]: [string, any]) => (
                                                        <span key={tag} className="px-2 py-1 bg-stone-800 border border-stone-700 rounded text-xs text-stone-300 font-medium">
                                                            {tag} <span className="text-stone-500 ml-1">({count})</span>
                                                        </span>
                                                    ))}
                                                    {Object.keys(stats.tagCounts).length === 0 && <span className="text-stone-500 text-sm italic">No data yet.</span>}
                                                </div>
                                            </div>

                                            <div className="bg-stone-900 p-6 rounded-xl border border-stone-800 shadow-lg">
                                                <h4 className="font-serif text-lg text-white mb-4">AI Dependency by Feature</h4>
                                                <div className="space-y-3">
                                                    {Object.entries(stats.featureUsage)
                                                        .sort(([, a]: [string, any], [, b]: [string, any]) => b.weight - a.weight) // Sort by weight descending
                                                        .map(([feature, ObjectItem]: [string, any]) => {
                                                            const counts = ObjectItem;
                                                            const total = (counts.human || 0) + (counts.ai || 0);
                                                            const aiPct = total > 0 ? (counts.ai / total) * 100 : 0;
                                                            return (
                                                                <div key={feature} className="flex items-center justify-between text-sm">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-stone-300 font-medium">{feature}</span>
                                                                        <span className="px-1.5 py-0.5 rounded bg-stone-800 text-[10px] font-bold text-stone-500 border border-stone-700">
                                                                            {counts.weight}X WGT
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-24 h-1.5 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
                                                                            <div className={`h-full ${aiPct > 50 ? 'bg-red-500' : 'bg-nobel-gold'}`} style={{ width: `${aiPct}%` }}></div>
                                                                        </div>
                                                                        <span className={`text-xs font-bold ${aiPct > 50 ? 'text-red-400' : 'text-stone-500'}`}>{aiPct.toFixed(0)}%</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ─── TAB: TIMELINE ─── */}
                            {activeTab === 'timeline' && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h3 className="font-serif text-2xl text-stone-900">Cooperation Timeline</h3>
                                                <p className="text-sm text-stone-400 mt-1">Cumulative human vs AI actions over time</p>
                                            </div>
                                            <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-wider">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-stone-900"></div>
                                                    <span className="text-stone-500">Human</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-nobel-gold"></div>
                                                    <span className="text-stone-500">AI</span>
                                                </div>
                                                <div className="flex items-center gap-2 border-l border-stone-200 pl-4 ml-2">
                                                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                                    <span className="text-emerald-600">Truthfulness Index</span>
                                                </div>
                                            </div>
                                        </div>

                                        {timelineData && timelineData.length > 0 ? (
                                            <div className="h-[320px]">
                                                <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
                                                    <ComposedChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="gradHuman" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#1c1917" stopOpacity={0.15} />
                                                                <stop offset="95%" stopColor="#1c1917" stopOpacity={0} />
                                                            </linearGradient>
                                                            <linearGradient id="gradAI" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#b8860b" stopOpacity={0.15} />
                                                                <stop offset="95%" stopColor="#b8860b" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                                                        <XAxis
                                                            dataKey="week"
                                                            tick={{ fontSize: 11, fill: '#a8a29e', fontWeight: 600 }}
                                                            axisLine={false}
                                                            tickLine={false}
                                                        />
                                                        <YAxis
                                                            yAxisId="left"
                                                            tick={{ fontSize: 11, fill: '#a8a29e', fontWeight: 600 }}
                                                            axisLine={false}
                                                            tickLine={false}
                                                            allowDecimals={false}
                                                        />
                                                        <YAxis
                                                            yAxisId="right"
                                                            orientation="right"
                                                            domain={[0, 100]}
                                                            tick={{ fontSize: 11, fill: '#10b981', fontWeight: 600 }}
                                                            axisLine={false}
                                                            tickLine={false}
                                                            tickFormatter={(value) => `${value}%`}
                                                        />
                                                        <Tooltip
                                                            contentStyle={{
                                                                backgroundColor: '#1c1917',
                                                                border: 'none',
                                                                borderRadius: '12px',
                                                                padding: '12px 16px',
                                                                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                                                            }}
                                                            labelStyle={{ color: '#a8a29e', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                                            itemStyle={{ color: '#fafaf9', fontSize: 13, fontWeight: 600 }}
                                                            formatter={(value: number, name: string) => {
                                                                if (name === 'Truthfulness Index') return [`${value.toFixed(1)}%`, name];
                                                                return [value, name];
                                                            }}
                                                        />
                                                        <Area
                                                            yAxisId="left"
                                                            type="monotone"
                                                            dataKey="cumHuman"
                                                            name="Human Actions"
                                                            stroke="#1c1917"
                                                            strokeWidth={3}
                                                            fill="url(#gradHuman)"
                                                            dot={{ fill: '#1c1917', strokeWidth: 0, r: 4 }}
                                                            activeDot={{ r: 6, fill: '#1c1917', stroke: '#fff', strokeWidth: 2 }}
                                                        />
                                                        <Area
                                                            yAxisId="left"
                                                            type="monotone"
                                                            dataKey="cumAI"
                                                            name="AI Actions"
                                                            stroke="#b8860b"
                                                            strokeWidth={3}
                                                            fill="url(#gradAI)"
                                                            dot={{ fill: '#b8860b', strokeWidth: 0, r: 4 }}
                                                            activeDot={{ r: 6, fill: '#b8860b', stroke: '#fff', strokeWidth: 2 }}
                                                        />
                                                        <Line
                                                            yAxisId="right"
                                                            type="monotone"
                                                            dataKey={(data) => {
                                                                const total = data.cumHuman + data.cumAI;
                                                                return total > 0 ? (data.cumHuman / total) * 100 : 0;
                                                            }}
                                                            name="Truthfulness Index"
                                                            stroke="#10b981"
                                                            strokeWidth={3}
                                                            dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                                                            activeDot={{ r: 7, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                                                        />
                                                    </ComposedChart>
                                                </ResponsiveContainer>
                                            </div>
                                        ) : (
                                            <div className="h-[320px] flex flex-col items-center justify-center text-stone-400">
                                                <Activity className="w-12 h-12 mb-4 opacity-20" />
                                                <p className="text-sm font-medium">No timeline data yet</p>
                                                <p className="text-xs mt-1">Actions will appear here as you use the platform</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Weekly Breakdown */}
                                    {timelineData && timelineData.length > 0 && (
                                        <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="font-serif text-lg text-stone-900">Weekly Breakdown</h3>
                                                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Recent Activity</span>
                                            </div>
                                            <div className="space-y-3">
                                                {[...timelineData].slice(-6).reverse().map((w: any, index: number, arr: any[]) => {
                                                    const total = w.human + w.ai;
                                                    const humanPct = total > 0 ? (w.human / total) * 100 : 0;

                                                    // Calculate trend (remember array is reversed, so 'previous week' is index + 1)
                                                    let trend: number | null = null;
                                                    if (index < arr.length - 1) {
                                                        const prev = arr[index + 1];
                                                        const prevTotal = prev.human + prev.ai;
                                                        const prevPct = prevTotal > 0 ? (prev.human / prevTotal) * 100 : 0;
                                                        trend = humanPct - prevPct;
                                                    }

                                                    const isGood = humanPct >= targetHumanRatio;

                                                    return (
                                                        <div key={w.week} className="flex items-center gap-6 p-4 rounded-xl border border-stone-100 hover:border-stone-200 transition-all bg-stone-50/50 hover:bg-stone-50 group">
                                                            <div className="w-24 shrink-0">
                                                                <span className="text-sm font-bold text-stone-900">{w.week}</span>
                                                                <div className="text-[10px] text-stone-400 uppercase tracking-widest mt-1">{total} Actions</div>
                                                            </div>

                                                            {/* Score */}
                                                            <div className="w-32 shrink-0 border-l border-stone-200 pl-6">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-xl font-bold ${total === 0 ? 'text-stone-300' : isGood ? 'text-emerald-600' : 'text-amber-500'}`}>
                                                                        {total > 0 ? humanPct.toFixed(0) : '-'}%
                                                                    </span>
                                                                    {trend !== null && Math.abs(trend) > 0.5 && total > 0 && (
                                                                        <span className={`text-[10px] font-bold flex items-center px-1.5 py-0.5 rounded-full ${trend > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                            {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(0)}%
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-[9px] uppercase font-bold tracking-[0.2em] text-stone-400 mt-1">Index Score</div>
                                                            </div>

                                                            {/* Volume Bar */}
                                                            <div className="flex-1 flex flex-col justify-center gap-2 ml-4">
                                                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-stone-400">
                                                                    <span>Human vs AI Volume</span>
                                                                    <div className="flex gap-2">
                                                                        <span className="text-stone-700">{w.human}H</span>
                                                                        <span className="text-nobel-gold">{w.ai}AI</span>
                                                                    </div>
                                                                </div>
                                                                <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden flex">
                                                                    <div className="h-full bg-stone-900 transition-all duration-500 group-hover:bg-stone-800" style={{ width: `${humanPct}%` }}></div>
                                                                    <div className="h-full bg-nobel-gold transition-all duration-500 group-hover:bg-yellow-500" style={{ width: `${total > 0 ? 100 - humanPct : 0}%` }}></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ─── TAB: PHILOSOPHY ─── */}
                            {activeTab === 'philosophy' && (
                                <div className="space-y-8 animate-in fade-in duration-300">
                                    {/* Hero */}
                                    <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 p-10 rounded-2xl border border-stone-700 shadow-2xl text-white relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-nobel-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                                        <div className="relative z-10">
                                            <div className="text-[10px] uppercase font-bold tracking-[0.3em] text-nobel-gold mb-4">Our Philosophy</div>
                                            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 leading-tight">
                                                The Pilot, Not the Passenger.
                                            </h2>
                                            <p className="text-stone-300 text-base leading-relaxed max-w-2xl">
                                                We believe that <strong className="text-white">founders should always be in control</strong>. AI is a powerful co-pilot
                                                that accelerates your work, but your human insight, creativity, and judgment are what make a startup succeed.
                                                The best outcomes come when humans lead and AI supports, not the other way around.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Principles Grid */}
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 text-emerald-700"><Target className="w-5 h-5" /></div>
                                            <h4 className="font-bold text-stone-900 text-sm mb-2">Human-Originated Decisions</h4>
                                            <p className="text-xs text-stone-500 leading-relaxed">
                                                Every strategic decision, your Canvas, your OKRs, your financial targets, should come from you.
                                                AI can suggest, but you decide. That's why we track the ratio.
                                            </p>
                                        </div>
                                        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-4 text-blue-700"><Zap className="w-5 h-5" /></div>
                                            <h4 className="font-bold text-stone-900 text-sm mb-2">AI as Force Multiplier</h4>
                                            <p className="text-xs text-stone-500 leading-relaxed">
                                                Use AI for research, drafts, analysis, and competitive intelligence. Let it handle the heavy lifting
                                                so you can focus on vision, relationships, and the details only a founder understands.
                                            </p>
                                        </div>
                                        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-4 text-amber-700"><BarChart className="w-5 h-5" /></div>
                                            <h4 className="font-bold text-stone-900 text-sm mb-2">Transparency Via Metrics</h4>
                                            <p className="text-xs text-stone-500 leading-relaxed">
                                                We don't hide AI usage, we surface it. The cooperation tracker gives you an honest view of your
                                                dependency balance. If AI exceeds {100 - targetHumanRatio}%, it's time to recalibrate.
                                            </p>
                                        </div>
                                        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-4 text-purple-700"><Handshake className="w-5 h-5" /></div>
                                            <h4 className="font-bold text-stone-900 text-sm mb-2">Investor Confidence</h4>
                                            <p className="text-xs text-stone-500 leading-relaxed">
                                                Investors want to fund founders, not AI autopilots. Showing a healthy human-AI ratio proves
                                                you understand your business deeply, a critical trust signal for fundraising.
                                            </p>
                                        </div>
                                    </div>

                                    {/* How It's Calculated */}
                                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                                        <div className="p-6 border-b border-stone-100">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
                                                    <Activity className="w-4 h-4 text-white" />
                                                </div>
                                                <h3 className="font-serif text-xl font-bold text-stone-900">How It's Calculated</h3>
                                            </div>
                                            <p className="text-sm text-stone-500">Understanding the numbers behind Human Insight and AI Assisted scores.</p>
                                        </div>

                                        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-100">
                                            {/* Human Insight */}
                                            <div className="p-6">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <User className="w-5 h-5 text-stone-700" />
                                                    <h4 className="font-bold text-stone-900">Human Insight</h4>
                                                    <span className="text-[10px] uppercase tracking-widest text-stone-400 ml-auto">Core Value</span>
                                                </div>
                                                <p className="text-xs text-stone-500 leading-relaxed mb-4">
                                                    Every item you create manually across the platform counts as a <strong className="text-stone-700">human action</strong>.
                                                    This includes canvas entries, goals, features, competitors, interviews, financial projections,
                                                    documents, milestones, and operating expenses added by you.
                                                </p>
                                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                                    <div className="text-[10px] uppercase tracking-widest text-emerald-600 font-bold mb-1">Formula</div>
                                                    <p className="text-xs text-emerald-800 font-mono">Human Actions / Total Actions × 100</p>
                                                    <p className="text-[10px] text-emerald-600 mt-1">Goal: &gt;={targetHumanRatio}%</p>
                                                </div>
                                            </div>

                                            {/* AI Assisted */}
                                            <div className="p-6">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Bot className="w-5 h-5 text-stone-700" />
                                                    <h4 className="font-bold text-stone-900">AI Assisted</h4>
                                                    <span className="text-[10px] uppercase tracking-widest text-stone-400 ml-auto">Co-Pilot Support</span>
                                                </div>
                                                <p className="text-xs text-stone-500 leading-relaxed mb-4">
                                                    Any item generated or auto-filled by AI is flagged with a <strong className="text-stone-700">source: AI</strong> marker
                                                    or an "AI Assisted" tag. This includes AI-generated canvas entries, AI research, AI-drafted
                                                    documents, and any content where you used the "Generate with AI" option.
                                                </p>
                                                <div className="bg-stone-100 border border-stone-200 rounded-lg p-3">
                                                    <div className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-1">Formula</div>
                                                    <p className="text-xs text-stone-700 font-mono">AI Actions / Total Actions × 100</p>
                                                    <p className="text-[10px] text-stone-500 mt-1">Goal: &lt;={100 - targetHumanRatio}%</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Truthfulness Index */}
                                        <div className="p-6 border-t border-stone-100 bg-emerald-50/30">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                                <h4 className="font-bold text-stone-900">Truthfulness Index</h4>
                                                <span className="text-[10px] uppercase tracking-widest text-emerald-600 ml-auto">Ground Truth Metric</span>
                                            </div>
                                            <p className="text-xs text-stone-600 leading-relaxed mb-4">
                                                This index measures the percentage of your startup's foundational intelligence that originates from verifiable human input versus AI generation.
                                                A higher score indicates a foundation built on authentic founder insight, reducing the risk of AI hallucination and generic strategies.
                                            </p>
                                            <div className="bg-white border border-emerald-100 rounded-lg p-3">
                                                <div className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-1">Formula</div>
                                                <p className="text-xs text-stone-700 font-mono">Human Actions / Total Actions × 100</p>
                                                <p className="text-[10px] text-emerald-600 mt-1">Goal: Maintain &gt;={targetHumanRatio}% to ensure founder-led strategy.</p>
                                            </div>
                                        </div>

                                        {/* Tracked Sources */}
                                        <div className="p-6 border-t border-stone-100 bg-stone-50/50">
                                            <div className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-3">What We Track</div>
                                            <div className="flex flex-wrap gap-2">
                                                {['Priority Matrix', 'Competitive Matrix', 'Market Research', 'Documents', 'Canvas', 'Goals & OKRs', 'Customer Discovery', 'Financial Forecast', 'Operating Expenses', 'Journey Story', 'Timeline'].map(source => (
                                                    <span key={source} className="text-[10px] px-2.5 py-1 rounded-full bg-white border border-stone-200 text-stone-600 font-medium">
                                                        {source}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            )}
                        </div>
                    </div>
                </main>

                {/* Toggle Button - Only show when report panel is closed and report exists */}
                {!isReportOpen && report && (
                    <button
                        onClick={() => setIsReportOpen(true)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-3 bg-emerald-500 text-white rounded-l-full hover:bg-emerald-600 transition-all z-50 shadow-lg group"
                        title="Open Report"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                )}
            </motion.div>

            {/* Report Panel - Fixed overlay taking full height */}
            <AnimatePresence>
                {isReportOpen && (
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed top-0 right-0 h-full w-1/2 bg-stone-900 border-l border-stone-800 overflow-hidden flex flex-col z-50 shadow-2xl text-white"
                    >
                        {/* Report Header */}
                        <div className="px-8 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-stone-800 rounded-full">
                                    <ShieldCheck className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="font-serif text-xl text-white">Cooperation Report</h2>
                                    <p className="text-[10px] text-stone-400 uppercase tracking-widest">Strategic Balance Analysis</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {report && (
                                    <>
                                        <button
                                            onClick={() => setIsSaveDialogOpen(true)}
                                            className="p-2 text-stone-400 hover:text-white transition-colors rounded-full hover:bg-stone-800"
                                            title="Save to Documents"
                                        >
                                            <FileText className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={handleGenerate}
                                            disabled={isGenerating}
                                            className="p-2 text-stone-400 hover:text-white transition-colors rounded-full hover:bg-stone-800"
                                            title="Refresh Analysis"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => setIsReportOpen(false)}
                                    className="p-2 text-stone-400 hover:text-white transition-colors rounded-full hover:bg-stone-800"
                                    title="Close Report"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Report Content */}
                        <div className="flex-1 overflow-y-auto px-8 py-4">
                            {report ? (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="prose prose-invert prose-stone max-w-none prose-p:text-stone-300 prose-headings:text-white prose-strong:text-white prose-li:text-stone-300">
                                        <MarkdownRenderer content={report} theme="dark" />
                                    </div>
                                    <div className="mt-8 p-4 bg-stone-950 rounded-lg text-center border border-stone-800">
                                        <p className="text-stone-500 font-mono text-xs italic">
                                            "The assistant should always be lower than the human edited."
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center text-stone-400">
                                    <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center mb-6">
                                        <Activity className="w-8 h-8 opacity-20 text-white" />
                                    </div>
                                    <h3 className="font-serif text-xl text-white mb-3">Analyze Your Workflow</h3>
                                    <p className="max-w-xs mx-auto mb-8 text-sm leading-relaxed text-stone-400">
                                        Use AI to detect if you are leaning too heavily on automation. Keeping the human touch is vital for founder success.
                                    </p>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isGenerating}
                                        className="bg-emerald-600 text-white px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-emerald-500 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                                        {isGenerating ? 'Analyzing...' : 'Generate Analysis'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <SaveToFilesDialog
                isOpen={isSaveDialogOpen}
                onClose={() => setIsSaveDialogOpen(false)}
                projectId={data.id as Id<"projects">}
                onSave={handleSaveToDocs}
                title="Save Cooperation Report"
            />
        </div>
    );
};
