import React, { useState } from 'react';
import { Target, Sparkles, Loader2, HelpCircle, X, User, CheckSquare, Square, Search, FolderPlus, ChevronUp, ChevronDown } from 'lucide-react';
import MiniEditor from '../../editor/MiniEditor';

interface Interview {
    id: string;
    Name?: string;
    Role?: string;
    Organization?: string;
    [key: string]: any;
}

interface FitAnalysisTabProps {
    interviews: Interview[];
    selectedIds: Set<string>;
    isAnalyzing: boolean;
    analysis: string;
    onToggleSelect: (id: string) => void;
    onSelectAll: () => void;
    onAnalyze: () => void;
    onSave?: () => void;
    customPrompt: string;
    onCustomPromptChange: (val: string) => void;
}

const steps = [
    { title: 'Select Interviews', description: 'Use the checkboxes below to pick which customer interviews you want to analyze.', icon: '☑️' },
    { title: 'Click Analyze Fit', description: 'AI will compare the selected interviews against your Canvas Value Proposition.', icon: '✨' },
    { title: 'Review Insights', description: 'Get fit scores, common pain points, and segment recommendations.', icon: '📊' },
    { title: 'Take Action', description: 'Update your Canvas, refine segments, or generate follow-up questions.', icon: '🚀' },
];

const editorStyles = "bg-stone-50 rounded-xl border border-stone-200 overflow-hidden [&_.ProseMirror]:text-sm [&_.ProseMirror]:leading-relaxed [&_.ProseMirror]:p-6 [&_.ProseMirror_h1]:text-xl [&_.ProseMirror_h1]:font-serif [&_.ProseMirror_h1]:mb-4 [&_.ProseMirror_h1]:mt-2 [&_.ProseMirror_h2]:text-base [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mt-6 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:border-b [&_.ProseMirror_h2]:border-stone-200 [&_.ProseMirror_h2]:pb-2 [&_.ProseMirror_h3]:text-sm [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mt-4 [&_.ProseMirror_h3]:mb-1 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-nobel-gold [&_.ProseMirror_blockquote]:bg-amber-50 [&_.ProseMirror_blockquote]:py-2 [&_.ProseMirror_blockquote]:px-3 [&_.ProseMirror_blockquote]:rounded-r-lg [&_.ProseMirror_blockquote]:text-xs [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:my-2 min-h-[400px]";

export const FitAnalysisTab: React.FC<FitAnalysisTabProps> = ({
    interviews, selectedIds, isAnalyzing, analysis,
    onToggleSelect, onSelectAll, onAnalyze, onSave,
    customPrompt, onCustomPromptChange
}) => {
    const [showGuide, setShowGuide] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const allSelected = interviews.length > 0 && selectedIds.size === interviews.length;

    const filteredInterviews = interviews.filter(i => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (i.Name || '').toLowerCase().includes(q)
            || (i.Role || '').toLowerCase().includes(q)
            || (i.Organization || '').toLowerCase().includes(q);
    });

    return (
        <div className="flex-grow flex flex-col p-4 md:p-8 w-full gap-6">
            <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden w-full max-w-4xl p-8 md:p-12 flex flex-col mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-stone-50 rounded-full flex items-center justify-center shrink-0">
                        <Target className="w-6 h-6 text-stone-900" />
                    </div>
                    <div className="flex-grow">
                        <h3 className="font-serif text-2xl md:text-3xl text-stone-900">Customer Fit Analysis</h3>
                        <p className="text-stone-500 text-sm md:text-base mt-1">Select interviews below then click Analyze Fit.</p>
                    </div>
                    <button
                        onClick={() => setShowGuide(!showGuide)}
                        className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors shrink-0 ${showGuide ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'}`}
                        title="How does this work?"
                    >
                        {showGuide ? <X className="w-4 h-4" /> : <HelpCircle className="w-4 h-4" />}
                    </button>
                </div>

                {showGuide && (
                    <div className="mb-8 p-6 bg-gradient-to-br from-stone-50 to-stone-100/50 rounded-xl border border-stone-200">
                        <h4 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-4">How It Works</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {steps.map((step, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-stone-100">
                                    <span className="text-xl mt-0.5">{step.icon}</span>
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Step {i + 1}</span>
                                        <h5 className="text-sm font-bold text-stone-900 mt-0.5">{step.title}</h5>
                                        <p className="text-xs text-stone-500 mt-1 leading-relaxed">{step.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                            <span className="text-amber-500 mt-0.5">💡</span>
                            <p className="text-xs text-amber-800 leading-relaxed">
                                <strong>Pro tip:</strong> Select at least 3–5 interviews with detailed notes and pain points for the most actionable analysis.
                            </p>
                        </div>
                    </div>
                )}

                {/* AI Configuration */}
                <div className="mb-6">
                    <button
                        onClick={() => setShowConfig(!showConfig)}
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-stone-900 transition-colors mb-3"
                    >
                        {showConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        Configure AI Instructions (Optional)
                    </button>
                    
                    {showConfig && (
                        <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 mb-6 transition-all">
                            <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">Custom System Prompt</label>
                            <p className="text-xs text-stone-500 mb-3">
                                Override the default AI instructions to change the analysis criteria, tone, or output structure. Leave blank to use the default Lean Startup prompt.
                            </p>
                            <textarea
                                value={customPrompt}
                                onChange={e => onCustomPromptChange(e.target.value)}
                                placeholder="e.g. Focus exclusively on enterprise b2b willingness to pay signals..."
                                className="w-full h-24 p-3 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold bg-white resize-none"
                            />
                        </div>
                    )}
                </div>

                {/* Interview Selector */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-stone-500">Select Interviews</h4>
                        <button onClick={onSelectAll} className="text-xs text-stone-500 hover:text-stone-900 transition-colors font-medium">
                            {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                    <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                        <input
                            type="text"
                            placeholder="Search by name, role, organization..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:border-nobel-gold"
                        />
                    </div>
                    <div className="bg-stone-50 rounded-xl border border-stone-100 divide-y divide-stone-100 max-h-64 overflow-y-auto">
                        {filteredInterviews.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-stone-400">
                                {interviews.length === 0 ? 'No interviews yet. Go to the Interviews tab to add some.' : 'No matches found.'}
                            </div>
                        ) : (
                            filteredInterviews.map(interview => (
                                <button
                                    key={interview.id}
                                    onClick={() => onToggleSelect(interview.id)}
                                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-stone-100 transition-colors text-left ${selectedIds.has(interview.id) ? 'bg-stone-100/80' : ''}`}
                                >
                                    {selectedIds.has(interview.id)
                                        ? <CheckSquare className="w-4 h-4 text-stone-900 shrink-0" />
                                        : <Square className="w-4 h-4 text-stone-300 shrink-0" />}
                                    <div className="w-7 h-7 bg-stone-200 rounded-full flex items-center justify-center shrink-0">
                                        <User className="w-3.5 h-3.5 text-stone-500" />
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <span className="text-sm font-medium text-stone-900 truncate block">{interview.Name || 'Unnamed'}</span>
                                        <span className="text-xs text-stone-400 truncate block">{[interview.Role, interview.Organization].filter(Boolean).join(' @ ') || 'No details'}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Analyze Button */}
                <div className="mb-6 p-4 bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-700">
                        {selectedIds.size} interview{selectedIds.size !== 1 ? 's' : ''} selected for analysis
                    </span>
                    <div className="flex items-center gap-2">
                        {analysis && onSave && (
                            <button
                                onClick={onSave}
                                className="px-5 py-2 bg-stone-200 text-stone-700 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-stone-300 transition-colors flex items-center gap-2"
                            >
                                <FolderPlus className="w-4 h-4" />
                                Save to Docs
                            </button>
                        )}
                        <button
                            onClick={onAnalyze}
                            disabled={isAnalyzing || selectedIds.size === 0}
                            className="px-6 py-2 bg-stone-900 text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-nobel-gold transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Analyze Fit
                        </button>
                    </div>
                </div>

                {/* Results — MiniEditor (same style as interview notes) */}
                {analysis && (
                    <div className={editorStyles}>
                        <MiniEditor
                            content={analysis}
                            onUpdate={() => { }}
                            placeholder=""
                            className="!border-none !bg-transparent"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
