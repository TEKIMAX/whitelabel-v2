
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from "../../convex/_generated/api";
import { useCreateFolder } from '../../hooks/useCreate';
import { Id } from '../../convex/_generated/dataModel';
import { Folder, FolderOpen, ChevronRight, ChevronDown, Plus, FileText, X, Check } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface SaveToFilesDialogProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    onSave: (folderId: string | null, filename: string) => Promise<void>;
    title?: string;
    defaultFilename?: string;
}

interface FileSystemItem {
    id: string;
    type: 'folder' | 'doc' | 'file';
    title: string;
    parentId: string | null;
}

export const SaveToFilesDialog: React.FC<SaveToFilesDialogProps> = ({ isOpen, onClose, projectId, onSave, title = "Save to Files", defaultFilename = "New AI Document" }) => {
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [filename, setFilename] = useState(defaultFilename);

    React.useEffect(() => {
        if (isOpen) {
            setFilename(defaultFilename);
        }
    }, [isOpen, defaultFilename]);

    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);

    const createFolder = useCreateFolder();

    // Fetch File System
    const rawData = useQuery(api.files.getAllFileSystem, { projectId });

    const items: FileSystemItem[] = useMemo(() => {
        if (!rawData) return [];
        const { folders, documents } = rawData;
        const processed: FileSystemItem[] = [];

        // Only include .md documents
        const mdDocs = documents.filter(d => {
            const title = (d.title || '').toLowerCase();
            return title.endsWith('.md');
        });

        // Build a set of folder IDs that contain .md docs (directly or via descendants)
        const folderHasMdDoc = new Set<string>();

        // Map folder IDs to their parent IDs for bottom-up walk
        const folderMap = new Map<string, { parentId: string | null }>();
        folders.forEach(f => folderMap.set(f._id, { parentId: f.parentId || null }));

        // Mark each folder that directly contains an .md doc, then walk up
        mdDocs.forEach(d => {
            let fId: string | null = d.folderId || null;
            while (fId) {
                if (folderHasMdDoc.has(fId)) break; // already marked ancestors
                folderHasMdDoc.add(fId);
                const parent = folderMap.get(fId);
                fId = (parent?.parentId as string | null) || null;
            }
        });

        // Also include root-level .md docs (folderId is null) — no folder marking needed
        // Include only folders that have .md descendants
        folders.forEach(f => {
            if (folderHasMdDoc.has(f._id)) {
                processed.push({
                    id: f._id,
                    type: 'folder',
                    title: f.name,
                    parentId: f.parentId || null,
                });
            }
        });

        mdDocs.forEach(d => processed.push({
            id: d._id,
            type: 'doc',
            title: d.title || 'Untitled',
            parentId: d.folderId || null,
        }));

        return processed;
    }, [rawData]);

    const toggleFolder = (folderId: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folderId)) newExpanded.delete(folderId);
        else newExpanded.add(folderId);
        setExpandedFolders(newExpanded);
    };

    const handleCreateFolder = async () => {
        if (!newFolderName) return;
        try {
            const newId = await createFolder({
                projectId,
                name: newFolderName,
                parentId: selectedFolderId ? selectedFolderId as Id<"folders"> : undefined
            });
            setNewFolderName("");
            setIsCreatingFolder(false);
            if (selectedFolderId) setExpandedFolders(prev => new Set(prev).add(selectedFolderId));
        } catch (e) {
        }
    };

    const renderTree = (parentId: string | null, depth = 0) => {
        const children = items.filter(item => item.parentId === parentId);
        return children.sort((a, b) => a.type === 'folder' ? -1 : 1).map(item => {
            const isSelected = item.id === selectedFolderId && item.type === 'folder';
            const isOpen = item.type === 'folder' && expandedFolders.has(item.id);

            return (
                <div key={item.id} className="select-none">
                    <div
                        className={twMerge(
                            "flex items-center gap-2 py-1.5 px-2 cursor-pointer transition-all text-sm rounded-md",
                            isSelected ? "bg-nobel-gold/10 text-nobel-dark font-medium" : "hover:bg-nobel-dark/5 text-nobel-dim",
                            item.type !== 'folder' && "opacity-60"
                        )}
                        style={{ paddingLeft: `${depth * 12 + 8}px` }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (item.type === 'folder') {
                                setSelectedFolderId(item.id);
                                toggleFolder(item.id);
                            }
                        }}
                    >
                        {item.type === 'folder' && (
                            <span className="text-nobel-dim/50 mr-1" onClick={(e) => { e.stopPropagation(); toggleFolder(item.id); }}>
                                {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                            </span>
                        )}
                        {item.type === 'folder' ? (
                            isOpen ? <FolderOpen size={14} className="text-nobel-gold" /> : <Folder size={14} className="text-nobel-gold/70" />
                        ) : <FileText size={14} />}
                        <span className="truncate">{item.title}</span>
                    </div>
                    {item.type === 'folder' && isOpen && (
                        <div className="ml-2 border-l border-nobel-dark/5">
                            {renderTree(item.id, depth + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-nobel-dark/10 flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center mb-4 border-b border-nobel-dark/5 pb-2">
                    <h2 className="font-serif text-xl font-bold text-stone-900">{title}</h2>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
                </div>

                <div className="mb-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1 block">Filename</label>
                    <input
                        value={filename}
                        onChange={(e) => setFilename(e.target.value)}
                        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nobel-gold"
                        placeholder="Enter filename..."
                    />
                </div>

                <div className="flex-grow overflow-y-auto border border-stone-100 rounded-lg p-2 bg-stone-50 mb-4 min-h-[200px]">
                    <div
                        className={twMerge("p-2 mb-1 rounded flex items-center gap-2 cursor-pointer", selectedFolderId === null ? "bg-nobel-gold/10 font-bold" : "hover:bg-stone-200")}
                        onClick={() => setSelectedFolderId(null)}
                    >
                        <Folder size={16} className="text-nobel-gold" /> <span>Root Library</span>
                    </div>
                    {renderTree(null)}
                </div>

                {isCreatingFolder ? (
                    <div className="flex gap-2 mb-4 animate-in slide-in-from-top-2">
                        <input
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            placeholder="New Folder Name"
                            className="flex-grow border border-stone-200 rounded px-2 py-1 text-sm focus:border-nobel-gold outline-none"
                            autoFocus
                        />
                        <button onClick={handleCreateFolder} className="bg-nobel-gold text-white p-1 rounded hover:bg-nobel-gold/90"><Check size={16} /></button>
                        <button onClick={() => setIsCreatingFolder(false)} className="bg-stone-200 text-stone-500 p-1 rounded hover:bg-stone-300"><X size={16} /></button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsCreatingFolder(true)}
                        className="flex items-center gap-2 text-xs text-stone-500 hover:text-nobel-gold font-bold uppercase tracking-wide mb-4 transition-colors w-fit"
                    >
                        <Plus size={14} /> New Folder
                    </button>
                )}

                <div className="flex justify-end gap-3 pt-2 border-t border-stone-100">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100 rounded-lg transition-colors">Cancel</button>
                    <button
                        onClick={async () => {
                            setIsSaving(true);
                            await onSave(selectedFolderId, filename);
                            setIsSaving(false);
                            onClose();
                        }}
                        disabled={isSaving || !filename.trim()}
                        className="px-6 py-2 text-sm font-bold bg-stone-900 text-white rounded-lg hover:bg-nobel-gold transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Saving...' : 'Save File'}
                    </button>
                </div>
            </div>
        </div>
    );
};
