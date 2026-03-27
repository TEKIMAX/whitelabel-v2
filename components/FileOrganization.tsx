import React, { useState, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from "../convex/_generated/api";
import { useCreateFolder, useGenerateUploadUrl, useSaveFile } from '../hooks/useCreate';
import { useDeleteFolder, useDeleteFile } from '../hooks/useDelete';
import { useMoveFile } from '../hooks/useUpdate';
import { StartupData, ViewState, Folder, File as FileDoc, RolePermissions } from '../types';
import TabNavigation from './TabNavigation';
import DotPatternBackground from './DotPatternBackground';
import { Logo } from './Logo';
import { Folder as FolderIcon, Check } from 'lucide-react';
import { toast } from "sonner";
import { UploadModal } from './file-organization/UploadModal';
import { DeleteConfirmDialog } from './file-organization/DeleteConfirmDialog';
import { FilePreviewPanel } from './file-organization/FilePreviewPanel';
import { FileGrid } from './file-organization/FileGrid';
import { Toolbar } from './file-organization/Toolbar';
import { EmptyState } from './file-organization/EmptyState';
import { formatSize, getFileIcon } from './file-organization/utils';

interface FileOrganizationProps {
    data: StartupData;
    currentView: ViewState;
    onNavigate: (view: ViewState) => void;
    onUpdateProject: (updates: Partial<StartupData> | ((prev: StartupData) => Partial<StartupData>)) => void;
    allProjects: StartupData[];
    onSwitchProject: (projectId: string) => void;
    onNewProject: () => void;
    allowedPages?: string[];
    permissions?: RolePermissions;
}

const FileOrganization: React.FC<FileOrganizationProps> = ({
    data,
    currentView,
    onNavigate,
    onUpdateProject,
    allProjects,
    onSwitchProject,
    onNewProject,
    allowedPages,
    permissions
}) => {
    // Permission Verification
    const canCreate = permissions ? (permissions.global?.create ?? false) : true;
    const canDelete = permissions ? (permissions.global?.delete ?? false) : true;

    const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
    const [folderPath, setFolderPath] = useState<{ id: string, name: string }[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFile, setSelectedFile] = useState<FileDoc | null>(null);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderTags, setNewFolderTags] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'folder' | 'file', id: string, name: string } | null>(null);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadQueue, setUploadQueue] = useState<{ file: File, progress: number, status: 'pending' | 'uploading' | 'done' | 'error', tags: { name: string, color: string }[] }[]>([]);
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const { folders, files } = useQuery(api.files.list, {
        projectId: data.id as any,
        parentId: currentFolderId as any
    }) || { folders: [], files: [] };

    const sharedStorageIds = new Set<string>(useQuery(api.filesControl.getSharedStorageIds) || []);

    // Query for folder contents when deleting a folder
    const folderContents = useQuery(api.files.list,
        deleteConfirm?.type === 'folder'
            ? { projectId: data.id as any, parentId: deleteConfirm.id as any }
            : "skip"
    ) || { folders: [], files: [] };

    const createFolder = useCreateFolder();
    const generateUploadUrl = useGenerateUploadUrl();
    const saveFile = useSaveFile();
    const deleteFolder = useDeleteFolder();
    const deleteFile = useDeleteFile();
    const moveFile = useMoveFile();

    const handleDownload = async (file: FileDoc) => {
        if (!file.url) return;
        try {
            const response = await fetch(file.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            // Fallback to direct link if fetch fails
            window.open(file.url, '_blank');
        }
    };

    const handleDragStart = (e: React.DragEvent, fileId: string) => {
        if (!canCreate) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('fileId', fileId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        if (!canCreate) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDropOnFolder = async (e: React.DragEvent, folderId: string) => {
        e.preventDefault();
        if (!canCreate) return;
        const fileId = e.dataTransfer.getData('fileId');
        if (!fileId) return;

        try {
            await moveFile({
                fileId: fileId as any,
                folderId: folderId as any
            });
        } catch (error) {
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        const tags = newFolderTags.split(',').map(t => t.trim()).filter(Boolean).map(name => ({ name, color: '#6B7280' }));
        await createFolder({
            projectId: data.id as any,
            name: newFolderName,
            parentId: currentFolderId as any,
            tags: tags.length > 0 ? tags : undefined
        });
        toast.success("Folder created", { icon: <FolderIcon className="w-4 h-4 text-black" /> });
        setNewFolderName('');
        setNewFolderTags('');
        setIsCreatingFolder(false);
    };

    const handleFilesSelected = (files: FileList | null) => {
        if (!files) return;
        const newQueue = Array.from(files).map(file => ({
            file,
            progress: 0,
            status: 'pending' as const,
            tags: [] as { name: string; color: string }[]
        }));
        setUploadQueue((prev: typeof uploadQueue) => [...prev, ...newQueue]);
        setUploadModalOpen(true);
    };

    const handleUploadAll = async () => {
        const pendingUploads = uploadQueue.filter(u => u.status === 'pending');

        for (const item of pendingUploads) {
            setUploadQueue(prev => prev.map(u => u.file === item.file ? { ...u, status: 'uploading' } : u));

            try {
                const postUrl = await generateUploadUrl();

                await new Promise<void>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open("POST", postUrl, true);
                    xhr.setRequestHeader("Content-Type", item.file.type);

                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable) {
                            const percentComplete = (event.loaded / event.total) * 100;
                            setUploadQueue(prev => prev.map(u => u.file === item.file ? { ...u, progress: percentComplete } : u));
                        }
                    };

                    xhr.onload = async () => {
                        if (xhr.status === 200) {
                            try {
                                const { storageId } = JSON.parse(xhr.responseText);
                                await saveFile({
                                    projectId: data.id as any,
                                    folderId: currentFolderId as any,
                                    name: item.file.name,
                                    title: item.file.name,
                                    description: '',
                                    tags: item.tags,
                                    type: item.file.type,
                                    storageId,
                                    size: item.file.size,
                                    source: "external",
                                });
                                setUploadQueue(prev => prev.map(u => u.file === item.file ? { ...u, status: 'done', progress: 100 } : u));
                                toast.success("File uploaded successfully", { icon: <Check className="w-4 h-4 text-black" /> });
                                resolve();
                            } catch (err) {
                                setUploadQueue(prev => prev.map(u => u.file === item.file ? { ...u, status: 'error' } : u));
                                reject(err);
                            }
                        } else {
                            setUploadQueue(prev => prev.map(u => u.file === item.file ? { ...u, status: 'error' } : u));
                            reject(new Error("Upload failed"));
                        }
                    };

                    xhr.onerror = () => {
                        setUploadQueue(prev => prev.map(u => u.file === item.file ? { ...u, status: 'error' } : u));
                        reject(new Error("Upload error"));
                    };

                    xhr.send(item.file);
                });

            } catch (error) {
            }
        }
    };

    const updateItemTags = (file: File, newTags: { name: string, color: string }[]) => {
        setUploadQueue(prev => prev.map(u => u.file === file ? { ...u, tags: newTags } : u));
    };

    const removeQueueItem = (file: File) => {
        setUploadQueue(prev => prev.filter(u => u.file !== file));
    };

    const handleFolderClick = (folder: Folder) => {
        setCurrentFolderId(folder._id);
        setFolderPath([...folderPath, { id: folder._id, name: folder.name }]);
        setSelectedTag(null);
    };

    const handleBreadcrumbClick = (index: number) => {
        if (index === -1) {
            setCurrentFolderId(undefined);
            setFolderPath([]);
        } else {
            const newPath = folderPath.slice(0, index + 1);
            setCurrentFolderId(newPath[newPath.length - 1].id);
            setFolderPath(newPath);
        }
        setSelectedTag(null);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirm) return;

        if (deleteConfirm.type === 'folder') {
            await deleteFolder({ folderId: deleteConfirm.id as any });
            toast.success("Folder deleted");
        } else {
            await deleteFile({ fileId: deleteConfirm.id as any });
            toast.success("File deleted");
            if (selectedFile?._id === deleteConfirm.id) setSelectedFile(null);
        }
        setDeleteConfirm(null);
    };

    // Extract all unique tags from current folders
    const allTags = Array.from(new Set(folders.flatMap(f => f.tags?.map(t => t.name) || []))).sort() as string[];

    const filteredFolders = folders.filter(f => {
        const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
        if (selectedTag) {
            return f.tags?.some(t => t.name === selectedTag);
        }
        return true;
    });

    const filteredFiles = files.filter(f => {
        const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
        if (selectedTag) {
            return f.tags?.some(t => t.name === selectedTag);
        }
        return true;
    });

    return (
        <div className="h-screen flex bg-nobel-cream relative overflow-hidden">
            {/* Left Sidebar - Vertical Image with Logo and Title */}
            <div className="w-[20%] h-full relative overflow-hidden bg-stone-900 border-r border-stone-200 shadow-2xl z-20">
                <img
                    src="/images/EnergeticWorkspace.png"
                    alt="Files & Documents"
                    className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-stone-900/40 via-transparent to-stone-900/80" />

                {/* Logo */}
                <div className="absolute top-8 left-8 z-30">
                    <Logo imageClassName="h-8 w-auto brightness-0 invert" />
                </div>

                {/* Title and Description */}
                <div className="absolute inset-x-0 bottom-0 p-8 space-y-4 bg-gradient-to-t from-stone-900 via-stone-900/60 to-transparent pt-24">
                    <div className="space-y-3">
                        <span className="text-nobel-gold font-medium tracking-wider uppercase text-xs block">Repository</span>
                        <h2 className="text-white text-2xl font-serif font-bold leading-tight">
                            Files & Documents
                        </h2>
                        <div className="h-1 w-10 bg-nobel-gold/50 rounded-full" />
                        <p className="text-stone-300 text-sm leading-relaxed">
                            Manage your project files and assets.
                        </p>
                        {canCreate && (
                            <div className="pt-4">
                                <button
                                    onClick={() => setUploadModalOpen(true)}
                                    className="px-5 py-2.5 bg-nobel-gold text-white rounded-full font-bold uppercase tracking-wider text-xs hover:bg-white hover:text-stone-900 transition-colors shadow-lg"
                                >
                                    Upload File
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Content Area */}
            <div className="w-[80%] h-full flex flex-col relative z-10">
                <DotPatternBackground color="#a8a29e" />

                <header className="px-10 py-4 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-stone-200 shrink-0 relative z-50">
                    <TabNavigation currentView={currentView} onNavigate={onNavigate} allowedPages={allowedPages} mode="light" />
                    {canCreate && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsCreatingFolder(true)}
                                className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <FolderIcon className="w-4 h-4" /> New Folder
                            </button>
                            <button
                                onClick={() => setUploadModalOpen(true)}
                                className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest bg-stone-900 text-white hover:bg-nobel-gold transition-colors flex items-center gap-2 shadow-md"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                Upload File
                            </button>
                        </div>
                    )}
                </header>

                <main className="flex-grow flex relative overflow-hidden">
                    <UploadModal
                        isOpen={uploadModalOpen}
                        onClose={() => setUploadModalOpen(false)}
                        uploadQueue={uploadQueue}
                        setUploadQueue={setUploadQueue}
                        handleUploadAll={handleUploadAll}
                        handleFilesSelected={handleFilesSelected}
                        updateItemTags={updateItemTags}
                        removeQueueItem={removeQueueItem}
                    />

                    <DeleteConfirmDialog
                        item={deleteConfirm}
                        onClose={() => setDeleteConfirm(null)}
                        onConfirm={handleDeleteConfirm}
                        folderContents={folderContents}
                    />

                    <div className={`flex-grow flex flex-col transition-all duration-300 ${selectedFile ? 'mr-[40%]' : ''}`}>
                        <div className="flex-grow overflow-y-auto">
                            <div className="max-w-[1400px] mx-auto w-full p-8 md:p-12">
                                <Toolbar
                                    folderPath={folderPath}
                                    handleBreadcrumbClick={handleBreadcrumbClick}
                                    searchQuery={searchQuery}
                                    setSearchQuery={setSearchQuery}
                                    selectedTag={selectedTag}
                                    setSelectedTag={setSelectedTag}
                                    allTags={allTags}
                                />

                                {/* Drag & Drop Hint */}
                                <div className="mb-6 flex items-center gap-2 text-xs text-stone-500 bg-stone-100/50 p-2 rounded-lg border border-stone-200/50 w-fit">
                                    <span className="bg-stone-200 px-1.5 rounded text-stone-600 font-bold">TIP</span>
                                    <span>You can drag and drop files directly onto folders to organize them.</span>
                                </div>

                                {/* Content */}
                                <div className="relative min-h-[500px]">
                                    <FileGrid
                                        folders={filteredFolders}
                                        files={filteredFiles}
                                        onFolderClick={handleFolderClick}
                                        onFileClick={setSelectedFile}
                                        selectedFile={selectedFile}
                                        handleDragOver={handleDragOver}
                                        handleDropOnFolder={handleDropOnFolder}
                                        handleDragStart={handleDragStart}
                                        setDeleteConfirm={setDeleteConfirm}
                                        canDelete={canDelete}
                                        isCreatingFolder={isCreatingFolder}
                                        setIsCreatingFolder={setIsCreatingFolder}
                                        newFolderName={newFolderName}
                                        setNewFolderName={setNewFolderName}
                                        newFolderTags={newFolderTags}
                                        setNewFolderTags={setNewFolderTags}
                                        handleCreateFolder={handleCreateFolder}
                                        canCreate={canCreate}
                                        sharedStorageIds={sharedStorageIds}
                                    />

                                    {filteredFolders.length === 0 && filteredFiles.length === 0 && !isCreatingFolder && (
                                        <EmptyState
                                            canCreate={canCreate}
                                            setUploadModalOpen={setUploadModalOpen}
                                            setIsCreatingFolder={setIsCreatingFolder}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <FilePreviewPanel
                        selectedFile={selectedFile}
                        onClose={() => setSelectedFile(null)}
                        handleDownload={handleDownload}
                    />
                </main>
            </div>
        </div>
    );
};

export default FileOrganization;
