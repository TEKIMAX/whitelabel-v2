import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { CanvasSection } from '../types';
import MiniEditor from './editor/MiniEditor';

const BADGE_MARKDOWN = '![AI Assisted](https://img.shields.io/badge/AI-Assisted-purple)';
const HUMAN_BADGE_MARKDOWN = '![Human Edited](https://img.shields.io/badge/Human-Edited-orange)';

interface SectionEditDialogProps {
    isOpen: boolean;
    onClose: () => void;
    section: CanvasSection | string;
    initialContent: string;
    onSave: (content: string) => void;
    handleGenerate: (section: any) => Promise<string>;
    getSectionHelper: (section: any) => string;
    isGenerating?: boolean;
}

const SectionEditDialog: React.FC<SectionEditDialogProps> = ({
    isOpen,
    onClose,
    section,
    initialContent,
    onSave,
    handleGenerate,
    getSectionHelper,
    isGenerating = false
}) => {
    const [localContent, setLocalContent] = useState(initialContent);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLocalContent(initialContent);
            setIsDirty(false);
        }
    }, [isOpen, initialContent]);

    const isAiAssisted = localContent.includes(BADGE_MARKDOWN);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(localContent);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-stone-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-6 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-nobel-gold">Editing Section</span>
                        </div>
                        <h2 className="text-2xl font-serif text-stone-900 lowercase first-letter:uppercase">{section}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-400 hover:text-stone-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 bg-white flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Section Goal</h3>
                        <p className="text-sm text-stone-500 italic">
                            {getSectionHelper(section as any)}
                        </p>
                    </div>

                    <div className="flex-1 flex flex-col min-h-[400px]">
                        <MiniEditor
                            content={localContent}
                            onUpdate={(newContent) => {
                                setLocalContent(newContent);
                                setIsDirty(true);
                            }}
                            placeholder={getSectionHelper(section as any)}
                            onGenerateAI={() => handleGenerate(section as any)}
                            isGenerating={isGenerating}
                            isAiAssisted={isAiAssisted}
                            className="flex-1 min-h-[400px]"
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-8 py-6 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-600 text-sm font-bold uppercase tracking-wider hover:bg-stone-50 transition-all shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!isDirty}
                        className="px-8 py-2.5 bg-stone-900 border border-stone-900 rounded-xl text-white text-sm font-bold uppercase tracking-wider hover:bg-nobel-gold hover:border-nobel-gold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Check className="w-4 h-4" />
                        Update Section
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SectionEditDialog;
