'use client';

import React, { useState, useMemo } from 'react';
import { useMutation, useQuery, usePaginatedQuery } from 'convex/react';
import { api } from "../convex/_generated/api";
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell, CheckCheck, Filter, Calendar as CalendarIcon,
    ChevronLeft, ChevronRight, Sparkles, Target,
    Users, AlertCircle, Clock, Trash2, MailOpen
} from 'lucide-react';
import { format, getMonth, getYear, isSameMonth, isSameYear } from 'date-fns';
import { Logo } from './Logo';
import DotPatternBackground from './DotPatternBackground';
import TabNavigation from './TabNavigation';

interface NotificationsProps {
    data: any;
    onNavigate: (view: any) => void;
    currentView: any;
    allowedPages?: string[];
}

export const NotificationsCenter: React.FC<NotificationsProps> = ({
    data,
    onNavigate,
    currentView,
    allowedPages
}) => {
    const [filterMonth, setFilterMonth] = useState<number | 'all'>('all');
    const [filterYear, setFilterYear] = useState<number | 'all'>('all');

    // Paginated Query
    const { results: notifications, status, loadMore } = usePaginatedQuery(
        api.notifications.getNotifications,
        { projectId: data.id as any },
        { initialNumItems: 15 }
    );

    const markAsRead = useMutation(api.notifications.markAsRead);
    const markAllAsRead = useMutation(api.notifications.markAllAsRead);

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return [currentYear, currentYear - 1];
    }, []);

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const filteredNotifications = useMemo(() => {
        if (!notifications) return [];
        return notifications.filter(n => {
            const date = new Date(n.createdAt);
            const monthMatch = filterMonth === 'all' || date.getMonth() === filterMonth;
            const yearMatch = filterYear === 'all' || date.getFullYear() === filterYear;
            return monthMatch && yearMatch;
        });
    }, [notifications, filterMonth, filterYear]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'AI': return <Sparkles className="w-4 h-4" />;
            case 'GOAL': return <Target className="w-4 h-4" />;
            case 'TEAM': return <Users className="w-4 h-4" />;
            case 'SYSTEM': return <AlertCircle className="w-4 h-4" />;
            default: return <Bell className="w-4 h-4" />;
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'AI': return 'text-nobel-gold bg-nobel-gold/10';
            case 'GOAL': return 'text-emerald-500 bg-emerald-500/10';
            case 'TEAM': return 'text-blue-500 bg-blue-500/10';
            case 'SYSTEM': return 'text-red-500 bg-red-500/10';
            default: return 'text-stone-500 bg-stone-100';
        }
    };

    return (
        <div className="h-screen flex bg-nobel-cream relative overflow-hidden">
            {/* LEFT SIDE: DECORATIVE PANEL */}
            <div className="w-[25%] h-full relative overflow-hidden bg-stone-900 border-r border-stone-200 shadow-2xl z-20">
                <img
                    src="/images/milad-fakurian-F4qy_1tAFfs-unsplash.jpg"
                    className="absolute inset-0 w-full h-full object-cover opacity-30 brightness-50"
                    alt="Notifications"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-stone-900/60 via-stone-900/40 to-stone-900/90" />

                <div className="absolute top-12 left-12 z-30">
                    <Logo imageClassName="h-10 w-auto brightness-0 invert" />
                </div>

                <div className="absolute inset-x-0 bottom-0 p-12 space-y-8">
                    <div className="space-y-4">
                        <h2 className="text-white text-4xl font-serif font-bold leading-tight">
                            Activity<br />
                            <span className="text-nobel-gold italic">Timeline.</span>
                        </h2>
                        <div className="h-1 w-12 bg-nobel-gold/50 rounded-full" />
                        <p className="text-stone-400 text-sm leading-relaxed">
                            A permanent record of your venture's evolution and AI-driven insights.
                        </p>
                    </div>

                    <div className="pt-8 border-t border-white/10 space-y-4">
                        <div className="flex items-center gap-3 text-stone-300">
                            <Clock className="w-5 h-5 text-nobel-gold" />
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest">Logged Activity</p>
                                <p className="text-xl font-serif text-white">{notifications?.length || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE: NOTIFICATION CENTER */}
            <div className="w-[75%] h-full flex flex-col relative z-10">
                <DotPatternBackground color="#a8a29e" />

                <header className="px-10 py-4 flex items-center justify-between relative z-30 bg-white/80 backdrop-blur-sm border-b border-stone-200">
                    <div className="flex items-center gap-6">
                        <Logo imageClassName="h-8 w-auto" />
                        <div className="w-px h-6 bg-stone-200" />
                        <TabNavigation
                            currentView={currentView}
                            onNavigate={onNavigate}
                            allowedPages={allowedPages}
                            projectFeatures={{
                                canvasEnabled: data.canvasEnabled,
                                marketResearchEnabled: data.marketResearchEnabled
                            }}
                            mode="light"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => markAllAsRead({ projectId: data.id })}
                            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-stone-800 transition-all hover:scale-105"
                        >
                            <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
                        </button>
                    </div>
                </header>

                <main className="flex-grow flex flex-col px-12 py-10 overflow-y-auto relative z-10 content-scrollbar">
                    <div className="max-w-4xl mx-auto w-full mb-10">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-3xl font-serif text-stone-900 mb-2">Notification Center</h1>
                                <p className="text-stone-500">Track milestones and strategic updates.</p>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-xl shadow-sm">
                                    <Filter className="w-3.5 h-3.5 text-stone-400" />
                                    <select
                                        value={filterMonth}
                                        onChange={(e) => setFilterMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                                        className="text-xs font-bold uppercase tracking-wider bg-transparent border-0 focus:ring-0 p-0 text-stone-600"
                                    >
                                        <option value="all">All Months</option>
                                        {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-xl shadow-sm">
                                    <CalendarIcon className="w-3.5 h-3.5 text-stone-400" />
                                    <select
                                        value={filterYear}
                                        onChange={(e) => setFilterYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                                        className="text-xs font-bold uppercase tracking-wider bg-transparent border-0 focus:ring-0 p-0 text-stone-600"
                                    >
                                        <option value="all">All Years</option>
                                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <AnimatePresence mode="popLayout">
                                {filteredNotifications.map((note, index) => (
                                    <motion.div
                                        key={note._id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={`group relative flex items-start gap-6 p-6 rounded-2xl border transition-all duration-300 ${note.isRead
                                            ? 'bg-stone-50 border-stone-100 opacity-70'
                                            : 'bg-white border-stone-200 shadow-sm hover:shadow-md hover:border-nobel-gold/30'
                                            }`}
                                    >
                                        {/* Timeline Dot */}
                                        <div className="absolute left-[-2rem] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-4 border-nobel-cream bg-nobel-gold z-10 hidden lg:block" />

                                        <div className={`mt-1 p-3 rounded-xl flex-shrink-0 transition-transform group-hover:scale-110 ${getColor(note.type)}`}>
                                            {getIcon(note.type)}
                                        </div>

                                        <div className="flex-grow">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className={`text-lg font-serif font-bold transition-all ${note.isRead ? 'text-stone-400 line-through' : 'text-stone-900'}`}>
                                                        {note.title}
                                                    </h3>
                                                    <p className="text-xs text-stone-400 mt-0.5">{format(new Date(note.createdAt), 'MMM d, yyyy • h:mm a')}</p>
                                                </div>
                                                {!note.isRead && (
                                                    <button
                                                        onClick={() => markAsRead({ notificationId: note._id })}
                                                        className="p-2 hover:bg-emerald-50 text-emerald-500 rounded-lg transition-colors group/btn"
                                                        title="Mark as read"
                                                    >
                                                        <MailOpen className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                                    </button>
                                                )}
                                            </div>
                                            <p className={`text-sm leading-relaxed transition-all ${note.isRead ? 'text-stone-400' : 'text-stone-600'}`}>
                                                {note.description}
                                            </p>
                                        </div>

                                        {/* Status Badge */}
                                        {!note.isRead && (
                                            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-bold uppercase tracking-wider animate-pulse">
                                                New
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {filteredNotifications.length === 0 && (
                                <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-stone-300">
                                    <Bell className="w-12 h-12 text-stone-300 mx-auto mb-4 opacity-50" />
                                    <p className="text-stone-400 italic">Historical records are quiet for this period.</p>
                                </div>
                            )}

                            {status === "CanLoadMore" && (
                                <div className="flex justify-center mt-12 pb-20">
                                    <button
                                        onClick={() => loadMore(15)}
                                        className="px-8 py-3 bg-white border border-stone-200 rounded-full text-xs font-bold uppercase tracking-widest text-stone-600 hover:text-nobel-gold hover:border-nobel-gold transition-all shadow-sm hover:shadow-md"
                                    >
                                        Load More Entries
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .content-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .content-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .content-scrollbar::-webkit-scrollbar-thumb {
                    background: #d6d3d1;
                    border-radius: 10px;
                }
                .content-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #a8a29e;
                }
            `}} />
        </div>
    );
};
