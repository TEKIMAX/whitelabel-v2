import React from 'react';
import { Folder as FolderIcon, Upload } from 'lucide-react';

interface EmptyStateProps {
    canCreate: boolean;
    setUploadModalOpen: (open: boolean) => void;
    setIsCreatingFolder: (creating: boolean) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    canCreate,
    setUploadModalOpen,
    setIsCreatingFolder
}) => {
    return (
        <div className="grid md:grid-cols-2 gap-12 items-center justify-center min-h-[400px] animate-in fade-in zoom-in-95 duration-500 p-8">
            <div className="flex flex-col items-start text-left">
                <div className="relative mb-6 group">
                    <div className="absolute inset-0 bg-nobel-gold rounded-full blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                    <div className="relative w-20 h-20 bg-white border-2 border-stone-100 rounded-2xl shadow-lg flex items-center justify-center transform group-hover:-translate-y-1 transition-transform duration-300">
                        <FolderIcon className="w-8 h-8 text-nobel-gold" />
                        <div className="absolute -bottom-2 -right-2 bg-stone-900 rounded-full p-1.5 shadow-lg">
                            <Upload className="w-3 h-3 text-white" />
                        </div>
                    </div>
                </div>
                {/* Removed font-serif to match user request */}
                <h3 className="text-3xl font-bold text-stone-900 mb-4">No files yet</h3>
                <p className="text-stone-500 max-w-md mb-8 leading-relaxed text-lg">
                    Upload documents, images, or media to keep your project organized. You can drag & drop files here anytime.
                </p>
                <div className="flex items-center gap-3">
                    {canCreate && (
                        <>
                            <button
                                onClick={() => setUploadModalOpen(true)}
                                className="px-6 py-3 bg-stone-900 text-white rounded-full font-bold uppercase tracking-wider text-xs hover:bg-nobel-gold transition-colors shadow-lg hover:shadow-xl"
                            >
                                Upload First File
                            </button>
                            <button
                                onClick={() => setIsCreatingFolder(true)}
                                className="px-6 py-3 bg-white border border-stone-200 text-stone-600 rounded-full font-bold uppercase tracking-wider text-xs hover:bg-stone-50 transition-colors"
                            >
                                Create Folder
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="relative hidden md:block">
                <div className="absolute inset-0 bg-stone-900/5 blur-3xl transform rotate-6 rounded-full"></div>
                <img
                    src="/images/ManTypingbyWindow.png"
                    alt="Empty State"
                    className="relative w-full h-auto rounded-2xl border-8 border-white shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500 object-cover aspect-[4/3]"
                />
            </div>
        </div>
    );
};
