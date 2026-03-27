import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Sparkles, AlertCircle, FolderPlus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { SaveToFilesDialog } from '../nobel_chat/SaveToFilesDialog';
import { useCreateDocument } from '../../hooks/useCreate';
import { Id } from '../../convex/_generated/dataModel';
import { toast } from 'sonner';
import { marked } from 'marked';

interface StrategySummarySheetProps {
    isOpen: boolean;
    onClose: () => void;
    summary: string;
    isGenerating: boolean;
    projectId: string;
}

export const StrategySummarySheet: React.FC<StrategySummarySheetProps> = ({
    isOpen,
    onClose,
    summary,
    isGenerating,
    projectId
}) => {
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const createDocument = useCreateDocument();

    const handleSaveToDocs = async (folderId: string | null, filename: string) => {
        if (!summary) return;

        try {
            // Configure marked for GFM tables, strikethrough, etc.
            marked.use({ gfm: true, breaks: true });
            const htmlContent = await marked.parse(summary);

            await createDocument({
                projectId,
                folderId: folderId ? folderId as Id<"folders"> : undefined,
                title: filename.endsWith('.md') ? filename : `${filename}.md`,
                content: htmlContent,
                type: 'doc',
                tags: [{ name: 'AI Assisted', color: '#7c007c' }, { name: 'Strategy', color: '#b8860b' }]
            });
            toast.success("Strategy saved to documents");
            setIsSaveDialogOpen(false);
        } catch (error) {
            toast.error("Failed to save document");
        }
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm z-40"
                        />

                        {/* Sheet */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="fixed top-0 right-0 h-full w-[600px] bg-stone-950 border-l border-stone-800 overflow-hidden flex flex-col z-50 shadow-2xl"
                        >
                            {/* Header */}
                            <div className="px-8 py-8 border-b border-stone-800 flex items-center justify-between bg-stone-900/50">
                                <div>
                                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                        <Sparkles className="w-6 h-6 text-nobel-gold" />
                                        Strategic Summary
                                    </h3>
                                    <p className="text-xs text-stone-400 mt-2">AI-generated analysis of your current priorities.</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    {summary && !isGenerating && (
                                        <button
                                            onClick={() => setIsSaveDialogOpen(true)}
                                            className="p-2 text-stone-400 hover:text-white transition-colors rounded-full hover:bg-stone-800"
                                            title="Save to Documents"
                                        >
                                            <FolderPlus className="w-5 h-5" />
                                        </button>
                                    )}
                                    <button
                                        onClick={onClose}
                                        className="p-2 hover:bg-stone-800 rounded-full transition-colors"
                                    >
                                        <X className="w-5 h-5 text-stone-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-grow overflow-y-auto p-8">
                                {isGenerating ? (
                                    <div className="flex flex-col items-center justify-center h-64 space-y-4">
                                        <div className="w-8 h-8 border-4 border-stone-800 border-t-nobel-gold rounded-full animate-spin"></div>
                                        <p className="text-stone-500 text-sm font-medium animate-pulse">Analyzing your startup data...</p>
                                    </div>
                                ) : summary ? (
                                    <div className="prose prose-stone prose-sm max-w-none prose-invert">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm, remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                            components={{
                                                h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-white mb-4 mt-6" {...props} />,
                                                h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-white mb-3 mt-5" {...props} />,
                                                h3: ({ node, ...props }) => <h3 className="text-md font-bold text-white mb-2 mt-4" {...props} />,
                                                p: ({ node, ...props }) => <p className="text-stone-400 leading-relaxed mb-4" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-2 mb-4" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-2 mb-4" {...props} />,
                                                li: ({ node, ...props }) => <li className="text-stone-400" {...props} />,
                                                strong: ({ node, ...props }) => <strong className="text-white font-bold" {...props} />,
                                                em: ({ node, ...props }) => <em className="text-stone-300 italic" {...props} />,
                                                hr: ({ node, ...props }) => <hr className="border-stone-700 my-6" {...props} />,
                                                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-nobel-gold pl-4 italic text-stone-500 my-4" {...props} />,
                                                table: ({ node, ...props }) => (
                                                    <div className="my-4 overflow-x-auto rounded-lg border border-stone-700">
                                                        <table className="w-full text-left border-collapse text-sm" {...props} />
                                                    </div>
                                                ),
                                                thead: ({ node, ...props }) => <thead className="bg-stone-800 text-stone-300" {...props} />,
                                                th: ({ node, ...props }) => <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-stone-300 border-b border-stone-700" {...props} />,
                                                td: ({ node, ...props }) => <td className="px-4 py-2.5 text-stone-400 border-b border-stone-800" {...props} />,
                                                code: ({ node, inline, className, children, ...props }: any) => (
                                                    inline
                                                        ? <code className="bg-stone-800 text-nobel-gold px-1.5 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>
                                                        : <pre className="bg-stone-900 border border-stone-800 rounded-lg p-4 overflow-x-auto my-4"><code className="text-stone-300 text-xs font-mono" {...props}>{children}</code></pre>
                                                ),
                                            }}
                                        >
                                            {(() => {
                                                let text = summary;
                                                text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `$$${inner}$$`);
                                                text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => `$${inner}$`);
                                                return text;
                                            })()}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-stone-400">
                                        <AlertCircle className="w-10 h-10 mb-3 opacity-50" />
                                        <p>No summary generated yet.</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-8 py-6 border-t border-stone-800 bg-stone-900/50 flex gap-3">
                                {summary && !isGenerating && (
                                    <button
                                        onClick={() => setIsSaveDialogOpen(true)}
                                        className="flex-1 px-4 py-3 bg-stone-800 text-stone-300 rounded-full text-sm font-bold uppercase tracking-wider hover:bg-stone-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <FolderPlus className="w-4 h-4" />
                                        Save to Documents
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className={`${summary && !isGenerating ? 'flex-1' : 'w-full'} px-4 py-3 bg-white text-stone-900 rounded-full text-sm font-bold uppercase tracking-wider hover:bg-stone-200 transition-colors shadow-lg`}
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <SaveToFilesDialog
                isOpen={isSaveDialogOpen}
                onClose={() => setIsSaveDialogOpen(false)}
                projectId={projectId}
                onSave={handleSaveToDocs}
                title="Save Strategic Summary"
            />
        </>
    );
};
