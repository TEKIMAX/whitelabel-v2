import React from 'react';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';

interface HealthScoreProps {
    healthScore: number;
    setShowHealthSheet: (show: boolean) => void;
    getHealthColor: (score: number) => string;
    getHealthBg: (score: number) => string;
}

export const HealthScore: React.FC<HealthScoreProps> = ({
    healthScore,
    setShowHealthSheet,
    getHealthColor,
    getHealthBg
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col justify-center relative group"
        >
            <div className="absolute top-4 right-4 group/tip">
                <button
                    onClick={() => setShowHealthSheet(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white hover:bg-nobel-gold rounded-full transition-all text-[10px] font-bold uppercase tracking-wider"
                >
                    <Info className="w-3 h-3" />
                    View Details
                </button>
                <div className="absolute right-0 top-full mt-2 w-56 bg-stone-900 text-white text-[11px] leading-relaxed p-3 rounded-xl shadow-xl opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50">
                    Your Health Core score measures legal compliance, business registration, and operational readiness. Click to see a full breakdown.
                    <div className="absolute -top-1.5 right-4 w-3 h-3 bg-stone-900 rotate-45" />
                </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3">Health Score</p>
            <div className="flex items-baseline gap-2">
                {/* Removed font-serif */}
                <span className={`text-5xl font-bold ${getHealthColor(healthScore)}`}>{healthScore}</span>
                <span className="text-stone-300 text-lg">/100</span>
            </div>
            <div className="mt-4 h-2 bg-stone-100 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${healthScore}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className={`h-full rounded-full ${getHealthBg(healthScore)}`}
                />
            </div>
        </motion.div>
    );
};
