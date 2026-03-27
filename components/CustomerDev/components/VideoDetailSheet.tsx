import React from 'react';
import { X, Video, FileText, Eye, Trash2 } from 'lucide-react';

interface VideoDetailSheetProps {
    interview: {
        name: string;
        email: string;
        videoUrl?: string;
        waiverUrl?: string;
        _id: string;
    };
    canEdit: boolean;
    onClose: () => void;
    onDelete: () => void;
}

export const VideoDetailSheet: React.FC<VideoDetailSheetProps> = ({
    interview,
    canEdit,
    onClose,
    onDelete
}) => {
    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-stone-200 transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) z-40 overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-stone-100 flex justify-between items-start bg-[#F9F8F4]">
                <div>
                    <h3 className="font-serif text-xl font-bold text-stone-900 mb-1">{interview.name}</h3>
                    <p className="text-xs text-stone-500 uppercase tracking-widest">{interview.email}</p>
                </div>
                <div className="flex gap-2">
                    {canEdit && (
                        <button
                            onClick={onDelete}
                            className="text-stone-400 hover:text-red-500 transition-colors p-1"
                            title="Delete Interview"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-900 p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-8">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Video className="w-4 h-4 text-stone-900" />
                        <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Interview Recording</span>
                    </div>
                    {interview.videoUrl ? (
                        <div className="bg-black rounded-xl overflow-hidden shadow-lg aspect-video flex items-center justify-center relative group">
                            <video
                                src={interview.videoUrl}
                                controls
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ) : (
                        <div className="bg-stone-100 rounded-xl aspect-video flex items-center justify-center text-stone-400 text-sm italic border border-stone-200 border-dashed">
                            No video uploaded
                        </div>
                    )}
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-stone-900" />
                        <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Signed Waiver</span>
                    </div>
                    {interview.waiverUrl ? (
                        <>
                            <div className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden h-96 shadow-inner">
                                <iframe
                                    src={interview.waiverUrl}
                                    className="w-full h-full"
                                    title="Waiver Preview"
                                />
                            </div>
                            <a
                                href={interview.waiverUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 text-xs font-bold text-nobel-gold hover:underline flex items-center gap-1"
                            >
                                <Eye className="w-3 h-3" /> Open in new tab
                            </a>
                        </>
                    ) : (
                        <div className="bg-stone-100 rounded-xl h-32 flex items-center justify-center text-stone-400 text-sm italic border border-stone-200 border-dashed">
                            No waiver uploaded
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
