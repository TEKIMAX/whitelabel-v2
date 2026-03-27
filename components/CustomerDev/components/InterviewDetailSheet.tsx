import React, { useState } from 'react';
import { X, Video, FileText, Eye, ChevronDown, ChevronUp, FileQuestion } from 'lucide-react';
import MiniEditor from '../../editor/MiniEditor';

interface LinkedVideo {
    videoUrl?: string;
    waiverUrl?: string;
}

interface InterviewDetailSheetProps {
    interview: Record<string, any>;
    headers: string[];
    linkedVideo?: LinkedVideo | null;
    isUploading: boolean;
    onClose: () => void;
    onReplaceVideo: () => void;
    onReplaceWaiver: () => void;
}

export const InterviewDetailSheet: React.FC<InterviewDetailSheetProps> = ({
    interview,
    headers,
    linkedVideo,
    isUploading,
    onClose,
    onReplaceVideo,
    onReplaceWaiver
}) => {
    const [notesOpen, setNotesOpen] = useState(true);
    const [mediaOpen, setMediaOpen] = useState(false);

    const coreFields = ['Organization', 'Email', 'Industry', 'Pain Points', 'Survey Feedback', 'Willingness to Pay ($)'];
    const visibleFields = headers.filter(h =>
        h !== 'Status' && h !== 'Name' && h !== 'Role' && h !== 'Notes' && h !== 'Video' && h !== 'Waiver'
    );

    return (
        <>
            <div
                className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm z-40"
                onClick={onClose}
            />
            <div className="fixed inset-y-0 right-0 w-[40%] min-w-[420px] max-w-[640px] bg-white shadow-2xl border-l border-stone-200 z-50 flex flex-col">
                {/* Header */}
                <div className="px-8 py-6 border-b border-stone-200 flex justify-between items-start bg-[#F9F8F4] shrink-0">
                    <div>
                        <h3 className="font-serif text-2xl font-bold text-stone-900">{interview?.Name || 'Interview Details'}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            {interview?.Role && (
                                <span className="text-xs font-bold uppercase tracking-widest text-stone-500">{interview.Role}</span>
                            )}
                            {interview?.Organization && (
                                <>
                                    <span className="text-stone-300">•</span>
                                    <span className="text-xs text-stone-400">{interview.Organization}</span>
                                </>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-200 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-grow overflow-y-auto">
                    {/* Fields Grid */}
                    <div className="px-8 py-6 border-b border-stone-100">
                        <div className="grid grid-cols-2 gap-4">
                            {visibleFields.map(header => (
                                <div key={header} className={header === 'Pain Points' || header === 'Survey Feedback' ? 'col-span-2' : ''}>
                                    <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400 mb-1.5">
                                        {header}
                                    </label>
                                    <div className="text-sm text-stone-800 leading-relaxed bg-stone-50 p-3 rounded-lg border border-stone-100 min-h-[2.5rem]">
                                        {interview?.[header] || <span className="text-stone-300">—</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notes & Questions Accordion */}
                    <div className="border-b border-stone-100">
                        <button
                            onClick={() => setNotesOpen(!notesOpen)}
                            className="w-full px-8 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <FileQuestion className="w-4 h-4 text-stone-500" />
                                <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Interview Notes & Questions</span>
                                {interview?.Notes && (
                                    <span className="text-[10px] bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full font-medium">Has Content</span>
                                )}
                            </div>
                            {notesOpen ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                        </button>
                        {notesOpen && (
                            <div className="px-8 pb-6">
                                <div className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden [&_.ProseMirror]:text-sm [&_.ProseMirror]:leading-relaxed [&_.ProseMirror]:p-4 [&_.ProseMirror_h1]:text-lg [&_.ProseMirror_h1]:font-serif [&_.ProseMirror_h1]:mb-3 [&_.ProseMirror_h2]:text-base [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mt-5 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:border-b [&_.ProseMirror_h2]:border-stone-200 [&_.ProseMirror_h2]:pb-2 [&_.ProseMirror_h3]:text-sm [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mt-4 [&_.ProseMirror_h3]:mb-1 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-nobel-gold [&_.ProseMirror_blockquote]:bg-amber-50 [&_.ProseMirror_blockquote]:py-2 [&_.ProseMirror_blockquote]:px-3 [&_.ProseMirror_blockquote]:rounded-r-lg [&_.ProseMirror_blockquote]:text-xs [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:my-2 min-h-[120px] max-h-[400px] overflow-y-auto">
                                    <MiniEditor
                                        content={interview?.Notes || ''}
                                        onUpdate={() => { }}
                                        placeholder="No notes or questions recorded yet..."
                                        className="!border-none !bg-transparent"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Media Accordion */}
                    {linkedVideo && (
                        <div className="border-b border-stone-100">
                            <button
                                onClick={() => setMediaOpen(!mediaOpen)}
                                className="w-full px-8 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Video className="w-4 h-4 text-stone-500" />
                                    <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Video & Waiver</span>
                                    {(linkedVideo.videoUrl || linkedVideo.waiverUrl) && (
                                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Uploaded</span>
                                    )}
                                </div>
                                {mediaOpen ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                            </button>
                            {mediaOpen && (
                                <div className="px-8 pb-6 space-y-6">
                                    {/* Video */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Video Recording</span>
                                            <button
                                                disabled={isUploading}
                                                onClick={onReplaceVideo}
                                                className="text-[10px] font-bold uppercase tracking-widest text-nobel-gold hover:underline disabled:opacity-50"
                                            >
                                                {linkedVideo?.videoUrl ? 'Replace' : 'Upload'}
                                            </button>
                                        </div>
                                        {linkedVideo?.videoUrl ? (
                                            <div className="bg-black rounded-xl overflow-hidden shadow-lg aspect-video">
                                                <video src={linkedVideo.videoUrl} controls className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="bg-stone-50 rounded-xl h-24 flex items-center justify-center border border-stone-200 border-dashed text-stone-400 text-sm">
                                                No video uploaded
                                            </div>
                                        )}
                                    </div>
                                    {/* Waiver */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Signed Waiver</span>
                                            <button
                                                disabled={isUploading}
                                                onClick={onReplaceWaiver}
                                                className="text-[10px] font-bold uppercase tracking-widest text-nobel-gold hover:underline disabled:opacity-50"
                                            >
                                                {linkedVideo?.waiverUrl ? 'Replace' : 'Upload'}
                                            </button>
                                        </div>
                                        {linkedVideo?.waiverUrl ? (
                                            <>
                                                <div className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden h-48 shadow-inner">
                                                    <iframe src={linkedVideo.waiverUrl} className="w-full h-full" title="Waiver Preview" />
                                                </div>
                                                <a
                                                    href={linkedVideo.waiverUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-2 text-xs font-bold text-nobel-gold hover:underline flex items-center gap-1"
                                                >
                                                    <Eye className="w-3 h-3" /> Open in new tab
                                                </a>
                                            </>
                                        ) : (
                                            <div className="bg-stone-50 rounded-xl h-20 flex items-center justify-center border border-stone-200 border-dashed text-stone-400 text-sm">
                                                No waiver uploaded
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
