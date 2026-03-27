import React, { useRef, useState } from 'react';
import { Upload, X, Plus, Check, CloudUpload, FileText, Image, Film, Music, Archive, File } from 'lucide-react';
import { formatSize } from './utils';
import { toast } from "sonner";

interface UploadQueueItem {
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'done' | 'error';
    tags: { name: string; color: string }[];
}

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    uploadQueue: UploadQueueItem[];
    setUploadQueue: React.Dispatch<React.SetStateAction<UploadQueueItem[]>>;
    handleUploadAll: () => void;
    handleFilesSelected: (files: FileList | null) => void;
    updateItemTags: (file: File, newTags: { name: string, color: string }[]) => void;
    removeQueueItem: (file: File) => void;
}

function getModernFileIcon(type: string) {
    if (type.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (type.startsWith('video/')) return <Film className="w-5 h-5" />;
    if (type.startsWith('audio/')) return <Music className="w-5 h-5" />;
    if (type.includes('pdf') || type.includes('document') || type.includes('text')) return <FileText className="w-5 h-5" />;
    if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return <Archive className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
}

function getIconBg(type: string) {
    if (type.startsWith('image/')) return 'bg-violet-100 text-violet-600';
    if (type.startsWith('video/')) return 'bg-rose-100 text-rose-600';
    if (type.startsWith('audio/')) return 'bg-amber-100 text-amber-600';
    if (type.includes('pdf')) return 'bg-red-100 text-red-600';
    if (type.includes('document') || type.includes('text')) return 'bg-blue-100 text-blue-600';
    if (type.includes('zip') || type.includes('rar')) return 'bg-stone-200 text-stone-600';
    return 'bg-stone-100 text-stone-500';
}

function getStatusColor(status: string) {
    if (status === 'done') return 'bg-emerald-500';
    if (status === 'error') return 'bg-red-500';
    if (status === 'uploading') return 'bg-nobel-gold';
    return 'bg-stone-200';
}

const TAG_COLORS = [
    '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6B7280',
];

export const UploadModal: React.FC<UploadModalProps> = ({
    isOpen,
    onClose,
    uploadQueue,
    setUploadQueue,
    handleUploadAll,
    handleFilesSelected,
    updateItemTags,
    removeQueueItem
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTagPopover, setActiveTagPopover] = useState<number | null>(null);
    const [tagInput, setTagInput] = useState('');
    const [tagError, setTagError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    if (!isOpen) return null;

    const pendingCount = uploadQueue.filter(u => u.status === 'pending').length;
    const doneCount = uploadQueue.filter(u => u.status === 'done').length;
    const isUploading = uploadQueue.some(u => u.status === 'uploading');
    const allDone = uploadQueue.length > 0 && uploadQueue.every(u => u.status === 'done');

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="px-8 pt-7 pb-5 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-stone-900 tracking-tight">Upload Files</h2>
                        <p className="text-xs text-stone-400 mt-1">
                            {uploadQueue.length === 0
                                ? 'Drag files or browse to get started'
                                : `${uploadQueue.length} file${uploadQueue.length !== 1 ? 's' : ''} selected${doneCount > 0 ? ` · ${doneCount} uploaded` : ''}`
                            }
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 -mt-1 rounded-xl text-stone-300 hover:text-stone-600 hover:bg-stone-100 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto px-8 pb-6">

                    {/* Drop Zone */}
                    <div
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFilesSelected(e.dataTransfer.files); }}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 mb-6 group
                            ${isDragOver
                                ? 'bg-nobel-gold/5 border-2 border-nobel-gold/50 shadow-lg shadow-nobel-gold/10'
                                : 'bg-stone-50 border-2 border-dashed border-stone-200 hover:border-stone-300 hover:bg-stone-100/50'
                            }`}
                    >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300
                            ${isDragOver
                                ? 'bg-nobel-gold/10 text-nobel-gold scale-110'
                                : 'bg-white text-stone-400 shadow-sm group-hover:shadow-md group-hover:text-stone-600 group-hover:scale-105'
                            }`}
                        >
                            <CloudUpload className="w-7 h-7" />
                        </div>
                        <p className="text-sm font-semibold text-stone-700 mb-1">
                            {isDragOver ? 'Drop files here' : 'Drop files or click to browse'}
                        </p>
                        <p className="text-xs text-stone-400">
                            PDF, images, documents, and more
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => handleFilesSelected(e.target.files)}
                        />
                    </div>

                    {/* File Queue */}
                    {uploadQueue.length > 0 && (
                        <div className="space-y-3">
                            {uploadQueue.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200
                                        ${item.status === 'done'
                                            ? 'bg-emerald-50/50 border-emerald-100'
                                            : item.status === 'error'
                                                ? 'bg-red-50/50 border-red-100'
                                                : 'bg-white border-stone-100 hover:border-stone-200 hover:shadow-sm'
                                        }`}
                                >
                                    {/* Thumbnail / File Type Icon */}
                                    {item.file.type.startsWith('image/') ? (
                                        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-stone-100 shadow-sm">
                                            <img
                                                src={URL.createObjectURL(item.file)}
                                                alt={item.file.name}
                                                className="w-full h-full object-cover"
                                                onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                                            />
                                        </div>
                                    ) : (
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${getIconBg(item.file.type)}`}>
                                            {getModernFileIcon(item.file.type)}
                                        </div>
                                    )}

                                    {/* File Info */}
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-sm text-stone-800 truncate">{item.file.name}</h4>
                                            {item.status === 'done' && <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                                            {item.status === 'error' && <span className="text-[10px] font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded-full flex-shrink-0">Failed</span>}
                                        </div>
                                        <p className="text-[11px] text-stone-400 mb-2">{formatSize(item.file.size)}</p>

                                        {/* Progress */}
                                        {(item.status === 'uploading' || item.status === 'pending') && (
                                            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ease-out ${getStatusColor(item.status)}`}
                                                    style={{ width: `${item.status === 'pending' ? 0 : item.progress}%` }}
                                                />
                                            </div>
                                        )}

                                        {/* Tags */}
                                        <div className="flex flex-wrap gap-1.5 items-center mt-2">
                                            {item.tags.map((tag, tIdx) => (
                                                <span
                                                    key={tIdx}
                                                    className="pl-2.5 pr-1.5 py-0.5 rounded-full text-[10px] font-semibold text-white flex items-center gap-1 shadow-sm"
                                                    style={{ backgroundColor: tag.color }}
                                                >
                                                    {tag.name}
                                                    <button
                                                        onClick={() => updateItemTags(item.file, item.tags.filter((_, i) => i !== tIdx))}
                                                        className="hover:text-white/70 transition-colors ml-0.5"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                            <div className="relative">
                                                <button
                                                    onClick={() => {
                                                        if (activeTagPopover === idx) {
                                                            setActiveTagPopover(null);
                                                        } else {
                                                            setActiveTagPopover(idx);
                                                            setTagInput('');
                                                        }
                                                    }}
                                                    className={`text-[10px] font-semibold flex items-center gap-1 px-2.5 py-1 rounded-full transition-all
                                                        ${activeTagPopover === idx
                                                            ? 'bg-stone-200 text-stone-700'
                                                            : 'bg-stone-100 text-stone-400 hover:bg-stone-200 hover:text-stone-600'
                                                        }`}
                                                >
                                                    <Plus className="w-3 h-3" /> Tag
                                                </button>

                                                {/* Tag Picker Popover */}
                                                {activeTagPopover === idx && (
                                                    <div className="absolute top-full left-0 mt-2 bg-white border border-stone-150 rounded-2xl shadow-2xl p-4 z-50 w-56 animate-in fade-in zoom-in-95 duration-200">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Add Tag</span>
                                                            <button onClick={() => { setActiveTagPopover(null); setTagError(null); }} className="text-stone-300 hover:text-stone-500 transition-colors">
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>

                                                        <input
                                                            type="text"
                                                            value={tagInput}
                                                            onChange={(e) => { setTagInput(e.target.value); setTagError(null); }}
                                                            placeholder="Tag name..."
                                                            className={`w-full px-3.5 py-2.5 bg-stone-50 border rounded-xl text-sm outline-none transition-all
                                                                ${tagError ? 'border-red-200 focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'border-stone-200 focus:border-nobel-gold focus:ring-2 focus:ring-nobel-gold/10'}`}
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && tagInput.trim()) {
                                                                    updateItemTags(item.file, [...item.tags, { name: tagInput.trim(), color: TAG_COLORS[0] }]);
                                                                    setTagInput('');
                                                                    setTagError(null);
                                                                    setActiveTagPopover(null);
                                                                }
                                                            }}
                                                        />

                                                        {tagError && (
                                                            <p className="text-[10px] text-red-500 font-medium mt-2">{tagError}</p>
                                                        )}

                                                        <p className="text-[10px] text-stone-400 mt-3 mb-2">Pick a color</p>
                                                        <div className="flex gap-2">
                                                            {TAG_COLORS.map(color => (
                                                                <button
                                                                    key={color}
                                                                    className="w-7 h-7 rounded-full hover:scale-110 active:scale-95 transition-transform ring-2 ring-transparent hover:ring-stone-200 shadow-sm"
                                                                    style={{ backgroundColor: color }}
                                                                    onClick={() => {
                                                                        if (!tagInput.trim()) {
                                                                            setTagError("Enter a name first");
                                                                            return;
                                                                        }
                                                                        updateItemTags(item.file, [...item.tags, { name: tagInput.trim(), color }]);
                                                                        setTagInput('');
                                                                        setTagError(null);
                                                                        setActiveTagPopover(null);
                                                                    }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                        onClick={() => removeQueueItem(item.file)}
                                        className="p-2 rounded-xl text-stone-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between">
                    <p className="text-[11px] text-stone-400">
                        {isUploading && `Uploading ${uploadQueue.filter(u => u.status === 'uploading').length} file${uploadQueue.filter(u => u.status === 'uploading').length !== 1 ? 's' : ''}...`}
                        {allDone && '✓ All files uploaded successfully'}
                        {!isUploading && !allDone && uploadQueue.length > 0 && `${pendingCount} file${pendingCount !== 1 ? 's' : ''} ready`}
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-sm font-medium text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition-all"
                        >
                            {allDone ? 'Done' : 'Cancel'}
                        </button>
                        {!allDone && (
                            <button
                                onClick={handleUploadAll}
                                disabled={uploadQueue.length === 0 || isUploading}
                                className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-stone-900 text-white hover:bg-nobel-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.98] flex items-center gap-2"
                            >
                                <Upload className="w-4 h-4" />
                                {isUploading ? 'Uploading...' : 'Upload'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
