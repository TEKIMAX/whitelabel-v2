
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from "../../convex/_generated/api";
import { Folder, Image, FileText, Search, ChevronRight, ArrowLeft, Loader2, Grid, List, FolderOpen } from 'lucide-react';
import { Id } from '../../convex/_generated/dataModel';

interface FileSelectorProps {
    projectId: string;
    onSelect: (url: string, storageId: string, file: any) => void;
    allowedTypes?: string[]; // e.g. ['image/']
    title?: string;
}

export const FileSelector: React.FC<FileSelectorProps> = ({ projectId, onSelect, allowedTypes, title = "Select File" }) => {
    // Mode: 'browse' | 'search'
    const [mode, setMode] = useState<'browse' | 'search'>('browse');

    // Browse State
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [folderHistory, setFolderHistory] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'Root' }]);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
            if (searchQuery.trim()) setMode('search');
            else setMode('browse');
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Data Fetching
    const browseData = useQuery(api.files.list, projectId ? {
        projectId,
        parentId: (currentFolderId as Id<"folders">) || undefined
    } : "skip");

    // Search Data
    const searchData = useQuery(api.files.searchFiles, (debouncedQuery && projectId) ? {
        projectId,
        query: debouncedQuery,
        type: allowedTypes && allowedTypes.length === 1 ? allowedTypes[0].replace('/', '') : undefined
    } : "skip");

    // Helper: Filter display items by type if browsing
    const filteredFiles = React.useMemo(() => {
        if (mode === 'search') return searchData || [];
        if (!browseData) return [];

        let files = browseData.files;
        if (allowedTypes) {
            files = files.filter(f => allowedTypes.some(t => f.type.startsWith(t.replace('*', ''))));
        }
        return files;
    }, [mode, browseData, searchData, allowedTypes]);


    const handleFolderClick = (folder: any) => {
        setCurrentFolderId(folder._id);
        setFolderHistory(prev => [...prev, { id: folder._id, name: folder.name }]);
        setSearchQuery('');
        setMode('browse');
    };

    const handleBreadcrumbClick = (index: number) => {
        const target = folderHistory[index];
        setCurrentFolderId(target.id);
        setFolderHistory(prev => prev.slice(0, index + 1));
        setSearchQuery('');
        setMode('browse');
    };

    return (
        <div className="flex flex-col h-full bg-nobel-cream canvas-pattern rounded-xl overflow-hidden border border-stone-200" style={{ backgroundSize: '24px 24px' }}>
            {/* Header / Toolbar */}
            <div className="flex items-center justify-between p-3 bg-white border-b border-stone-100">
                <div className="flex items-center gap-2 flex-1">
                    {/* Breadcrumbs (only in browse mode) */}
                    {mode === 'browse' && (
                        <div className="flex items-center text-sm text-stone-500 overflow-hidden whitespace-nowrap">
                            {folderHistory.map((item, idx) => (
                                <React.Fragment key={idx}>
                                    {idx > 0 && <ChevronRight className="w-3 h-3 mx-1 text-stone-300" />}
                                    <button
                                        onClick={() => handleBreadcrumbClick(idx)}
                                        className={`hover:text-stone-900 transition-colors ${idx === folderHistory.length - 1 ? 'font-bold text-stone-900' : ''}`}
                                    >
                                        {item.name}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                    {mode === 'search' && <span className="text-sm font-bold text-stone-900">Search Results</span>}
                </div>

                {/* Search Bar */}
                <div className="relative w-48">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                        type="text"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-100 border-none rounded-full focus:ring-1 focus:ring-stone-300 transition-all font-medium text-stone-700 placeholder:text-stone-400"
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4">
                {/* Search Loading */}
                {mode === 'search' && !searchData && debouncedQuery && (
                    <div className="flex items-center justify-center h-20 text-stone-400">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Searching...
                    </div>
                )}

                {/* Empty States */}
                {mode === 'browse' && !browseData && (
                    <div className="flex items-center justify-center h-20 text-stone-400">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
                    </div>
                )}

                {/* Folders (Browse Mode Only) */}
                {mode === 'browse' && browseData?.folders && browseData.folders.length > 0 && (
                    <div className="mb-4">
                        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 px-1">Folders</h4>
                        <div className="grid grid-cols-3 gap-2">
                            {browseData.folders.map((folder: any) => (
                                <button
                                    key={folder._id}
                                    onClick={() => handleFolderClick(folder)}
                                    className="flex items-center gap-2 p-2 bg-white rounded-lg border border-stone-200 hover:border-stone-300 hover:shadow-sm transition-all text-left group"
                                >
                                    <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-500 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                                        <Folder className="w-4 h-4 fill-current" />
                                    </div>
                                    <span className="text-xs font-medium text-stone-700 truncate">{folder.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Files Grid */}
                <div>
                    {(mode === 'browse' && browseData?.files?.length === 0 && browseData?.folders?.length === 0) ? (
                        <div className="flex flex-col items-center justify-center py-10 text-stone-400">
                            <FolderOpen className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-xs">No files in this folder</p>
                        </div>
                    ) : (
                        <>
                            {/* Only show 'Files' header if mixing with folders or searching */}
                            {(mode === 'search' || (browseData?.folders?.length || 0) > 0) && filteredFiles.length > 0 && (
                                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 px-1">Files</h4>
                            )}

                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                {filteredFiles.map((file: any) => {
                                    // Determine icon/preview based on type
                                    const isImage = file.type.startsWith('image/');

                                    // For search results, we might not have 'url' yet, but 'browse' results do.
                                    // If url is missing, we use storageId to render a convex image? 
                                    // Or we just show icon.
                                    // Browse query returns signed URLs. Search query returns NO URLs (to be fast).
                                    // We can just use the storageId to construct a URL if needed, or fetch it.
                                    // Ideally, let's fix Search query to return URL or use a dedicated <FilePreview> component.
                                    // For now, I'll pass storageId to parent.

                                    return (
                                        <button
                                            key={file.id || file._id}
                                            onClick={() => onSelect(file.url || '', file.storageId, file)} // Pass file object
                                            className="group relative aspect-square bg-white rounded-lg border border-stone-200 overflow-hidden hover:border-stone-400 hover:shadow-md transition-all"
                                        >
                                            {isImage && (file.url || file.storageId) ? (
                                                <img
                                                    src={file.url || `https://${process.env.NEXT_PUBLIC_CONVEX_URL?.replace('.convex.cloud', '')}.convex.cloud/api/storage/${file.storageId}`}
                                                    alt={file.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        // Fallback if URL construction fails
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                        ((e.target as HTMLImageElement).nextSibling as HTMLElement).style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}

                                            {/* Fallback Icon */}
                                            <div className={`absolute inset-0 flex items-center justify-center bg-stone-50 ${isImage && (file.url || file.storageId) ? 'hidden' : 'flex'}`}>
                                                {isImage ? <Image className="w-6 h-6 text-stone-400" /> : <FileText className="w-6 h-6 text-stone-400" />}
                                            </div>

                                            {/* Hover Overlay */}
                                            <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1.5 translate-y-full group-hover:translate-y-0 transition-transform">
                                                <p className="text-[10px] text-white truncate text-center">{file.name}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
