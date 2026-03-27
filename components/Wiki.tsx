
import React, { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Plus, Eye, MoreHorizontal, Edit, Edit3, Trash, Trash2, FolderOpen, Tag, Calendar, Clock, CheckCircle2, AlertCircle, Save, X, Search, Filter, Palette, FileText, Globe, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useCreateBlogPost } from '../hooks/useCreate';
import ProjectSelector from './ProjectSelector';
import TabNavigation from './TabNavigation';
import { WikiEditor } from './WikiEditor';
import DotPatternBackground from './DotPatternBackground';
import { StartupData, RolePermissions, DashboardProps } from '../types';
import CustomSelect from './CustomSelect';
import { BLOG_CATEGORIES } from '../constants';
import { BlogCustomizationSheet } from './BlogCustomizationSheet';
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog';

export interface WikiProps extends DashboardProps {
    projectId?: string; // Kept for legacy compatibility if needed
    orgId?: string;
}

export const Wiki: React.FC<WikiProps> = ({
    projectId,
    orgId,
    allProjects,
    currentProjectId,
    onSwitchProject,
    onNewProject,
    onNavigate,
    currentView,
    allowedPages,
    permissions,
    projectFeatures
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [editingPostData, setEditingPostData] = useState<any>(null);
    const [filter, setFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all'); // Category Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [showCustomizationSheet, setShowCustomizationSheet] = useState(false);

    // List posts - prioritize currentProjectId prop if passed, else fallback to projectId arg (legacy)
    const activeProjectId = currentProjectId || projectId;
    const posts = useQuery(api.blog.listPosts, { projectId: activeProjectId as any, orgId });
    const dbCategories = useQuery(api.blog.listCategories, { projectId: activeProjectId as any, orgId }); // Fetch Categories
    const deletePost = useMutation(api.blog.deletePost);
    const createPost = useCreateBlogPost();

    const getPostById = useQuery(api.blog.getPostById, selectedPostId ? { id: selectedPostId as any } : "skip");

    // Get current project settings for customization
    const fetchedProjects = useQuery(api.projects.list) || [];
    const currentProject = fetchedProjects.find(p => p._id === activeProjectId);

    // Combine Categories
    const allCategoryOptions = [
        { label: 'All Categories', value: 'all' },
        ...BLOG_CATEGORIES,
        ...(dbCategories || []).map((c: any) => ({
            label: c.name,
            value: c.name,
            color: c.color || 'bg-gray-100 text-gray-800'
        })).filter((c: any) => !BLOG_CATEGORIES.some(def => def.value === c.value))
    ];

    // Filter Logic
    const filteredPosts = posts?.filter((post: any) => {
        // Filter by Status
        if (filter === 'published' && !post.published) return false;
        if (filter === 'draft' && post.published) return false;
        if (filter === 'internal' && post.visibility !== 'internal') return false;

        // Filter by Category
        if (categoryFilter !== 'all' && post.category !== categoryFilter) return false;

        // Filter by Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const title = (post.title || '').toLowerCase();
            const desc = (post.description || '').toLowerCase();
            return title.includes(query) || desc.includes(query);
        }

        return true;
    });

    const handleCreateNew = async () => {
        const title = "Untitled";
        const slug = "untitled-" + Date.now(); // Ensure uniqueness initially

        try {
            const newPostId = await createPost({
                title,
                slug,
                content: '',
                description: '',
                projectId: activeProjectId as any,
                orgId: orgId,
                published: false, // Draft
                visibility: 'internal',
                category: 'Uncategorized',
                tags: []
            });

            setSelectedPostId(newPostId);
            setEditingPostData({
                _id: newPostId,
                title,
                slug,
                content: '',
                description: '',
                projectId: activeProjectId,
                orgId,
                published: false,
                visibility: 'internal',
                category: 'Uncategorized',
                tags: []
            });
            setIsEditing(true);
            toast.success("New draft created");
        } catch (error) {
            toast.error("Failed to create new story");
        }
    };

    const handleEdit = (post: any) => {
        setSelectedPostId(post._id);
        setEditingPostData(post);
        setIsEditing(true);
    };

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [postToDelete, setPostToDelete] = useState<string | null>(null);

    const handleDeleteClick = (postId: string) => {
        setPostToDelete(postId);
        setShowDeleteDialog(true);
    };

    const handleConfirmDelete = async () => {
        if (postToDelete) {
            await deletePost({ id: postToDelete as any });
            toast.success("Post deleted");
            setPostToDelete(null);
        }
    };

    if (isEditing) {
        // Use fresh data if available, else fall back to list data (or null for new)
        const dataToEdit = (selectedPostId && getPostById) ? getPostById : editingPostData;

        if (selectedPostId && !dataToEdit) return <div className="flex h-full items-center justify-center">Loading...</div>;

        return (
            <WikiEditor
                postId={selectedPostId}
                initialData={dataToEdit}
                onClose={() => setIsEditing(false)}
                projectId={activeProjectId} // Pass the active project ID
                projectSlug={currentProject?.slug}
                orgId={orgId}
            />
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[#F9F8F4] font-sans text-nobel-dark overflow-hidden">
            {/* Standard Dashboard Header */}
            <header className="px-6 py-4 bg-[#F9F8F4]/90 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between border-b border-stone-200 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="relative">
                    </div>
                    <TabNavigation
                        currentView={currentView}
                        onNavigate={onNavigate}
                        allowedPages={allowedPages}
                        projectFeatures={projectFeatures}
                    />
                </div>
                <div className="flex items-center gap-3">
                    {/* Right Side Actions - mirroring other pages */}
                    <button
                        onClick={() => setShowCustomizationSheet(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-full hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm"
                    >
                        <Palette className="w-4 h-4" /> Customize Design
                    </button>
                    {currentProject?.slug && (
                        <a
                            href={`/p/${currentProject.slug}/blog`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-full hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm"
                        >
                            <Globe className="w-4 h-4" /> View Public
                        </a>
                    )}
                    <button
                        onClick={handleCreateNew}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors font-medium text-xs uppercase tracking-wider shadow-sm hover:shadow-md"
                    >
                        <Plus className="w-3 h-3" /> New Wiki
                    </button>
                </div>
            </header>

            {/* Main Layout - Full Height below Header */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

                {/* Left Sidebar (20% width) with Image */}
                <div className="hidden md:block w-[20%] relative border-r border-gray-200 shrink-0 h-full">
                    <div className="absolute inset-0 bg-gray-900">
                        {/* Use a placeholder image or similar visual */}
                        <img
                            src="/images/blog-manager-sidebar.jpg"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                            }}
                            alt=""
                            className="w-full h-full object-cover opacity-50"
                        />
                        <div className="absolute inset-0 bg-black/80" />
                    </div>

                    <div className="relative z-10 p-8 h-full flex flex-col justify-between text-white">
                        <div className="mb-8 mt-20">
                            <h1 className="text-3xl font-serif font-black tracking-tight text-white mb-2">Wiki</h1>
                            <p className="text-stone-400 text-sm leading-relaxed">
                                The central hub for your startup's internal documentation, engineering runbooks, product specs, and public stories.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Content (80%) */}
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F9F8F4] relative">
                    <DotPatternBackground className="absolute inset-0 z-0 pointer-events-none" />

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-8 relative z-10">
                        <div className="max-w-[1600px] mx-auto">

                            {/* Search and Filter Bar */}
                            <div className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between max-w-4xl">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search stories..."
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold outline-none text-sm transition-shadow shadow-sm hover:shadow-md"
                                    />
                                </div>
                                <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
                                    <div className="w-full md:w-48 shrink-0">
                                        <CustomSelect
                                            value={categoryFilter}
                                            onChange={setCategoryFilter}
                                            placeholder="Category"
                                            options={allCategoryOptions}
                                        />
                                    </div>
                                    <div className="w-full md:w-48 shrink-0">
                                        <CustomSelect
                                            value={filter}
                                            onChange={setFilter}
                                            placeholder="Status"
                                            options={[
                                                { label: 'All Status', value: 'all' },
                                                { label: 'Published', value: 'published', color: 'bg-green-100 text-green-800' },
                                                { label: 'Drafts', value: 'draft', color: 'bg-stone-200 text-stone-600' },
                                                { label: 'Internal', value: 'internal', color: 'bg-yellow-100 text-yellow-800' }
                                            ]}
                                        />
                                    </div>
                                </div>
                            </div>

                            {posts === undefined ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                        <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse"></div>
                                    ))}
                                </div>
                            ) : filteredPosts?.length === 0 ? (
                                <div className="text-center py-24 bg-white rounded-xl border border-gray-200 border-dashed">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        {posts.length === 0 ? "No stories yet" : "No stories found"}
                                    </h3>
                                    <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
                                        {posts.length === 0
                                            ? "Start writing about your journey, product updates, or insights to share with the world."
                                            : "Try adjusting your search or filters to find what you're looking for."}
                                    </p>
                                    {posts.length === 0 && (
                                        <button
                                            onClick={handleCreateNew}
                                            className="text-nobel-gold font-medium hover:underline text-sm"
                                        >
                                            Write your first story
                                        </button>
                                    )}
                                </div>
                            ) : (
                                // Grid Layout - 3 Columns
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                                    {filteredPosts!.map(post => (
                                        <div key={post._id} className="group bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all overflow-hidden hover:shadow-lg flex flex-col h-[320px]">
                                            {/* Cover Image */}
                                            <div className="h-40 bg-gray-100 relative overflow-hidden">
                                                {post.coverImage ? (
                                                    <img src={post.coverImage} alt="" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                                                        <FileText className="w-8 h-8 opacity-20" />
                                                    </div>
                                                )}

                                                {/* Category Badge (Top Left) */}
                                                {post.category && (
                                                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-black shadow-sm border border-black/5">
                                                        {post.category}
                                                    </div>
                                                )}

                                                {/* Status/Visibility Badges (Top Right) */}
                                                <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                                                    {post.published ? (
                                                        <>
                                                            {post.visibility === 'internal' ? (
                                                                <span className="px-2 py-1 bg-yellow-100/90 backdrop-blur text-yellow-800 text-[10px] font-bold uppercase tracking-wider rounded shadow-sm flex items-center gap-1">
                                                                    <Lock className="w-3 h-3" /> Internal
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-1 bg-green-100/90 backdrop-blur text-green-800 text-[10px] font-bold uppercase tracking-wider rounded shadow-sm flex items-center gap-1">
                                                                    <Globe className="w-3 h-3" /> Public
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-gray-100/90 backdrop-blur text-gray-600 text-[10px] font-bold uppercase tracking-wider rounded shadow-sm flex items-center gap-1">
                                                            Draft
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="p-5 flex flex-col flex-1">
                                                <h3 className="text-lg font-bold font-serif text-gray-900 mb-2 line-clamp-1" title={post.title}>
                                                    {post.title || 'Untitled'}
                                                </h3>
                                                <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
                                                    {post.description || 'No description provided.'}
                                                </p>

                                                <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                                                    <span className="text-xs text-gray-400 font-medium">
                                                        {format(new Date(post.lastSyncedAt || post.date), 'MMM d, yyyy')}
                                                    </span>

                                                    <div className="flex items-center gap-1">
                                                        {post.published && (
                                                            <a
                                                                href={currentProject?.slug
                                                                    ? `/p/${currentProject.slug}/blog/${post.slug}`
                                                                    : `/blog/${post.slug}`
                                                                }
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1.5 text-gray-400 hover:text-nobel-gold hover:bg-nobel-gold/10 rounded-md transition-all"
                                                                title="View Live"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </a>
                                                        )}<button
                                                            onClick={() => handleEdit(post)}
                                                            className="p-2 text-gray-400 hover:text-nobel-gold hover:bg-gray-100 rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteClick(post._id);
                                                            }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {currentProject && (
                <BlogCustomizationSheet
                    isOpen={showCustomizationSheet}
                    onClose={() => setShowCustomizationSheet(false)}
                    projectId={currentProject._id}
                    currentSettings={currentProject.blogSettings}
                />
            )}

            <DeleteConfirmationDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleConfirmDelete}
                itemTitle={posts?.find(p => p._id === postToDelete)?.title}
            />
        </div>
    );
};
