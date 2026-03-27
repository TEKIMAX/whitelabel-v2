import React, { useEffect, useMemo } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { AiBadge } from './extensions/AiBadge';
import { Bold, Italic, List, ListOrdered, Sparkles, Loader2 } from 'lucide-react';
import { marked } from 'marked';
import TurndownService from 'turndown';

const BADGE_MARKDOWN = '![AI Assisted](https://img.shields.io/badge/AI-Assisted-purple)';
const HUMAN_BADGE_MARKDOWN = '![Human Edited](https://img.shields.io/badge/Human-Edited-orange)';

interface MiniEditorProps {
    content: string;
    onUpdate: (content: string) => void;
    placeholder?: string;
    onGenerateAI?: () => Promise<string>;
    isGenerating?: boolean;
    disabled?: boolean;
    className?: string; // Allow external styling
    isAiAssisted?: boolean;
    variant?: 'light' | 'dark';
}

const MiniEditor: React.FC<MiniEditorProps> = ({
    content,
    onUpdate,
    placeholder = 'Write something...',
    onGenerateAI,
    isGenerating = false,
    disabled = false,
    className = '',
    isAiAssisted = false,
    variant = 'light'
}) => {
    // Configure Turndown for HTML -> Markdown
    const turndownService = useMemo(() => {
        const service = new TurndownService({
            headingStyle: 'atx',
            bulletListMarker: '-',
            codeBlockStyle: 'fenced'
        });

        // Custom rule for AI Badge
        service.addRule('aiBadge', {
            filter: (node) => {
                return node.nodeName === 'SPAN' && node.getAttribute('data-type') === 'ai-badge';
            },
            replacement: (content, node) => {
                return '![AI Assisted](https://img.shields.io/badge/AI-Assisted-purple) ';
            }
        });

        // Custom rule for images (keep as image markdown)
        service.keep(['img']);

        return service;
    }, []);

    // Strip badges for editor view
    const cleanContent = useMemo(() => {
        if (!content) return '';
        let cleaned = content;
        // Remove AI Badge (Global replace to catch duplicates)
        // We use a regex with global flag to ensure all instances are removed
        cleaned = cleaned.replace(new RegExp(`\\s*${BADGE_MARKDOWN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g'), '');
        // Remove Human Badge
        cleaned = cleaned.replace(new RegExp(`\\s*${HUMAN_BADGE_MARKDOWN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g'), '');

        return cleaned.trim();
    }, [content]);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder,
            }),
            AiBadge,
        ],
        // Initial Content: Parse Markdown to HTML if content looks like markdown (or always)
        content: cleanContent ? marked.parse(cleanContent) : '',
        editable: !disabled,
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] p-3 text-gray-700',
            },
        },
    });

    const isApplyingAi = React.useRef(false);

    // Handle updates with latest props
    useEffect(() => {
        if (!editor) return;

        const handleUpdate = () => {
            if (isApplyingAi.current) return;

            const html = editor.getHTML();
            let markdown = turndownService.turndown(html);

            // Only add/update badges if the user is actually interacting (focused)
            if (editor.isFocused) {
                markdown = markdown.trim();
                if (isAiAssisted) {
                    markdown += '\n\n' + BADGE_MARKDOWN;
                    markdown += '&nbsp;&nbsp;' + HUMAN_BADGE_MARKDOWN;
                } else {
                    markdown += '\n\n' + HUMAN_BADGE_MARKDOWN;
                }
                onUpdate(markdown);
            }
        };

        editor.on('update', handleUpdate);
        return () => {
            editor.off('update', handleUpdate);
        };
    }, [editor, isAiAssisted, onUpdate, turndownService]);

    // Sync content if it changes externally
    useEffect(() => {
        if (editor && content) {
            // Clean incoming content for comparison
            let incomingClean = content;
            incomingClean = incomingClean.replace(new RegExp(`\\s*${BADGE_MARKDOWN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g'), '');
            incomingClean = incomingClean.replace(new RegExp(`\\s*${HUMAN_BADGE_MARKDOWN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g'), '');
            incomingClean = incomingClean.trim();

            const currentHTML = editor.getHTML();
            const currentMarkdown = turndownService.turndown(currentHTML);
            const currentClean = currentMarkdown.replace(new RegExp(`\\s*${BADGE_MARKDOWN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g'), '').replace(new RegExp(`\\s*${HUMAN_BADGE_MARKDOWN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g'), '').trim();

            if (currentClean !== incomingClean && !editor.isFocused && !isApplyingAi.current) {
                const newHTML = marked.parse(incomingClean);
                editor.commands.setContent(newHTML as string);
            }
        }
    }, [content, editor, turndownService]);

    useEffect(() => {
        if (editor) {
            editor.setEditable(!disabled);
        }
    }, [disabled, editor]);

    const handleGenerateClick = async () => {
        if (!onGenerateAI) return;

        // Expect string return
        try {
            const generatedContent = await onGenerateAI();

            if (typeof generatedContent === 'string' && generatedContent.trim() && editor) {
                isApplyingAi.current = true;
                const html = marked.parse(generatedContent);

                // Ensure focus before inserting
                editor.commands.focus('end');

                if (!editor.isEmpty) {
                    editor.commands.insertContent('\n\n');
                }
                editor.commands.insertContent(html as string);

                const currentHtml = editor.getHTML();
                let markdown = turndownService.turndown(currentHtml);
                markdown = markdown.trim() + '\n\n' + BADGE_MARKDOWN;

                onUpdate(markdown);

                // Buffer to ensure update event finishes
                setTimeout(() => {
                    isApplyingAi.current = false;
                }, 500); // Increased buffer
            } else {
            }
        } catch (error) {
            isApplyingAi.current = false;
        }
    };

    if (!editor) {
        return null;
    }

    return (
        <div className={`transition-colors flex flex-col ${disabled ? '' : (variant === 'dark' ? 'bg-stone-950 border border-stone-800' : 'bg-white border border-gray-300')} rounded-md focus-within:ring-2 focus-within:ring-nobel-gold focus-within:border-transparent ${className}`}>
            {/* Fixed Toolbar - Always render to maintain DOM stability, hide via CSS when disabled */}
            <div
                className={`items-center gap-1 p-2 border-b ${variant === 'dark' ? 'border-stone-800 bg-stone-900/50' : 'border-gray-100 bg-gray-50/50'} ${disabled ? 'hidden' : 'flex'}`}
            >
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-1.5 rounded transition-colors ${
                        editor.isActive('bold') 
                            ? (variant === 'dark' ? 'bg-stone-800 text-white' : 'bg-gray-200 text-black') 
                            : (variant === 'dark' ? 'text-stone-400 hover:bg-stone-800 hover:text-white' : 'text-gray-500 hover:bg-gray-200')
                    }`}
                    title="Bold"
                >
                    <Bold size={14} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-1.5 rounded transition-colors ${
                        editor.isActive('italic') 
                            ? (variant === 'dark' ? 'bg-stone-800 text-white' : 'bg-gray-200 text-black') 
                            : (variant === 'dark' ? 'text-stone-400 hover:bg-stone-800 hover:text-white' : 'text-gray-500 hover:bg-gray-200')
                    }`}
                    title="Italic"
                >
                    <Italic size={14} />
                </button>
                <div className={`w-px h-4 mx-1 ${variant === 'dark' ? 'bg-stone-800' : 'bg-gray-300'}`} />
                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-1.5 rounded transition-colors ${
                        editor.isActive('bulletList') 
                            ? (variant === 'dark' ? 'bg-stone-800 text-white' : 'bg-gray-200 text-black') 
                            : (variant === 'dark' ? 'text-stone-400 hover:bg-stone-800 hover:text-white' : 'text-gray-500 hover:bg-gray-200')
                    }`}
                    title="Bullet List"
                >
                    <List size={14} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`p-1.5 rounded transition-colors ${
                        editor.isActive('orderedList') 
                            ? (variant === 'dark' ? 'bg-stone-800 text-white' : 'bg-gray-200 text-black') 
                            : (variant === 'dark' ? 'text-stone-400 hover:bg-stone-800 hover:text-white' : 'text-gray-500 hover:bg-gray-200')
                    }`}
                    title="Ordered List"
                >
                    <ListOrdered size={14} />
                </button>

                <div className="flex-1" />

                {onGenerateAI && (
                    <button
                        onClick={handleGenerateClick}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-4 py-1.5 bg-stone-900 text-nobel-gold rounded-full text-[10px] font-bold uppercase tracking-[0.1em] transition-all hover:bg-stone-800 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group border border-nobel-gold/20"
                    >
                        {isGenerating ? (
                            <Loader2 size={12} className="animate-spin text-nobel-gold" />
                        ) : (
                            <Sparkles size={12} className="text-nobel-gold group-hover:scale-110 transition-transform" />
                        )}
                        {isGenerating ? 'Generating...' : 'Generate an example'}
                    </button>
                )}
            </div>

            {/* Floating Bubble Menu - Render always to avoid unmount crashes, control visibility via props */}
            {editor && (
                <BubbleMenu
                    editor={editor}
                    tippyOptions={{ duration: 100 }}
                    shouldShow={({ editor, from, to }) => {
                        // Only show if editable, has selection, and selection is not empty
                        return !disabled && editor.isEditable && !editor.state.selection.empty;
                    }}
                >
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-black/80 backdrop-blur text-white shadow-xl border border-white/10">
                        <button
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            className={`p-1.5 rounded hover:bg-white/20 transition-colors ${editor.isActive('bold') ? 'text-nobel-gold' : 'text-white'}`}
                        >
                            <Bold size={14} />
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            className={`p-1.5 rounded hover:bg-white/20 transition-colors ${editor.isActive('italic') ? 'text-nobel-gold' : 'text-white'}`}
                        >
                            <Italic size={14} />
                        </button>
                    </div>
                </BubbleMenu>
            )}

            <EditorContent editor={editor} className={`flex-1 overflow-y-auto ${!disabled ? 'min-h-[120px] h-auto' : 'h-full'}`} />
        </div>
    );
};

export default MiniEditor;
