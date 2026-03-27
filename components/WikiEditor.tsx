import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
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
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useCreateBlogPost, useCreateBlogCategory } from '../hooks/useCreate';
import { useUpdateBlogPost, useUpdateBlogCategory } from '../hooks/useUpdate';
import { useDeleteBlogCategory } from '../hooks/useDelete';
import { toast } from 'sonner';
import {
    Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, List, Undo, Redo,
    Image as ImageIcon, Link as LinkIcon, AlignLeft, AlignCenter, AlignRight,
    Table as TableIcon, Save, ArrowLeft, Globe, Lock, Eye, Check, X, Copy, Tag, ChevronDown, ChevronRight, Plus
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';

import { UnifiedMediaPicker } from './UnifiedMediaPicker';
import DotPatternBackground from './DotPatternBackground';
import CustomSelect from './CustomSelect';
import { BLOG_CATEGORIES } from '../constants';
import { CategoryCreationDialog } from './CategoryCreationDialog';

interface WikiEditorProps {
    postId?: string | null; // If null, creating new
    initialData?: any;
    onClose: () => void;
    projectId?: string;
    projectSlug?: string;
    orgId?: string;
}

// Simple Tags Input Component
const TagsInput = ({ tags, onChange }: { tags: string[], onChange: (tags: string[]) => void }) => {
    const [input, setInput] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
            e.preventDefault();
            const newTag = input.trim();
            if (!tags.includes(newTag)) {
                onChange([...tags, newTag]);
            }
            setInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        onChange(tags.filter(tag => tag !== tagToRemove));
    };

    const handleAdd = () => {
        if (input.trim()) {
            if (!tags.includes(input.trim())) {
                onChange([...tags, input.trim()]);
            }
            setInput('');
        }
    };

    return (
        <div className="w-full">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-48 flex items-center gap-2 border border-gray-200 rounded-full px-4 py-2 bg-white focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all">
                    <Tag size={14} className="text-gray-400" />
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
                        placeholder="Add tag..."
                    />
                </div>
                <button
                    onClick={handleAdd}
                    className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-black text-white rounded-full hover:bg-gray-800 transition-colors shadow-sm"
                >
                    <Plus size={16} />
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                    <span key={tag} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm border border-gray-200">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-red-500 p-0.5 rounded-full hover:bg-gray-200">
                            <X size={12} />
                        </button>
                    </span>
                ))}
            </div>
        </div>
    );
};

const ToolbarButton = ({ onClick, isActive, icon, title }: { onClick: () => void, isActive: boolean, icon: React.ReactNode, title: string }) => (
    <button
        onClick={onClick}
        title={title}
        className={twMerge(
            "p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all border border-transparent hover:border-gray-200",
            isActive && "bg-gray-100 text-nobel-gold font-bold border-gray-200"
        )}
    >
        {icon}
    </button>
);

export const WikiEditor: React.FC<WikiEditorProps> = ({ postId, initialData, onClose, projectId, projectSlug, orgId }) => {
    // --- State ---
    const [title, setTitle] = useState(initialData?.title || '');
    const [slug, setSlug] = useState(initialData?.slug || '');
    const [category, setCategory] = useState(initialData?.category || '');
    const [tags, setTags] = useState<string[]>(initialData?.tags || []);
    const [description, setDescription] = useState(initialData?.description || '');
    const [coverImage, setCoverImage] = useState(initialData?.coverImage || '');
    const [visibility, setVisibility] = useState<'public' | 'internal'>(initialData?.visibility || 'internal');
    const [isPublished, setIsPublished] = useState(initialData?.published || false);
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [mediaPickerTarget, setMediaPickerTarget] = useState<'cover' | 'content'>('cover');
    const [isSaving, setIsSaving] = useState(false);
    const [showPublishDropdown, setShowPublishDropdown] = useState(false);
    // Fix: Init with null to avoid use-before-declaration
    const savedCallback = useRef<((publishedStatus?: boolean, silent?: boolean) => Promise<any>) | null>(null);

    // Update ref to latest handleSave on every render
    useEffect(() => {
        savedCallback.current = handleSave;
    });

    // Auto-save every 4 minutes (240,000 ms)
    useEffect(() => {
        const intervalId = setInterval(() => {
            if (!isPublished) { // Optional: only auto-save drafts? Or everything? User said "auto save".
                // We'll auto-save everything to be safe, preserves work.
                savedCallback.current?.(undefined, true);
            } else {
                savedCallback.current?.(undefined, true);
            }
        }, 4 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, []);

    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

    // Mutations
    const createPost = useCreateBlogPost();
    const updatePost = useUpdateBlogPost();
    const updateCategory = useUpdateBlogCategory();
    const deleteCategory = useDeleteBlogCategory();
    const createCategory = useCreateBlogCategory();

    // Fetch Categories
    const dbCategories = useQuery(api.blog.listCategories, { projectId: projectId as any, orgId }) || [];

    const allCategoryOptions = [
        ...BLOG_CATEGORIES,
        ...(dbCategories || []).map((c: any) => ({
            label: c.name,
            value: c.name,
            color: c.color || 'bg-gray-100 text-gray-800'
        })).filter((c: any) => !BLOG_CATEGORIES.some(def => def.value === c.value))
    ];

    const handleCreateCategory = () => {
        setIsCategoryDialogOpen(true);
    };

    const handleDialogCreate = async (name: string) => {
        // Randomly pick a color or default
        const colors = [
            'bg-blue-100 text-blue-800', 'bg-pink-100 text-pink-800', 'bg-purple-100 text-purple-800',
            'bg-orange-100 text-orange-800', 'bg-green-100 text-green-800', 'bg-teal-100 text-teal-800'
        ];
        const color = colors[Math.floor(Math.random() * colors.length)];

        try {
            await createCategory({
                name,
                color,
                projectId: projectId as any,
                orgId: orgId, // Now optional in backend, but good to pass if present
            });
            setCategory(name);
            toast.success(`Category "${name}" created`);
        } catch (error: any) {
            toast.error("Failed to create category");
        }
    };

    const handleUpdateCategory = async (id: string, name: string) => {
        try {
            await updateCategory({ id: id as any, name });
            toast.success("Category updated");
        } catch (error) {
            toast.error("Failed to update category");
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (confirm("Are you sure? This will not delete posts but unassign them.")) {
            try {
                await deleteCategory({ id: id as any });
                toast.success("Category deleted");
                if (category === dbCategories?.find((c: any) => c._id === id)?.name) {
                    setCategory(""); // Clear if current is deleted
                }
            } catch (error) {
                toast.error("Failed to delete category");
            }
        }
    };

    // --- Tiptap Editor Setup ---
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({ placeholder: 'Start writing your story...' }),
            Image.configure({ inline: true, allowBase64: true }),
            Link.configure({ openOnClick: false }),
            TextStyle,
            FontFamily,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            CharacterCount,
            Underline,
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
        ],
        content: initialData?.content || '',
        editorProps: {
            attributes: {
                class: 'prose prose-nobel max-w-none focus:outline-none min-h-[400px] px-8 py-6',
            },
        },
    });

    const handleSave = async (publishedStatus = isPublished, silent = false) => {
        if (!title) return toast.error("Title is required");
        setIsSaving(true);
        const content = editor?.getHTML() || '';

        try {
            const data = {
                title,
                slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
                content,
                description,
                coverImage,
                published: publishedStatus, // Use the passed status
                visibility,
                category,
                tags,
                projectId: projectId as any,
                orgId: orgId
            };

            if (postId) {
                const { projectId: pid, orgId: oid, ...updateData } = data;
                await updatePost({ id: postId as any, ...updateData });
                if (!silent) toast.success(publishedStatus ? "Published!" : "Saved");
            } else {
                await createPost(data);
                toast.success("Created");
                onClose(); // Close on initial create if user clicked save
            }
        } catch (e: any) {
            if (!silent) toast.error(e.message || "Failed to save post");
        } finally {
            setIsSaving(false);
        }
    };

    const openMediaPicker = (target: 'cover' | 'content') => {
        setMediaPickerTarget(target);
        setShowMediaPicker(true);
    };

    const handleMediaSelect = (url: string) => {
        if (mediaPickerTarget === 'cover') {
            setCoverImage(url);
        } else {
            editor?.chain().focus().setImage({ src: url }).run();
        }
        setShowMediaPicker(false);
    };

    const handlePublishClick = async () => {
        // Enforce publish = true, and save
        setIsPublished(true);
        await handleSave(true); // Pass explicitly true
        setShowPublishDropdown(false);
    };

    if (!editor) return null;

    return (
        <div className="fixed inset-0 z-50 bg-[#F9F8F4] flex flex-col font-sans overflow-hidden">
            <DotPatternBackground className="absolute inset-0 z-0 pointer-events-none" />
            <div className="relative z-10 flex flex-col h-full">
                {/* Header / Toolbar */}
                <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="h-6 w-px bg-gray-200"></div>
                        <div className="flex flex-col">
                            <span className="font-semibold text-gray-800">{postId ? 'Edit Post' : 'New Post'}</span>
                            <span className={`text-[10px] uppercase font-bold tracking-wider ${isPublished ? 'text-green-600' : 'text-gray-400'}`}>
                                {isPublished ? 'Published' : 'Draft'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Publish Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowPublishDropdown(!showPublishDropdown)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all ${isPublished
                                    ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                {isPublished ? 'Published' : 'Publish'}
                                <ChevronDown size={14} />
                            </button>

                            {showPublishDropdown && (
                                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Publish Settings</h4>

                                    {/* Visibility Selection */}
                                    <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
                                        <button
                                            onClick={() => setVisibility('internal')}
                                            className={`flex-1 px-3 py-2 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-all ${visibility === 'internal' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            <Lock className="w-3 h-3" /> Internal
                                        </button>
                                        <button
                                            onClick={() => setVisibility('public')}
                                            className={`flex-1 px-3 py-2 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-all ${visibility === 'public' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            <Globe className="w-3 h-3" /> Public
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <button
                                            onClick={handlePublishClick}
                                            className="w-full py-2.5 bg-black text-white rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                                        >
                                            {isPublished ? 'Update & Save' : 'Publish Now'}
                                        </button>

                                        {isPublished && (
                                            <button
                                                onClick={async () => {
                                                    setIsPublished(false);
                                                    await handleSave(false);
                                                    setShowPublishDropdown(false);
                                                }}
                                                className="w-full py-2 text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-gray-50 rounded-lg transition-colors"
                                            >
                                                Unpublish (Revert to Draft)
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={() => handleSave()}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-6 py-2 bg-nobel-gold text-white rounded-full hover:bg-black transition-colors font-medium text-sm disabled:opacity-50 shadow-sm"
                        >
                            {isSaving ? 'Saving...' : (
                                <>
                                    <Save className="w-4 h-4" /> Save
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden min-h-0 bg-transparent items-center justify-center p-4 sm:p-8">
                    {/* Fixed Card Container */}
                    <div className="w-full max-w-4xl bg-white h-full shadow-lg rounded-xl overflow-hidden flex flex-col relative border border-gray-100">

                        {/* Internal Scroll Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-white">

                            {/* Meta Inputs */}
                            <div className="px-8 sm:px-12 pt-12 pb-6 space-y-6">
                                {/* Cover Image */}
                                <div
                                    className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden relative group cursor-pointer border-2 border-dashed border-gray-200 hover:border-nobel-gold transition-colors"
                                    onClick={() => openMediaPicker('cover')}
                                >
                                    {coverImage ? (
                                        <>
                                            <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium text-sm">
                                                Change Cover Image
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                            <ImageIcon className="w-8 h-8 mb-2" />
                                            <span className="text-sm">Add Cover Image</span>
                                        </div>
                                    )}
                                </div>

                                <CategoryCreationDialog
                                    isOpen={isCategoryDialogOpen}
                                    onClose={() => setIsCategoryDialogOpen(false)}
                                    onCreate={handleDialogCreate}
                                    categories={dbCategories}
                                    onUpdate={handleUpdateCategory}
                                    onDelete={handleDeleteCategory}
                                />

                                {/* Title Input with Slug Auto-Gen */}
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => {
                                        const newTitle = e.target.value;
                                        setTitle(newTitle);
                                        // Auto-generate slug from full title as requested
                                        const generatedSlug = newTitle.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                                        setSlug(generatedSlug);
                                    }}
                                    placeholder="Article Title"
                                    className="w-full text-4xl font-black font-serif text-gray-900 placeholder:text-gray-300 outline-none"
                                />

                                {/* Slug, Category & Tags Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">URL Slug</label>
                                        <div className="flex items-center group/slug">
                                            <div className="flex-1 flex items-center bg-white border border-gray-200 rounded-l-lg hover:border-gray-300 transition-colors overflow-hidden">
                                                <span className="text-gray-400 text-sm bg-gray-50 px-3 py-2 border-r border-gray-100 select-none">/</span>
                                                <input
                                                    type="text"
                                                    value={slug}
                                                    onChange={(e) => setSlug(e.target.value)}
                                                    className="flex-1 px-3 py-2 text-sm outline-none font-mono text-gray-700 placeholder:text-gray-300"
                                                    placeholder="slug"
                                                />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const url = projectSlug
                                                        ? `${window.location.origin}/p/${projectSlug}/blog/${slug}`
                                                        : `${window.location.origin}/blog/${slug}`;
                                                    navigator.clipboard.writeText(url);
                                                    toast.success("Link Copied");
                                                }}
                                                className="px-3 py-2 bg-gray-50 border border-gray-200 border-l-0 rounded-r-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors h-full flex items-center justify-center"
                                                title="Copy Link"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Category</label>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1">
                                                <CustomSelect
                                                    value={category}
                                                    onChange={setCategory}
                                                    options={allCategoryOptions}
                                                    placeholder="Select Category..."
                                                />
                                            </div>
                                            <button
                                                onClick={handleCreateCategory}
                                                className="p-2 bg-black text-white rounded-full hover:bg-gray-800 transition-all shadow-sm"
                                                title="Create New Category"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tags Input */}
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tags</label>
                                        <TagsInput tags={tags} onChange={setTags} />
                                    </div>
                                </div>

                                {/* Collapsible Description (SEO) */}
                                <details className="group border border-gray-200 rounded-lg overflow-hidden bg-[#FAF9F6]">
                                    <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-100/50 transition-colors list-none select-none">
                                        <span className="text-sm font-bold text-gray-600 flex items-center gap-2">
                                            SEO Settings (Description)
                                        </span>
                                        <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
                                    </summary>
                                    <div className="p-4 border-t border-gray-200/50">
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Meta Description</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={4}
                                            className="w-full bg-white border border-gray-200 rounded px-3 py-3 text-sm outline-none focus:border-nobel-gold resize-none"
                                            placeholder="Brief summary for search engines and social media previews..."
                                        />
                                    </div>
                                </details>
                            </div>

                            {/* Formatting Toolbar (Sticky) */}
                            <div className="sticky top-0 bg-white border-y border-gray-100 px-6 py-2 flex items-center gap-1 z-10 overflow-x-auto shadow-sm">
                                <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} icon={<Bold size={16} />} title="Bold" />
                                <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} icon={<Italic size={16} />} title="Italic" />
                                <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} icon={<UnderlineIcon size={16} />} title="Underline" />
                                <div className="w-px h-4 bg-gray-200 mx-2"></div>
                                <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} icon={<Heading1 size={16} />} title="H1" />
                                <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} icon={<Heading2 size={16} />} title="H2" />
                                <div className="w-px h-4 bg-gray-200 mx-2"></div>
                                <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} icon={<AlignLeft size={16} />} title="Align Left" />
                                <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} icon={<AlignCenter size={16} />} title="Align Center" />
                                <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} icon={<AlignRight size={16} />} title="Align Right" />
                                <div className="w-px h-4 bg-gray-200 mx-2"></div>
                                <ToolbarButton onClick={() => openMediaPicker('content')} isActive={false} icon={<ImageIcon size={16} />} title="Insert Image" />

                                <ToolbarButton onClick={() => {
                                    const url = window.prompt('URL');
                                    if (url) editor.chain().focus().setLink({ href: url }).run();
                                }} isActive={editor.isActive('link')} icon={<LinkIcon size={16} />} title="Link" />
                            </div>

                            {/* Editor Content */}
                            <EditorContent editor={editor} className="flex-1 blog-prose min-h-[500px]" />

                            {/* Bottom spacer for comfortable scrolling */}
                            <div className="h-20"></div>
                        </div>
                    </div>
                </div>

                {showMediaPicker && (
                    <UnifiedMediaPicker
                        projectId={projectId}
                        onSelect={handleMediaSelect}
                        onClose={() => setShowMediaPicker(false)}
                    />
                )}

                {/* Styles for Prose Mirror (injected here for isolation) */}
                <style>{`
                .blog-prose .ProseMirror {
                    min-height: 400px;
                    padding: 2rem 3rem;
                    outline: none;
                }
                .blog-prose .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #adb5bd;
                    pointer-events: none;
                    height: 0;
                }
            `}</style>
            </div>
        </div>
    );
};
