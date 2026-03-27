import React from 'react';
import { Trash2, Folder as FolderIcon, File as FileIcon } from 'lucide-react';

interface DeleteConfirmDialogProps {
    item: { type: 'folder' | 'file'; id: string; name: string } | null;
    onClose: () => void;
    onConfirm: () => void;
    folderContents: { folders: any[]; files: any[] };
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
    item,
    onClose,
    onConfirm,
    folderContents
}) => {
    if (!item) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-stone-100 bg-[#F9F8F4]">
                    {/* Removed font-serif to match user request */}
                    <h2 className="text-xl text-stone-900 font-bold">Delete {item.type === 'folder' ? 'Folder' : 'File'}?</h2>
                </div>

                <div className="p-6">
                    <p className="text-stone-600 mb-4">
                        Are you sure you want to delete <span className="font-bold text-stone-900">{item.name}</span>?
                    </p>

                    {item.type === 'folder' && (folderContents.folders.length > 0 || folderContents.files.length > 0) && (
                        <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-4">
                            <p className="text-red-800 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Trash2 className="w-3 h-3" /> Warning: Cascading Delete
                            </p>
                            <p className="text-sm text-red-700 mb-2">This will also permanently delete the following items:</p>
                            <div className="max-h-32 overflow-y-auto space-y-1 pl-2 border-l-2 border-red-200">
                                {folderContents.folders.map(f => (
                                    <div key={f._id} className="flex items-center gap-2 text-xs text-red-600">
                                        <FolderIcon className="w-3 h-3" /> {f.name}
                                    </div>
                                ))}
                                {folderContents.files.map(f => (
                                    <div key={f._id} className="flex items-center gap-2 text-xs text-red-600">
                                        <FileIcon className="w-3 h-3" /> {f.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <p className="text-xs text-stone-400">This action cannot be undone.</p>
                </div>

                <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-red-500 hover:bg-red-600 shadow-sm transition-colors flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" /> Delete Forever
                    </button>
                </div>
            </div>
        </div>
    );
};
