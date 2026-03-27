import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { BookOpen, Sparkles, Loader2, Download, FolderPlus, ChevronDown, ChevronUp, Clock, User } from 'lucide-react';
import CustomSelect from '../../CustomSelect';

interface QuestionsTabProps {
    customers: any[];
    selectedCustomerId: string;
    targetName: string;
    targetRole: string;
    targetDomain: string;
    targetIndustry: string;
    generatedQuestions: string | null;
    isGenerating: boolean;
    isSaveDialogOpen: boolean;
    onCustomerChange: (id: string) => void;
    onNameChange: (name: string) => void;
    onRoleChange: (role: string) => void;
    onDomainChange: (domain: string) => void;
    onIndustryChange: (industry: string) => void;
    onGenerate: () => void;
    onSaveToDocs: () => void;
    onSetSaveDialogOpen: (open: boolean) => void;
}

export const QuestionsTab: React.FC<QuestionsTabProps> = ({
    customers,
    selectedCustomerId,
    targetName,
    targetRole,
    targetDomain,
    targetIndustry,
    generatedQuestions,
    isGenerating,
    isSaveDialogOpen,
    onCustomerChange,
    onNameChange,
    onRoleChange,
    onDomainChange,
    onIndustryChange,
    onGenerate,
    onSaveToDocs,
    onSetSaveDialogOpen
}) => {
    const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

    // Extract previously generated questions from customer notes
    const questionsHistory = customers
        .filter(c => {
            const notes = c.Notes || '';
            return notes.includes('Interview Script') || notes.includes('Generated Interview Questions') || notes.includes('## Problem Validation');
        })
        .map(c => ({
            id: c.id,
            name: c.Name || 'Unknown',
            role: c.Role || '',
            organization: c.Organization || '',
            notes: c.Notes || '',
        }));

    return (
        <div className="flex-grow flex flex-col p-4 md:p-8 w-full gap-6">
            {/* Generator Card */}
            <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden w-full max-w-4xl p-8 md:p-12 flex flex-col mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-stone-50 rounded-full flex items-center justify-center shrink-0">
                        <BookOpen className="w-6 h-6 text-stone-900" />
                    </div>
                    <div>
                        <h3 className="font-serif text-2xl md:text-3xl text-stone-900">Interview Question Generator</h3>
                        <p className="text-stone-500 text-sm md:text-base mt-1">
                            Generate Lean Startup aligned questions to validate your problem hypothesis.
                        </p>
                    </div>
                </div>

                <div className="mb-6 p-6 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">Target Customer (CRM)</label>
                            <CustomSelect
                                value={selectedCustomerId}
                                onChange={onCustomerChange}
                                options={[
                                    { label: '--- Create New Prospect ---', value: 'new', color: 'bg-stone-50 text-stone-500 border-stone-200' },
                                    ...customers.map(ci => ({
                                        label: `${ci.Name || 'Unnamed'} ${ci.Organization ? `(${ci.Organization})` : ''}`,
                                        value: ci.id,
                                        color: 'bg-white text-stone-900 border-stone-200'
                                    }))
                                ]}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">Customer Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Jane Doe"
                                value={targetName}
                                onChange={e => onNameChange(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">Role / Title</label>
                            <input
                                type="text"
                                placeholder="e.g. VP of Product"
                                value={targetRole}
                                onChange={e => onRoleChange(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">Company / Domain</label>
                            <input
                                type="text"
                                placeholder="e.g. Acme Corp"
                                value={targetDomain}
                                onChange={e => onDomainChange(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">Industry</label>
                            <input
                                type="text"
                                placeholder="e.g. SaaS"
                                value={targetIndustry}
                                onChange={e => onIndustryChange(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold"
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={onGenerate}
                            disabled={isGenerating || !targetName || !targetRole || !targetDomain}
                            className="px-6 py-2 bg-stone-900 text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-nobel-gold transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Generate Questions
                        </button>
                    </div>
                </div>

                {/* Show loading state */}
                {isGenerating && (
                    <div className="flex items-center justify-center gap-3 py-12 text-stone-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Generating interview script with cross-referenced startup data...</span>
                    </div>
                )}

                {/* Generated Questions Output */}
                {generatedQuestions && !isGenerating && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-stone-900">Generated Questions</h4>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onSetSaveDialogOpen(true)}
                                    title="Save to Documents"
                                    className="w-9 h-9 flex items-center justify-center bg-stone-100 text-stone-700 rounded-full hover:bg-stone-200 transition-colors"
                                >
                                    <FolderPlus className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => { navigator.clipboard.writeText(generatedQuestions); }}
                                    title="Copy to clipboard"
                                    className="w-9 h-9 flex items-center justify-center bg-stone-100 text-stone-700 rounded-full hover:bg-stone-200 transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="prose prose-stone prose-lg max-w-none p-8 bg-stone-50 rounded-xl border border-stone-200 [&_h1]:text-2xl [&_h1]:font-serif [&_h1]:mb-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-stone-800 [&_h2]:border-b [&_h2]:border-stone-200 [&_h2]:pb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-stone-900 [&_blockquote]:border-l-4 [&_blockquote]:border-nobel-gold [&_blockquote]:bg-amber-50 [&_blockquote]:py-3 [&_blockquote]:px-4 [&_blockquote]:rounded-r-lg [&_blockquote]:text-sm [&_blockquote]:text-stone-600 [&_blockquote]:italic [&_blockquote]:my-3 [&_hr]:my-6 [&_em]:text-stone-500 [&_p]:leading-relaxed [&_p]:text-stone-700">
                            <ReactMarkdown>{generatedQuestions}</ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>

            {/* Questions History by Customer */}
            {questionsHistory.length > 0 && (
                <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden w-full max-w-4xl mx-auto">
                    <div className="px-8 py-5 border-b border-stone-100 bg-[#F9F8F4]">
                        <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-stone-400" />
                            <div>
                                <h4 className="font-serif text-lg text-stone-900">Previously Generated Scripts</h4>
                                <p className="text-xs text-stone-500 mt-0.5">{questionsHistory.length} customer{questionsHistory.length > 1 ? 's' : ''} with generated questions</p>
                            </div>
                        </div>
                    </div>
                    <div className="divide-y divide-stone-100">
                        {questionsHistory.map(item => (
                            <div key={item.id}>
                                <button
                                    onClick={() => setExpandedHistoryId(expandedHistoryId === item.id ? null : item.id)}
                                    className="w-full px-8 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center shrink-0">
                                            <User className="w-4 h-4 text-stone-500" />
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold text-stone-900">{item.name}</span>
                                            {item.role && <span className="text-xs text-stone-500 ml-2">{item.role}</span>}
                                            {item.organization && <span className="text-xs text-stone-400 ml-1">@ {item.organization}</span>}
                                        </div>
                                    </div>
                                    {expandedHistoryId === item.id
                                        ? <ChevronUp className="w-4 h-4 text-stone-400" />
                                        : <ChevronDown className="w-4 h-4 text-stone-400" />}
                                </button>
                                {expandedHistoryId === item.id && (
                                    <div className="px-8 pb-6">
                                        <div className="prose prose-stone prose-sm max-w-none p-6 bg-stone-50 rounded-xl border border-stone-200 [&_h1]:text-xl [&_h1]:font-serif [&_h1]:mb-3 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-stone-800 [&_h2]:border-b [&_h2]:border-stone-200 [&_h2]:pb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-nobel-gold [&_blockquote]:bg-amber-50 [&_blockquote]:py-2 [&_blockquote]:px-3 [&_blockquote]:rounded-r-lg [&_blockquote]:text-xs [&_blockquote]:text-stone-600 [&_blockquote]:italic [&_blockquote]:my-2 [&_hr]:my-4 [&_p]:leading-relaxed">
                                            <ReactMarkdown>{item.notes}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
