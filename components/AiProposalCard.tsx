import React from 'react';
import { Check, X, Wand2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface AiProposalCardProps {
    section: string;
    content: string;
    rationale: string;
    onSave: () => void;
    onDiscard: () => void;
    isSaving: boolean;
}

export const AiProposalCard: React.FC<AiProposalCardProps> = ({
    section,
    content,
    rationale,
    onSave,
    onDiscard,
    isSaving
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md bg-white border border-purple-200 rounded-2xl shadow-xl overflow-hidden mt-4 mx-auto"
        >
            <div className="bg-purple-50 p-4 border-b border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                        <Wand2 className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-purple-900 uppercase tracking-wide">
                        AI Proposal: {section}
                    </span>
                </div>
            </div>

            <div className="p-5">
                <div className="mb-4">
                    <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Proposed Content</h4>
                    <div className="p-3 bg-stone-50 rounded-xl text-stone-800 text-sm leading-relaxed border border-stone-100">
                        {content}
                    </div>
                </div>

                <div className="mb-6">
                    <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Why this matters</h4>
                    <p className="text-xs text-stone-500 italic">
                        {rationale}
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onDiscard}
                        disabled={isSaving}
                        className="flex-1 py-2.5 px-4 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
                    >
                        <X className="w-4 h-4" />
                        Discard
                    </button>
                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {isSaving ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                        Save to Canvas
                    </button>
                </div>
            </div>
        </motion.div>
    );
};
