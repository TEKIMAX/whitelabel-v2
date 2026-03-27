import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Maximize2 } from 'lucide-react';
import { AIStrategyMemoSheet } from './AIStrategyMemoSheet';

interface AIStrategyMemoProps {
    dailyMemo: any;
    latestMemo?: any;
    isGeneratingMemo: boolean;
    showAISettings: boolean;
    setShowAISettings: (show: boolean) => void;
    isMemoExpanded: boolean; // Keeping for prop compatibility if passed from parent, but managing locally
    setIsMemoExpanded: (expanded: boolean) => void;
    markMemoAsRead: (args: { memoId: any }) => void;
    handleRefreshMemo: () => void;
    updateProject: (args: any) => void;
    data: any;
}

export const AIStrategyMemo: React.FC<AIStrategyMemoProps> = ({
    dailyMemo,
    latestMemo,
    isGeneratingMemo,
    showAISettings,
    setShowAISettings,
    markMemoAsRead,
    handleRefreshMemo,
    updateProject,
    data
}) => {
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const activeMemo = dailyMemo || latestMemo;

    // Create a 2-3 sentence excerpt from the memo if it exists
    const excerpt = React.useMemo(() => {
        if (!dailyMemo?.content) return "AI analysis of your trajectory and market positioning.";

        // Very basic markdown stripping for the excerpt
        const cleanText = dailyMemo.content
            .replace(/[#*`_>-]/g, '') // Remove markdown characters
            .replace(/\n+/g, ' ')     // Replace newlines with spaces
            .trim();

        // Get first ~150 characters
        if (cleanText.length > 150) {
            return cleanText.substring(0, 150) + "...";
        }
        return cleanText;
    }, [dailyMemo]);

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-full flex flex-col relative"
            >
                {/* Header built into the Bento Grid item already, so we just provide the content here.
                    The settings gear is positioned absolutely in the top right. */}
                <div className="absolute -top-12 -right-4 z-50">
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowAISettings(!showAISettings);
                            }}
                            className="p-2 bg-stone-50 hover:bg-stone-100 rounded-full transition-colors border border-stone-200 shadow-sm"
                        >
                            <Settings className="w-4 h-4 text-stone-500" />
                        </button>

                        <AnimatePresence>
                            {showAISettings && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 mt-3 w-56 bg-white border border-stone-200 rounded-xl shadow-xl p-4 z-[60]"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">AI Configuration</p>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1.5">Expert Strategy</label>
                                            <select
                                                value={data.strategyFrequencyDays || 14}
                                                onChange={(e) => updateProject({ id: data.id as any, updates: { strategyFrequencyDays: parseInt(e.target.value) } })}
                                                className="w-full bg-stone-50 border border-stone-200 rounded-lg text-xs px-2 py-1.5 text-stone-700 outline-none focus:ring-1 focus:ring-nobel-gold"
                                            >
                                                <option value="7">Every Week</option>
                                                <option value="14">Bi-Weekly</option>
                                                <option value="30">Monthly</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1.5">Daily Focus</label>
                                            <select
                                                value={data.memoFrequencyDays || 1}
                                                onChange={(e) => updateProject({ id: data.id as any, updates: { memoFrequencyDays: parseInt(e.target.value) } })}
                                                className="w-full bg-stone-50 border border-stone-200 rounded-lg text-xs px-2 py-1.5 text-stone-700 outline-none focus:ring-1 focus:ring-nobel-gold"
                                            >
                                                <option value="1">Every Morning</option>
                                                <option value="2">Every 2 Days</option>
                                            </select>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRefreshMemo();
                                                setShowAISettings(false);
                                            }}
                                            disabled={isGeneratingMemo}
                                            className="w-full py-2 bg-stone-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-stone-800 transition-all mt-2 disabled:opacity-50"
                                        >
                                            Force Sync Now
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Main Card Content */}
                <div className="flex-1 flex flex-col mt-2">
                    {dailyMemo ? (
                        <div className="flex-1 flex flex-col justify-between">
                            <div className="bg-stone-50/50 rounded-xl p-4 border border-stone-100 flex-1 relative overflow-hidden group/excerpt">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent z-0 pointer-events-none" />

                                <div className="relative z-10 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-nobel-gold" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Today's Synthesis</p>
                                    </div>
                                    <p className="text-sm text-stone-600 leading-relaxed italic line-clamp-4">
                                        "{excerpt}"
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsSheetOpen(true);
                                }}
                                className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-stone-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-stone-800 transition-colors shadow-sm group/btn"
                            >
                                <Maximize2 className="w-4 h-4 text-stone-400 group-hover/btn:scale-110 group-hover/btn:text-white transition-all" />
                                Expand Full Memo
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-stone-50/50 rounded-xl border border-stone-100 border-dashed">
                            <p className="text-xs text-stone-400 font-medium px-4 text-center">
                                No strategic memo generated for today.
                            </p>
                            <div className="flex flex-col gap-2 w-full px-6">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRefreshMemo();
                                    }}
                                    disabled={isGeneratingMemo}
                                    className="w-full py-2 bg-white border border-stone-200 text-stone-700 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-stone-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isGeneratingMemo ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                                            Analysing...
                                        </>
                                    ) : (
                                        "Generate Now"
                                    )}
                                </button>
                                {latestMemo && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsSheetOpen(true);
                                        }}
                                        className="w-full py-2 bg-transparent text-stone-500 hover:text-stone-700 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1 mt-1"
                                    >
                                        <Maximize2 className="w-3 h-3" />
                                        Read Last Version
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Slide-over Sheet */}
            <AIStrategyMemoSheet
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                dailyMemo={activeMemo}
                markMemoAsRead={markMemoAsRead}
            />
        </>
    );
};
