import React, { JSX } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronRight, Clock, MoreVertical } from 'lucide-react';
import { ViewState } from '../../types';

interface CalendarEvent {
    _id: string;
    title: string;
    start: number | string;
    type: string;
}

interface DailyScheduleProps {
    todayEvents: CalendarEvent[];
    onNavigate: (view: ViewState | string) => void;
    format: (date: Date, format: string) => string;
    getMeetingIcon: (type: string) => JSX.Element;
}

export const DailySchedule: React.FC<DailyScheduleProps> = ({
    todayEvents,
    onNavigate,
    format,
    getMeetingIcon
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col h-full"
        >
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-nobel-gold" />
                    <span className="text-sm font-bold text-stone-800">Today's Schedule</span>
                </div>
                <button
                    onClick={() => onNavigate('CALENDAR')}
                    className="bg-black text-white hover:bg-stone-800 rounded-full px-4 py-1 text-xs transition-all flex items-center gap-1 font-bold tracking-wide"
                >
                    View all <ChevronRight className="w-3 h-3" />
                </button>
            </div>
            <div className="space-y-3 flex-grow overflow-y-auto max-h-[300px] pr-2 scrollbar-hide">
                {todayEvents.length > 0 ? todayEvents.map((event) => {
                    const eventDate = new Date(event.start);
                    const isHappeningNow = Math.abs(Date.now() - eventDate.getTime()) < 1800000; // within 30m

                    return (
                        <div
                            key={event._id}
                            onClick={() => onNavigate('CALENDAR')}
                            className="flex items-center gap-4 p-3 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer group"
                        >
                            <div className={`p-2.5 rounded-xl ${isHappeningNow ? 'bg-red-50 text-red-500' : 'bg-stone-100 text-stone-500'}`}>
                                {getMeetingIcon(event.type)}
                            </div>
                            <div className="flex-grow">
                                <p className="font-medium text-stone-900 line-clamp-1">{event.title}</p>
                                <p className="text-xs text-stone-400 mt-0.5">{format(eventDate, 'h:mm a')}</p>
                            </div>
                            {isHappeningNow && (
                                <span className="text-[9px] font-bold uppercase tracking-wide bg-red-500 text-white px-2.5 py-1 rounded-full">Now</span>
                            )}
                            <div className="relative group/more">
                                <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-stone-200 rounded-md transition-all">
                                    <MoreVertical className="w-3.5 h-3.5 text-stone-400" />
                                </button>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-stone-400">
                        <Clock className="w-8 h-8 opacity-20 mb-2" />
                        <p className="text-xs italic">No items scheduled for today.</p>
                    </div>
                )}
            </div>
        </motion.div >
    );
};
