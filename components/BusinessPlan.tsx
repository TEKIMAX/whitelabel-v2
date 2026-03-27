import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from "../convex/_generated/api";
import { StartupData, AISettings, CanvasSection } from '../types';
import { generateBusinessPlan } from '../services/geminiService';
import { Plus, Check, ChevronDown, Loader2, Briefcase, Printer, Rocket, AlertCircle, ArrowRight, Layout, PieChart, Users, TrendingUp, CheckCircle2 } from 'lucide-react';
import TabNavigation from './TabNavigation';
import ProjectSelector from './ProjectSelector';
import { Logo } from './Logo';

interface BusinessPlanProps {
    data: StartupData;
    allProjects: StartupData[];
    onUpdateProject: (updater: (project: StartupData) => StartupData) => void;
    onSwitchProject: (id: string) => void;
    onNewProject: () => void;
    onNavigate: (view: any) => void;
    currentView: any;
    settings: AISettings;
    allowedPages?: string[];
}

// Simple Markdown Renderer
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    // Helper to parse inline formatting (bold)
    const parseInline = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} className="font-bold text-stone-900">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    return (
        <div className="prose prose-stone max-w-none text-stone-700 font-sans leading-loose selection:bg-nobel-gold selection:text-white">
            {content.split('\n').map((line, i) => {
                // Horizontal Rule
                if (line.trim() === '---' || line.trim() === '***') {
                    return <hr key={i} className="my-8 border-stone-200" />;
                }

                // Headers
                if (line.startsWith('# ')) return <h1 key={i} className="font-serif text-3xl font-bold text-stone-900 mb-6 mt-10 pb-4 border-b border-stone-200">{parseInline(line.replace('# ', ''))}</h1>;
                if (line.startsWith('## ')) return <h2 key={i} className="font-serif text-2xl font-bold text-stone-900 mb-4 mt-8">{parseInline(line.replace('## ', ''))}</h2>;
                if (line.startsWith('### ')) return <h3 key={i} className="font-serif text-xl font-bold text-stone-800 mb-3 mt-6">{parseInline(line.replace('### ', ''))}</h3>;

                // List Items
                if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                    return (
                        <div key={i} className="flex gap-3 mb-2 pl-4">
                            <span className="text-nobel-gold font-bold">•</span>
                            <span>{parseInline(line.replace(/^[-*]\s/, ''))}</span>
                        </div>
                    );
                }

                // Empty Lines
                if (line.trim() === '') return <br key={i} />;

                // Images
                if (line.match(/^!\[.*?\]\(.*?\)/)) {
                    const match = line.match(/^!\[(.*?)\]\((.*?)\)/);
                    if (match) {
                        return <img key={i} src={match[2]} alt={match[1]} className="h-5 my-2 inline-block" />;
                    }
                }

                // Paragraphs
                return <p key={i} className="mb-4 text-stone-600">{parseInline(line)}</p>;
            })}
        </div>
    );
};

const BusinessPlan: React.FC<BusinessPlanProps> = ({
    data,
    allProjects,
    onUpdateProject,
    onSwitchProject,
    onNewProject,
    onNavigate,
    currentView,
    settings,
    allowedPages
}) => {
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const updateProject = useMutation(api.projects.update);

    const handleGenerate = async () => {
        setIsGenerating(true);
        const plan = await generateBusinessPlan(data, settings);

        // Save to Backend
        await updateProject({
            id: data.id as any,
            updates: {
                businessPlanContent: plan
            }
        });

        // Update Local State (Optimistic)
        onUpdateProject(p => ({
            ...p,
            businessPlanContent: plan
        }));
        setIsGenerating(false);
    };

    // Calculate Readiness
    const readinessChecks = [
        {
            id: 'identity',
            title: 'Identity',
            description: 'Name & Hypothesis',
            isReady: !!data.name && !!data.hypothesis,
            icon: Rocket,
            view: 'ONBOARDING',
            missingText: 'Define Hypothesis'
        },
        {
            id: 'canvas',
            title: 'Lean Model',
            description: 'Core Canvas Sections',
            isReady: !!data.canvas[CanvasSection.PROBLEM] && !!data.canvas[CanvasSection.SOLUTION] && !!data.canvas[CanvasSection.UNIQUE_VALUE_PROPOSITION] && !!data.canvas[CanvasSection.CUSTOMER_SEGMENTS],
            icon: Layout,
            view: 'CANVAS',
            missingText: 'Complete Canvas'
        },
        {
            id: 'market',
            title: 'Market Size',
            description: 'TAM/SAM/SOM Data',
            isReady: (data.market.tam || 0) > 0,
            icon: PieChart,
            view: 'MARKET',
            missingText: 'Estimate Market'
        },
        {
            id: 'financials',
            title: 'Financials',
            description: 'Revenue & Costs',
            isReady: data.revenueModel.revenueStreams.length > 0 && data.revenueModel.costStructure.length > 0,
            icon: TrendingUp,
            view: 'REVENUE',
            missingText: 'Add Financials'
        },
        {
            id: 'validation',
            title: 'Validation',
            description: 'Interviews Logged',
            isReady: data.customerInterviews.length > 0,
            icon: Users,
            view: 'CUSTOMERS',
            missingText: 'Log Interview'
        }
    ];

    const completedChecks = readinessChecks.filter(c => c.isReady).length;
    const progress = Math.round((completedChecks / readinessChecks.length) * 100);
    const isFullyReady = progress === 100;

    return (
        <div className="min-h-screen flex flex-col bg-[#F9F8F4] text-stone-900 font-sans">
            {/* Header */}
            <header className="px-6 py-3 bg-white/80 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between border-b border-stone-200">
                <div className="flex items-center gap-4">
                    <Logo imageClassName="h-8 w-auto" />
                    <div className="h-6 w-px bg-stone-200" />
                    <div className="h-6 w-px bg-stone-200" />
                    <TabNavigation
                        currentView={currentView}
                        onNavigate={onNavigate}
                        allowedPages={allowedPages}
                        projectFeatures={{
                            canvasEnabled: data.canvasEnabled,
                            marketResearchEnabled: data.marketResearchEnabled
                        }}
                    />
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="bg-stone-900 text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-nobel-gold transition-colors flex items-center gap-2 shadow-md"
                        title={`Generate using ${settings.provider}`}
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                        Generate Plan
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="bg-white border border-stone-200 text-stone-600 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:border-nobel-gold hover:text-nobel-gold transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <Printer className="w-4 h-4" /> Print / PDF
                    </button>
                </div>
            </header>

            <main className="flex-grow p-8 md:p-12 overflow-y-auto flex flex-col items-center">
                {/* Dashboard or Document */}
                {!data.businessPlanContent && !isGenerating ? (
                    <div className="w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center mb-16">
                            <div className="inline-block mb-3 text-xs font-bold tracking-[0.2em] text-stone-500 uppercase">Master Plan</div>
                            <h1 className="font-serif text-5xl text-stone-900 mb-6">Investment Readiness</h1>
                            <p className="text-stone-500 text-lg max-w-xl mx-auto font-light leading-relaxed">
                                Your business plan is extracted from your progress.
                                Complete the modules to generate an investment-grade document.
                            </p>
                        </div>

                        {/* Progress Bar */}
                        <div className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm mb-12">
                            <div className="flex justify-between items-end mb-4">
                                <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Completion Status</span>
                                <span className="font-serif text-3xl font-bold text-stone-900">{progress}%</span>
                            </div>
                            <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-1000 ease-out ${isFullyReady ? 'bg-nobel-gold' : 'bg-stone-900'}`}
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Checklist Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                            {readinessChecks.map(check => (
                                <div key={check.id} className={`group bg-white p-6 rounded-xl border transition-all duration-300 ${check.isReady ? 'border-stone-100 opacity-60 hover:opacity-100' : 'border-stone-200 hover:border-nobel-gold hover:shadow-lg'}`}>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`p-3 rounded-full ${check.isReady ? 'bg-stone-50 text-stone-400' : 'bg-stone-900 text-white'}`}>
                                            <check.icon className="w-5 h-5" />
                                        </div>
                                        {check.isReady ? (
                                            <CheckCircle2 className="w-5 h-5 text-nobel-gold" />
                                        ) : (
                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                        )}
                                    </div>
                                    <h3 className="font-serif text-xl text-stone-900 mb-2">{check.title}</h3>
                                    <p className="text-xs text-stone-500 font-bold uppercase tracking-wider mb-6 h-4">{check.description}</p>

                                    {check.isReady ? (
                                        <div className="w-full py-3 bg-stone-50 text-stone-300 text-[10px] font-bold uppercase tracking-widest text-center rounded-lg cursor-default border border-stone-100">
                                            Ready
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => onNavigate(check.view)}
                                            className="w-full py-3 bg-white text-stone-900 border border-stone-200 hover:border-stone-900 hover:bg-stone-50 text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all"
                                        >
                                            {check.missingText} <ArrowRight className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="text-center">
                            <button
                                onClick={handleGenerate}
                                className={`px-10 py-5 rounded-full font-bold text-xs uppercase tracking-[0.2em] shadow-xl transition-all hover:-translate-y-1 flex items-center gap-3 mx-auto ${isFullyReady
                                    ? 'bg-nobel-gold text-white hover:bg-stone-900'
                                    : 'bg-stone-900 text-white hover:bg-nobel-gold'
                                    }`}
                            >
                                <Briefcase className="w-4 h-4" />
                                {isFullyReady ? "Generate Final Plan" : "Generate Draft"}
                            </button>
                            {!isFullyReady && (
                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mt-6">
                                    Warning: Incomplete sections will use placeholders.
                                </p>
                            )}
                        </div>

                    </div>
                ) : isGenerating ? (
                    <div className="h-full flex flex-col items-center justify-center text-center mt-32">
                        <div className="relative mb-8">
                            <div className="absolute inset-0 bg-stone-200 rounded-full opacity-50 animate-ping"></div>
                            <div className="relative w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg border border-stone-100">
                                <Loader2 className="w-8 h-8 animate-spin text-stone-900" />
                            </div>
                        </div>
                        <h3 className="font-serif text-2xl text-stone-900 mb-2">Drafting Business Plan</h3>
                        <p className="text-stone-500 text-xs uppercase tracking-widest font-bold">Consolidating Strategy & Financials</p>
                    </div>
                ) : (
                    /* The Document View */
                    <div className="bg-white shadow-2xl w-full max-w-[850px] min-h-[1100px] p-16 md:p-24 relative mb-12 print:shadow-none print:w-full print:max-w-none print:p-0 transition-all duration-1000 animate-in fade-in slide-in-from-bottom-8">
                        {/* Cover Page Header */}
                        <div className="text-center border-b-2 border-stone-900 pb-12 mb-12">
                            <h1 className="font-serif text-6xl text-stone-900 mb-4 tracking-tight">{data.name}</h1>
                            <p className="text-xl text-stone-500 font-serif italic">Business Plan</p>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-nobel-gold mt-10">{new Date().toLocaleDateString()}</p>
                        </div>

                        {/* Main Content */}
                        <MarkdownRenderer content={data.businessPlanContent || ''} />

                        {/* Footer */}
                        <div className="mt-24 pt-8 border-t border-stone-100 text-center text-[10px] text-stone-400 font-mono uppercase tracking-widest flex justify-between">
                            <span>Strictly Confidential</span>
                            <span>{data.name}</span>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default BusinessPlan;
