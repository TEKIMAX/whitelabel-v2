import React from 'react';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { timeAgo } from './utils';

interface NotificationPanelProps {
    notifications: any[];
    onMarkAllRead: () => void;
    onNotificationClick: (n: any) => void;
    onViewTimeline: () => void;
    onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
    notifications,
    onMarkAllRead,
    onNotificationClick,
    onViewTimeline,
    onClose
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-3 w-80 bg-white border border-stone-200 rounded-2xl shadow-2xl z-[100] overflow-hidden"
        >
            <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
                <h4 className="text-xs font-bold uppercase tracking-widest text-stone-900">Activity Log</h4>
                <button
                    onClick={onMarkAllRead}
                    className="text-[10px] text-nobel-gold font-bold hover:underline"
                >
                    Mark all read
                </button>
            </div>
            <div className="max-h-[350px] overflow-y-auto">
                {notifications && notifications.length > 0 ? (
                    notifications.map(n => (
                        <div
                            key={n._id}
                            onClick={() => onNotificationClick(n)}
                            className={`px-5 py-4 hover:bg-stone-50 border-b border-stone-50 last:border-0 cursor-pointer transition-colors group ${n.isRead ? 'opacity-50' : ''}`}
                        >
                            <div className="flex gap-3">
                                <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center text-stone-600 shadow-sm group-hover:scale-110 transition-transform`}>
                                    <Bell className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-grow">
                                    <div className="flex justify-between items-start mb-1">
                                        <h5 className={`text-[13px] font-bold text-stone-900 ${n.isRead ? 'line-through text-stone-400' : ''}`}>{n.title}</h5>
                                        <span className="text-[10px] text-stone-400 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                                    </div>
                                    <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">{n.description}</p>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-8 text-center text-stone-400 text-xs italic">
                        No recent activity found.
                    </div>
                )}
            </div>
            <div className="px-5 py-3 bg-stone-50 text-center">
                <button
                    onClick={() => { onClose(); onViewTimeline(); }}
                    className="text-[11px] font-bold uppercase tracking-widest text-stone-500 hover:text-stone-900 transition-colors"
                >
                    View Timeline
                </button>
            </div>
        </motion.div>
    );
};
