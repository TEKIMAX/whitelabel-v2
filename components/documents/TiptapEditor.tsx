import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useEditor, EditorContent, BubbleMenu, FloatingMenu, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { createPortal } from 'react-dom';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextAlign } from '@tiptap/extension-text-align';
import { CharacterCount } from '@tiptap/extension-character-count';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Underline } from '@tiptap/extension-underline';
import { Extension, Mark, Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
    Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, List, Undo, Redo, Sparkles, ChevronDown,
    Image as ImageIcon, Link as LinkIcon, X, Check, FileText, AlignLeft, AlignCenter, AlignRight, Minus,
    MessageSquarePlus, User, Send, MessageSquare, Table as TableIcon, Trash2, Layout, Maximize, Columns, Rows, Settings, MoreHorizontal, Bot,
    Lock, Type, PenLine
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useMutation, useQuery } from "convex/react";
import { useAIFixDocumentGrammar, useAIDocumentChat } from "../../hooks/useAI";
import { useUpdateDocument } from '../../hooks/useUpdate';
import { useGenerateUploadUrl } from '../../hooks/useCreate';
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { useTiptapSync } from "@convex-dev/prosemirror-sync/tiptap";
import { marked } from 'marked';
import TurndownService from 'turndown';

// Initialize Turndown Service
const turndownService = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });
turndownService.remove(['style', 'script']);

// --- Interfaces ---

interface CommentReply {
    id: string;
    text: string;
    author: string;
    timestamp: string;
}

interface Comment {
    id: string;
    text: string;
    author: string;
    timestamp: string;
    replies: CommentReply[];
}

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

interface TiptapEditorProps {
    content: string;
    onUpdate: (content: string) => void;
    isCommentsOpen: boolean;
    onToggleComments: (isOpen: boolean) => void;
    documentId?: string;
    orgId?: string;
    readOnly?: boolean;
    fileName?: string;
    collaborators?: string[];
}

// --- Custom Signature Node View ---

const ImageResizeComponent = (props: any) => {
    const { node, updateAttributes, selected } = props;
    const [resizing, setResizing] = useState(false);
    const startX = useRef(0);
    const startWidth = useRef(0);

    const onMouseDown = (e: React.MouseEvent, direction: 'right' | 'left') => {
        e.preventDefault();
        e.stopPropagation();
        setResizing(true);
        startX.current = e.clientX;

        // Get current width (computed or attribute)
        const currentWidth = node.attrs.width;
        // For simplicity, let's use the element's offsetWidth to start
        const element = (e.target as HTMLElement).closest('.image-resizer') as HTMLElement;
        startWidth.current = element ? element.offsetWidth : 300;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const delta = moveEvent.clientX - startX.current;
            const newWidth = direction === 'right' ? startWidth.current + delta : startWidth.current - delta;
            // Enforce min width
            if (newWidth > 100) {
                updateAttributes({ width: `${newWidth}px` });
            }
        };

        const onMouseUp = () => {
            setResizing(false);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    return (
        <NodeViewWrapper className={twMerge("image-resizer", node.attrs.class)} style={{ width: node.attrs.width }}>
            <img src={node.attrs.src} alt={node.attrs.alt} />
            {(selected || resizing) && (
                <>
                    <div className="resize-handle tl" onMouseDown={(e) => onMouseDown(e, 'left')} />
                    <div className="resize-handle tr" onMouseDown={(e) => onMouseDown(e, 'right')} />
                    <div className="resize-handle bl" onMouseDown={(e) => onMouseDown(e, 'left')} />
                    <div className="resize-handle br" onMouseDown={(e) => onMouseDown(e, 'right')} />
                </>
            )}
        </NodeViewWrapper>
    );
};

// Custom Image Extension
const ResizableImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: '100%',
                parseHTML: element => element.style.width,
                renderHTML: (attributes) => {
                    return {
                        style: `width: ${attributes.width}`
                    }
                }
            },
            class: {
                default: 'img-center',
            }
        }
    },
    addNodeView() {
        return ReactNodeViewRenderer(ImageResizeComponent);
    },
});


// --- Custom Extensions ---

// Custom Mark for Comments
const CommentMark = Mark.create({
    name: 'comment',
    keepOnSplit: false,

    addAttributes() {
        return {
            commentId: {
                default: null,
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-comment-id]',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { 'data-comment-id': HTMLAttributes.commentId, class: 'comment-highlight' }), 0]
    },
})

// Grammar Extension (Simulated)
const GrammarHighlight = Extension.create({
    name: 'grammarHighlight',
    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('grammarHighlight'),
                props: {
                    decorations(state) {
                        const decorations: Decoration[] = [];
                        const doc = state.doc;
                        const badWords = ['teh', 'recieve', 'seperate', 'occured'];

                        doc.descendants((node, pos) => {
                            if (node.isText) {
                                const text = node.text || '';
                                badWords.forEach(word => {
                                    const regex = new RegExp(`\\b${word}\\b`, 'gi');
                                    let match;
                                    while ((match = regex.exec(text)) !== null) {
                                        decorations.push(
                                            Decoration.inline(pos + match.index, pos + match.index + match[0].length, {
                                                class: 'grammar-error',
                                                'data-error': match[0]
                                            })
                                        );
                                    }
                                });
                            }
                        });
                        return DecorationSet.create(doc, decorations);
                    },
                },
            }),
        ];
    },
});

export const TipTapEditor: React.FC<TiptapEditorProps> = ({ content, onUpdate, isCommentsOpen, onToggleComments, documentId, orgId, readOnly = false, fileName, collaborators }) => {
    // Editor State
    const [isPluginMenuOpen, setIsPluginMenuOpen] = useState(false);
    const [isTableDropdownOpen, setIsTableDropdownOpen] = useState(false); // Main Toolbar Table Dropdown
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [showSummary, setShowSummary] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isLocked, setIsLocked] = useState(false);

    // AI Chat State
    const [isAiChatOpen, setIsAiChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatProcessing, setIsChatProcessing] = useState(false);
    const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
    const chatSessionRef = useRef<any | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Comments State
    const [comments, setComments] = useState<Comment[]>([]);
    const [newCommentText, setNewCommentText] = useState('');
    const [replyText, setReplyText] = useState('');
    const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
    const [pendingCommentId, setPendingCommentId] = useState<string | null>(null); // ID for comment being created

    const fileInputRef = useRef<HTMLInputElement>(null);

    const sync = useTiptapSync(api.tiptap, documentId || "default");
    const generateUploadUrl = useGenerateUploadUrl();
    const fixGrammarAction = useAIFixDocumentGrammar();
    const documentChatAction = useAIDocumentChat();

    const isMarkdown = fileName?.toLowerCase().endsWith('.md');

    // Debounced update for Markdown conversion
    const handleUpdate = useCallback((editor: any) => {
        const html = editor.getHTML();
        if (isMarkdown) {
            const markdown = turndownService.turndown(html);
            onUpdate(markdown);
        } else {
            onUpdate(html);
        }
    }, [isMarkdown, onUpdate]);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({ placeholder: 'Type \'/\' for commands...' }),
            ResizableImage, // Replaced standard Image with ResizableImage
            Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-nobel-gold underline cursor-pointer' } }),
            TextStyle,
            FontFamily,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            CharacterCount,
            GrammarHighlight,
            CommentMark,
            Underline,
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            // SignatureExtension removed
            sync.extension,
        ],
        content: isMarkdown ? '' : (sync.initialContent || content), // Use sync content if available, else prop. Empty if MD (async load)
        editable: !readOnly, // Add this line
        onUpdate: ({ editor }) => {
            handleUpdate(editor);
        },
        editorProps: {
            attributes: {
                class: 'prose prose-nobel max-w-none focus:outline-none min-h-[500px] px-8 py-6 pb-32',
            },
            handleClick: (view, pos, event) => {
                // Check if a comment mark was clicked
                const { schema } = view.state;
                const node = view.state.doc.nodeAt(pos);
                // Find marks at the click position
                const $pos = view.state.doc.resolve(pos);
                const marks = $pos.marks();
                const commentMark = marks.find(m => m.type.name === 'comment');

                if (commentMark) {
                    const id = commentMark.attrs.commentId;
                    setActiveCommentId(id);
                    onToggleComments(true);
                    return true; // Stop event propagation
                }
                return false;
            },
            // Pass documentId to editorProps so NodeViews can access it
            documentId: documentId,
            orgId: orgId,
            collaborators: collaborators,
        } as any,
    });

    // Handle Markdown Loading
    const isFirstRun = useRef(true);
    useEffect(() => {
        const parseMarkdown = async () => {
            if (isMarkdown && content && editor && (!editor.isFocused || isFirstRun.current)) {
                if (isFirstRun.current) {
                    const html = await marked.parse(content);
                    editor.commands.setContent(html);
                    isFirstRun.current = false;
                }
            }
        };
        parseMarkdown();
    }, [content, editor, isMarkdown]);

    useEffect(() => {
        if (sync.isLoading) return;
        if (sync.initialContent === null && content && editor) {
            // Document doesn't exist on server, create it with local content
            try {
                // Wait for editor to be ready with content
                sync.create({ type: 'doc', content: editor.getJSON().content });
            } catch (e) {
                sync.create({ type: 'doc', content: [] });
            }
        } else if (sync.initialContent === null && !content) {
            sync.create({ type: 'doc', content: [] });
        }
    }, [sync.isLoading, sync.initialContent, editor]);

    // --- Logic ---

    // Handle Document Locking
    const toggleLock = () => {
        if (!editor) return;
        const newState = !isLocked;
        setIsLocked(newState);
        editor.setEditable(!newState);
    };

    // Scroll to bottom of chat
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, currentStreamingMessage, isAiChatOpen]);

    // Update comment highlights based on active ID
    useEffect(() => {
        if (!editor) return;

        // 1. Update Editor Highlights
        setTimeout(() => {
            const domElements = document.querySelectorAll(`span[data-comment-id]`);
            domElements.forEach(el => {
                const id = el.getAttribute('data-comment-id');
                if (id === activeCommentId) {
                    el.classList.add('active');
                } else {
                    el.classList.remove('active');
                }
            });
        }, 0);

        // 2. Scroll Sidebar to Active Comment
        if (activeCommentId && isCommentsOpen) {
            setTimeout(() => {
                const commentCard = document.getElementById(`comment-${activeCommentId}`);
                if (commentCard) {
                    commentCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    }, [activeCommentId, editor, isCommentsOpen]);


    const addImage = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            try {
                // 1. Get Upload URL
                const postUrl = await generateUploadUrl();

                // 2. Upload File
                const result = await fetch(postUrl, {
                    method: "POST",
                    headers: { "Content-Type": file.type },
                    body: file,
                });

                if (!result.ok) throw new Error("Upload failed");
                const { storageId } = await result.json();

                // 3. Insert Image with Persistent URL
                if (editor) {
                    // Start 
                    const convexUrl = import.meta.env.VITE_CONVEX_URL || "https://hidden-gecko-710.convex.cloud";
                    const httpUrl = convexUrl.replace(".cloud", ".site");
                    const imageUrl = `${httpUrl}/api/storage?storageId=${storageId}`;

                    editor.chain().focus().setImage({ src: imageUrl }).run();
                }
            } catch (error) {
                toast.error("Failed to upload image");
            } finally {
                // Reset input
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        }
    };

    const handleGrammarFix = async () => {
        if (!editor || isAiLoading) return;

        const selection = editor.state.selection;
        if (selection.empty) {
            toast.error("Please select text to fix grammar");
            return;
        }

        const selectedText = editor.state.doc.textBetween(selection.from, selection.to, ' ');
        setIsAiLoading(true);

        try {
            // Use Convex action instead of client-side Gemini
            const fixedText = await fixGrammarAction({ text: selectedText });

            if (fixedText) {
                editor.chain().focus().deleteSelection().insertContent(fixedText.trim()).run();
                toast.success("Grammar fixed!");
            }
        } catch (error) {
            toast.error("Failed to fix grammar");
        } finally {
            setIsAiLoading(false);
        }
    };

    // Helper to get initials from a name
    const getInitials = (name: string) => {
        const names = name.split(' ');
        if (names.length === 1) {
            return names[0].charAt(0).toUpperCase();
        }
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    };

    const updateImageClass = (className: string) => {
        if (editor?.isActive('image')) {
            editor.chain().focus().updateAttributes('image', { class: className }).run();
        }
    };

    const setLink = useCallback(() => {
        if (linkUrl === null) return;
        if (linkUrl === '') {
            editor?.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor?.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
        setShowLinkInput(false);
        setLinkUrl('');
    }, [editor, linkUrl]);

    // --- AI Chat Logic ---

    const openAiChat = async () => {
        setIsAiChatOpen(true);
        onToggleComments(false); // Ensure comments are closed

        // Initialize chat with greeting on first open
        if (chatMessages.length === 0) {
            setChatMessages([{ role: 'model', text: 'Hello! I\'ve read your document. How can I help you improve or expand it today?' }]);
        }
    };

    const handleSendChatMessage = async () => {
        if (!chatInput.trim() || !editor) return;

        const userMessage = chatInput;
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setIsChatProcessing(true);

        try {
            // Use Convex action instead of client-side Gemini
            const response = await documentChatAction({
                message: userMessage,
                documentContext: editor.getText(),
                history: chatMessages.map(m => ({ role: m.role, text: m.text }))
            });

            setChatMessages(prev => [...prev, { role: 'model', text: response }]);
        } catch (error) {
            setChatMessages(prev => [...prev, { role: 'model', text: "I'm sorry, I encountered an error processing your request." }]);
        } finally {
            setIsChatProcessing(false);
        }
    };

    const handleAiCompletion = () => {
        if (!editor) return;
        setIsAiLoading(true);
        setTimeout(() => {
            const selection = editor.state.selection;
            const text = editor.state.doc.textBetween(selection.from, selection.to, ' ');
            let aiResponse = "";
            if (text) {
                aiResponse = ` Here is a clearer way to phrase that: "${text}" implies a formal tone, but we could simplify it for clarity.`;
            } else {
                aiResponse = " Nobel Financial's unified platform streamlines revenue management by combining invoicing, subscriptions, and payments into a single secure dashboard.";
            }
            editor.chain().focus().insertContent(aiResponse).run();
            setIsAiLoading(false);
        }, 1500);
    };

    const handleFixGrammar = () => {
        if (!editor) return;
        setIsAiLoading(true);
        setTimeout(() => {
            const corrections: Record<string, string> = {
                'teh': 'the', 'recieve': 'receive', 'seperate': 'separate', 'occured': 'occurred'
            };
            const doc = editor.state.doc;
            let tr = editor.state.tr;
            let found = false;
            doc.descendants((node, pos) => {
                if (!node.isText) return;
                const text = node.text || '';
                Object.keys(corrections).forEach(badWord => {
                    const regex = new RegExp(`\\b${badWord}\\b`, 'gi');
                    let match;
                    while ((match = regex.exec(text)) !== null) {
                        const from = pos + match.index;
                        const to = from + match[0].length;
                        tr = tr.replaceWith(from, to, editor.schema.text(corrections[badWord]));
                        found = true;
                    }
                });
            });
            if (found) {
                editor.view.dispatch(tr);
                alert("AI has fixed the detected grammar issues.");
            } else {
                alert("No grammar issues found.");
            }
            setIsAiLoading(false);
        }, 1000);
    }

    // --- Comments Logic ---
    const handleAddCommentStart = () => {
        if (!editor) return;
        if (editor.state.selection.empty) {
            alert("Please highlight text to comment on.");
            return;
        }
        const commentId = Date.now().toString();
        editor.chain().focus().setMark('comment', { commentId }).run();
        setPendingCommentId(commentId);
        setActiveCommentId(commentId);
        onToggleComments(true);
        setIsAiChatOpen(false); // Close AI chat if opening comments
    };

    const handleSaveComment = () => {
        if (!newCommentText.trim() || !pendingCommentId) return;
        const newComment: Comment = {
            id: pendingCommentId,
            text: newCommentText,
            author: 'You',
            timestamp: 'Just now',
            replies: []
        };
        setComments([newComment, ...comments]);
        setNewCommentText('');
        setPendingCommentId(null);
    };

    const handleReply = (commentId: string) => {
        if (!replyText.trim()) return;
        const updatedComments = comments.map(c => {
            if (c.id === commentId) {
                return {
                    ...c,
                    replies: [...c.replies, {
                        id: Date.now().toString(),
                        text: replyText,
                        author: 'You',
                        timestamp: 'Just now'
                    }]
                };
            }
            return c;
        });
        setComments(updatedComments);
        setReplyText('');
    };

    const scrollToComment = (commentId: string) => {
        setActiveCommentId(commentId);
    };

    if (!editor) {
        return null;
    }

    const ToolbarButton = ({ onClick, isActive = false, children, className, title, disabled = false }: any) => (
        <button
            onClick={onClick}
            title={title}
            disabled={disabled}
            className={twMerge(
                "p-2 rounded hover:bg-nobel-gold/10 transition-colors text-nobel-dark/70 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed",
                isActive && "bg-nobel-gold/10 text-nobel-dark",
                className
            )}
        >
            {children}
        </button>
    );

    return (

        <>

            <div className="flex h-full relative overflow-hidden">
                {/* Editor Container */}
                <div className="flex-grow flex flex-col h-full bg-white rounded-lg shadow-sm border border-nobel-dark/5 overflow-hidden relative group z-10">
                    {/* Hidden File Input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />

                    {/* Main Toolbar (Top) - Hidden when printing */}
                    <div className="no-print flex flex-wrap items-center gap-1 p-2 border-b border-nobel-dark/10 bg-nobel-cream/30 sticky top-0 z-20 transition-opacity duration-300" style={{ opacity: isLocked ? 0.6 : 1, pointerEvents: isLocked ? 'none' : 'auto' }}>
                        <div className="flex items-center gap-1 border-r border-nobel-dark/10 pr-2 mr-2">
                            <div className="relative group/font">
                                <ToolbarButton className="w-24 justify-between text-xs px-2">
                                    <span className="truncate">Font</span> <ChevronDown size={12} />
                                </ToolbarButton>
                                <div className="absolute top-full left-0 w-32 bg-white shadow-lg rounded border border-nobel-dark/5 hidden group-hover/font:block py-1 z-50">
                                    <button onClick={() => editor.chain().focus().setFontFamily('Inter').run()} className="w-full text-left px-3 py-1 hover:bg-nobel-cream text-xs font-sans">Inter</button>
                                    <button onClick={() => editor.chain().focus().setFontFamily('Playfair Display').run()} className="w-full text-left px-3 py-1 hover:bg-nobel-cream text-xs font-serif">Playfair Display</button>
                                    <button onClick={() => editor.chain().focus().setFontFamily('Lato').run()} className="w-full text-left px-3 py-1 hover:bg-nobel-cream text-xs font-sans" style={{ fontFamily: 'Lato' }}>Lato</button>
                                    <button onClick={() => editor.chain().focus().setFontFamily('Montserrat').run()} className="w-full text-left px-3 py-1 hover:bg-nobel-cream text-xs font-sans" style={{ fontFamily: 'Montserrat' }}>Montserrat</button>
                                    <button onClick={() => editor.chain().focus().setFontFamily('Merriweather').run()} className="w-full text-left px-3 py-1 hover:bg-nobel-cream text-xs font-serif" style={{ fontFamily: 'Merriweather' }}>Merriweather</button>
                                    <button onClick={() => editor.chain().focus().setFontFamily('Courier Prime').run()} className="w-full text-left px-3 py-1 hover:bg-nobel-cream text-xs font-mono" style={{ fontFamily: 'Courier Prime' }}>Monospace</button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 border-r border-nobel-dark/10 pr-2 mr-2">
                            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold"><Bold size={16} /></ToolbarButton>
                            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic"><Italic size={16} /></ToolbarButton>
                            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline"><UnderlineIcon size={16} /></ToolbarButton>
                            <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus size={16} /></ToolbarButton>
                        </div>

                        <div className="flex items-center gap-1 border-r border-nobel-dark/10 pr-2 mr-2">
                            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="H1"><Heading1 size={16} /></ToolbarButton>
                            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="H2"><Heading2 size={16} /></ToolbarButton>
                        </div>

                        <div className="flex items-center gap-1 border-r border-nobel-dark/10 pr-2 mr-2">
                            {/* Main Table Toolbar Menu */}
                            <div className="relative">
                                <ToolbarButton
                                    onClick={() => setIsTableDropdownOpen(!isTableDropdownOpen)}
                                    isActive={editor.isActive('table')}
                                    title="Table"
                                >
                                    <TableIcon size={16} /> <ChevronDown size={10} className="ml-1" />
                                </ToolbarButton>

                                {isTableDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-nobel-dark/5 py-1 z-50 flex flex-col">
                                        <button onClick={() => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); setIsTableDropdownOpen(false); }} className="px-3 py-2 text-xs text-left hover:bg-nobel-cream flex items-center gap-2"><TableIcon size={14} /> Insert Table</button>
                                        <div className="h-[1px] bg-nobel-dark/5 my-1" />
                                        <button onClick={() => { editor.chain().focus().addColumnBefore().run(); setIsTableDropdownOpen(false); }} className="px-3 py-2 text-xs text-left hover:bg-nobel-cream">Add Column Before</button>
                                        <button onClick={() => { editor.chain().focus().addColumnAfter().run(); setIsTableDropdownOpen(false); }} className="px-3 py-2 text-xs text-left hover:bg-nobel-cream">Add Column After</button>
                                        <button onClick={() => { editor.chain().focus().deleteColumn().run(); setIsTableDropdownOpen(false); }} className="px-3 py-2 text-xs text-left hover:bg-nobel-cream text-red-500">Delete Column</button>
                                        <div className="h-[1px] bg-nobel-dark/5 my-1" />
                                        <button onClick={() => { editor.chain().focus().addRowBefore().run(); setIsTableDropdownOpen(false); }} className="px-3 py-2 text-xs text-left hover:bg-nobel-cream">Add Row Before</button>
                                        <button onClick={() => { editor.chain().focus().addRowAfter().run(); setIsTableDropdownOpen(false); }} className="px-3 py-2 text-xs text-left hover:bg-nobel-cream">Add Row After</button>
                                        <button onClick={() => { editor.chain().focus().deleteRow().run(); setIsTableDropdownOpen(false); }} className="px-3 py-2 text-xs text-left hover:bg-nobel-cream text-red-500">Delete Row</button>
                                        <div className="h-[1px] bg-nobel-dark/5 my-1" />
                                        <button onClick={() => { editor.chain().focus().deleteTable().run(); setIsTableDropdownOpen(false); }} className="px-3 py-2 text-xs text-left hover:bg-nobel-cream text-red-500">Delete Table</button>
                                    </div>
                                )}
                            </div>

                            <ToolbarButton onClick={addImage} title="Upload Image"><ImageIcon size={16} /></ToolbarButton>

                            {/* Signature Button Removed */}
                        </div>

                        <div className="flex items-center gap-1 mr-auto">
                            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo size={16} /></ToolbarButton>
                            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo size={16} /></ToolbarButton>
                        </div>



                        {/* Lock Button - OUTSIDE the lock-opacity style so it remains clickable */}
                        {/* <div className="ml-2 pl-2 border-l border-nobel-dark/10 pointer-events-auto">
                            <button
                                onClick={toggleLock}
                                className={twMerge(
                                    "p-2 rounded transition-colors flex items-center gap-2 text-xs font-medium",
                                    isLocked ? "bg-nobel-dark text-white hover:bg-nobel-dark/90" : "hover:bg-nobel-gold/10 text-nobel-dim"
                                )}
                                title={isLocked ? "Unlock Document" : "Lock to View Only"}
                            >
                                <Lock size={16} />
                                {isLocked ? "View Only" : "Lock"}
                            </button>
                        </div> */}

                        {/* Comments Toggle */}
                        {/* <button
                            onClick={() => {
                                onToggleComments(!isCommentsOpen);
                                if (!isCommentsOpen) setIsAiChatOpen(false);
                            }}
                            className={twMerge("ml-2 p-2 rounded transition-colors pointer-events-auto", isCommentsOpen ? "bg-nobel-gold text-white" : "hover:bg-nobel-gold/10 text-nobel-dim")}
                            title="Toggle Comments"
                        >
                            <MessageSquare size={16} />
                        </button> */}
                    </div>

                    {/* Floating Menu (For new lines) */}
                    {!isLocked && (
                        <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }} className="no-print">
                            <div className="flex items-center gap-1 bg-white shadow-lg border border-nobel-dark/10 rounded-lg p-1 overflow-hidden">
                                {/* <button onClick={openAiChat} className="flex items-center gap-2 px-2 py-1 hover:bg-nobel-cream rounded text-xs font-medium text-nobel-gold">
                                    <Sparkles size={14} /> Ask AI
                                </button> */}
                                <div className="w-[1px] h-4 bg-nobel-dark/10 mx-1"></div>
                                <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className="p-1 hover:bg-nobel-cream rounded text-nobel-dim hover:text-nobel-dark"><Heading1 size={14} /></button>
                                <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="p-1 hover:bg-nobel-cream rounded text-nobel-dim hover:text-nobel-dark"><Heading2 size={14} /></button>
                                <button onClick={() => editor.chain().focus().toggleBulletList().run()} className="p-1 hover:bg-nobel-cream rounded text-nobel-dim hover:text-nobel-dark"><List size={14} /></button>
                                <button onClick={addImage} className="p-1 hover:bg-nobel-cream rounded text-nobel-dim hover:text-nobel-dark"><ImageIcon size={14} /></button>
                                <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="p-1 hover:bg-nobel-cream rounded text-nobel-dim hover:text-nobel-dark"><TableIcon size={14} /></button>

                            </div>
                        </FloatingMenu>
                    )}

                    {/* Bubble Menu (General Selection) */}
                    {!isLocked && (
                        <BubbleMenu editor={editor} tippyOptions={{ duration: 100, zIndex: 50 }} className="no-print" shouldShow={({ editor, from, to }) => {
                            // Hide if Image or Table is active (we use separate logic or menus for those)
                            if (editor.isActive('image') || editor.isActive('table') || !editor.isEditable) return false;
                            return !editor.state.selection.empty;
                        }}>
                            <div className="flex items-center gap-1 bg-nobel-dark text-white rounded-lg shadow-xl p-1 animate-fade-in-up">
                                {showLinkInput ? (
                                    <div className="flex items-center gap-2 px-2 py-1">
                                        <input
                                            type="text"
                                            value={linkUrl}
                                            onChange={(e) => setLinkUrl(e.target.value)}
                                            placeholder="Paste URL..."
                                            className="bg-transparent border-b border-white/30 text-xs text-white placeholder-white/50 focus:outline-none focus:border-white w-32"
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && setLink()}
                                        />
                                        <button onClick={setLink} className="text-nobel-gold hover:text-white"><Check size={14} /></button>
                                        <button onClick={() => setShowLinkInput(false)} className="text-white/50 hover:text-white"><X size={14} /></button>
                                    </div>
                                ) : (
                                    <>
                                        {/* <button onClick={handleGrammarFix} className="flex items-center gap-1 px-2 py-1 hover:bg-white/10 rounded text-xs font-medium text-nobel-gold border-r border-white/10 mr-1">
                                        <Sparkles size={12} /> <span className="hidden sm:inline">Grammar Fix</span>
                                    </button> */}
                                        <button onClick={() => editor.chain().focus().toggleBold().run()} className={twMerge("p-1.5 hover:bg-white/10 rounded", editor.isActive('bold') && "text-nobel-gold")}><Bold size={14} /></button>
                                        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={twMerge("p-1.5 hover:bg-white/10 rounded", editor.isActive('italic') && "text-nobel-gold")}><Italic size={14} /></button>
                                        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={twMerge("p-1.5 hover:bg-white/10 rounded", editor.isActive('underline') && "text-nobel-gold")}><UnderlineIcon size={14} /></button>
                                        <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={twMerge("p-1.5 hover:bg-white/10 rounded", editor.isActive({ textAlign: 'left' }) && "text-nobel-gold")}><AlignLeft size={14} /></button>
                                        <button onClick={() => { setShowLinkInput(true); setLinkUrl(editor.getAttributes('link').href || '') }} className={twMerge("p-1.5 hover:bg-white/10 rounded", editor.isActive('link') && "text-nobel-gold")}><LinkIcon size={14} /></button>
                                    </>
                                )}
                            </div>
                        </BubbleMenu>
                    )}

                    {/* Bubble Menu (IMAGE Selection) */}
                    {!isLocked && (
                        <BubbleMenu editor={editor} tippyOptions={{ duration: 100, zIndex: 50 }} className="no-print" shouldShow={({ editor }) => editor.isActive('image') && editor.isEditable}>
                            <div className="flex flex-col gap-1 bg-nobel-dark text-white rounded-lg shadow-xl p-1 animate-fade-in-up">
                                <div className="flex items-center gap-1 border-b border-white/10 pb-1 mb-1 px-1">
                                    <span className="text-[10px] uppercase text-nobel-gold font-bold tracking-wider">Image</span>
                                </div>

                                {/* Position */}
                                <div className="flex items-center gap-1">
                                    <button onClick={() => updateImageClass('img-left')} className="p-1.5 hover:bg-white/10 rounded" title="Float Left"><AlignLeft size={14} /></button>
                                    <button onClick={() => updateImageClass('img-center')} className="p-1.5 hover:bg-white/10 rounded" title="Center"><AlignCenter size={14} /></button>
                                    <button onClick={() => updateImageClass('img-right')} className="p-1.5 hover:bg-white/10 rounded" title="Float Right"><AlignRight size={14} /></button>
                                    <button onClick={() => updateImageClass('img-cover')} className="p-1.5 hover:bg-white/10 rounded text-nobel-gold" title="Header Cover"><Layout size={14} /></button>
                                </div>
                            </div>
                        </BubbleMenu>
                    )}

                    {/* Editor Content */}
                    <div className="flex-grow overflow-y-auto cursor-text bg-white relative" onClick={() => editor.commands.focus()}>
                        {isLocked && (
                            <div className="absolute inset-x-0 top-0 h-1 bg-nobel-dark z-20 flex justify-center">
                                <div className="bg-nobel-dark text-white text-[10px] uppercase tracking-widest px-3 py-1 rounded-b-lg flex items-center gap-1 shadow-md">
                                    <Lock size={10} /> Read Only
                                </div>
                            </div>
                        )}
                        <EditorContent editor={editor} className={twMerge(isLocked && "opacity-90 pointer-events-none select-text")} />

                        {/* AI Loading Indicator */}
                        {isAiLoading && (
                            <div className="absolute bottom-4 right-4 bg-white shadow-lg border border-nobel-gold/30 px-4 py-2 rounded-full flex items-center gap-2 z-50 animate-pulse">
                                <Sparkles size={16} className="text-nobel-gold animate-spin" />
                                <span className="text-xs font-medium text-nobel-dark">AI is writing...</span>
                            </div>
                        )}
                    </div>

                    {/* Footer Status */}
                    <div className="no-print px-4 py-2 bg-nobel-cream/50 border-t border-nobel-dark/5 text-[10px] text-nobel-dim flex justify-between uppercase tracking-wider">
                        <span className="flex items-center gap-2">
                            <div className={twMerge("w-1.5 h-1.5 rounded-full", isLocked ? "bg-nobel-dark" : "bg-green-500")}></div>
                            {isLocked ? "Locked" : "Saved"}
                        </span>
                        {/* Using characterCount storage directly */}
                        <span>{editor.storage.characterCount && editor.storage.characterCount.words ? editor.storage.characterCount.words() : 0} Words</span>
                    </div>
                </div>
            </div>

            {/* Right Side Panels Container */}
            {/* 
            <div className="absolute inset-0 z-50 pointer-events-none">
            
                <div
                    className={twMerge(
                        "bg-[#F9F8F4] border border-nobel-dark/5 shadow-2xl skew-x-0 rounded-l-xl flex flex-col transition-all duration-300 overflow-hidden shrink-0 absolute right-0 top-0 bottom-0 z-50 pointer-events-auto",
                        isCommentsOpen ? "w-80 opacity-100 translate-x-0" : "w-80 opacity-0 translate-x-full pointer-events-none"
                    )}
                >
                    <div className="p-4 border-b border-nobel-dark/5 bg-nobel-cream/30 flex justify-between items-center">
                        <h3 className="font-serif font-bold text-nobel-dark flex items-center gap-2">
                            <MessageSquare size={16} className="text-nobel-gold" /> Comments
                        </h3>
                        <button onClick={() => onToggleComments(false)} className="text-nobel-dim hover:text-nobel-dark"><X size={16} /></button>
                    </div>

                    <div className="flex-grow overflow-y-auto p-4 space-y-4">
                        
                        {pendingCommentId && (
                            <div className="bg-white border border-nobel-gold rounded-lg p-3 shadow-sm animate-fade-in-up">
                                <textarea
                                    className="w-full text-sm resize-none focus:outline-none placeholder:text-nobel-dim/50"
                                    rows={3}
                                    placeholder="Write a comment..."
                                    autoFocus
                                    value={newCommentText}
                                    onChange={(e) => setNewCommentText(e.target.value)}
                                />
                                <div className="flex justify-end mt-2">
                                    <button
                                        onClick={handleSaveComment}
                                        className="bg-nobel-dark text-white px-3 py-1 text-xs rounded hover:bg-nobel-gold transition-colors"
                                    >
                                        Post
                                    </button>
                                </div>
                            </div>
                        )}

                        
                        {comments.length === 0 && !pendingCommentId && (
                            <div className="text-center text-nobel-dim text-xs py-8 italic">
                                No comments yet. Highlight text to add one.
                            </div>
                        )}

                        {comments.map(comment => (
                            <div
                                key={comment.id}
                                id={`comment-${comment.id}`}
                                onClick={() => scrollToComment(comment.id)}
                                className={twMerge(
                                    "border rounded-lg p-3 transition-colors cursor-pointer",
                                    activeCommentId === comment.id
                                        ? "border-nobel-gold bg-nobel-gold/10 shadow-sm" // Soft gold background for active state
                                        : "border-nobel-dark/5 bg-white hover:border-nobel-dark/20"
                                )}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 rounded-full bg-nobel-dark text-nobel-gold flex items-center justify-center text-[10px]">
                                        <User size={12} />
                                    </div>
                                    <span className="text-xs font-bold text-nobel-dark">{comment.author}</span>
                                    <span className="text-[10px] text-nobel-dim ml-auto">{comment.timestamp}</span>
                                </div>
                                <p className="text-sm text-nobel-dark mb-3 leading-relaxed">{comment.text}</p>

                                
                                {comment.replies.map(reply => (
                                    <div key={reply.id} className="ml-4 pl-3 border-l-2 border-nobel-dark/5 mt-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold">{reply.author}</span>
                                            <span className="text-[9px] text-nobel-dim">{reply.timestamp}</span>
                                        </div>
                                        <p className="text-xs text-nobel-dim">{reply.text}</p>
                                    </div>
                                ))}

                                
                                {activeCommentId === comment.id && (
                                    <div className="mt-3 flex items-center gap-2 pt-2">
                                        <input
                                            className="flex-grow text-xs bg-white border border-nobel-dark/10 rounded px-2 py-1.5 focus:outline-none focus:border-nobel-gold transition-colors placeholder:text-nobel-dim/50"
                                            placeholder="Write a reply..."
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleReply(comment.id)}
                                        />
                                        <button onClick={() => handleReply(comment.id)} className="p-1.5 bg-nobel-dark text-white rounded hover:bg-nobel-gold transition-colors">
                                            <Send size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                
                <div className={twMerge(
                    "bg-white border-l border-nobel-dark/10 shadow-3xl flex flex-col transition-all duration-300 absolute right-0 top-0 bottom-0 z-[60] h-full pointer-events-auto",
                    isAiChatOpen ? "w-[450px] translate-x-0 opacity-100" : "w-[450px] translate-x-full opacity-0 pointer-events-none"
                )}>
                    
                    <div className="p-4 border-b border-nobel-dark/5 bg-nobel-gold/5 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-nobel-gold text-white rounded-lg shadow-sm">
                                <Sparkles size={16} fill="currentColor" />
                            </div>
                            <div>
                                <h3 className="font-serif font-bold text-nobel-dark leading-none">AI Assistant</h3>
                                <p className="text-[10px] text-nobel-dim uppercase tracking-wider mt-0.5">Powered by Gemini</p>
                            </div>
                        </div>
                        <button onClick={() => setIsAiChatOpen(false)} className="p-1.5 hover:bg-nobel-dark/5 rounded-full text-nobel-dim hover:text-nobel-dark transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    
                    <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-[#FAFAFA]">
                        {chatMessages.map((msg, index) => (
                            <div key={index} className={twMerge("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                                <div className={twMerge(
                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm",
                                    msg.role === 'user' ? "bg-nobel-dark text-white border-nobel-dark" : "bg-white text-nobel-gold border-nobel-gold/30"
                                )}>
                                    {msg.role === 'user' ? <User size={14} /> : <Bot size={16} />}
                                </div>
                                <div className={twMerge(
                                    "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm text-sm leading-relaxed",
                                    msg.role === 'user'
                                        ? "bg-nobel-dark text-white rounded-tr-sm"
                                        : "bg-white text-nobel-dark border border-nobel-dark/5 rounded-tl-sm prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0"
                                )}>
                                    {msg.role === 'user' ? (
                                        msg.text
                                    ) : (
                                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                                    )}
                                </div>
                            </div>
                        ))}

                        
                        {currentStreamingMessage && (
                            <div className="flex gap-3 flex-row animate-fade-in-up">
                                <div className="w-8 h-8 rounded-full bg-white text-nobel-gold border border-nobel-gold/30 flex items-center justify-center shrink-0 shadow-sm">
                                    <Bot size={16} />
                                </div>
                                <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm text-sm leading-relaxed bg-white text-nobel-dark border border-nobel-dark/5 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                                    <ReactMarkdown>{currentStreamingMessage}</ReactMarkdown>
                                    <span className="inline-block w-1.5 h-3 bg-nobel-gold ml-1 animate-pulse align-middle"></span>
                                </div>
                            </div>
                        )}

                        
                        {isChatProcessing && !currentStreamingMessage && (
                            <div className="flex gap-3 flex-row">
                                <div className="w-8 h-8 rounded-full bg-white text-nobel-gold border border-nobel-gold/30 flex items-center justify-center shrink-0 shadow-sm">
                                    <Bot size={16} />
                                </div>
                                <div className="bg-white border border-nobel-dark/5 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-nobel-dim/40 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                    <div className="w-1.5 h-1.5 bg-nobel-dim/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    <div className="w-1.5 h-1.5 bg-nobel-dim/40 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    
                    <div className="p-4 bg-white border-t border-nobel-dark/5 shrink-0">
                        <div className="relative flex items-center shadow-lg rounded-2xl bg-white border border-nobel-dark/10 focus-within:border-nobel-gold/50 focus-within:ring-4 focus-within:ring-nobel-gold/5 transition-all">
                            <textarea
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendChatMessage();
                                    }
                                }}
                                placeholder="Ask about this document..."
                                rows={1}
                                className="w-full bg-transparent pl-4 pr-12 py-3.5 text-sm text-nobel-dark placeholder:text-nobel-dim/50 focus:outline-none resize-none max-h-32 rounded-2xl"
                                style={{ minHeight: '48px' }}
                            />
                            <button
                                onClick={handleSendChatMessage}
                                disabled={!chatInput.trim() || isChatProcessing}
                                className="absolute right-2 p-2 bg-nobel-dark text-white rounded-xl hover:bg-nobel-gold disabled:bg-nobel-dim/20 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                <Send size={16} className={isChatProcessing ? "opacity-0" : "opacity-100"} />
                                {isChatProcessing && <div className="absolute inset-0 flex items-center justify-center"><div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"></div></div>}
                            </button>
                        </div>
                        <p className="text-[10px] text-center text-nobel-dim/40 mt-3">
                            AI can make mistakes. Please review responses.
                        </p>
                    </div>
                </div>

                
                {showSummary && (
                    <div className="absolute inset-0 z-[60] bg-black/20 backdrop-blur-sm flex justify-end pointer-events-auto">
                        <div className="w-full max-w-md bg-white h-full shadow-2xl animate-fade-in-up p-6 overflow-y-auto border-l border-nobel-dark/10">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-2">
                                    <FileText className="text-nobel-gold" />
                                    <h2 className="font-serif text-2xl font-bold">Summary</h2>
                                </div>
                                <button onClick={() => setShowSummary(false)} className="p-2 hover:bg-nobel-cream rounded-full"><X size={20} /></button>
                            </div>

                            <div className="prose prose-sm prose-nobel">
                                <h3 className="text-nobel-dim uppercase tracking-widest text-xs font-bold mb-4">AI Generated Overview</h3>
                                <p className="mb-4">
                                    This document provides a comprehensive overview of the {editor.storage.characterCount?.words?.() > 0 ? "current project" : "empty document"}.
                                    It covers key aspects of implementation, security protocols, and integration steps.
                                </p>
                                <ul className="space-y-2">
                                    <li className="flex gap-2 items-start"><span className="text-nobel-gold">•</span> Key infrastructure details are outlined.</li>
                                    <li className="flex gap-2 items-start"><span className="text-nobel-gold">•</span> API endpoints have been defined.</li>
                                    <li className="flex gap-2 items-start"><span className="text-nobel-gold">•</span> Next steps for deployment are included.</li>
                                </ul>

                                <div className="mt-8 p-4 bg-nobel-gold/5 rounded-lg border border-nobel-gold/20">
                                    <h4 className="font-bold text-nobel-dark mb-2">Action Items</h4>
                                    <div className="flex items-center gap-2 text-sm text-nobel-dim">
                                        <input type="checkbox" checked readOnly className="accent-nobel-gold" /> Review API keys
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-nobel-dim mt-2">
                                        <input type="checkbox" className="accent-nobel-gold" /> Finalize content
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            */}


        </>
    );
};