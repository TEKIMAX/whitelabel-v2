import React, { useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Heading1, Heading2, List as ListIcon } from 'lucide-react';
import TurndownService from 'turndown';
import { marked } from 'marked';

const turndownService = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });
turndownService.remove(['style', 'script']);

interface MiniStoryEditorProps {
    content: string;
    onChange: (html: string) => void;
    className?: string;
    readOnly?: boolean;
}

export const MiniStoryEditor: React.FC<MiniStoryEditorProps> = ({ content, onChange, className = '', readOnly = false }) => {
    const editor = useEditor({
        extensions: [StarterKit],
        editable: !readOnly,
        content: '',
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            const markdown = turndownService.turndown(html);
            onChange(markdown);
        },
        editorProps: {
            attributes: {
                class: 'prose prose-nobel max-w-none focus:outline-none min-h-full px-8 py-6 text-stone-800 font-sans leading-loose',
            },
        },
    });

    // Parse Markdown to HTML when content prop changes (and not focused)
    const isFirstRun = useRef(true);
    useEffect(() => {
        const parseContent = async () => {
            if (content && editor && (!editor.isFocused || isFirstRun.current)) {
                const html = await marked.parse(content);
                editor.commands.setContent(html);
                isFirstRun.current = false;
            }
        };
        parseContent();
    }, [content, editor]);

    useEffect(() => {
        if (editor) {
            editor.setEditable(!readOnly);
        }
    }, [readOnly, editor]);

    if (!editor) return null;

    return (
        <div className={`border border-stone-200 rounded-none overflow-hidden bg-white flex flex-col ${className}`}>
            {/* Toolbar */}
            <div className={`flex items-center gap-1 px-3 py-2 bg-stone-50 border-b border-stone-200 shrink-0 ${readOnly ? 'opacity-50 pointer-events-none' : ''}`}>
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-2 rounded hover:bg-white transition-colors ${editor.isActive('bold') ? 'bg-white shadow-sm text-nobel-gold' : 'text-stone-500'} `}
                    title="Bold"
                >
                    <Bold className="w-4 h-4" />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-2 rounded hover:bg-white transition-colors ${editor.isActive('italic') ? 'bg-white shadow-sm text-nobel-gold' : 'text-stone-500'} `}
                    title="Italic"
                >
                    <Italic className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-stone-200 mx-1" />
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`p-2 rounded hover:bg-white transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-white shadow-sm text-nobel-gold' : 'text-stone-500'} `}
                    title="Heading 1"
                >
                    <Heading1 className="w-4 h-4" />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`p-2 rounded hover:bg-white transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-white shadow-sm text-nobel-gold' : 'text-stone-500'} `}
                    title="Heading 2"
                >
                    <Heading2 className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-stone-200 mx-1" />
                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-2 rounded hover:bg-white transition-colors ${editor.isActive('bulletList') ? 'bg-white shadow-sm text-nobel-gold' : 'text-stone-500'} `}
                    title="Bullet List"
                >
                    <ListIcon className="w-4 h-4" />
                </button>
            </div>
            {/* Editor */}
            <EditorContent editor={editor} className="flex-grow [&>div]:h-full" />
        </div>
    );
};
