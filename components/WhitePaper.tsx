import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from "../convex/_generated/api";
import { StartupData, AISettings } from '../types';
import { generateProjectReport } from '../services/geminiService';
import { Plus, Check, ChevronDown, Loader2, FileText, Printer, Rocket, Sparkles } from 'lucide-react';
import TabNavigation from './TabNavigation';
import ProjectSelector from './ProjectSelector';
import { Logo } from './Logo';

interface WhitePaperProps {
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

                // Paragraphs
                return <p key={i} className="mb-4 text-stone-600">{parseInline(line)}</p>;
            })}
        </div>
    );
};

const WhitePaper: React.FC<WhitePaperProps> = ({
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
        const report = await generateProjectReport(data, settings);

        // Save to Backend
        await updateProject({
            id: data.id as any,
            updates: {
                whitePaperContent: report
            }
        });

        // Update Local State (Optimistic)
        onUpdateProject(p => ({
            ...p,
            whitePaperContent: report
        }));
        setIsGenerating(false);
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#F9F8F4] text-stone-900 font-sans">
            {/* Header */}
            <header className="px-6 py-3 bg-white/80 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between border-b border-stone-200 no-print">
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
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider bg-white border border-stone-200 hover:border-nobel-gold hover:text-nobel-gold rounded-md transition-colors text-stone-500 shadow-sm"
                    >
                        <Printer className="w-3 h-3" /> Print
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="bg-stone-900 text-white px-5 py-2 rounded-full shadow-lg text-xs font-bold uppercase tracking-wider hover:bg-nobel-gold transition-all flex items-center gap-2"
                        title={`Generate using ${settings.provider}`}
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Generate Report
                    </button>
                </div>
            </header>

            <main className="flex-grow p-8 md:p-12 overflow-y-auto flex flex-col items-center">
                {/* Google Doc / A4 Paper Style Container */}
                <div className="bg-white shadow-2xl w-full max-w-[850px] min-h-[1100px] p-16 md:p-24 relative mb-12 print:shadow-none print:w-full print:max-w-none print:p-0 transition-all duration-700">

                    {/* Cover Page Placeholder if empty */}
                    {!data.whitePaperContent && !isGenerating ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-stone-400 space-y-8 mt-20 animate-fade-in-up">
                            <div className="w-24 h-24 bg-[#F9F8F4] rounded-full flex items-center justify-center border border-stone-200">
                                <FileText className="w-10 h-10 text-stone-300" />
                            </div>
                            <div>
                                <h2 className="font-serif text-3xl text-stone-900 mb-4">Executive White Paper</h2>
                                <p className="max-w-md mx-auto text-sm leading-relaxed font-light">
                                    Synthesize your Lean Canvas pivots, customer discovery data, and strategic outlook into a professional document suitable for stakeholders.
                                </p>
                            </div>
                            <button
                                onClick={handleGenerate}
                                className="mt-8 bg-stone-900 text-white px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-nobel-gold transition-colors shadow-lg flex items-center gap-3"
                            >
                                Generate Report <Rocket className="w-3 h-3" />
                            </button>
                        </div>
                    ) : isGenerating ? (
                        <div className="h-full flex flex-col items-center justify-center text-center mt-32">
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-nobel-gold rounded-full opacity-20 animate-ping"></div>
                                <div className="relative w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md border border-stone-100">
                                    <Loader2 className="w-6 h-6 animate-spin text-nobel-gold" />
                                </div>
                            </div>
                            <h3 className="font-serif text-2xl text-stone-900 mb-2">Synthesizing Intelligence</h3>
                            <p className="text-stone-500 text-xs uppercase tracking-widest font-bold">Analyzing {data.canvasVersions.length} pivots & {data.customerInterviews.length} interviews</p>
                        </div>
                    ) : (
                        <div className="animate-in fade-in duration-1000">
                            {/* Cover Page Header */}
                            <div className="text-center border-b-2 border-stone-900 pb-12 mb-12">
                                <div className="w-12 h-12 bg-stone-900 text-white rounded flex items-center justify-center mx-auto mb-8 shadow-lg">
                                    <Rocket className="w-6 h-6" />
                                </div>
                                <h1 className="font-serif text-5xl md:text-6xl text-stone-900 mb-6 tracking-tight">{data.name}</h1>
                                <p className="text-lg text-stone-500 font-serif italic">Strategic Outlook & Validation Report</p>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-nobel-gold mt-8">{new Date().toLocaleDateString()}</p>
                            </div>

                            {/* Main Content */}
                            <MarkdownRenderer content={data.whitePaperContent || ''} />

                            {/* Footer */}
                            <div className="mt-24 pt-8 border-t border-stone-100 text-center text-[10px] text-stone-400 font-mono uppercase tracking-widest flex justify-between items-center">
                                <span>Confidential Strategy Document</span>
                                <span>Generated by Adaptive Startup</span>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default WhitePaper;
