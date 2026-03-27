import React from 'react';
import { motion } from 'framer-motion';
import { Target, ChevronRight } from 'lucide-react';

interface CurrentFocusProps {
    activeGoal: any;
    activeGoalProgress: number;
    onNavigate: (view: any) => void;
    setShowGoalsPanel: (show: boolean) => void;
}

export const CurrentFocus: React.FC<CurrentFocusProps> = ({
    activeGoal,
    activeGoalProgress,
    onNavigate,
    setShowGoalsPanel
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col h-full relative overflow-hidden group"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-stone-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-nobel-gold" />
                        <span className="text-sm font-bold text-stone-800">Current Focus</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {activeGoal && (
                            <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                Active
                            </span>
                        )}
                        <button
                            onClick={() => onNavigate('GOALS')}
                            className="bg-black text-white px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider hover:bg-stone-800 flex items-center gap-1"
                        >
                            View <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {activeGoal ? (
                    <div className="flex-grow flex flex-col justify-between">
                        <div>
                            {/* Removed font-serif */}
                            <h3 className="text-xl font-bold text-stone-900 leading-tight mb-2">{activeGoal.title}</h3>
                            <div className="flex items-center gap-2 text-xs text-stone-500">
                                <span className="px-2 py-0.5 bg-stone-100 rounded text-stone-600 font-medium">{activeGoal.type}</span>
                                <span>•</span>
                                <span>{activeGoal.timeframe}</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-stone-100">
                            <div className="flex items-center justify-between text-xs mb-2">
                                <span className="font-bold text-stone-400 uppercase tracking-widest">Progress</span>
                                <span className="font-bold text-stone-900">{activeGoalProgress}%</span>
                            </div>
                            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${activeGoalProgress}%` }} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-center py-6">
                        <div className="p-3 bg-stone-50 rounded-full mb-3">
                            <Target className="w-6 h-6 text-stone-300" />
                        </div>
                        <p className="text-stone-500 text-sm font-medium">No active goal set.</p>
                        <button
                            onClick={() => setShowGoalsPanel(true)}
                            className="mt-3 text-xs font-bold uppercase tracking-wider text-nobel-gold hover:text-stone-900 transition-colors"
                        >
                            Set a Goal
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
