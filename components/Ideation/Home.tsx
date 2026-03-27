import React, { useState, useEffect, useRef } from 'react';
import TabNavigation from '../TabNavigation';
import ProjectSelector from '../ProjectSelector';
import { Logo } from '../Logo';
import { ViewState, StartupData, CanvasItem, WorkspaceState } from '../../types';

import { ArrowRight, Layout, PenTool, Image as ImageIcon, Plus, Clock, MoreHorizontal, Trash2, Edit2, X, Check, Search, ChevronDown, Sparkles, Upload, Monitor, AlertTriangle, User, Loader2 } from 'lucide-react';
import { usePresence } from '../../hooks/usePresence';
import { useQuery, useMutation } from 'convex/react';
import { api } from "../../convex/_generated/api";
import { useCreateIdeationWorkspace, useGenerateUploadUrl } from '../../hooks/useCreate';
import { useUpdateIdeationWorkspace } from '../../hooks/useUpdate';
import { useDeleteIdeationWorkspace } from '../../hooks/useDelete';
import Workspace from './Workspace/Workspace';
import { SAMPLE_WORKSPACE_ITEMS } from '../../constants';
import { toast } from 'sonner';
import { FileSelector } from './FileSelector';
import { IdeationTeaser } from './IdeationTeaser';


interface Props {
    onEnter: () => void;
    currentView: ViewState;
    onNavigate: (view: ViewState) => void;
    allowedPages?: string[];
    projectFeatures?: {
        canvasEnabled?: boolean;
        marketResearchEnabled?: boolean;
    };
    allProjects: StartupData[];
    currentProjectId: string | null;
    onSwitchProject: (id: string) => void;
    onNewProject: () => void;
    currentUserRole?: any;
}

const PRESET_COVERS = [
    { id: 'yellow', color: '#FEF3C7', name: 'Mellow Yellow' },
    { id: 'blue', color: '#BFDBFE', name: 'Sky Blue' },
    { id: 'green', color: '#BBF7D0', name: 'Fresh Green' },
    { id: 'rose', color: '#FECDD3', name: 'Rose Quartz' },
    { id: 'purple', color: '#E9D5FF', name: 'Soft Lavender' },
];

const CATEGORIES = [
    { id: 'strategy', label: 'Strategy', color: 'bg-purple-100 text-purple-700' },
    { id: 'product', label: 'Product', color: 'bg-blue-100 text-blue-700' },
    { id: 'marketing', label: 'Marketing', color: 'bg-pink-100 text-pink-700' },
    { id: 'operations', label: 'Operations', color: 'bg-orange-100 text-orange-700' },
    { id: 'research', label: 'Research', color: 'bg-teal-100 text-teal-700' },
    { id: 'other', label: 'Other', color: 'bg-gray-100 text-gray-700' },
];

const CategoryBadge = ({ categoryId }: { categoryId?: string }) => {
    const cat = CATEGORIES.find(c => c.id === categoryId) || { ...CATEGORIES.find(c => c.id === 'other'), label: categoryId, color: 'bg-gray-100 text-gray-700' };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold ${cat?.color}`}>
            {cat?.label || categoryId}
        </span>
    );
};




const USER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD'];
const getRandomColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
};


const LandingPage: React.FC<Props> = ({
    onEnter,
    currentView,
    onNavigate,
    allowedPages,
    projectFeatures,
    allProjects,
    currentProjectId,
    onSwitchProject,
    onNewProject,
    currentUserRole
}) => {
    // Derived State
    const currentProject = allProjects.find(p => p.id === currentProjectId);

    // Convex Query - Scoped to Project/Org
    const workspaces = useQuery(api.ideation.list, {
        orgId: currentProject?.orgId,
        projectId: currentProjectId || undefined
    });

    const createWorkspace = useCreateIdeationWorkspace();
    const updateWorkspace = useUpdateIdeationWorkspace();
    const deleteWorkspace = useDeleteIdeationWorkspace();
    const generateUploadUrl = useGenerateUploadUrl();

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // Filter
    const [selectedProject, setSelectedProject] = useState<WorkspaceState | null>(null);

    // Reset selected workspace when switching projects
    useEffect(() => {
        setSelectedProject(null);
    }, [currentProjectId]);

    // Create Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newProjectTitle, setNewProjectTitle] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');
    const [newProjectCategory, setNewProjectCategory] = useState<string>(CATEGORIES[0].id);
    const [customCategoryInput, setCustomCategoryInput] = useState(''); // New state for custom input
    const [coverType, setCoverType] = useState<'preset' | 'upload' | 'files' | 'generate'>('preset');
    const [selectedPreset, setSelectedPreset] = useState(PRESET_COVERS[0].id);
    const [coverImage, setCoverImage] = useState<string | null>(null); // For uploaded/generated (Preview URL)
    const [coverImageStorageId, setCoverImageStorageId] = useState<string | null>(null); // Actual Storage ID
    const [isCreating, setIsCreating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);


    // Edit State
    const [editForm, setEditForm] = useState<{
        title: string;
        description: string;
        category: string;
        customCategory: string; // New field for edit
        coverType: 'preset' | 'upload' | 'generate';
        selectedPreset: string;
        coverImage: string | null;
        coverImageStorageId: string | null;
    }>({
        title: '',
        description: '',
        category: CATEGORIES[0].id,
        customCategory: '',
        coverType: 'preset',
        selectedPreset: PRESET_COVERS[0].id,
        coverImage: null,
        coverImageStorageId: null
    });



    // Context for "Are you sure?" dialog
    const [deleteCheckId, setDeleteCheckId] = useState<string | null>(null);

    // Derived Categories
    const existingCategories = Array.from(new Set(workspaces?.map(w => w.category).filter(c => c && !CATEGORIES.some(def => def.id === c)) || []));
    const allActiveCategories = [...CATEGORIES, ...existingCategories.map(c => ({ id: c!, label: c!, color: 'bg-gray-100 text-gray-700' }))];


    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // 1. Get upload URL
            const postUrl = await generateUploadUrl();

            // 2. Upload file
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });

            if (!result.ok) throw new Error("Upload failed");

            const { storageId } = await result.json();

            // 3. Set state
            setCoverImageStorageId(storageId);
            setCoverImage(URL.createObjectURL(file)); // Preview
        } catch (error) {
            toast.error("Failed to upload image.");
        } finally {
            setIsUploading(false);
        }
    };



    const handleOpenProject = (project: any) => {
        // Parse items if string
        let items: CanvasItem[] = [];
        try {
            items = typeof project.items === 'string' ? JSON.parse(project.items) : (project.items || []);
        } catch (e) {
        }

        const workspaceData: WorkspaceState = {
            id: project._id,
            name: project.name,
            projectId: project.projectId,
            items: items,
            coverColor: project.coverColor,
            coverImage: project.coverImage
        };
        setSelectedProject(workspaceData);
    }

    const handleCreateProject = async () => {
        if (!newProjectTitle.trim()) return;

        // Ensure we have a context
        if (!currentProject) {
            toast.error("Please select a venture first.");
            return;
        }

        setIsCreating(true);

        try {
            let finalCoverCol = null;
            let finalCoverImg = null;
            let finalStorageId = null;

            if (coverType === 'preset') {
                finalCoverCol = PRESET_COVERS.find(p => p.id === selectedPreset)?.color || '#ffffff';
            } else if (coverType === 'upload' && coverImage) {
                // If uploading, coverImage is the preview (blob) URL, but we want to save the storage ID.
                finalStorageId = coverImageStorageId;
                // We pass undefined for coverImage string if we have storageId to rely on storage ID source.
            } else if (coverType === 'generate' && coverImage) {
                finalCoverImg = coverImage;
            }

            const finalCategory = newProjectCategory === 'other' && customCategoryInput.trim()
                ? customCategoryInput.trim()
                : newProjectCategory;

            await createWorkspace({
                orgId: currentProject.orgId || "personal",
                projectId: currentProjectId!,
                name: newProjectTitle,
                description: newProjectDesc,
                category: finalCategory,
                coverColor: finalCoverCol || undefined,
                coverImage: finalStorageId ? undefined : (finalCoverImg || undefined),
                coverImageStorageId: finalStorageId || undefined,
                items: JSON.stringify(SAMPLE_WORKSPACE_ITEMS),
            });
            setIsCreateModalOpen(false);
            setNewProjectTitle('');
            setNewProjectDesc('');
            setNewProjectCategory(CATEGORIES[0].id);
            setCustomCategoryInput('');
            setCoverImage(null);
            setCoverImageStorageId(null);
            toast.success("Workspace created successfully");
        } catch (error) {
            toast.error("Failed to create workspace. Please try again.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeleteCheckId(id);
        setOpenMenuId(null);
    };

    const confirmDelete = async () => {
        if (deleteCheckId) {
            try {
                await deleteWorkspace({ id: deleteCheckId as any });
                toast.success("Workspace deleted");
            } catch (e) {
                toast.error("Failed to delete workspace");
            }
            setDeleteCheckId(null);
        }
    }

    const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const postUrl = await generateUploadUrl();
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });
            if (!result.ok) throw new Error("Upload failed");
            const { storageId } = await result.json();

            setEditForm(prev => ({
                ...prev,
                coverImageStorageId: storageId,
                coverImage: URL.createObjectURL(file)
            }));
        } catch (error) {
            toast.error("Upload failed");
        } finally {
            setIsUploading(false);
        }
    };



    const handleEditClick = (project: any) => {
        setEditingProjectId(project._id);

        // Determine initial cover state
        let type: 'preset' | 'upload' | 'generate' = 'preset';
        let presetId = PRESET_COVERS[0].id;

        if (project.coverImageStorageId || (project.coverImage && project.coverImage.startsWith('http'))) {
            type = 'upload';
        } else if (project.coverColor) {
            const found = PRESET_COVERS.find(p => p.color === project.coverColor);
            if (found) presetId = found.id;
        }

        // Check if category is standard
        const isStandard = CATEGORIES.some(c => c.id === project.category);

        setEditForm({
            title: project.name,
            description: project.description || '',
            category: isStandard ? project.category : 'other',
            customCategory: isStandard ? '' : (project.category || ''),
            coverType: type,
            selectedPreset: presetId,
            coverImage: project.coverImage || null,
            coverImageStorageId: project.coverImageStorageId || null
        });
        setOpenMenuId(null);
    };

    const handleSaveEdit = async () => {
        if (!editingProjectId) return;

        try {
            let finalCoverCol = null;
            let finalCoverImg = null;
            let finalStorageId = null;

            if (editForm.coverType === 'preset') {
                finalCoverCol = PRESET_COVERS.find(p => p.id === editForm.selectedPreset)?.color || '#ffffff';
            } else if (editForm.coverType === 'upload' && editForm.coverImage) {
                finalStorageId = editForm.coverImageStorageId;
            }

            const finalCategory = editForm.category === 'other' && editForm.customCategory.trim()
                ? editForm.customCategory.trim()
                : editForm.category;

            await updateWorkspace({
                id: editingProjectId as any,
                name: editForm.title,
                description: editForm.description,
                category: finalCategory,
                coverColor: finalCoverCol || undefined,
                coverImage: finalStorageId ? undefined : (finalCoverImg || undefined),
                coverImageStorageId: finalStorageId || undefined
            });
            setEditingProjectId(null);
            toast.success("Workspace updated");
        } catch (error) {
            toast.error("Failed to update workspace");
        }
    };

    // Close menu when clicking outside
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const toggleMenu = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setOpenMenuId(openMenuId === id ? null : id);
    };

    // Derived
    const displayProjects = workspaces || [];
    const filteredProjects = displayProjects.filter((project: any) => {
        const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (project.description || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory ? (project.category === selectedCategory) : true;
        return matchesSearch && matchesCategory;
    });

    if (selectedProject) {
        return <Workspace onBack={() => setSelectedProject(null)} title={selectedProject.name} workspace={selectedProject} />;
    }

    const isEmptyState = displayProjects.length === 0;

    return (
        <div className="min-h-screen bg-nobel-cream canvas-pattern flex flex-col relative overflow-hidden" style={{ backgroundSize: '24px 24px' }}>
            {/* Nav */}
            <nav className="px-6 py-3 flex justify-between items-center z-50 sticky top-0 bg-white/80 backdrop-blur-sm border-b border-stone-200">
                <div className="flex items-center gap-4">
                    <Logo imageClassName="h-8 w-auto" />
                    <div className="h-6 w-px bg-stone-200" />
                    <div className="h-6 w-px bg-stone-200" />
                    <TabNavigation
                        currentView={currentView}
                        onNavigate={onNavigate}
                        allowedPages={allowedPages}
                        projectFeatures={projectFeatures}
                    />
                </div>
                <div className="flex items-center gap-4">
                </div>
            </nav>

            {/* Modals */}
            {editingProjectId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in-up">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-nobel-gold relative max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-serif font-bold text-nobel-dark">Edit Project</h3>
                            <button onClick={() => setEditingProjectId(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Title</label>
                                <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-nobel-gold/50 focus:border-nobel-gold outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Category</label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setEditForm(prev => ({ ...prev, category: cat.id }))}
                                            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${editForm.category === cat.id ? `${cat.color} border-current ring-1 ring-offset-1 ring-current` : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                                {editForm.category === 'other' && (
                                    <input
                                        type="text"
                                        placeholder="Enter custom category..."
                                        value={editForm.customCategory}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, customCategory: e.target.value }))}
                                        className="w-full mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm"
                                        autoFocus
                                    />
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-nobel-gold/50 focus:border-nobel-gold outline-none h-24 resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Cover Image</label>
                                <div className="flex gap-2 mb-4">
                                    <button className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${editForm.coverType === 'preset' ? 'bg-nobel-dark text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} onClick={() => setEditForm({ ...editForm, coverType: 'preset' })}>Presets</button>
                                    <button className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${editForm.coverType === 'upload' ? 'bg-nobel-dark text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} onClick={() => setEditForm({ ...editForm, coverType: 'upload' })}>Upload</button>

                                </div>
                                {editForm.coverType === 'preset' && (
                                    <div className="flex gap-3 flex-wrap">
                                        {PRESET_COVERS.map(preset => (
                                            <button key={preset.id} onClick={() => setEditForm({ ...editForm, selectedPreset: preset.id })} className={`w-12 h-12 rounded-full border-2 transition-all ${editForm.selectedPreset === preset.id ? 'border-nobel-dark scale-110 shadow-md' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: preset.color }} title={preset.name} />
                                        ))}
                                    </div>
                                )}
                                {editForm.coverType === 'upload' && (
                                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors relative overflow-hidden">
                                        {editForm.coverImage ? (
                                            <div className="absolute inset-0"><img src={editForm.coverImage} alt="Preview" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><span className="text-white text-xs font-bold uppercase tracking-wider">Change Image</span></div></div>
                                        ) : (
                                            <>{isUploading ? (
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nobel-gold mb-2"></div>
                                            ) : (
                                                <Upload className="text-gray-400 mb-2" />
                                            )}<span className="text-sm text-gray-500">{isUploading ? "Uploading..." : "Click to upload cover"}</span></>
                                        )}
                                        <input type="file" onChange={handleEditImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/*" disabled={isUploading} />
                                    </div>
                                )}

                            </div>
                            <button onClick={handleSaveEdit} disabled={!editForm.title.trim()} className="w-full bg-nobel-gold text-white font-medium py-3 rounded-xl hover:bg-[#B3904D] transition-colors flex items-center justify-center gap-2 mt-4 disabled:opacity-50"><Check size={18} /> Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            {deleteCheckId && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
                        <div className="flex items-center gap-4 mb-4 text-red-600">
                            <div className="bg-red-50 p-3 rounded-full">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Delete Workspace?</h3>
                        </div>
                        <p className="text-gray-500 mb-8 leading-relaxed">
                            Are you sure you want to delete this workspace? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteCheckId(null)}
                                className="px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-5 py-2.5 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 shadow-md hover:shadow-lg transition-all"
                            >
                                Delete Workspace
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in-up">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-nobel-gold relative max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-serif font-bold text-nobel-dark">Create New Workspace</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Workspace Name</label>
                                <input type="text" placeholder="e.g. Q4 Strategy Board" value={newProjectTitle} onChange={(e) => setNewProjectTitle(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-nobel-gold/50 focus:border-nobel-gold outline-none text-lg font-serif" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Category</label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setNewProjectCategory(cat.id)}
                                            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${newProjectCategory === cat.id ? `${cat.color} border-current ring-1 ring-offset-1 ring-current` : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                                {newProjectCategory === 'other' && (
                                    <input
                                        type="text"
                                        placeholder="Enter custom category..."
                                        value={customCategoryInput}
                                        onChange={(e) => setCustomCategoryInput(e.target.value)}
                                        className="w-full mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm"
                                        autoFocus
                                    />
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description</label>
                                <textarea placeholder="Briefly describe the goal..." value={newProjectDesc} onChange={(e) => setNewProjectDesc(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-nobel-gold/50 focus:border-nobel-gold outline-none h-20 resize-none font-sans text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Cover Image</label>
                                <div className="flex gap-2 mb-4">
                                    <button className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${coverType === 'preset' ? 'bg-nobel-dark text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} onClick={() => setCoverType('preset')}>Presets</button>
                                    <button className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${coverType === 'upload' ? 'bg-nobel-dark text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} onClick={() => setCoverType('upload')}>Upload</button>
                                    <button className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${coverType === 'files' ? 'bg-nobel-dark text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} onClick={() => setCoverType('files')}>Files</button>

                                </div>
                                {coverType === 'preset' && (
                                    <div className="flex gap-3 flex-wrap">
                                        {PRESET_COVERS.map(preset => (
                                            <button key={preset.id} onClick={() => setSelectedPreset(preset.id)} className={`w-12 h-12 rounded-full border-2 transition-all ${selectedPreset === preset.id ? 'border-nobel-dark scale-110 shadow-md' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: preset.color }} title={preset.name} />
                                        ))}
                                    </div>
                                )}
                                {coverType === 'upload' && (
                                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors relative overflow-hidden">
                                        {coverImage ? (
                                            <div className="absolute inset-0"><img src={coverImage} alt="Preview" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><span className="text-white text-xs font-bold uppercase tracking-wider">Change Image</span></div></div>
                                        ) : (
                                            <>{isUploading ? (
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nobel-gold mb-2"></div>
                                            ) : (
                                                <Upload className="text-gray-400 mb-2" />
                                            )}<span className="text-sm text-gray-500">{isUploading ? "Uploading..." : "Click to upload cover"}</span></>
                                        )}
                                        <input type="file" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/*" disabled={isUploading} />
                                    </div>
                                )}
                                {coverType === 'files' && currentProjectId && (
                                    <div className="h-64">
                                        <FileSelector
                                            projectId={currentProjectId}
                                            allowedTypes={['image/']}
                                            onSelect={(url, storageId) => {
                                                setCoverImage(url || `https://${process.env.NEXT_PUBLIC_CONVEX_URL?.replace('.convex.cloud', '')}.convex.cloud/api/storage/${storageId}`);
                                                setCoverImageStorageId(storageId);
                                                // Switch to upload view to show preview or show selection indicator?
                                                // Let's switch to 'upload' view which shows the select image preview?
                                                // Or just stay here and show selected? 
                                                // Let's show preview in this tab or switch to upload tab with prefilled data.
                                                // Switching to upload tab is easiest for preview.
                                                setCoverType('upload');
                                                toast.success("Image selected from files");
                                            }}
                                        />
                                    </div>
                                )}

                            </div>
                            <button onClick={handleCreateProject} disabled={isCreating || !newProjectTitle.trim()} className="w-full bg-nobel-gold text-white font-medium py-3 rounded-xl hover:bg-[#B3904D] transition-colors flex items-center justify-center gap-2 mt-4 disabled:opacity-50">{isCreating ? 'Creating...' : 'Create Workspace'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {isEmptyState ? (
                <IdeationTeaser onCreate={() => setIsCreateModalOpen(true)} />
            ) : (
                // Active State (Refined)
                <main className="flex-1 w-full flex flex-col overflow-hidden">
                    {/* Active Header */}
                    <div className="relative h-64 w-full bg-nobel-dark overflow-hidden shrink-0">
                        <img
                            src="/images/manworking.png"
                            alt="Header"
                            className="absolute inset-0 w-full h-full object-cover opacity-60"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-nobel-dark via-nobel-dark/80 to-transparent"></div>
                        <div className="relative z-10 px-12 h-full flex flex-col justify-center max-w-7xl mx-auto w-full">
                            <span className="text-nobel-gold font-medium tracking-wider uppercase text-xs mb-2 block">Welcome back</span>
                            <h2 className="text-4xl md:text-5xl font-serif text-white mb-2">Ready to continue your work?</h2>
                            <p className="text-gray-300 text-lg">You have <span className="text-white font-medium">{filteredProjects.length} active spaces</span> ready.</p>
                        </div>
                    </div>

                    {/* Controls & Grid */}
                    <div className="flex-1 overflow-y-auto px-12 py-8 bg-transparent">
                        <div className="max-w-7xl mx-auto w-full">
                            {/* Search & Filter */}
                            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                                <div className="flex gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
                                    <button
                                        onClick={() => setSelectedCategory(null)}
                                        className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${!selectedCategory ? 'bg-nobel-dark text-white shadow-md' : 'bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-600 border border-transparent'} `}
                                    >
                                        All
                                    </button>
                                    {allActiveCategories.map((cat: any) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${selectedCategory === cat.id ? 'bg-nobel-dark text-white shadow-md' : 'bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-600 border border-transparent'} `}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search workspaces..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-nobel-gold/50"
                                    />
                                </div>
                            </div>

                            {/* Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up">
                                {/* New Project Card */}
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="group flex flex-col items-center justify-center h-72 rounded-2xl border-2 border-dashed border-gray-300 hover:border-nobel-gold hover:bg-white transition-all cursor-pointer bg-transparent gap-4"
                                >
                                    <div className="w-16 h-16 rounded-full bg-nobel-gold/10 text-nobel-gold flex items-center justify-center transition-transform duration-300">
                                        <Plus size={32} />
                                    </div>
                                    <div className="text-center">
                                        <span className="block font-serif font-bold text-nobel-dark text-lg group-hover:text-nobel-gold transition-colors">New Workspace</span>
                                        <span className="text-sm text-gray-400">Start from scratch</span>
                                    </div>
                                </button>

                                {filteredProjects.map((project: any) => (
                                    <div key={project._id} className="group bg-white rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-72 relative cursor-pointer" onClick={() => handleOpenProject(project)}>
                                        <div className="absolute top-4 right-4 z-20">
                                            <button
                                                className={`p-1.5 hover:bg-gray-100 rounded-full text-gray-500 bg-white shadow-sm transition-opacity ${openMenuId === project._id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                                onClick={(e) => toggleMenu(e, project._id)}
                                            >
                                                <MoreHorizontal size={16} />
                                            </button>
                                            {openMenuId === project._id && (
                                                <div
                                                    ref={menuRef}
                                                    className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 overflow-hidden z-[60] animate-fade-in-up"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button onClick={() => handleEditClick(project)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-nobel-gold flex items-center gap-2">
                                                        <Edit2 size={14} /> Edit Details
                                                    </button>
                                                    <button onClick={() => handleDeleteClick(project._id)} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2">
                                                        <Trash2 size={14} /> Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 w-full rounded-xl mb-4 relative overflow-hidden transition-all group-hover:shadow-inner bg-gray-50" style={{ backgroundColor: project.coverColor || '#f9fafb' }}>
                                            {project.coverImage ? (
                                                <img src={project.coverImage} alt="Cover" className="w-full h-full object-cover" />
                                            ) : (
                                                <>
                                                    <div className="absolute inset-0 opacity-20 canvas-pattern" style={{ backgroundSize: '12px 12px' }}></div>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-16 h-20 bg-white shadow-sm rounded border border-gray-100 transform -rotate-6 group-hover:-rotate-12 transition-transform duration-500"></div>
                                                    </div>
                                                </>
                                            )}
                                            {/* Category Badge overlay */}
                                            {project.category && (
                                                <div className="absolute top-2 left-2">
                                                    <CategoryBadge categoryId={project.category} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="px-1">
                                            <h4 className="font-serif font-bold text-nobel-dark text-lg mb-1 group-hover:text-nobel-gold transition-colors truncate">{project.name}</h4>
                                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                <Clock size={12} />
                                                <span>Last updated just now</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </main>
            )}
        </div >
    );
};

export default LandingPage;