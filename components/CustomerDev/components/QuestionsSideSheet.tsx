import React from 'react';
import { Sparkles, FolderPlus, X } from 'lucide-react';
import MiniEditor from '../../editor/MiniEditor';

interface QuestionsSideSheetProps {
    isOpen: boolean;
    content: string;
    targetName: string;
    targetRole: string;
    onUpdate: (content: string) => void;
    onClose: () => void;
    onSaveToDocs: () => void;
}

export const QuestionsSideSheet: React.FC<QuestionsSideSheetProps> = ({
    isOpen,
    content,
    targetName,
    targetRole,
    onUpdate,
    onClose,
    onSaveToDocs
}) => {
    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm z-40"
                onClick={onClose}
            />
            <div className="fixed inset-y-0 right-0 w-[800px] bg-stone-950 shadow-2xl border-l border-stone-800 transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) z-50 overflow-hidden flex flex-col">
                <div className="px-8 py-8 border-b border-stone-800 flex items-center justify-between bg-stone-900/50">
                    <div>
                        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-nobel-gold" />
                            Generated Questions
                        </h3>
                        <p className="text-xs text-stone-400 mt-2 uppercase tracking-widest">{targetName || targetRole || 'Target Customer'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={onSaveToDocs}
                            className="p-2 text-stone-400 hover:text-white transition-colors rounded-full hover:bg-stone-800"
                            title="Save to Documents"
                        >
                            <FolderPlus className="w-5 h-5" />
                        </button>
                        <button onClick={onClose} className="p-2 text-stone-400 hover:text-white transition-colors rounded-full hover:bg-stone-800">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="flex-grow flex flex-col bg-stone-950 p-8 pb-0 overflow-y-auto w-full">
                    <MiniEditor
                        content={content}
                        onUpdate={onUpdate}
                        placeholder="Edit generated questions here..."
                        variant="dark"
                        className="!bg-stone-950 !border-none focus-within:ring-0 [&_.ProseMirror]:text-stone-300 [&_.ProseMirror]:text-base [&_.ProseMirror]:leading-7 [&_.ProseMirror_p]:text-stone-300 [&_.ProseMirror_p]:mb-3 [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-serif [&_.ProseMirror_h1]:text-white [&_.ProseMirror_h1]:mb-4 [&_.ProseMirror_h1]:mt-2 [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:text-stone-100 [&_.ProseMirror_h2]:mt-8 [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h2]:pb-2 [&_.ProseMirror_h2]:border-b [&_.ProseMirror_h2]:border-stone-700 [&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:text-stone-200 [&_.ProseMirror_h3]:mt-5 [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h4]:text-base [&_.ProseMirror_h4]:font-semibold [&_.ProseMirror_h4]:text-stone-300 [&_.ProseMirror_h4]:mt-4 [&_.ProseMirror_h4]:mb-2 [&_.ProseMirror_strong]:text-stone-200 [&_.ProseMirror_strong]:font-bold [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_li]:text-stone-300 [&_.ProseMirror_li]:mb-1 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-nobel-gold [&_.ProseMirror_blockquote]:bg-stone-900 [&_.ProseMirror_blockquote]:py-3 [&_.ProseMirror_blockquote]:px-4 [&_.ProseMirror_blockquote]:rounded-r-lg [&_.ProseMirror_blockquote]:text-sm [&_.ProseMirror_blockquote]:text-stone-400 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:my-3 [&_.ProseMirror_hr]:border-stone-700 [&_.ProseMirror_hr]:my-6 [&_.ProseMirror_em]:text-stone-400 min-h-full"
                    />
                </div>
                <div className="px-8 py-6 border-t border-stone-800 bg-stone-900/50 flex justify-center gap-3 z-10 w-full mt-auto">
                    <button
                        onClick={onSaveToDocs}
                        className="flex-1 px-4 py-3 bg-stone-800 text-stone-300 rounded-full text-sm font-bold uppercase tracking-wider hover:bg-stone-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <FolderPlus className="w-4 h-4" />
                        Save to Documents
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-white text-stone-900 rounded-full text-sm font-bold uppercase tracking-wider hover:bg-stone-200 transition-colors shadow-lg"
                    >
                        Close
                    </button>
                </div>
            </div>
        </>
    );
};
