import React from 'react';
import { X, Download, Globe, Clock, Monitor } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface ShareAnalyticsSheetProps {
    storageId: string;
    fileName: string;
    isOpen: boolean;
    onClose: () => void;
}

export const ShareAnalyticsSheet: React.FC<ShareAnalyticsSheetProps> = ({
    storageId, fileName, isOpen, onClose
}) => {
    const events = useQuery(
        api.filesControl.getDownloadAnalytics,
        isOpen ? { storageId: storageId as any } : "skip"
    ) || [];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />
            <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                    <div>
                        <h2 className="text-lg font-bold text-stone-900">Download Analytics</h2>
                        <p className="text-xs text-stone-500 mt-0.5 truncate">{fileName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Stats Summary */}
                <div className="p-5 border-b border-stone-100 grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-stone-900">{events.length}</div>
                        <div className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">Total Downloads</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-stone-900">
                            {new Set(events.map(e => e.ipAddress).filter(Boolean)).size}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">Unique IPs</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-stone-900">
                            {events.length > 0
                                ? new Date(events[0].downloadedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                                : '—'
                            }
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">Last Download</div>
                    </div>
                </div>

                {/* Events List */}
                <div className="flex-1 overflow-y-auto p-5">
                    {events.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-stone-400">
                            <Download size={32} className="mb-3 opacity-50" />
                            <p className="text-sm font-medium">No downloads yet</p>
                            <p className="text-xs">Downloads will appear here once the link is used</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {events.map((event, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-stone-50 border border-stone-100">
                                    <div className="p-1.5 bg-teal-100 rounded-md mt-0.5">
                                        <Download size={12} className="text-teal-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 text-xs text-stone-700">
                                            <Clock size={10} className="text-stone-400 shrink-0" />
                                            <span>{new Date(event.downloadedAt).toLocaleString()}</span>
                                        </div>
                                        {event.ipAddress && (
                                            <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                                                <Globe size={10} className="text-stone-400 shrink-0" />
                                                <span className="font-mono text-[10px]">{event.ipAddress}</span>
                                            </div>
                                        )}
                                        {event.userAgent && (
                                            <div className="flex items-center gap-2 text-xs text-stone-400 mt-1 truncate">
                                                <Monitor size={10} className="shrink-0" />
                                                <span className="truncate text-[10px]">{event.userAgent.substring(0, 80)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
