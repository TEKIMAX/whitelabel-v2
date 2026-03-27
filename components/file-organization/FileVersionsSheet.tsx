import React from 'react';
import { X, History, Download, Clock, User } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface FileVersionsSheetProps {
    fileId: string;
    fileName: string;
    isOpen: boolean;
    onClose: () => void;
}

export const FileVersionsSheet: React.FC<FileVersionsSheetProps> = ({
    fileId, fileName, isOpen, onClose
}) => {
    const versions = useQuery(
        api.files.getFileVersions,
        isOpen ? { fileId: fileId as any } : "skip"
    ) || [];

    if (!isOpen) return null;

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />
            <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                    <div>
                        <h2 className="text-lg font-bold text-stone-900">Version History</h2>
                        <p className="text-xs text-stone-500 mt-0.5 truncate">{fileName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Current Version */}
                <div className="p-5 border-b border-stone-100">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-teal-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-teal-600">Current Version</span>
                    </div>
                    <p className="text-sm text-stone-700 font-medium">{fileName}</p>
                </div>

                {/* Previous Versions */}
                <div className="flex-1 overflow-y-auto p-5">
                    {versions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-stone-400">
                            <History size={32} className="mb-3 opacity-50" />
                            <p className="text-sm font-medium">No previous versions</p>
                            <p className="text-xs text-center">When a file is re-uploaded, previous versions will be saved here</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {versions.map((version, i) => (
                                <div key={version._id} className="flex items-center gap-3 p-3 rounded-lg bg-stone-50 border border-stone-100">
                                    <div className="p-1.5 bg-stone-200 rounded-md">
                                        <History size={12} className="text-stone-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-stone-700 truncate">{version.name}</p>
                                        <div className="flex items-center gap-3 mt-1 text-[10px] text-stone-400">
                                            <span className="flex items-center gap-1">
                                                <Clock size={9} /> {new Date(version.createdAt).toLocaleDateString()}
                                            </span>
                                            <span>{formatSize(version.size)}</span>
                                            <span className="flex items-center gap-1">
                                                <User size={9} /> v{versions.length - i}
                                            </span>
                                        </div>
                                    </div>
                                    <button className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors" title="Download this version">
                                        <Download size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
