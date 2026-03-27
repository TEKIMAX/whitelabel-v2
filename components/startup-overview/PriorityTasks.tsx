import React from 'react';
import { motion } from 'framer-motion';
import { Target, Sparkles } from 'lucide-react';

interface PriorityTasksProps {
    data: any;
    currentView: any;
    onNavigate: (view: any) => void;
    handleGenerateSummary: () => void;
}

export const PriorityTasks: React.FC<PriorityTasksProps> = ({
    data,
    currentView,
    onNavigate,
    handleGenerateSummary
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
        >
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center mb-6 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-stone-100 rounded-lg text-stone-600">
                            <Target className="w-5 h-5" />
                        </div>
                        {/* Removed font-serif */}
                        <h3 className="text-lg font-bold text-stone-900">Priority Tasks</h3>
                    </div>
                    <button
                        onClick={() => onNavigate('TEAM')}
                        className="bg-black text-white px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all hover:bg-stone-800"
                    >
                        Team
                    </button>
                    <button
                        onClick={handleGenerateSummary}
                        className="bg-nobel-gold text-white px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider hover:brightness-90 flex items-center gap-1.5 ml-2 transition-colors"
                    >
                        <Sparkles className="w-3 h-3" /> Strategy
                    </button>
                </div>

                <div className="space-y-4 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.features
                            ?.filter((f: any) => (f.eisenhowerQuadrant === 'Do' || f.priority === 'High') && f.status !== 'Done')
                            .slice(0, 4)
                            .map((task: any) => {
                                let badgeColor = 'bg-stone-100 text-stone-600';
                                switch (task.eisenhowerQuadrant) {
                                    case 'Do': badgeColor = 'bg-emerald-100 text-emerald-700'; break;
                                    case 'Schedule': badgeColor = 'bg-blue-100 text-blue-700'; break;
                                    case 'Delegate': badgeColor = 'bg-amber-100 text-amber-700'; break;
                                    case 'Eliminate': badgeColor = 'bg-red-100 text-red-700'; break;
                                    default: badgeColor = 'bg-stone-100 text-stone-600';
                                }

                                return (
                                    <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg bg-stone-50 hover:bg-stone-100 transition-colors border border-stone-100 hover:border-stone-200 cursor-default">
                                        <div className={`mt-1.5 w-2 h-2 rounded-full ${task.eisenhowerQuadrant === 'Do' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                        <div className="flex-grow">
                                            <div className="flex items-start justify-between gap-2">
                                                <h4 className="text-sm font-bold text-stone-900 leading-tight line-clamp-2">{task.title}</h4>
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 ${badgeColor}`}>
                                                    {task.eisenhowerQuadrant || 'High'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-stone-500 mt-1 line-clamp-1">{task.description || 'No description'}</p>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>

                    {(!data.features || data.features.filter((f: any) => (f.eisenhowerQuadrant === 'Do' || f.priority === 'High') && f.status !== 'Done').length === 0) && (
                        <div className="text-center py-6 text-stone-400 text-sm italic">
                            No high priority tasks pending.<br />
                            <span className="text-xs opacity-70">Check your matrix or add new tasks.</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};
