
import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Plus, FileText, MoreVertical, Search, Folder, FolderOpen, ChevronRight, ChevronDown, PanelLeftClose, PanelLeftOpen, Trash2, Edit2, Check, X, Lock, Unlock, UserPlus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { TipTapEditor } from './TiptapEditor';
import { SignatureSection } from './SignatureSection';
import { HeroSection } from './HeroSection';
import { twMerge } from 'tailwind-merge';
import TabNavigation from '../TabNavigation';
import ProjectSelector from '../ProjectSelector';
import { Logo } from '../Logo';
import CustomSelect from '../CustomSelect';
import AttributionBadge from '../AttributionBadge';

// Convex Integration
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCreateFolder, useCreateDocument } from "../../hooks/useCreate";
import { useUpdateDocument, useUpdateFolder, useUpdateFile, useMoveFolder, useMoveFile } from "../../hooks/useUpdate";
import { useDeleteFolder, useDeleteDocument, useDeleteFile } from "../../hooks/useDelete";
import { Id } from '../../convex/_generated/dataModel';

import { ViewState, StartupData } from '../../types';

interface FileSystemItem {
    id: string; // convex _id
    type: 'folder' | 'doc' | 'file';
    title: string;
    parentId: string | null;
    content?: string; // HTML content for docs
    tags?: { name: string; color: string }[];
    lastModified?: string;
    original?: any; // Original convex object
}

interface DocsManagerProps {
    onBack: () => void;
    allProjects?: StartupData[];
    currentProjectId?: string | null;
    onSwitchProject?: (id: string) => void;
    onNewProject?: () => void;
    currentView?: ViewState;
    onNavigate?: (view: ViewState) => void;
    allowedPages?: string[];
    projectFeatures?: {
        canvasEnabled?: boolean;
        marketResearchEnabled?: boolean;
    };
}

// Dialog Component for Delete Confirmation
const DeleteConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    itemName,
    isFolder
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName: string;
    isFolder: boolean;
}) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm border border-nobel-dark/10">
                <h3 className="text-lg font-bold text-nobel-dark mb-2">Delete {isFolder ? 'Folder' : 'Item'}?</h3>
                <p className="text-sm text-nobel-dim mb-4">
                    Are you sure you want to delete <span className="font-semibold text-nobel-dark">"{itemName}"</span>?
                    {isFolder && <span className="block mt-2 text-red-500 font-medium">Warning: This will delete all contents inside this folder!</span>}
                </p>
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-3 py-1.5 text-sm font-medium text-nobel-dim hover:bg-nobel-cream rounded transition-colors">Cancel</button>
                    <button onClick={onConfirm} className="px-3 py-1.5 text-sm font-medium bg-red-500 text-white rounded hover:bg-red-600 transition-colors shadow-sm">Delete</button>
                </div>
            </div>
        </div>
    );
};

export const DocsManager: React.FC<DocsManagerProps> = ({
    onBack,
    allProjects = [],
    currentProjectId = null,
    onSwitchProject = () => { },
    onNewProject = () => { },
    currentView = 'LEGAL',
    onNavigate = () => { },
    allowedPages,
    projectFeatures
}) => {
    const [showHero, setShowHero] = useState(false);
    const [activeDocId, setActiveDocId] = useState<string | null>(null);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTag, setFilterTag] = useState<string>('all');
    const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);

    // Persistence for activeDocId via URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const docId = params.get('docId');
        if (docId) {
            setActiveDocId(docId);
            setShowHero(false);
        }
    }, []);

    useEffect(() => {
        const url = new URL(window.location.href);
        if (activeDocId) {
            url.searchParams.set('docId', activeDocId);
        } else {
            url.searchParams.delete('docId');
        }
        window.history.replaceState({}, '', url.toString());
    }, [activeDocId]);

    // Layout
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default open
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);

    // Auth & Share
    const { isAuthenticated } = useConvexAuth();
    const me = useQuery(api.users.getUser);
    const [isSignaturesOpen, setIsSignaturesOpen] = useState(false);

    // Convex Mutations
    const createFolder = useCreateFolder();
    const createDocument = useCreateDocument();
    const deleteFolderMutation = useDeleteFolder();
    const deleteDocumentMutation = useDeleteDocument();
    const deleteFileMutation = useDeleteFile();
    const moveFolderMutation = useMoveFolder();
    const moveFileMutation = useMoveFile();
    const updateDocumentMutation = useUpdateDocument();
    const updateFolderMutation = useUpdateFolder();
    const updateFileMutation = useUpdateFile();


    // Fetch Data
    const rawData = useQuery(api.files.getAllFileSystem, currentProjectId ? { projectId: currentProjectId } : "skip");

    // Process Data into Items — show only .md docs and folders containing them
    const items: FileSystemItem[] = useMemo(() => {
        if (!rawData) return [];
        const { folders, files, documents } = rawData;
        const processed: FileSystemItem[] = [];

        // Filter files to .md only (already done)
        const mdFiles = files.filter(f => f.name.toLowerCase().endsWith('.md'));

        // Filter documents to .md titles only
        const mdDocs = documents.filter(d => {
            const title = (d.title || '').toLowerCase();
            return title.endsWith('.md');
        });

        // Build a set of folder IDs that contain .md items (directly or via descendants)
        const folderHasMdContent = new Set<string>();
        const folderMap = new Map<string, { parentId: string | null }>();
        folders.forEach(f => folderMap.set(f._id, { parentId: f.parentId || null }));

        // Mark folders with .md files
        const markAncestors = (folderId: string | null | undefined) => {
            let fId: string | null = (folderId as string) || null;
            while (fId) {
                if (folderHasMdContent.has(fId)) break;
                folderHasMdContent.add(fId);
                const parent = folderMap.get(fId);
                fId = (parent?.parentId as string | null) || null;
            }
        };

        mdFiles.forEach(f => markAncestors(f.folderId));
        mdDocs.forEach(d => markAncestors(d.folderId));

        // Include ALL folders so empty folders are visible and usable.
        // Previously we only showed folders with .md descendants, which caused
        // newly-created empty folders to be invisible.
        folders.forEach(f => {
            processed.push({
                id: f._id,
                type: 'folder',
                title: f.name,
                parentId: f.parentId || null,
                original: f
            });
        });

        mdFiles.forEach(f => {
            processed.push({
                id: f._id,
                type: 'file',
                title: f.name,
                parentId: f.folderId || null,
                original: f
            });
        });

        mdDocs.forEach(d => processed.push({
            id: d._id,
            type: 'doc',
            title: d.title || 'Untitled',
            parentId: d.folderId || null,
            content: d.content,
            tags: d.tags,
            original: d
        }));

        return processed;
    }, [rawData]);

    // Derived State
    const activeDoc = useMemo(() => items.find(d => d.id === activeDocId && d.type === 'doc'), [items, activeDocId]);

    // Drag and Drop State
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);

    // Delete Dialog State
    const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; itemId: string | null; itemName: string; type: 'folder' | 'doc' | 'file' }>({
        isOpen: false, itemId: null, itemName: '', type: 'doc'
    });

    const [editingItem, setEditingItem] = useState<{ id: string, name: string, type: 'folder' | 'doc' | 'file' } | null>(null);

    // Unique Tags Calculation
    const uniqueTags = useMemo(() => {
        const tagMap = new Map();
        items.forEach(item => {
            if (item.tags) {
                item.tags.forEach(tag => {
                    if (!tagMap.has(tag.name)) {
                        tagMap.set(tag.name, tag);
                    }
                });
            }
        });
        return Array.from(tagMap.values());
    }, [items]);

    useEffect(() => {
        if (isCommentsOpen) setIsSidebarOpen(false);
    }, [isCommentsOpen]);

    const toggleFolder = (folderId: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folderId)) newExpanded.delete(folderId);
        else newExpanded.add(folderId);
        setExpandedFolders(newExpanded);
    };

    const handleCreateItem = async (type: 'doc' | 'folder') => {
        if (!currentProjectId) return;
        try {
            if (type === 'folder') {
                // Check if folder name exists in current parent
                // Ideally backend validates, but for "toast" we can check partially here if we have list
                const existing = items.find(i => i.type === 'folder' && i.title === 'New Folder' && i.parentId === (selectedFolderId || null));

                const newId = await createFolder({
                    projectId: currentProjectId,
                    name: 'New Folder',
                    parentId: selectedFolderId ? (selectedFolderId as Id<"folders">) : undefined
                });
                toast.success("Folder created successfully");
                // Auto expand parent
                if (selectedFolderId) setExpandedFolders(prev => new Set(prev).add(selectedFolderId));
                // Auto expand new folder? Maybe not necessary immediately
            } else {
                const newId = await createDocument({
                    projectId: currentProjectId,
                    folderId: selectedFolderId ? (selectedFolderId as Id<"folders">) : undefined,
                    title: 'New AI Document.md',
                    type: 'doc',
                    content: ''
                });

                // Clear filters to ensure new item is visible
                setFilterTag('all');
                setSearchQuery('');
                setIsSidebarOpen(true);


                setActiveDocId(newId);
                toast.success("Document created successfully");
                // Auto expand parent
                if (selectedFolderId) setExpandedFolders(prev => new Set(prev).add(selectedFolderId));
            }
        } catch (e) {
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, item: FileSystemItem) => {
        e.stopPropagation();
        setDeleteDialog({
            isOpen: true,
            itemId: item.id,
            itemName: item.title,
            type: item.type
        });
    };

    const confirmDelete = async () => {
        const { itemId, type } = deleteDialog;
        if (!itemId) return;

        try {
            if (type === 'folder') {
                await deleteFolderMutation({ folderId: itemId as Id<"folders"> });
            } else if (type === 'doc') {
                await deleteDocumentMutation({ id: itemId as Id<"documents"> });
                if (activeDocId === itemId) setActiveDocId(null);
            } else if (type === 'file') {
                await deleteFileMutation({ fileId: itemId as Id<"files"> });
            }
        } catch (e) {
        } finally {
            setDeleteDialog({ ...deleteDialog, isOpen: false });
        }
    };

    const handleEditClick = (e: React.MouseEvent, item: FileSystemItem) => {
        e.stopPropagation();
        setEditingItem({ id: item.id, name: item.title, type: item.type });
    };

    const handleRenameSubmit = async () => {
        if (!editingItem || !editingItem.name.trim()) return;

        try {
            if (editingItem.type === 'folder') {
                await updateFolderMutation({ folderId: editingItem.id as Id<"folders">, name: editingItem.name });
            } else if (editingItem.type === 'doc') {
                await updateDocumentMutation({ id: editingItem.id as Id<"documents">, title: editingItem.name });
            } else if (editingItem.type === 'file') {
                await updateFileMutation({ fileId: editingItem.id as Id<"files">, name: editingItem.name });
            }
        } catch (e) {
        } finally {
            setEditingItem(null);
        }
    };

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.stopPropagation();
        setDraggedId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setDraggedId(null);
        setDragOverId(null);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.stopPropagation();
        setDragOverId(null);
    };

    const handleDragOver = (e: React.DragEvent, id: string | 'root', type: 'folder' | 'doc' | 'file') => {
        e.preventDefault();
        e.stopPropagation();
        if (!draggedId || draggedId === id) return;

        // Cycle prevention for folders
        if (draggedId) {
            const draggedItem = items.find(i => i.id === draggedId);
            if (draggedItem?.type === 'folder') {
                // If dropping INTO a folder that is a child of dragged folder -> fail
                let isDescendant = false;
                let checkId: string | null = typeof id === 'string' ? id : null;
                while (checkId) {
                    const checkItem = items.find(i => i.id === checkId);
                    if (!checkItem) break;
                    if (checkItem.parentId === draggedId) { isDescendant = true; break; }
                    checkId = checkItem.parentId;
                }
                if (isDescendant) return;
            }
        }
        setDragOverId(typeof id === 'string' ? id : null);
    };

    const handleDrop = async (e: React.DragEvent, targetId: string | null) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverId(null);
        if (!draggedId || draggedId === targetId) return;

        const draggedItem = items.find(i => i.id === draggedId);
        if (!draggedItem) return;

        // Logic: Dropping ON a folder -> Move INSIDE it.
        // Dropping ON a file/doc -> Move to SAME parent as that doc (reorder/move next to it).
        // Since backend doesn't support "order" field yet, we just move to same folder.

        let newParentId: string | null = null;

        if (targetId === null) {
            newParentId = null; // Root
        } else {
            const targetItem = items.find(i => i.id === targetId);
            if (!targetItem) return;

            if (targetItem.type === 'folder') {
                newParentId = targetId;
                setExpandedFolders(prev => new Set(prev).add(targetId));
            } else {
                newParentId = targetItem.parentId;
            }
        }

        // Optimization: Don't move if parent is same
        if (draggedItem.parentId === newParentId) {
            setDraggedId(null);
            return;
        }

        try {
            if (draggedItem.type === 'folder') {
                await moveFolderMutation({
                    folderId: draggedItem.id as Id<"folders">,
                    parentId: newParentId as Id<"folders"> | null
                });
            } else if (draggedItem.type === 'file') {
                await moveFileMutation({
                    fileId: draggedItem.id as Id<"files">,
                    folderId: newParentId as Id<"folders"> | null
                });
            } else if (draggedItem.type === 'doc') {
                await updateDocumentMutation({
                    id: draggedItem.id as Id<"documents">,
                    folderId: newParentId as Id<"folders"> | null
                });
            }
        } catch (e) { }

        setDraggedId(null);
    };


    // Render Tree
    const renderTree = (parentId: string | null, depth = 0) => {
        // Filter logic: search
        let children = items.filter(item => item.parentId === parentId);
        if (searchQuery && parentId === null) {
            // If searching, flatten tree? Or just filter visible?
            // Simple flatten for search:
            return items.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase())).map(item => renderItem(item, 0, true));
        }

        if (filterTag !== 'all' && parentId === null) {
            return items.filter(i => i.type === 'doc' && i.tags?.some(t => t.name === filterTag)).map(item => renderItem(item, 0, true));
        }

        return children.map(item => renderItem(item, depth));
    };

    const renderItem = (item: FileSystemItem, depth: number, isSearch = false) => {
        const isSelected = (item.type === 'doc' && activeDocId === item.id) || (item.type === 'folder' && selectedFolderId === item.id);
        const isOpen = item.type === 'folder' && expandedFolders.has(item.id);

        return (
            <div key={item.id} className="select-none group">
                <div
                    draggable={!isSearch}
                    onDragStart={(e) => !isSearch && handleDragStart(e, item.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => !isSearch && handleDragOver(e, item.id, item.type)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => !isSearch && handleDrop(e, item.id)}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (item.type === 'folder') {
                            setSelectedFolderId(item.id);
                            toggleFolder(item.id);
                        } else {
                            setActiveDocId(item.id);
                            setSelectedFolderId(item.parentId); // Auto-select parent folder of doc
                        }
                    }}
                    style={{ paddingLeft: isSearch ? '12px' : `${depth * 12 + 12}px` }}
                    className={twMerge(
                        "flex items-center gap-2 py-1.5 pr-2 cursor-pointer transition-all text-sm my-0.5 border-l-2 relative",
                        isSelected
                            ? "bg-nobel-gold/10 text-nobel-dark font-medium border-nobel-gold"
                            : "hover:bg-nobel-dark/5 text-nobel-dim border-transparent",
                        draggedId === item.id && "opacity-50",
                        dragOverId === item.id && (item.type === 'folder' ? "bg-nobel-gold/20" : "border-t-2 border-t-nobel-gold bg-nobel-gold/5")
                    )}
                >
                    {item.type === 'folder' && !isSearch && (
                        <span className="text-nobel-dim/50 mr-1" onClick={(e) => { e.stopPropagation(); toggleFolder(item.id); }}>
                            {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        </span>
                    )}

                    {item.type === 'folder' ? (
                        isOpen ? <FolderOpen size={14} className="text-nobel-gold" /> : <Folder size={14} className="text-nobel-gold/70" />
                    ) : (
                        <FileText size={14} className={activeDocId === item.id ? "text-nobel-gold" : "text-nobel-dim"} />
                    )}

                    {!editingItem && (
                        <div className="mr-2 flex items-center gap-2 flex-grow min-w-0">
                            <span className="truncate">{item.title}</span>
                        </div>
                    )}

                    {editingItem?.id === item.id ? (
                        <div className="flex items-center gap-1 flex-grow mr-2" onClick={(e) => e.stopPropagation()}>
                            <input
                                value={editingItem.name}
                                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                className="bg-white border border-nobel-gold/50 rounded px-1 py-0.5 text-xs w-full focus:outline-none"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenameSubmit();
                                    if (e.key === 'Escape') setEditingItem(null);
                                }}
                            />
                            <button onClick={handleRenameSubmit} className="text-green-600 hover:text-green-700 p-0.5"><Check size={12} /></button>
                            <button onClick={() => setEditingItem(null)} className="text-red-500 hover:text-red-600 p-0.5"><X size={12} /></button>
                        </div>
                    ) : (
                        <>


                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                <button
                                    onClick={(e) => handleEditClick(e, item)}
                                    className="p-1 hover:bg-nobel-dark/10 text-nobel-dim hover:text-nobel-gold rounded transition-all"
                                    title="Rename"
                                >
                                    <Edit2 size={12} />
                                </button>
                                <button
                                    onClick={(e) => handleDeleteClick(e, item)}
                                    className="p-1 hover:bg-red-100 text-red-400 hover:text-red-500 rounded transition-all"
                                    title="Delete"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
                {item.type === 'folder' && isOpen && !isSearch && (
                    <div className="ml-2 border-l border-nobel-dark/5">
                        {renderTree(item.id, depth + 1)}
                    </div>
                )}
            </div>
        );
    };

    if (showHero && !activeDocId) {
        // If hero is active AND no active doc, show hero. 
        // If user clicks a doc from somewhere, activeDocId sets, we hide hero.
        return (
            <HeroSection
                onOpenDocs={() => setShowHero(false)}
                allProjects={allProjects}
                currentProjectId={currentProjectId}
                onSwitchProject={onSwitchProject}
                onNewProject={onNewProject}
                currentView={currentView}
                onNavigate={onNavigate}
                allowedPages={allowedPages}
                projectFeatures={projectFeatures}
                uniqueTags={uniqueTags}
            />
        );
    }

    return (
        <div className="flex h-screen w-full bg-nobel-cream canvas-pattern font-sans text-nobel-dark animate-fade-in-up overflow-hidden flex-col" style={{ backgroundSize: '24px 24px' }}>

            {/* Header */}
            <header className="px-6 py-3 bg-white/80 backdrop-blur-sm sticky top-0 z-50 flex items-center justify-between border-b border-stone-200 print:hidden shrink-0">
                <div className="flex items-center gap-4">
                    <Logo imageClassName="h-8 w-auto" />
                    <div className="h-6 w-px bg-stone-200" />
                    <div className="h-6 w-px bg-stone-200" />
                    <TabNavigation
                        currentView={currentView}
                        onNavigate={onNavigate}
                        allowedPages={allowedPages}
                        projectFeatures={{
                            canvasEnabled: projectFeatures?.canvasEnabled,
                            marketResearchEnabled: projectFeatures?.marketResearchEnabled
                        }}
                    />
                </div>
                <div className="w-48">
                    <CustomSelect
                        value={filterTag}
                        onChange={setFilterTag}
                        options={[
                            { label: 'All Tags', value: 'all' },
                            ...Array.from(new Set(items.flatMap(i => i.tags?.map(t => t.name) || []))).map(tag => ({ label: tag, value: tag }))
                        ]}
                        placeholder="Filter by Tag"
                        className="bg-white/50 border-stone-200"
                    />
                </div>
            </header>

            <div className="flex-grow flex relative overflow-hidden">
                {/* Delete Confirmation Dialog */}
                <DeleteConfirmDialog
                    isOpen={deleteDialog.isOpen}
                    onClose={() => setDeleteDialog({ ...deleteDialog, isOpen: false })}
                    onConfirm={confirmDelete}
                    itemName={deleteDialog.itemName}
                    isFolder={deleteDialog.type === 'folder'}
                />

                {/* Sidebar */}
                <div
                    className={twMerge(
                        "border-r border-nobel-dark/10 flex flex-col bg-nobel-cream/50 backdrop-blur-xl transition-all duration-300 overflow-hidden shrink-0",
                        isSidebarOpen ? "w-80 opacity-100" : "w-0 opacity-0 border-r-0"
                    )}
                >
                    <div className="p-4 border-b border-nobel-dark/5 min-w-[16rem]">
                        <div className="flex justify-between items-center mb-6">
                            <button
                                onClick={() => { setShowHero(true); setActiveDocId(null); }}
                                className="flex items-center gap-2 text-[10px] font-medium bg-nobel-dark text-white rounded-full px-3 py-1 hover:bg-nobel-gold transition-colors tracking-wide"
                            >
                                <ArrowLeft size={10} /> Back
                            </button>
                            <button onClick={() => setIsSidebarOpen(false)} className="text-nobel-dim hover:text-nobel-dark p-1">
                                <PanelLeftClose size={16} />
                            </button>
                        </div>

                        <div
                            className={twMerge(
                                "flex items-center justify-between mb-4 -mx-2 px-2 py-1 rounded transition-colors cursor-pointer",
                                dragOverId === 'root' ? "bg-nobel-gold/10 border border-dashed border-nobel-gold" : (selectedFolderId === null ? "bg-nobel-dark/5" : "hover:bg-nobel-dark/5")
                            )}
                            onClick={() => setSelectedFolderId(null)}
                            onDragOver={(e) => handleDragOver(e, 'root', 'folder')}
                            onDrop={(e) => handleDrop(e, null)}
                        >
                            <span className="font-serif font-bold text-lg">Library</span>
                            <div className="flex gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleCreateItem('folder'); }}
                                    className="p-1.5 hover:bg-nobel-gold/10 rounded-md text-nobel-gold transition-colors"
                                    title="New Folder"
                                >
                                    <Folder size={16} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleCreateItem('doc'); }}
                                    className="p-1.5 hover:bg-nobel-gold/10 rounded-md text-nobel-gold transition-colors"
                                    title="New Document"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nobel-dim" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Filter..."
                                className="w-full bg-white border border-nobel-dark/10 rounded-md py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:border-nobel-gold/50 placeholder:text-nobel-dim/50"
                            />
                        </div>
                    </div>

                    <div
                        className="flex-grow overflow-y-auto p-2 min-w-[16rem]"
                        onDragOver={(e) => handleDragOver(e, 'root', 'folder')}
                        onDrop={(e) => handleDrop(e, null)}
                    >
                        {renderTree(null)}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-grow flex flex-col h-full bg-nobel-cream canvas-pattern relative min-w-0 transition-all duration-300" style={{ backgroundSize: '24px 24px' }}>
                    {/* Floating Sidebar Toggle */}
                    {!isSidebarOpen && (
                        <button
                            onClick={() => {
                                setIsSidebarOpen(true);
                                if (window.innerWidth < 1024) setIsCommentsOpen(false);
                            }}
                            className="absolute top-6 left-6 z-20 w-8 h-8 bg-nobel-dark text-white rounded-full flex items-center justify-center shadow-lg hover:bg-nobel-gold transition-colors"
                            title="Expand Sidebar"
                        >
                            <PanelLeftOpen size={16} />
                        </button>
                    )}

                    {activeDoc ? (
                        <div className={twMerge("p-4 md:p-6 lg:p-8 flex flex-col h-full w-full max-w-none transition-all duration-300", !isSidebarOpen && "pl-24 md:pl-48 pr-12 md:pr-24")}>
                            {/* Header */}
                            <div className="mb-6 flex flex-col gap-4 w-full max-w-4xl mx-auto">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-grow flex items-center gap-2">
                                        {(activeDoc as any).isLocked && <Lock className="w-5 h-5 text-stone-400" />}
                                        <input
                                            value={activeDoc.title}
                                            onChange={(e) => updateDocumentMutation({ id: activeDoc.id as Id<"documents">, title: e.target.value })}
                                            className="bg-transparent font-serif text-3xl font-bold text-nobel-dark focus:outline-none w-full placeholder:text-nobel-dim/30 border-none px-0"
                                            placeholder="Untitled Document"
                                            disabled={(activeDoc as any).isLocked}
                                        />

                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Security Controls (Owner Only) */}
                                        {/* Assuming current user is owner if creatorId matches, BUT we need current user ID. 
                                            We can use `useConvexAuth` or check `activeDoc` permissions if we had that.
                                            For now, let's implement the UI and hook it up. 
                                            We need `me` query to know self.
                                        */}

                                        {/* Security Controls (Owner/Collaborator Only) */}
                                        {/* Share moved to Files & Assets preview panel */}

                                        {/* Attribution Badge */}
                                        {activeDoc.tags?.map((tag, idx) => {
                                            if (tag.name === 'AI Assisted' || tag.name === 'Human') {
                                                return (
                                                    <div key={idx} className="mr-2 order-2">
                                                        <AttributionBadge type={tag.name === 'AI Assisted' ? 'AI Assisted' : 'Human'} />
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}

                                        <div className="h-4 w-px bg-stone-200 mx-1 order-3" />

                                        <button
                                            onClick={() => toast.success("Document saved")}
                                            className="flex items-center gap-2 px-4 py-2 bg-nobel-dark text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-nobel-gold transition-colors shadow-lg shrink-0"
                                        >
                                            <Check className="w-4 h-4" /> Save
                                        </button>
                                    </div>
                                </div>

                                {/* Tags Input */}
                                <div className="flex flex-wrap gap-2 items-center">
                                    {(activeDoc.tags || []).filter(t => t.name !== 'AI Assisted' && t.name !== 'Human').map((tag, idx) => (
                                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border" style={{ backgroundColor: tag.color + '20', borderColor: tag.color, color: tag.color }}>
                                            {tag.name}
                                            <button onClick={() => {
                                                const newTags = (activeDoc.tags || []).filter((_, i) => i !== idx);
                                                updateDocumentMutation({ id: activeDoc.id as Id<"documents">, tags: newTags });
                                            }} className="hover:opacity-75"><X size={10} /></button>
                                        </span>
                                    ))}

                                    <div className="relative">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsTagPopoverOpen(!isTagPopoverOpen); }}
                                            className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 px-2 py-1 rounded-full border border-dashed border-stone-300 hover:border-stone-400 transition-colors"
                                        >
                                            <Plus size={10} /> Add Tag
                                        </button>

                                        {isTagPopoverOpen && (
                                            <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-stone-100 p-3 w-64 z-50 animate-in fade-in zoom-in-95 duration-200">
                                                <h4 className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider flex justify-between items-center">
                                                    Create Tag
                                                    <button onClick={() => setIsTagPopoverOpen(false)}><X size={12} /></button>
                                                </h4>
                                                <div className="space-y-2">
                                                    <input
                                                        placeholder="Tag Name"
                                                        className="w-full text-xs p-2 border rounded focus:outline-none focus:border-nobel-gold"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                const val = e.currentTarget.value;
                                                                if (!val.trim()) return;
                                                                // Random color generator
                                                                const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
                                                                const color = colors[Math.floor(Math.random() * colors.length)];

                                                                // Duplicate Check on Document
                                                                if (activeDoc.tags?.some(t => t.name.toLowerCase() === val.toLowerCase())) {
                                                                    toast.error(`Tag "${val}" already exists on this document`);
                                                                    return;
                                                                }

                                                                // Reuse color if tag exists globally (uniqueTags is calculated in parent scope)
                                                                // We need to access uniqueTags here. 
                                                                // Since uniqueTags is in the component scope, we can access it directly.
                                                                let finalColor = color;
                                                                const existingGlobalTag = uniqueTags.find(t => t.name.toLowerCase() === val.toLowerCase());
                                                                if (existingGlobalTag) {
                                                                    finalColor = existingGlobalTag.color;
                                                                }

                                                                updateDocumentMutation({
                                                                    id: activeDoc.id as Id<"documents">,
                                                                    tags: [...(activeDoc.tags || []), { name: val, color: finalColor }]
                                                                });
                                                                toast.success(`Tag "${val}" added`);
                                                                e.currentTarget.value = '';
                                                                setIsTagPopoverOpen(false);
                                                            }
                                                        }}
                                                    />
                                                    <p className="text-[10px] text-stone-400">Press Enter to add</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Editor */}
                            <div className="flex-grow pb-8 min-h-0 w-full max-w-4xl mx-auto">
                                <TipTapEditor
                                    key={activeDoc.id}
                                    documentId={activeDoc.id} /* PASSING ID FOR SYNC */
                                    orgId={me?.orgIds?.[0]}
                                    collaborators={(activeDoc as any).collaborators}
                                    fileName={activeDoc.title}
                                    readOnly={(activeDoc as any).isLocked}
                                    content={activeDoc.content || ''}
                                    onUpdate={(content) => { /* Sync handled by prosemirror-sync mostly, but simple update for preview in list? */
                                        // Actually useTiptapSync handles content updates?
                                        // If we use useTiptapSync, we don't need manual onUpdate to save content.
                                        // But for "lastModified" or preview we might?
                                        // Let's keep it simple: assume sync handles content.
                                        // But wait, the schema stores `content`. ProseMirror sync stores binary steps in `_node` tables usually?
                                        // No, `prosemirror-sync` usually handles its own tables.
                                        // The `documents` table has `content` field.
                                        // If I use `useTiptapSync`, it syncs to a separate location?
                                        // Step 996 said: "Implementing Convex ProseMirror Synchronization: Ensuring `@convex-dev/prosemirror-sync` is fully integrated...".
                                        // If that's the case, the `content` field in `documents` might become stale or unused?
                                        // Or `TipTapEditor` uses `useTiptapSync` which updates `documents` table?
                                        // Usually `useTiptapSync` uses a collaborative state.
                                        // BUT `TipTapEditor` also accepts `onUpdate`.
                                        // If I want to sync back to `documents` table (for search/preview), I should call `updateDocumentMutation`.
                                        // Debounce this?
                                        // I'll call it.
                                        updateDocumentMutation({ id: activeDoc.id as Id<"documents">, content });
                                    }}
                                    isCommentsOpen={isCommentsOpen}
                                    onToggleComments={(isOpen) => setIsCommentsOpen(isOpen)}
                                />
                            </div>

                            {/* Signatures Section */}
                            <SignatureSection
                                documentId={activeDoc.id as Id<"documents">}
                                signers={(activeDoc as any).signers || []}
                                isOwner={!(activeDoc as any).creatorId || (activeDoc as any).creatorId === me?._id}
                                meId={me?._id || ''}
                                orgId={me?.orgIds?.[0]}
                                isOpen={isSignaturesOpen}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <div className="mb-6 max-w-md rounded-lg overflow-hidden border-[6px] border-white shadow-xl -rotate-2">
                                <img src="/images/hero-carousel-5.png" alt="Workspace" className="w-full h-auto" />
                            </div>
                            <h3 className="font-serif text-xl font-bold text-stone-900 mb-2">Select a document to view</h3>
                            <p className="text-sm text-stone-500 max-w-xs">
                                Choose a file from the list to preview its contents, download, or manage details.
                            </p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};