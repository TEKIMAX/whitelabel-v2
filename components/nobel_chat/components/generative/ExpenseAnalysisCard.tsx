import React from 'react';
import { DollarSign, PieChart, TrendingUp, AlertCircle, ArrowUpRight } from 'lucide-react';

interface CategoryData {
    name: string;
    amount: number;
    percentage: number;
}

interface TopExpense {
    name: string;
    amount: number;
}

interface ExpenseAnalysisCardProps {
    totalMonthly: number;
    totalOneTime: number;
    categories: CategoryData[];
    topExpenses: TopExpense[];
    summary: string;
}

const ExpenseAnalysisCard: React.FC<ExpenseAnalysisCardProps> = ({
    totalMonthly,
    totalOneTime,
    categories,
    topExpenses,
    summary
}) => {
    // Find highest spending category
    const topCategory = categories.reduce((prev, current) =>
        (prev.amount > current.amount) ? prev : current
        , categories[0] || { name: 'None', amount: 0, percentage: 0 });

    return (
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden font-sans">
            {/* Header */}
            <div className="bg-stone-50 border-b border-stone-100 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-stone-700 font-semibold">
                    <div className="p-2 bg-white rounded-lg border border-stone-200 shadow-sm text-green-600">
                        <DollarSign size={18} />
                    </div>
                    <span>Expense Analysis</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-stone-500 bg-white px-2 py-1 rounded-md border border-stone-200">
                    <PieChart size={14} />
                    <span>Burn Rate</span>
                </div>
            </div>

            <div className="p-6 space-y-8">
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-stone-900 to-stone-800 text-white shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <TrendingUp size={64} />
                        </div>
                        <p className="text-stone-400 text-xs font-medium uppercase tracking-wider mb-1">Monthly Burn Rate</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold font-serif table-nums">
                                ${totalMonthly.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-sm text-stone-400">/mo</span>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-stone-500 text-xs font-bold uppercase tracking-wider">Top Spender</p>
                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{topCategory.name}</span>
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-2xl font-bold text-stone-900 font-serif table-nums">
                                {topCategory.percentage.toFixed(0)}%
                            </span>
                            <span className="text-xs text-stone-500 mb-1">of total budget</span>
                        </div>
                        <div className="w-full bg-stone-100 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div
                                className="h-full bg-red-500 rounded-full"
                                style={{ width: `${Math.min(topCategory.percentage, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Breakdown & Top Expenses Split */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Categories */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                            <PieChart size={16} className="text-stone-400" /> Breakdown by Category
                        </h4>
                        <div className="space-y-3">
                            {categories.map((cat, i) => (
                                <div key={i} className="group">
                                    <div className="flex justify-between items-end mb-1 text-sm">
                                        <span className="text-stone-700 font-medium group-hover:text-stone-900 transition-colors">{cat.name}</span>
                                        <div className="text-right">
                                            <span className="text-stone-900 font-medium table-nums">${cat.amount.toLocaleString()}</span>
                                            <span className="text-stone-400 text-xs ml-1">({cat.percentage.toFixed(0)}%)</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ease-out group-hover:bg-nobel-gold ${i === 0 ? 'bg-stone-800' : 'bg-stone-400'}`}
                                            style={{ width: `${cat.percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Sheet */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                            <AlertCircle size={16} className="text-stone-400" /> High Impact Items
                        </h4>
                        <div className="bg-stone-50 rounded-xl p-1">
                            {topExpenses.slice(0, 4).map((exp, i) => (
                                <div key={i} className="flex items-center justify-between p-3 first:bg-white first:shadow-sm first:rounded-lg first:border first:border-stone-200 border-b border-stone-200/50 last:border-0 hover:bg-white/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-stone-300 w-4">{i + 1}.</span>
                                        <span className="text-sm font-medium text-stone-700">{exp.name}</span>
                                    </div>
                                    <span className="text-sm font-bold text-stone-900 font-serif table-nums">
                                        ${exp.amount.toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                        {totalOneTime > 0 && (
                            <div className="flex items-center justify-between text-xs text-stone-500 px-2 mt-2 pt-2 border-t border-stone-200 border-dashed">
                                <span>+ One-time costs</span>
                                <span className="font-medium">${totalOneTime.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Insight Footer */}
                <div className="bg-nobel-gold/10 rounded-xl p-4 flex gap-3 border border-nobel-gold/20">
                    <div className="shrink-0 mt-0.5">
                        <div className="w-5 h-5 rounded-full bg-nobel-gold flex items-center justify-center text-white shadow-sm">
                            <ArrowUpRight size={12} strokeWidth={3} />
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-nobel-dark uppercase tracking-wide mb-1">Analyst Insight</p>
                        <p className="text-sm text-stone-700 leading-relaxed italic pr-2">
                            "{summary}"
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpenseAnalysisCard;
