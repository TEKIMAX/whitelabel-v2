'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useConvexAuth } from 'convex/react';
import { api } from "../convex/_generated/api";
import { useCreateEvent } from '../hooks/useCreate';
import { StartupData } from '../types';
import {
    ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon,
    Clock, Tag, Trash2, GripVertical, CheckCircle2, AlertCircle, Video, Users
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import TabNavigation from './TabNavigation';
import { Logo } from './Logo';

interface CalendarProps {
    data: StartupData;
    onNavigate: (view: any) => void;
    currentView: any;
    allowedPages?: string[];
}

export default function Calendar({ data, onNavigate, currentView, allowedPages }: CalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showEventModal, setShowEventModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<any>(null);

    // Convex Operations
    const { isAuthenticated } = useConvexAuth();
    const events = useQuery(api.calendar.getEvents, isAuthenticated ? { projectId: data.id as any } : "skip");
    const addEvent = useCreateEvent();
    const updateEvent = useMutation(api.calendar.updateEvent);
    const deleteEvent = useMutation(api.calendar.deleteEvent);

    // Interview Schedules
    const interviewSchedules = useQuery(api.customers.getInterviewSchedules, isAuthenticated ? { projectId: data.id as any } : "skip") || [];

    // Drag and Drop State
    const [draggedEvent, setDraggedEvent] = useState<any>(null);

    // Form State
    const [eventTitle, setEventTitle] = useState('');
    const [eventDesc, setEventDesc] = useState('');
    const [eventType, setEventType] = useState<string>('task');
    const [customType, setCustomType] = useState('');
    const [showCustomTypeInput, setShowCustomTypeInput] = useState(false);
    const [locationType, setLocationType] = useState<'in-person' | 'online'>('online');
    const [meetingUrl, setMeetingUrl] = useState('');
    const [eventStart, setEventStart] = useState('');
    const [eventEnd, setEventEnd] = useState('');

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const onDateClick = (day: Date) => {
        setSelectedDate(day);
        setEventStart(format(day, "yyyy-MM-dd'T'HH:mm"));
        setEventEnd(format(day, "yyyy-MM-dd'T'HH:mm"));
        setEditingEvent(null);
        setEventTitle('');
        setEventDesc('');
        setEventType('task');
        setCustomType('');
        setShowCustomTypeInput(false);
        setLocationType('online');
        setMeetingUrl('');
        setShowEventModal(true);
    };

    const handleEditEvent = (event: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingEvent(event);
        setEventTitle(event.title);
        setEventDesc(event.description || '');
        setEventType(event.type);
        setCustomType(event.customType || '');
        setShowCustomTypeInput(!!event.customType);
        setLocationType(event.locationType || 'online');
        setMeetingUrl(event.meetingUrl || '');
        setEventStart(format(new Date(event.start), "yyyy-MM-dd'T'HH:mm"));
        setEventEnd(format(new Date(event.end), "yyyy-MM-dd'T'HH:mm"));
        setShowEventModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            projectId: data.id as any,
            orgId: data.orgId,
            title: eventTitle,
            description: eventDesc,
            start: new Date(eventStart).getTime(),
            end: new Date(eventEnd).getTime(),
            type: eventType,
            customType: showCustomTypeInput ? customType : undefined,
            locationType: eventType === 'meeting' ? locationType : undefined,
            meetingUrl: (eventType === 'meeting' && locationType === 'online') ? meetingUrl : undefined,
            allDay: false
        };

        try {
            if (editingEvent) {
                await updateEvent({ id: editingEvent._id, ...payload });
                toast.success('Event updated');
            } else {
                await addEvent(payload);
                toast.success('Event added');
            }
            setShowEventModal(false);
        } catch (error) {
            toast.error('Failed to save event');
        }
    };

    const handleDelete = async () => {
        if (!editingEvent) return;
        try {
            await deleteEvent({ id: editingEvent._id });
            toast.success('Event deleted');
            setShowEventModal(false);
        } catch (error) {
            toast.error('Failed to delete event');
        }
    };

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, event: any) => {
        setDraggedEvent(event);
        e.dataTransfer.setData('eventId', event._id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, date: Date) => {
        e.preventDefault();
        if (!draggedEvent) return;

        const duration = draggedEvent.end - draggedEvent.start;
        const newStart = date.getTime();
        const newEnd = newStart + duration;

        try {
            await updateEvent({
                id: draggedEvent._id,
                start: newStart,
                end: newEnd
            });
            toast.success('Rescheduled');
        } catch (error) {
            toast.error('Failed to move event');
        }
        setDraggedEvent(null);
    };

    const renderHeader = () => (
        <div className="flex items-center justify-between px-8 py-6 bg-white border-b border-stone-100">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-nobel-gold/10 rounded-2xl flex items-center justify-center">
                    <CalendarIcon className="w-6 h-6 text-nobel-gold" />
                </div>
                <div>
                    <h2 className="font-serif text-3xl font-bold text-stone-900 leading-tight">
                        {format(currentMonth, 'MMMM yyyy')}
                    </h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Project Timeline</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={prevMonth}
                    className="p-2 hover:bg-stone-50 rounded-xl border border-stone-200 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-stone-600" />
                </button>
                <button
                    onClick={() => setCurrentMonth(new Date())}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-stone-600 hover:text-stone-900 transition-colors"
                >
                    Today
                </button>
                <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-stone-50 rounded-xl border border-stone-200 transition-colors"
                >
                    <ChevronRight className="w-5 h-5 text-stone-600" />
                </button>
                <div className="w-px h-6 bg-stone-200 mx-2" />
                <button
                    onClick={() => onDateClick(new Date())}
                    className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-nobel-gold transition-all shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Add Event
                </button>
            </div>
        </div>
    );

    const renderDays = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return (
            <div className="grid grid-cols-7 border-b border-stone-100 bg-stone-50/50">
                {days.map(day => (
                    <div key={day} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-400 text-center border-r last:border-0 border-stone-100">
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        // Merge events and interview schedules
        const allEvents = [
            ...(events || []),
            ...interviewSchedules.map((s: any) => ({
                _id: `schedule_${s._id}`,
                title: s.title,
                description: s.description,
                start: s.scheduledAt,
                end: s.scheduledAt + (s.duration || 60) * 60 * 1000,
                type: 'interview',
                locationType: s.location?.includes('zoom') || s.location?.includes('meet') ? 'online' : 'in-person',
                meetingUrl: s.location?.startsWith('http') ? s.location : undefined,
                isInterview: true,
                status: s.status
            }))
        ];

        const rows = [];
        let days = [];
        let day = startDate;

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                const cloneDay = day;
                const dailyEvents = allEvents.filter(e => isSameDay(new Date(e.start), cloneDay));

                days.push(
                    <div
                        key={day.toISOString()}
                        className={`min-h-[140px] p-2 border-r border-b border-stone-100 transition-colors relative group
                            ${!isSameMonth(day, monthStart) ? 'bg-stone-50/30' : 'bg-white'}
                            ${isSameDay(day, new Date()) ? 'bg-nobel-gold/[0.02]' : ''}
                        `}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, cloneDay)}
                    >
                        <div className="flex justify-between items-start mb-2 px-1">
                            <span className={`text-sm font-medium ${isSameDay(day, new Date())
                                ? 'w-7 h-7 flex items-center justify-center bg-nobel-gold text-white rounded-full'
                                : isSameMonth(day, monthStart) ? 'text-stone-900' : 'text-stone-300'
                                }`}>
                                {format(day, 'd')}
                            </span>
                            <button
                                onClick={() => onDateClick(cloneDay)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 bg-stone-900 text-white rounded-lg transition-all hover:bg-nobel-gold shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="space-y-1">
                            {dailyEvents.map(event => (
                                <motion.div
                                    key={event._id}
                                    layoutId={event._id}
                                    draggable={!event.isInterview}
                                    onDragStart={(e) => !event.isInterview && handleDragStart(e as any, event)}
                                    onClick={(e) => !event.isInterview && handleEditEvent(event, e)}
                                    className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border cursor-pointer transition-all flex items-center justify-between group/item
                                        ${event.type === 'meeting' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' :
                                          event.type === 'milestone' ? 'bg-amber-50 border-amber-100 text-amber-900' :
                                          event.type === 'interview' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                                            'bg-stone-100 border-stone-200 text-stone-600'}
                                        hover:shadow-md hover:scale-[1.02] active:scale-95
                                    `}
                                >
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                        <div className="flex items-center gap-1.5 truncate">
                                            <div className={`w-1.5 h-1.5 rounded-full ${event.type === 'meeting' ? 'bg-indigo-400' :
                                                event.type === 'milestone' ? 'bg-amber-400' :
                                                event.type === 'interview' ? 'bg-emerald-400' :
                                                    'bg-stone-400'
                                                }`} />
                                            <span className="truncate">{event.title}</span>
                                            {event.isInterview && <Users className="w-2.5 h-2.5 ml-1 opacity-60" />}
                                        </div>
                                        {(event.type === 'meeting' || event.type === 'interview') && event.locationType === 'online' && (
                                            <div className="text-[8px] text-stone-400 flex items-center gap-1 ml-3 truncate italic">
                                                <Video className="w-2 h-2" /> Online
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[9px] opacity-0 group-hover/item:opacity-100 whitespace-nowrap">
                                        {format(new Date(event.start), 'h:mm a')}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="grid grid-cols-7" key={day.toISOString()}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="bg-white">{rows}</div>;
    };

    return (
        <div className="min-h-screen bg-[#F9F8F4] flex flex-col">
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
            </header>

            <main className="max-w-[1600px] mx-auto w-full px-8 pt-12 pb-12 flex-grow flex flex-col">
                <div className="mb-10">
                    <h1 className="text-3xl font-serif text-stone-900 mb-2">Project Calendar</h1>
                    <p className="text-stone-500">Manage your milestones, meetings, and key deadlines.</p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden flex flex-col flex-grow">
                    {renderHeader()}
                    {renderDays()}
                    <div className="flex-grow overflow-y-auto">
                        {renderCells()}
                    </div>
                </div>
            </main>

            {/* Event Modal */}
            <AnimatePresence>
                {showEventModal && (
                    <div className="fixed inset-0 flex items-center justify-center z-[100] px-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowEventModal(false)}
                            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden"
                        >
                            <div className="px-8 py-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                                <h2 className="font-serif text-2xl font-bold text-stone-900">
                                    {editingEvent ? 'Edit Event' : 'Schedule Event'}
                                </h2>
                                <button onClick={() => setShowEventModal(false)} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-stone-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Event Title</label>
                                    <input
                                        autoFocus
                                        required
                                        value={eventTitle}
                                        onChange={(e) => setEventTitle(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-nobel-gold/20 focus:border-nobel-gold transition-all font-serif text-lg"
                                        placeholder="Growth Sync, Milestone A, etc."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Start</label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={eventStart}
                                            onChange={(e) => setEventStart(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-nobel-gold/20 transition-all text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">End</label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={eventEnd}
                                            onChange={(e) => setEventEnd(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-nobel-gold/20 transition-all text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Type</label>
                                    <div className="flex flex-wrap gap-2">
                                        {(['task', 'meeting', 'milestone'] as const).map(type => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => {
                                                    setEventType(type);
                                                    setShowCustomTypeInput(false);
                                                }}
                                                className={`flex-1 min-w-[80px] py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${eventType === type && !showCustomTypeInput
                                                    ? 'bg-nobel-gold border-nobel-gold text-white shadow-sm'
                                                    : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'
                                                    }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setShowCustomTypeInput(true)}
                                            className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all ${showCustomTypeInput
                                                ? 'bg-nobel-gold border-nobel-gold text-white shadow-sm'
                                                : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'
                                                }`}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {showCustomTypeInput && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="mt-3"
                                        >
                                            <input
                                                value={customType}
                                                onChange={(e) => {
                                                    setCustomType(e.target.value);
                                                    setEventType(e.target.value);
                                                }}
                                                className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-nobel-gold/20 text-sm"
                                                placeholder="Enter custom type (e.g., Pitch, Workshop)"
                                            />
                                        </motion.div>
                                    )}
                                </div>

                                {eventType === 'meeting' && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="space-y-4 pt-2 pb-2 bg-stone-50/50 p-4 rounded-2xl border border-stone-100"
                                    >
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Meeting Setting</label>
                                            <div className="flex bg-white rounded-lg p-1 border border-stone-200 shadow-sm">
                                                <button
                                                    type="button"
                                                    onClick={() => setLocationType('online')}
                                                    className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${locationType === 'online' ? 'bg-stone-900 text-white' : 'text-stone-400'}`}
                                                >
                                                    Online
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setLocationType('in-person')}
                                                    className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${locationType === 'in-person' ? 'bg-stone-900 text-white' : 'text-stone-400'}`}
                                                >
                                                    In-Person
                                                </button>
                                            </div>
                                        </div>

                                        {locationType === 'online' && (
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Meeting URL</label>
                                                <div className="relative">
                                                    <input
                                                        value={meetingUrl}
                                                        onChange={(e) => setMeetingUrl(e.target.value)}
                                                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-nobel-gold/20 text-sm"
                                                        placeholder="Paster Zoom/Meet URL here..."
                                                    />
                                                    <Video className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Description (Optional)</label>
                                    <textarea
                                        value={eventDesc}
                                        onChange={(e) => setEventDesc(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-nobel-gold/20 transition-all text-sm min-h-[100px]"
                                        placeholder="Notes, agenda, or context..."
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    {editingEvent && (
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            className="px-6 py-3 border border-red-100 text-red-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-50 transition-colors flex items-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-stone-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-nobel-gold transition-all shadow-md active:scale-[0.98]"
                                    >
                                        {editingEvent ? 'Update Event' : 'Create Event'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
