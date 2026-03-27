import React from 'react';
import { Folder as FolderIcon, Trash2, Check, X, Folder, Link2 } from 'lucide-react';
import { getFileIcon, formatSize } from './utils';
import { Folder as FolderDoc, File as FileDoc } from '../../types';

interface FileGridProps {
    folders: FolderDoc[];
    files: FileDoc[];
    onFolderClick: (folder: FolderDoc) => void;
    onFileClick: (file: FileDoc) => void;
    selectedFile: FileDoc | null;
    handleDragOver: (e: React.DragEvent) => void;
    handleDropOnFolder: (e: React.DragEvent, folderId: string) => void;
    handleDragStart: (e: React.DragEvent, fileId: string) => void;
    setDeleteConfirm: (item: { type: 'folder' | 'file'; id: string; name: string }) => void;
    canDelete: boolean;
    isCreatingFolder: boolean;
    setIsCreatingFolder: (isCreating: boolean) => void;
    newFolderName: string;
    setNewFolderName: (name: string) => void;
    newFolderTags: string;
    setNewFolderTags: (tags: string) => void;
    handleCreateFolder: () => void;
    canCreate: boolean;
    sharedStorageIds?: Set<string>;
}

export const FileGrid: React.FC<FileGridProps> = ({
    folders,
    files,
    onFolderClick,
    onFileClick,
    selectedFile,
    handleDragOver,
    handleDropOnFolder,
    handleDragStart,
    setDeleteConfirm,
    canDelete,
    isCreatingFolder,
    setIsCreatingFolder,
    newFolderName,
    setNewFolderName,
    newFolderTags,
    setNewFolderTags,
    handleCreateFolder,
    canCreate,
    sharedStorageIds = new Set()
}) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {/* New Folder Input */}
            {isCreatingFolder && (
                <div className="mb-4 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 bg-white p-2 rounded-lg border border-stone-200 shadow-sm w-fit col-span-full md:col-span-1">
                    <FolderIcon className="w-6 h-6 text-stone-300" />
                    <div className="flex flex-col gap-1">
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                            placeholder="Folder Name"
                            autoFocus
                            disabled={!canCreate}
                            className="px-2 py-1 bg-transparent border-b border-stone-200 text-sm focus:border-nobel-gold outline-none"
                        />
                        <input
                            type="text"
                            value={newFolderTags}
                            onChange={(e) => setNewFolderTags(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                            placeholder="Tags (comma separated)"
                            className="px-2 py-1 bg-transparent text-xs text-stone-500 outline-none"
                        />
                    </div>
                    <button onClick={handleCreateFolder} className="p-1 hover:text-green-600"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setIsCreatingFolder(false)} className="p-1 hover:text-red-600"><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Folders */}
            {folders.map(folder => (
                <div
                    key={folder._id}
                    onClick={() => onFolderClick(folder)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnFolder(e, folder._id)}
                    className="group p-4 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-all cursor-pointer relative"
                >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canDelete && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'folder', id: folder._id, name: folder.name }); }}
                                className="p-1 hover:bg-stone-200 rounded text-stone-400 hover:text-red-500 transition-colors"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                    <FolderIcon className="w-8 h-8 text-nobel-gold mb-3" />
                    <h3 className="font-medium text-sm text-stone-900 truncate">{folder.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-2">
                        {folder.tags?.map((tag, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 text-[10px] rounded-full text-white" style={{ backgroundColor: tag.color }}>
                                {tag.name}
                            </span>
                        ))}
                    </div>
                    <p className="text-[10px] text-stone-400 mt-2">{new Date(folder.createdAt).toLocaleDateString()}</p>
                </div>
            ))}

            {/* Files */}
            {files.map(file => (
                <div
                    key={file._id}
                    onClick={() => onFileClick(file)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, file._id)}
                    className={`group p-4 bg-white border rounded-xl hover:bg-stone-50 transition-all cursor-pointer relative ${selectedFile?._id === file._id ? 'border-nobel-gold ring-1 ring-nobel-gold bg-stone-50' : 'border-stone-200'}`}
                >
                    {/* Shared Badge */}
                    {sharedStorageIds.has(file.storageId) && (
                        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-1.5 py-0.5 bg-teal-500 text-white rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm">
                            <Link2 className="w-2.5 h-2.5" />
                            Shared
                        </div>
                    )}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        {canDelete && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'file', id: file._id, name: file.name }); }}
                                className="p-1 hover:bg-stone-100 rounded text-stone-400 hover:text-red-500"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                    {file.type.startsWith('image/') && file.url ? (
                        <div className="w-full aspect-[4/3] rounded-lg overflow-hidden mb-3 bg-stone-100">
                            <img
                                src={file.url}
                                alt={file.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                        </div>
                    ) : (
                        <div className="mb-3">
                            {getFileIcon(file.type)}
                        </div>
                    )}
                    <h3 className="font-medium text-sm text-stone-900 truncate" title={file.name}>{file.name}</h3>
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-stone-400">{formatSize(file.size)}</p>
                        <p className="text-[10px] text-stone-300 uppercase">{file.type.split('/')[1]}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};
