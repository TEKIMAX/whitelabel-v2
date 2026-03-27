import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { toast } from 'sonner';

interface GoalSheetProps {
    isOpen: boolean;
    onClose: () => void;
    currentGoals: any[];
    onCreateGoal: (goalData: any) => Promise<void>;
    projectId: string;
}

export const GoalSheet: React.FC<GoalSheetProps> = ({
    isOpen,
    onClose,
    currentGoals,
    onCreateGoal,
    projectId
}) => {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('Product');
    const [dueDate, setDueDate] = useState('');
    const [keyResults, setKeyResults] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast.error("Please enter a goal title");
            return;
        }

        setIsSubmitting(true);
        try {
            await onCreateGoal({
                projectId,
                title,
                type: category,
                status: 'In Progress',
                timeframe: dueDate || 'Q1 2026',
                description: keyResults
            });
            // Reset and close
            setTitle('');
            setKeyResults('');
            setDueDate('');
            toast.success("New goal created successfully!");
            onClose();
        } catch (error) {
            toast.error("Failed to create goal. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="fixed top-0 right-0 h-full w-[30%] bg-stone-950 border-l border-stone-800 overflow-hidden flex flex-col z-50 shadow-2xl"
                >
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-stone-800 bg-stone-900/50 flex items-center justify-between">
                        <div>
                            <h3 className="font-serif text-xl text-white">Add Goal</h3>
                            <p className="text-xs text-stone-400 mt-1">Define what you want to achieve</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-stone-800 rounded-full"
                        >
                            <X className="w-4 h-4 text-stone-400" />
                        </button>
                    </div>

                    {/* Form */}
                    <div className="flex-grow overflow-y-auto p-8 space-y-6">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2 block">Goal</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="What do you want to achieve?"
                                className="w-full px-4 py-3 border border-stone-800 rounded-xl bg-stone-900 text-white placeholder-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-nobel-gold"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2 block">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-3 border border-stone-800 rounded-xl bg-stone-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-nobel-gold"
                            >
                                <option>Fundraising</option>
                                <option>Product</option>
                                <option>Growth</option>
                                <option>Team</option>
                                <option>Operations</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2 block">Due Date</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-4 py-3 border border-stone-800 rounded-xl bg-stone-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-nobel-gold"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2 block">Key Results</label>
                            <textarea
                                value={keyResults}
                                onChange={(e) => setKeyResults(e.target.value)}
                                placeholder="How will you measure success?"
                                rows={3}
                                className="w-full px-4 py-3 border border-stone-800 rounded-xl bg-stone-900 text-white placeholder-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-nobel-gold resize-none"
                            />
                        </div>

                        {/* Current Goals */}
                        <div className="pt-4 border-t border-stone-800">
                            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">Active Goals</p>
                            <div className="space-y-2">
                                {currentGoals?.filter(g => g.status === 'In Progress').map((goal) => (
                                    <div key={goal.id} className="px-4 py-3 bg-stone-900 rounded-xl flex items-center justify-between">
                                        <span className="text-sm text-stone-300 line-clamp-1">{goal.title}</span>
                                        <span className="text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-2 py-0.5 rounded-full flex-shrink-0">Active</span>
                                    </div>
                                ))}
                                {(!currentGoals || currentGoals.filter(g => g.status === 'In Progress').length === 0) && (
                                    <p className="text-xs text-stone-400 italic">No active goals found.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-6 border-t border-stone-800 bg-stone-900/50">
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className={`w-full px-4 py-3 bg-nobel-gold text-stone-900 hover:bg-yellow-600 rounded-full text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-xl shadow-nobel-gold/10 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" /> Submit Goal
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
