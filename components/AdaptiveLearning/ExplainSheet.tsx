import React, { useEffect, useState } from 'react';
import { Sparkles, Loader2, X, ArrowRight, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIExplainAdaptiveStatus } from '../../hooks/useAI';
import { MarkdownRenderer } from '../MarkdownRenderer';

interface ExplainSheetProps {
    isOpen: boolean;
    onClose: () => void;
    topic: string | null;
    metrics?: any;
}

export const ExplainSheet: React.FC<ExplainSheetProps> = ({ isOpen, onClose, topic, metrics }) => {
    const explainAction = useAIExplainAdaptiveStatus();
    const [explanation, setExplanation] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && topic) {
            setLoading(true);
            setExplanation(null);
            explainAction({ topic, metrics: metrics || {} })
                .then(setExplanation)
                .catch(err => setExplanation("System Offline. Could not retrieve analysis."))
                .finally(() => setLoading(false));
        }
    }, [isOpen, topic, metrics]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-stone-900/40 backdrop-blur-[2px] z-[60]"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 350, mass: 0.8 }}
                        className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-stone-950 shadow-2xl z-[70] flex flex-col border-l border-stone-800"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-8 pb-6 border-b border-stone-800 bg-stone-900/50 backdrop-blur sticky top-0 z-10">
                            <div>
                                <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                                    AI Traceability
                                </h2>
                                <p className="text-sm font-medium text-stone-400 mt-1 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
                                    {loading ? "Analyzing System State..." : "Analysis Complete"}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-full transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="space-y-8">

                                {/* Status Box */}
                                <div className="bg-stone-900 rounded-2xl p-6 border border-stone-800">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 p-3 bg-stone-800 rounded-xl shadow-sm border border-stone-700">
                                            <Brain className="w-6 h-6 text-[#C5A059]" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-lg mb-1">Target: {topic}</h3>
                                            <p className="text-stone-400 text-sm leading-relaxed">
                                                Querying core intelligence for real-time diagnostics...
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                        <Loader2 className="w-8 h-8 animate-spin text-[#C5A059]" />
                                        <p className="text-sm text-stone-400 font-mono animate-pulse">Processing Vector Streams...</p>
                                    </div>
                                ) : (
                                    <div className="prose prose-stone prose-sm prose-invert">
                                        <MarkdownRenderer content={explanation || ""} />
                                    </div>
                                )}

                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
