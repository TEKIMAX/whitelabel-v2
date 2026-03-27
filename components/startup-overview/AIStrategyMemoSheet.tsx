import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AIStrategyMemoSheetProps {
    isOpen: boolean;
    onClose: () => void;
    dailyMemo: any;
    markMemoAsRead: (args: { memoId: any }) => void;
}

export const AIStrategyMemoSheet: React.FC<AIStrategyMemoSheetProps> = ({
    isOpen,
    onClose,
    dailyMemo,
    markMemoAsRead
}) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Mark as read when opened if unread
    useEffect(() => {
        if (isOpen && dailyMemo && !dailyMemo.isRead) {
            markMemoAsRead({ memoId: dailyMemo._id });
        }
    }, [isOpen, dailyMemo, markMemoAsRead]);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100]"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed top-0 right-0 h-full w-full max-w-2xl bg-stone-900 border-l border-stone-800 overflow-hidden flex flex-col z-[110] shadow-2xl"
                    >
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-stone-800 flex items-center justify-between bg-stone-900/50 backdrop-blur-md">
                            <div>
                                <h3 className="text-2xl font-serif font-bold text-white">Strategic Memo</h3>
                                <p className="text-xs text-stone-400 mt-1 uppercase tracking-widest font-bold">
                                    AI Analysis & Trajectory {dailyMemo?.date ? `- ${dailyMemo.date}` : ''}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-stone-800 rounded-full transition-colors group"
                            >
                                <X className="w-5 h-5 text-stone-400 group-hover:text-white transition-colors" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-grow overflow-y-auto p-8 bg-stone-900">
                            {dailyMemo ? (
                                <div className="prose prose-stone prose-invert max-w-none">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            p: ({ children }) => <p className="text-base text-stone-300 leading-relaxed max-w-3xl mb-4">{children}</p>,
                                            strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
                                            ul: ({ children }) => <ul className="list-disc ml-6 mb-6 text-stone-300 space-y-2">{children}</ul>,
                                            li: ({ children }) => <li className="text-sm">{children}</li>,
                                            h1: ({ children }) => <h1 className="text-2xl font-serif font-bold text-white mt-8 mb-4">{children}</h1>,
                                            h2: ({ children }) => <h2 className="text-xl font-bold text-stone-100 mt-8 mb-4 border-b border-stone-800 pb-2">{children}</h2>,
                                            h3: ({ children }) => <h3 className="text-lg font-bold text-stone-200 mt-6 mb-3">{children}</h3>,
                                            blockquote: ({ children }) => <blockquote className="border-l-2 border-nobel-gold pl-4 italic text-stone-400 my-6 bg-stone-800/30 py-2 pr-4 rounded-r-lg">{children}</blockquote>,
                                        }}
                                    >
                                        {dailyMemo.content}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 rounded-full bg-stone-800 flex items-center justify-center mb-4">
                                        <X className="w-8 h-8 text-stone-600" />
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-2">No Memo Available</h4>
                                    <p className="text-sm text-stone-400 max-w-sm">
                                        There is no strategic memo generated for today yet.
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};
