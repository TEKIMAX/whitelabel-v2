import React, { useState, useEffect } from 'react';
import { Search, Upload, X, Loader2, Image as ImageIcon, Folder as FolderIcon, ChevronRight } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from "../convex/_generated/api";
import { useGenerateUploadUrl } from '../hooks/useCreate';
import { searchPixabayImages } from '../services/pixabayService';

interface UnifiedMediaPickerProps {
    onSelect: (url: string, previewUrl?: string) => void;
    onClose: () => void;
    projectId?: string;
    initialSearchTerm?: string;
}

export const UnifiedMediaPicker: React.FC<UnifiedMediaPickerProps> = ({ onSelect, onClose, projectId, initialSearchTerm = '' }) => {
    const [activeTab, setActiveTab] = useState<'pixabay' | 'files' | 'upload'>('pixabay');
    const [searchQuery, setSearchQuery] = useState(initialSearchTerm);
    const [pixabayImages, setPixabayImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // File Browser State
    const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
    const [folderPath, setFolderPath] = useState<{ id: string, name: string }[]>([]);

    // Fetch Project Files
    const projectContent = useQuery(api.files.list, projectId ? {
        projectId: projectId as any,
        parentId: currentFolderId as any
    } : "skip") || { folders: [], files: [] };

    // Initial Pixabay search
    useEffect(() => {
        if (activeTab === 'pixabay') {
            if (initialSearchTerm) {
                handlePixabaySearch(initialSearchTerm);
            } else {
                handlePixabaySearch('startup');
            }
        }
    }, [activeTab]);

    const handlePixabaySearch = async (query: string) => {
        setLoading(true);
        try {
            const results = await searchPixabayImages(query);
            setPixabayImages(results);
        } finally {
            setLoading(false);
        }
    };

    const generateUploadUrl = useGenerateUploadUrl();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            // 1. Get Upload URL
            const postUrl = await generateUploadUrl();

            // 2. Post File
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });
            const { storageId } = await result.json();

            // 3. Select Storage ID & Preview
            const previewUrl = URL.createObjectURL(file);
            onSelect(storageId, previewUrl);
            onClose();
        } catch (error) {
            alert("Failed to upload image. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleFolderClick = (folder: { _id: string, name: string }) => {
        setCurrentFolderId(folder._id);
        setFolderPath([...folderPath, { id: folder._id, name: folder.name }]);
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
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[700px]">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-nobel-gold" />
                        Select Media
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('pixabay')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'pixabay'
                            ? 'border-b-2 border-nobel-gold text-nobel-gold bg-white'
                            : 'text-gray-500 hover:text-gray-700 bg-gray-50'
                            }`}
                    >
                        Stock Photos
                    </button>
                    <button
                        onClick={() => setActiveTab('files')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'files'
                            ? 'border-b-2 border-nobel-gold text-nobel-gold bg-white'
                            : 'text-gray-500 hover:text-gray-700 bg-gray-50'
                            }`}
                    >
                        Project Files
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'upload'
                            ? 'border-b-2 border-nobel-gold text-nobel-gold bg-white'
                            : 'text-gray-500 hover:text-gray-700 bg-gray-50'
                            }`}
                    >
                        Upload New
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
                    {/* --- PIXABAY TAB --- */}
                    {activeTab === 'pixabay' && (
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handlePixabaySearch(searchQuery)}
                                        placeholder="Search stock photos..."
                                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-nobel-gold text-sm"
                                    />
                                </div>
                                <button
                                    onClick={() => handlePixabaySearch(searchQuery)}
                                    disabled={loading}
                                    className="px-4 py-2 bg-nobel-dark text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
                                >
                                    {loading ? 'Searching...' : 'Search'}
                                </button>
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-nobel-gold" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                                    {pixabayImages.map((url, index) => (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                onSelect(url, url);
                                                onClose();
                                            }}
                                            className="group relative aspect-video rounded-lg overflow-hidden border border-gray-100 hover:border-nobel-gold focus:outline-none bg-gray-50"
                                        >
                                            <img src={url} alt="Result" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                        </button>
                                    ))}
                                    {pixabayImages.length === 0 && (
                                        <div className="col-span-full text-center py-20 text-gray-400 text-sm">
                                            No images found. Try searching for something else.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- PROJECT FILES TAB --- */}
                    {activeTab === 'files' && (
                        <div className="h-full flex flex-col">
                            {!projectId ? (
                                <div className="flex flex-col items-center justify-center h-full text-stone-400">
                                    <FolderIcon className="w-12 h-12 mb-2 opacity-20" />
                                    <p>Select a project to browse files.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Breadcrumbs */}
                                    <div className="flex items-center gap-2 mb-4 text-sm overflow-x-auto pb-2">
                                        <button
                                            onClick={() => handleBreadcrumbClick(-1)}
                                            className={`hover:text-stone-900 transition-colors ${folderPath.length === 0 ? 'font-bold text-stone-900' : 'text-stone-500'}`}
                                        >
                                            Files
                                        </button>
                                        {folderPath.map((folder, index) => (
                                            <React.Fragment key={folder.id}>
                                                <ChevronRight className="w-4 h-4 text-stone-300 flex-shrink-0" />
                                                <button
                                                    onClick={() => handleBreadcrumbClick(index)}
                                                    className={`hover:text-stone-900 transition-colors whitespace-nowrap ${index === folderPath.length - 1 ? 'font-bold text-stone-900' : 'text-stone-500'}`}
                                                >
                                                    {folder.name}
                                                </button>
                                            </React.Fragment>
                                        ))}
                                    </div>

                                    {/* Grid */}
                                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {/* Folders */}
                                        {projectContent.folders?.map(folder => (
                                            <button
                                                key={folder._id}
                                                onClick={() => handleFolderClick(folder)}
                                                className="flex flex-col items-center p-4 border border-stone-100 rounded-xl hover:bg-stone-50 hover:border-stone-200 transition-all group"
                                            >
                                                <FolderIcon className="w-10 h-10 text-nobel-gold mb-2 group-hover:scale-110 transition-transform" />
                                                <span className="text-xs font-medium text-stone-700 truncate w-full text-center">{folder.name}</span>
                                            </button>
                                        ))}

                                        {/* Files - Filtered for Images */}
                                        {projectContent.files?.filter(f => f.type.startsWith('image/')).map(file => (
                                            <button
                                                key={file._id}
                                                onClick={() => {
                                                    if (file.url) {
                                                        onSelect(file.url, file.url);
                                                        onClose();
                                                    }
                                                }}
                                                className="group relative aspect-square rounded-xl overflow-hidden border border-stone-100 hover:border-nobel-gold focus:outline-none bg-stone-50"
                                            >
                                                {file.url ? (
                                                    <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <ImageIcon className="w-6 h-6 text-stone-300" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end p-2">
                                                    <span className="text-[10px] text-white font-medium truncate w-full bg-black/50 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {file.name}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {projectContent.folders?.length === 0 && projectContent.files?.filter(f => f.type.startsWith('image/')).length === 0 && (
                                        <div className="flex-1 flex flex-col items-center justify-center text-stone-400 py-12">
                                            <ImageIcon className="w-12 h-12 mb-3 opacity-20" />
                                            <p className="text-sm">No images found in this folder.</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* --- UPLOAD TAB --- */}
                    {activeTab === 'upload' && (
                        <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors relative group">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                <Upload className="w-8 h-8 text-nobel-gold" />
                            </div>
                            <h4 className="text-lg font-serif font-bold text-gray-800 mb-1">Upload Image</h4>
                            <p className="text-sm text-gray-500">Click to browse or drag and drop</p>
                            <p className="text-xs text-gray-400 mt-2 bg-white px-2 py-1 rounded border border-gray-200">Supports JPG, PNG, WEBP</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
