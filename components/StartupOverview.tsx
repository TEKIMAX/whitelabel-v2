'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, usePaginatedQuery, useConvexAuth } from 'convex/react';
import { api } from "../convex/_generated/api";
import { toast } from 'sonner';
import { StartupData, RolePermissions } from '../types';
import {
    Home, Calendar, Target,
    TrendingUp, FileText, Users,
    Bell, Coffee, Video, Settings, Check, ChevronDown, Brain
} from 'lucide-react';
import { isSameDay, format, differenceInDays } from 'date-fns';

import TabNavigation from './TabNavigation';
import { Logo } from './Logo';
import DotPatternBackground from './DotPatternBackground';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIGenerateDailyMemo, useAIGenerateStartupSummary } from '../hooks/useAICreate';
import { AIStrategyMemo } from './startup-overview/AIStrategyMemo';
import { HealthScore } from './startup-overview/HealthScore';


import { PriorityTasks } from './startup-overview/PriorityTasks';
import { HealthExplanationSheet } from './startup-overview/HealthExplanationSheet';
import { StrategySummarySheet } from './startup-overview/StrategySummarySheet';
import { GoalSheet } from './startup-overview/GoalSheet';
import { BentoGrid, BentoGridItem } from './BentoGrid';
import { UploadModal } from './file-organization/UploadModal';
import { useGenerateUploadUrl, useSaveFile } from '../hooks/useCreate';
import { ModelSelect } from './ModelSelector';
import { useActiveModel } from '../hooks/useActiveModel';

interface StartupOverviewProps {
    data: StartupData;
    onNavigate: (view: any) => void;
    currentView: any;
    allowedPages?: string[];
    permissions?: RolePermissions;
    currentUserRole?: string;
    userName?: string;
}

const timeAgo = (date: number) => {
    const seconds = Math.floor((Date.now() - date) / 1000);
    if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
    if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
    return Math.floor(seconds / 86400) + "d ago";
};

const getMeetingIcon = (type: string) => {
    switch (type) {
        case 'investor': return <TrendingUp className="w-4 h-4" />;
        case 'team': return <Users className="w-4 h-4" />;
        case 'customer': return <Coffee className="w-4 h-4" />;
        case 'advisory': return <Video className="w-4 h-4" />;
        default: return <Calendar className="w-4 h-4" />;
    }
};

export const StartupOverview: React.FC<StartupOverviewProps> = ({
    data,
    onNavigate,
    currentView,
    allowedPages,
    userName,
}) => {
    const [showGoalsPanel, setShowGoalsPanel] = useState(false);
    const [showHealthSheet, setShowHealthSheet] = useState(false);
    const [showSummarySheet, setShowSummarySheet] = useState(false);
    const [summaryContent, setSummaryContent] = useState<string>('');
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [isMemoExpanded, setIsMemoExpanded] = useState(false);
    const [isModelsExpanded, setIsModelsExpanded] = useState(false);
    const [uploadQueue, setUploadQueue] = useState<any[]>([]);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);

    // AI Daily Focus Logic
    const today = new Date().toISOString().split('T')[0];
    const dailyMemo = useQuery(api.dailyMemos.getDailyMemo, { projectId: data.id as any, date: today });
    const latestMemo = useQuery(api.dailyMemos.getLatestMemo, { projectId: data.id as any });
    const markMemoAsRead = useMutation(api.dailyMemos.markAsRead);

    // AI Models from Customer Portal Sync
    const { models, hasModels } = useActiveModel();

    // Upload Handlers
    const generateUploadUrl = useGenerateUploadUrl();
    const saveFile = useSaveFile();

    const handleFilesSelected = (files: FileList | null) => {
        if (!files) return;
        const newQueue = Array.from(files).map(file => ({
            file,
            progress: 0,
            status: 'pending' as const,
            tags: [] as { name: string; color: string }[]
        }));
        setUploadQueue((prev: typeof uploadQueue) => [...prev, ...newQueue]);
        setUploadModalOpen(true);
    };

    const handleUploadAll = async () => {
        const pendingUploads = uploadQueue.filter(u => u.status === 'pending');

        for (const item of pendingUploads) {
            setUploadQueue(prev => prev.map(u => u.file === item.file ? { ...u, status: 'uploading' } : u));

            try {
                const postUrl = await generateUploadUrl();

                await new Promise<void>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open("POST", postUrl, true);
                    xhr.setRequestHeader("Content-Type", item.file.type);

                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable) {
                            const percentComplete = (event.loaded / event.total) * 100;
                            setUploadQueue(prev => prev.map(u => u.file === item.file ? { ...u, progress: percentComplete } : u));
                        }
                    };

                    xhr.onload = async () => {
                        if (xhr.status === 200) {
                            try {
                                const { storageId } = JSON.parse(xhr.responseText);
                                await saveFile({
                                    projectId: data.id as any,
                                    folderId: undefined, // Upload to root
                                    name: item.file.name,
                                    title: item.file.name,
                                    description: '',
                                    tags: item.tags,
                                    type: item.file.type,
                                    storageId,
                                    size: item.file.size,
                                    source: "external",
                                });
                                setUploadQueue(prev => prev.map(u => u.file === item.file ? { ...u, status: 'done', progress: 100 } : u));
                                toast.success("File uploaded successfully", { icon: <Check className="w-4 h-4 text-black" /> });
                                resolve();
                            } catch (err) {
                                setUploadQueue(prev => prev.map(u => u.file === item.file ? { ...u, status: 'error' } : u));
                                reject(err);
                            }
                        } else {
                            setUploadQueue(prev => prev.map(u => u.file === item.file ? { ...u, status: 'error' } : u));
                            reject(new Error("Upload failed"));
                        }
                    };

                    xhr.onerror = () => {
                        setUploadQueue(prev => prev.map(u => u.file === item.file ? { ...u, status: 'error' } : u));
                        reject(new Error("Upload error"));
                    };

                    xhr.send(item.file);
                });

            } catch (error) {
            }
        }
    };

    const updateItemTags = (file: File, newTags: { name: string, color: string }[]) => {
        setUploadQueue(prev => prev.map(u => u.file === file ? { ...u, tags: newTags } : u));
    };

    const removeQueueItem = (file: File) => {
        setUploadQueue(prev => prev.filter(u => u.file !== file));
    };
    const generateDailyMemo = useAIGenerateDailyMemo();
    const generateStrategySummary = useAIGenerateStartupSummary();
    const updateProject = useMutation(api.projects.update);
    const markAllNotificationsRead = useMutation(api.notifications.markAllAsRead);

    // Notifications
    const { results: recentNotifications } = usePaginatedQuery(
        api.notifications.getNotifications,
        { projectId: data.id as any },
        { initialNumItems: 5 }
    );
    const unreadCount = recentNotifications?.filter(n => !n.isRead).length || 0;
    const [isGeneratingMemo, setIsGeneratingMemo] = useState(false);
    const [showAISettings, setShowAISettings] = useState(false);

    // Calendar Data
    const { isAuthenticated } = useConvexAuth();
    const calendarEvents = useQuery(api.calendar.getEvents, isAuthenticated ? { projectId: data.id as any } : "skip");
    const todayEvents = React.useMemo(() => {
        if (!calendarEvents) return [];
        return calendarEvents.filter(e => isSameDay(new Date(e.start), new Date()));
    }, [calendarEvents]);

    const handleGenerateSummary = async () => {
        setIsGeneratingSummary(true);
        setShowSummarySheet(true);
        try {
            const summary = await generateStrategySummary({ projectId: data.id as any });
            setSummaryContent(summary);
        } catch (error) {
            setSummaryContent("Failed to generate strategic summary. Please try again.");
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    const handleRefreshMemo = async () => {
        setIsGeneratingMemo(true);
        try {
            await generateDailyMemo({ projectId: data.id as any, date: today });
        } catch (error) {
        } finally {
            setIsGeneratingMemo(false);
        }
    };

    // Auto-generation is disabled, only manual trigger.
    /*
    React.useEffect(() => {
        if (dailyMemo === null && !isGeneratingMemo) {
            handleRefreshMemo();
        }
    }, [dailyMemo]);
    */

    // Bi-weekly Strategy Logic
    React.useEffect(() => {
        const lastGen = data.lastStrategyGeneratedAt || 0;
        const frequency = data.strategyFrequencyDays || 14;
        const daysSince = differenceInDays(new Date(), new Date(lastGen));

        if (daysSince >= frequency && !isGeneratingSummary) {
            // Strategic analysis is due — no-op, user can trigger manually
        }
    }, [data.lastStrategyGeneratedAt]);

    const createGoal = useMutation(api.goals.addGoal);

    // Health score calculation
    const healthBreakdown = React.useMemo(() => {
        let scores = {
            legalDocs: 0,
            legalDocsDetails: {} as Record<string, boolean>,
            total: 0
        };

        // Parse organization details
        let orgDetails: any = {};
        if (data.organizationDetails) {
            try {
                orgDetails = typeof data.organizationDetails === 'string'
                    ? JSON.parse(data.organizationDetails)
                    : data.organizationDetails;
            } catch (e) {
            }
        }

        const legalDocs = orgDetails.legalDocs || {};
        scores.legalDocsDetails = legalDocs;

        const foundationalDocs = [
            'Business Registration',
            'EIN Number',
            'Operating Agreement',
            'Bylaws'
        ];

        let checkedCount = 0;
        foundationalDocs.forEach(doc => {
            if (legalDocs[doc]) checkedCount++;
        });

        scores.legalDocs = checkedCount * 25;
        scores.total = scores.legalDocs;

        return scores;
    }, [data.organizationDetails]);

    const healthScore = healthBreakdown.total;

    const getHealthColor = (score: number) => score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-nobel-gold' : 'text-red-500';
    const getHealthBg = (score: number) => score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-nobel-gold' : 'bg-red-500';

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning,';
        if (hour < 18) return 'Good Afternoon,';
        return 'Good Evening,';
    };

    const activeGoal = data.goals?.find(g => g.status === 'In Progress');

    const activeGoalProgress = activeGoal && activeGoal.keyResults && activeGoal.keyResults.length > 0
        ? Math.round(activeGoal.keyResults.reduce((acc, kr) => {
            const target = kr.target || 1;
            const progress = Math.max(0, Math.min(1, kr.current / target));
            return acc + progress;
        }, 0) / activeGoal.keyResults.length * 100)
        : 0;

    const markAsRead = useMutation(api.notifications.markAsRead);

    const handleNotificationClick = (notification: any) => {
        if (!notification.isRead) {
            markAsRead({ notificationId: notification._id });
        }
        setShowNotifications(false);

        if (notification.metadata) {
            if (notification.metadata.includes('market-research') || notification.metadata.includes('/market')) {
                onNavigate('MARKET');
            } else if (notification.metadata.includes('bottom-up') || notification.metadata.includes('/bottom-up-sizing')) {
                onNavigate('BOTTOM_UP_SIZING');
            } else if (notification.metadata.includes('competitors')) {
                onNavigate('COMPETITORS');
            } else if (notification.metadata.includes('calendar')) {
                onNavigate('CALENDAR');
            } else if (notification.metadata.includes('okr') || notification.metadata.includes('goals')) {
                onNavigate('GOALS');
            }
        }
    };

    // Action Items Calculation
    const highPriorityCount = React.useMemo(() => {
        return data.features?.filter(f => f.priority === 'High' && f.status !== 'Done').length || 0;
    }, [data.features]);

    // Intelligence Badge
    const unreadMemoCount = dailyMemo && !dailyMemo.isRead ? 1 : 0;

    // Compliance Badge
    const missingDocsCount = 4 - (healthBreakdown.legalDocs / 25);

    // Goal Warning
    const hasActiveGoal = !!activeGoal;

    // --- BENTO GRID ITEMS ---
    const rawItems = React.useMemo(() => [
        {
            id: 1,
            title: "Strategic Memo",
            category: "INTELLIGENCE",
            color: "stone",
            badge: unreadMemoCount > 0 ? "New Memo" : "All Caught Up",
            badgeColor: unreadMemoCount > 0 ? "bg-red-50 text-red-600 border border-red-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200",
            icon: <FileText className="w-5 h-5 text-stone-600" />,
            description: "AI analysis of your trajectory and market positioning.",
            content: (
                <div className="h-full w-full absolute inset-0 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-stone-200 scrollbar-track-transparent">
                    <AIStrategyMemo
                        dailyMemo={dailyMemo}
                        latestMemo={latestMemo}
                        isGeneratingMemo={isGeneratingMemo}
                        showAISettings={showAISettings}
                        setShowAISettings={setShowAISettings}
                        isMemoExpanded={true} // Always expanded in stack view
                        setIsMemoExpanded={setIsMemoExpanded}
                        markMemoAsRead={markMemoAsRead}
                        handleRefreshMemo={handleRefreshMemo}
                        updateProject={updateProject}
                        data={data}
                    />
                </div>
            ),
            // Takes up 2 out of 3 columns on the top row
            className: "md:col-span-2 md:row-span-1"
        },
        {
            id: 2,
            title: "Health Core",
            category: "COMPLIANCE",
            color: "emerald",
            badge: `${healthScore}/100 Score`,
            badgeColor: "bg-stone-50 text-stone-600 border border-stone-200",
            icon: <Target className="w-5 h-5 text-emerald-600" />,
            description: "Monitor legal, financial, and operational readiness.",
            content: (
                <div className="h-full w-full absolute inset-0 flex flex-col justify-center">
                    <HealthScore
                        healthScore={healthScore}
                        setShowHealthSheet={setShowHealthSheet}
                        getHealthColor={getHealthColor}
                        getHealthBg={getHealthBg}
                    />
                </div>
            ),
            // Takes up 1 out of 3 columns on the top row (next to Strategic Memo)
            className: "md:col-span-1 md:row-span-1"
        },
        {
            id: 3,
            title: "Priority Tasks",
            category: "ACTION",
            color: "orange",
            badge: `${highPriorityCount} Tasks`,
            badgeColor: highPriorityCount > 0 ? "bg-orange-50 text-orange-600 border border-orange-200" : "bg-stone-50 text-stone-600 border border-stone-200",
            icon: <Check className="w-5 h-5 text-orange-600" />,
            description: "AI-recommended actions based on your current context.",
            content: (
                <div className="h-full w-full absolute inset-0 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-stone-200 scrollbar-track-transparent">
                    <PriorityTasks
                        data={data}
                        currentView={currentView}
                        onNavigate={onNavigate}
                        handleGenerateSummary={handleGenerateSummary}
                    />
                </div>
            ),
            // Spans fully across all 3 columns below the two above
            className: "md:col-span-3 md:row-span-1"
        }
    ].filter(Boolean) as any[], [dailyMemo, isGeneratingMemo, showAISettings, isMemoExpanded, unreadMemoCount, healthScore, missingDocsCount, todayEvents, activeGoal, hasActiveGoal, activeGoalProgress, highPriorityCount, data, currentView, markMemoAsRead, handleRefreshMemo, updateProject, setShowHealthSheet, getHealthColor, getHealthBg, onNavigate, format, setShowGoalsPanel, handleGenerateSummary]);

    return (
        <div className="h-screen flex bg-nobel-cream relative overflow-hidden">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-[20%] h-full relative overflow-hidden bg-stone-900 border-r border-stone-200 shadow-2xl z-20"
            >
                <img
                    src="/images/milad-fakurian-F4qy_1tAFfs-unsplash.jpg"
                    className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105"
                    alt="Startup Overview"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-stone-900/40 via-transparent to-stone-900/80" />
                <div className="absolute top-8 left-8 z-30">
                    <Logo imageClassName="h-8 w-auto brightness-0 invert" />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-8 space-y-4 bg-gradient-to-t from-stone-900 via-stone-900/60 to-transparent pt-24">
                    <div className="space-y-3">
                        <h2 className="text-white text-2xl font-serif font-bold leading-tight">
                            {getGreeting()}<br />
                            <span className="text-nobel-gold italic">{userName ? userName.split(' ')[0] : 'Founder'}.</span>
                        </h2>
                        <div className="h-1 w-10 bg-nobel-gold/50 rounded-full" />
                        <p className="text-stone-300 text-sm leading-relaxed">
                            Here's what needs your attention today.
                        </p>
                    </div>
                </div>
            </motion.div>

            <div className="w-[80%] h-full flex flex-col relative z-10">
                <DotPatternBackground color="#a8a29e" />
                <header className="px-10 py-4 flex items-center justify-between relative z-30 bg-white/80 backdrop-blur-sm border-b border-stone-200">
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
                    <div className="flex items-center gap-3">
                        {/* AI Model Selector */}
                        <ModelSelect />
                        {/* HUB BUTTON REMOVED */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2 bg-white border border-stone-200 rounded-full hover:bg-stone-50 transition-all hover:shadow-sm"
                            >
                                <Bell className={`w-4 h-4 text-stone-600 ${unreadCount > 0 ? 'animate-bounce' : ''}`} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">{unreadCount}</span>
                                )}
                            </button>
                            <AnimatePresence>
                                {showNotifications && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-3 w-80 bg-white border border-stone-200 rounded-2xl shadow-2xl z-[100] overflow-hidden"
                                    >
                                        <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-stone-900">Activity Log</h4>
                                            <button
                                                onClick={() => markAllNotificationsRead({ projectId: data.id as any })}
                                                className="text-[10px] text-nobel-gold font-bold hover:underline"
                                            >
                                                Mark all read
                                            </button>
                                        </div>
                                        <div className="max-h-[350px] overflow-y-auto">
                                            {recentNotifications && recentNotifications.length > 0 ? (
                                                recentNotifications.map(n => (
                                                    <div
                                                        key={n._id}
                                                        onClick={() => handleNotificationClick(n)}
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
                                                onClick={() => { setShowNotifications(false); onNavigate('NOTIFICATIONS'); }}
                                                className="bg-black text-white rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-widest hover:bg-stone-800 transition-colors"
                                            >
                                                View Timeline
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <button
                            onClick={() => onNavigate('SETTINGS')}
                            className="p-2 bg-white border border-stone-200 rounded-full hover:bg-stone-50 transition-all hover:shadow-sm"
                        >
                            <Settings className="w-3.5 h-3.5 text-stone-600" />
                        </button>
                    </div>
                </header>

                <main className="flex-grow flex flex-col px-12 py-10 overflow-y-auto relative z-10">
                    <div className="max-w-5xl mx-auto w-full">
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-stone-900 mb-2">Startup Overview</h1>
                            <p className="text-stone-500">Your daily command center for {data.name}.</p>
                        </div>

                        <BentoGrid>
                            {rawItems.map((item, i) => (
                                <BentoGridItem
                                    key={i}
                                    title={item.title}
                                    description={item.description}
                                    header={item.content}
                                    icon={item.icon}
                                    badge={item.badge}
                                    badgeColor={item.badgeColor}
                                    className={item.className || ""}
                                />
                            ))}
                        </BentoGrid>

                        {hasModels && (
                            <div className="mt-6 bg-white border border-stone-200 rounded-2xl p-6 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl group">
                                <div 
                                    className="flex items-center justify-between cursor-pointer"
                                    onClick={() => setIsModelsExpanded(!isModelsExpanded)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100 shrink-0 text-indigo-600 transition-transform group-hover:scale-110">
                                            <Brain className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="font-serif font-bold text-stone-900 text-xl group-hover:text-indigo-600 transition-colors">Included AI Models</h3>
                                            <p className="font-sans text-stone-500 text-sm">AI Engines provisioned via Stripe gateway for your startup.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0">
                                        <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
                                            {models.length} Models
                                        </span>
                                        <ChevronDown className={`w-5 h-5 text-stone-400 transition-transform duration-300 ${isModelsExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                </div>
                                <AnimatePresence>
                                    {isModelsExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        >
                                            <div className="pt-6 mt-6 border-t border-stone-100 flex flex-wrap gap-2">
                                                {models.map((model) => {
                                                    const provider = model.provider || model.modelId.split('/')[0] || 'Unknown';
                                                    const shortName = model.modelId.split('/').pop() || model.modelId;
                                                    return (
                                                        <div key={model.modelId} className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                                            <img 
                                                                src={`/logos/providers/${provider.toLowerCase()}.png`} 
                                                                className="w-3.5 h-3.5 opacity-80"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                                }}
                                                                alt={provider}
                                                            />
                                                            <span className="text-[10px] font-bold uppercase text-stone-500 bg-white border border-stone-100 px-1.5 py-0.5 rounded shadow-sm">{provider}</span>
                                                            <span className="text-xs font-semibold text-stone-800">{shortName}</span>
                                                            {model.isDefault && (
                                                                <span className="ml-1 text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded uppercase flex-shrink-0">Default</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            <HealthExplanationSheet
                isOpen={showHealthSheet}
                onClose={() => setShowHealthSheet(false)}
                healthScore={healthScore}
                legalDocs={healthBreakdown.legalDocsDetails || {}}
            />

            <UploadModal
                isOpen={uploadModalOpen}
                onClose={() => setUploadModalOpen(false)}
                uploadQueue={uploadQueue}
                setUploadQueue={setUploadQueue}
                handleUploadAll={handleUploadAll}
                handleFilesSelected={handleFilesSelected}
                updateItemTags={updateItemTags}
                removeQueueItem={removeQueueItem}
            />

            <GoalSheet
                isOpen={showGoalsPanel}
                onClose={() => setShowGoalsPanel(false)}
                currentGoals={data.goals || []}
                onCreateGoal={createGoal as any}
                projectId={data.id as any}
            />

            <StrategySummarySheet
                isOpen={showSummarySheet}
                onClose={() => setShowSummarySheet(false)}
                summary={summaryContent}
                isGenerating={isGeneratingSummary}
                projectId={data.id}
            />
        </div>
    );
};
