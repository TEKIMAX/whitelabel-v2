import React from 'react';
import { X } from 'lucide-react';

interface LinkedInterview {
    id: string;
    Name?: string;
    Role?: string;
}

interface AddVideoModalProps {
    isOpen: boolean;
    onClose: () => void;
    linkedInterviews: LinkedInterview[];
    name: string;
    email: string;
    linkedId: string;
    waiverFile: File | null;
    videoFile: File | null;
    onNameChange: (name: string) => void;
    onEmailChange: (email: string) => void;
    onLinkedIdChange: (id: string) => void;
    onWaiverChange: (file: File | null) => void;
    onVideoChange: (file: File | null) => void;
    onSubmit: (e: React.FormEvent) => void;
}

export const AddVideoModal: React.FC<AddVideoModalProps> = ({
    isOpen,
    onClose,
    linkedInterviews,
    name,
    email,
    linkedId,
    waiverFile,
    videoFile,
    onNameChange,
    onEmailChange,
    onLinkedIdChange,
    onWaiverChange,
    onVideoChange,
    onSubmit
}) => {
    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100]"
                onClick={onClose}
            />
            <div className="fixed top-0 right-0 h-full w-full max-w-xl bg-stone-900 border-l border-stone-800 overflow-hidden flex flex-col z-[110] shadow-2xl animate-in slide-in-from-right duration-300">
                <div className="px-8 py-6 border-b border-stone-800 flex items-center justify-between bg-stone-900/50 backdrop-blur-md">
                    <h3 className="text-2xl font-serif font-bold text-white">Add Video Interview</h3>
                    <button onClick={onClose} className="text-stone-400 hover:text-white transition-colors bg-stone-800/50 hover:bg-stone-800 p-2 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <form id="add-video-form" onSubmit={onSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => onNameChange(e.target.value)}
                                className="w-full pl-4 pr-4 py-2.5 border border-nobel-gold/40 bg-stone-900 rounded-lg text-sm text-white focus:outline-none focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold/40 transition-all font-bold placeholder-stone-600 shadow-inner"
                                placeholder="Interviewee Name"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => onEmailChange(e.target.value)}
                                className="w-full pl-4 pr-4 py-2.5 border border-nobel-gold/40 bg-stone-900 rounded-lg text-sm text-white focus:outline-none focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold/40 transition-all font-bold placeholder-stone-600 shadow-inner"
                                placeholder="interviewee@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Link to Interviewee (Optional)</label>
                            <div className="relative">
                                <select
                                    value={linkedId}
                                    onChange={(e) => onLinkedIdChange(e.target.value)}
                                    className="w-full pl-4 pr-4 py-2.5 border border-nobel-gold/40 bg-stone-900 rounded-lg text-sm text-white focus:outline-none focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold/40 transition-all font-bold placeholder-stone-600 shadow-inner appearance-none cursor-pointer"
                                >
                                    <option value="" className="bg-stone-800">Select Interviewee...</option>
                                    {linkedInterviews.map(ci => (
                                        <option key={ci.id} value={ci.id} className="bg-stone-800">{ci.Name || 'Unnamed'} ({ci.Role || 'No Role'})</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-stone-400">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Signed Waiver (PDF)</label>
                            <input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={(e) => onWaiverChange(e.target.files?.[0] || null)}
                                className="w-full text-sm text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-stone-800 file:text-white hover:file:bg-stone-700 cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Video Recording</label>
                            <input
                                type="file"
                                accept="video/*"
                                onChange={(e) => onVideoChange(e.target.files?.[0] || null)}
                                className="w-full text-sm text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-stone-800 file:text-white hover:file:bg-stone-700 cursor-pointer"
                            />
                        </div>
                    </form>
                </div>
                <div className="p-6 border-t border-stone-800 bg-stone-900/50 backdrop-blur-md flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 text-stone-400 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors rounded-lg hover:bg-stone-800"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="add-video-form"
                        className="px-8 py-3 bg-nobel-gold text-stone-900 hover:bg-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-xl transition-all"
                    >
                        Save Interview
                    </button>
                </div>
            </div>
        </>
    );
};
