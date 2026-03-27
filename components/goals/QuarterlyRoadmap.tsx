import React, { useMemo, useState } from 'react';
import {
    Target, TrendingUp, AlertTriangle, CheckCircle2, Plus, ChevronRight,
    Calendar, BarChart3, Zap, Eye, Filter, Check
} from 'lucide-react';
import { Goal } from '../../types';

interface QuarterlyRoadmapProps {
    goals: Goal[];
    year?: number;
    onEditGoal: (goalId: string) => void;
    onAddGoal: (status?: string) => void;
    onUpdateGoal?: (goalId: string, updates: Partial<Goal>) => void;
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

const QUARTER_MONTHS: Record<string, string> = {
    Q1: 'Jan — Mar',
    Q2: 'Apr — Jun',
    Q3: 'Jul — Sep',
    Q4: 'Oct — Dec',
};

function getCurrentQuarter(): string {
    const month = new Date().getMonth();
    if (month < 3) return 'Q1';
    if (month < 6) return 'Q2';
    if (month < 9) return 'Q3';
    return 'Q4';
}

function calculateGoalProgress(goal: Goal): number {
    const krs = goal.keyResults || [];
    if (krs.length === 0) return 0;
    return Math.round(
        krs.reduce((acc, kr) => acc + Math.min(100, (kr.current / (kr.target || 1)) * 100), 0) / krs.length
    );
}

function computeHealth(goal: Goal): 'on_track' | 'at_risk' | 'behind' {
    if (goal.health) return goal.health as any;
    const progress = calculateGoalProgress(goal);
    const now = new Date();
    const currentQ = getCurrentQuarter();
    const goalQ = goal.quarter || currentQ;

    // If the goal's quarter is in the past
    const qIndex = QUARTERS.indexOf(goalQ as any);
    const currentQIndex = QUARTERS.indexOf(currentQ as any);

    if (qIndex < currentQIndex) {
        // Past quarter
        if (goal.status === 'Completed' || progress >= 90) return 'on_track';
        if (progress >= 50) return 'at_risk';
        return 'behind';
    }

    // Current quarter — check if progress matches expected pace
    if (qIndex === currentQIndex) {
        const monthInQuarter = now.getMonth() % 3;
        const expectedProgress = ((monthInQuarter + 1) / 3) * 100;
        if (progress >= expectedProgress * 0.7) return 'on_track';
        if (progress >= expectedProgress * 0.4) return 'at_risk';
        return 'behind';
    }

    // Future quarter
    return 'on_track';
}

const HEALTH_CONFIG = {
    on_track: {
        label: 'On Track',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        icon: CheckCircle2,
    },
    at_risk: {
        label: 'At Risk',
        color: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        icon: AlertTriangle,
    },
    behind: {
        label: 'Behind',
        color: 'text-red-700',
        bg: 'bg-red-50',
        border: 'border-red-200',
        dot: 'bg-red-500',
        icon: AlertTriangle,
    },
};

export const QuarterlyRoadmap: React.FC<QuarterlyRoadmapProps> = ({
    goals,
    year,
    onEditGoal,
    onAddGoal,
    onUpdateGoal,
}) => {
    const currentYear = year || new Date().getFullYear();
    const currentQuarter = getCurrentQuarter();
    const [expandedQuarters, setExpandedQuarters] = useState<string[]>(['Q1', 'Q2']);
    const [visibleQuarters, setVisibleQuarters] = useState<string[]>(['Q1']);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [hoveredGoal, setHoveredGoal] = useState<string | null>(null);

    // Filter and organize goals by quarter
    const quarterData = useMemo(() => {
        const data: Record<string, Goal[]> = { Q1: [], Q2: [], Q3: [], Q4: [] };

        // Include goals that have a quarter assigned, or map from timeframe
        goals
            .filter(g => !g.archived)
            .forEach(g => {
                const quarter = g.quarter || (g.timeframe === 'Quarterly' ? getCurrentQuarter() : null);
                const goalYear = g.year || currentYear;
                if (quarter && goalYear === currentYear && data[quarter]) {
                    data[quarter].push(g);
                }
            });

        return data;
    }, [goals, currentYear]);

    // Compute overall stats
    const stats = useMemo(() => {
        const allQuarterGoals = Object.values(quarterData).flat();
        const totalGoals = allQuarterGoals.length;
        const avgProgress = totalGoals > 0
            ? Math.round(allQuarterGoals.reduce((sum, g) => sum + calculateGoalProgress(g), 0) / totalGoals)
            : 0;

        const healthCounts = { on_track: 0, at_risk: 0, behind: 0 };
        allQuarterGoals.forEach(g => {
            const h = computeHealth(g);
            healthCounts[h]++;
        });

        // Gap analysis
        const gaps: { label: string; severity: 'high' | 'medium' | 'low'; detail: string }[] = [];

        // Check for empty quarters
        QUARTERS.forEach(q => {
            const qIndex = QUARTERS.indexOf(q);
            const currentQIndex = QUARTERS.indexOf(currentQuarter as any);
            if (qIndex >= currentQIndex && quarterData[q].length === 0) {
                gaps.push({
                    label: `No goals set for ${q}`,
                    severity: qIndex === currentQIndex ? 'high' : 'medium',
                    detail: `Set objectives for ${q} to maintain momentum`,
                });
            }
        });

        // Check for behind goals
        if (healthCounts.behind > 0) {
            gaps.push({
                label: `${healthCounts.behind} goal${healthCounts.behind > 1 ? 's' : ''} behind schedule`,
                severity: 'high',
                detail: 'Review and adjust targets or allocate more resources',
            });
        }

        if (healthCounts.at_risk > 0) {
            gaps.push({
                label: `${healthCounts.at_risk} goal${healthCounts.at_risk > 1 ? 's' : ''} at risk`,
                severity: 'medium',
                detail: 'Monitor closely and consider intervention',
            });
        }

        return { totalGoals, avgProgress, healthCounts, gaps };
    }, [quarterData, currentQuarter]);

    return (
        <div className="animate-in fade-in duration-500 pb-20 space-y-6">
            {/* ── Year Header & Progress ── */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-stone-400 mb-1">Strategic Roadmap</div>
                        <h2 className="font-serif text-3xl text-stone-900">{currentYear} Annual Goals</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-3">
                            {Object.entries(HEALTH_CONFIG).map(([key, config]) => (
                                <div key={key} className="flex items-center gap-1.5">
                                    <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                        {config.label} ({stats.healthCounts[key as keyof typeof stats.healthCounts]})
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex-grow">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Yearly Progress</span>
                            <span className="font-mono text-lg font-bold text-stone-900">{stats.avgProgress}%</span>
                        </div>
                        <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                style={{
                                    width: `${stats.avgProgress}%`,
                                    background: stats.avgProgress >= 70
                                        ? 'linear-gradient(90deg, #059669, #10b981)'
                                        : stats.avgProgress >= 40
                                            ? 'linear-gradient(90deg, #D4AF37, #E5C158)'
                                            : 'linear-gradient(90deg, #dc2626, #ef4444)',
                                }}
                            />
                        </div>
                    </div>
                    <div className="bg-stone-50 px-4 py-2 rounded-xl border border-stone-100 text-center min-w-[80px]">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Goals</div>
                        <div className="font-mono text-xl font-bold text-stone-900">{stats.totalGoals}</div>
                    </div>
                </div>

                {/* Gap Analysis */}
                {stats.gaps.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {stats.gaps.slice(0, 3).map((gap, idx) => (
                            <div
                                key={idx}
                                className={`p-3 rounded-xl border ${gap.severity === 'high'
                                        ? 'bg-red-50/50 border-red-100'
                                        : gap.severity === 'medium'
                                            ? 'bg-amber-50/50 border-amber-100'
                                            : 'bg-blue-50/50 border-blue-100'
                                    }`}
                            >
                                <div className="flex items-start gap-2">
                                    <div className={`mt-0.5 ${gap.severity === 'high' ? 'text-red-500' : gap.severity === 'medium' ? 'text-amber-500' : 'text-blue-500'
                                        }`}>
                                        {gap.severity === 'high' ? <AlertTriangle size={14} /> : <Eye size={14} />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-stone-800">{gap.label}</p>
                                        <p className="text-[10px] text-stone-500 mt-0.5">{gap.detail}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Quarter Filters ── */}
            <div className="flex items-center gap-2 mb-4">
                <div className="relative">
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${visibleQuarters.length < 4 ? 'bg-nobel-gold text-white shadow-md' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                    >
                        <Filter className="w-4 h-4" />
                        Filter Quarters {visibleQuarters.length < 4 && `(${visibleQuarters.length})`}
                    </button>
                    
                    {isFilterOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                            <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-stone-200 p-2 z-50 min-w-[220px] flex flex-col gap-1">
                                <button
                                    onClick={() => setVisibleQuarters([...QUARTERS])}
                                    className="flex items-center gap-3 w-full px-3 py-2 text-left rounded-lg hover:bg-stone-50 transition-colors"
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${visibleQuarters.length === 4 ? 'bg-nobel-gold border-nobel-gold' : 'border-stone-300 bg-white'}`}>
                                        {visibleQuarters.length === 4 && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className="text-xs font-bold text-stone-700 capitalize">All Quarters</span>
                                </button>
                                <div className="h-px bg-stone-100 my-1 mx-2" />
                                {QUARTERS.map(q => {
                                    const isSelected = visibleQuarters.length < 4 && visibleQuarters.includes(q);
                                    return (
                                        <button
                                            key={q}
                                            onClick={() => {
                                                if (visibleQuarters.length === 4) setVisibleQuarters([q]);
                                                else if (visibleQuarters.includes(q)) {
                                                    if (visibleQuarters.length > 1) setVisibleQuarters(prev => prev.filter(x => x !== q));
                                                    else setVisibleQuarters([...QUARTERS]); // Reset to all
                                                }
                                                else setVisibleQuarters(prev => [...prev, q]);
                                            }}
                                            className="flex items-center gap-3 w-full px-3 py-2 text-left rounded-lg hover:bg-stone-50 transition-colors"
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-nobel-gold border-nobel-gold' : 'border-stone-300 bg-white'}`}>
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className="text-xs font-bold text-stone-600 capitalize">
                                                {q} <span className="font-normal text-stone-400 capitalize ml-1">({QUARTER_MONTHS[q]})</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── Quarter Accordions ── */}
            <div className={`grid gap-4 xl:gap-6 items-start ${visibleQuarters.length === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
                {QUARTERS.filter(q => visibleQuarters.includes(q)).map(q => {
                    const isCurrentQ = q === currentQuarter;
                    const qGoals = quarterData[q];
                    const isExpanded = expandedQuarters.includes(q);
                    const qProgress = qGoals.length > 0
                        ? Math.round(qGoals.reduce((s, g) => s + calculateGoalProgress(g), 0) / qGoals.length)
                        : 0;
                    const qIndex = QUARTERS.indexOf(q);
                    const currentQIndex = QUARTERS.indexOf(currentQuarter as any);
                    const isPast = qIndex < currentQIndex;

                    const completed = qGoals.filter(g => g.status === 'Completed').length;
                    const inProgress = qGoals.filter(g => g.status === 'In Progress').length;
                    const upcoming = qGoals.filter(g => g.status === 'Upcoming').length;
                    const totalKRs = qGoals.reduce((sum, g) => sum + (g.keyResults?.length || 0), 0);

                    return (
                        <div
                            key={q}
                            className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isCurrentQ
                                    ? 'border-nobel-gold shadow-md'
                                    : 'border-stone-200 bg-white'
                                }`}
                        >
                            {/* Accordion Header */}
                            <button
                                onClick={() => setExpandedQuarters(prev => isExpanded ? prev.filter(x => x !== q) : [...prev, q])}
                                className={`w-full text-left px-5 md:px-6 py-4 md:py-5 flex items-center justify-between transition-colors focus:outline-none focus:bg-stone-50 ${isCurrentQ ? 'bg-gradient-to-r from-[#F5EFD4]/30 to-white hover:from-[#F5EFD4]/50' : 'hover:bg-stone-50/80'}`}
                            >
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className={`hidden md:flex p-2.5 rounded-xl border ${isCurrentQ ? 'bg-nobel-gold/10 border-nobel-gold/30 text-nobel-gold' : 'bg-stone-50 border-stone-200 text-stone-400'}`}>
                                        <Calendar size={18} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h3 className={`font-serif text-xl md:text-2xl font-bold ${isCurrentQ ? 'text-nobel-gold' : 'text-stone-900'}`}>{q}</h3>
                                            {isCurrentQ && <span className="text-[9px] font-bold uppercase tracking-widest bg-nobel-gold text-stone-900 px-2 py-0.5 rounded-full">Current</span>}
                                            {isPast && <span className="text-[9px] font-bold uppercase tracking-widest bg-stone-100 text-stone-400 px-2 py-0.5 rounded-full">Past</span>}
                                        </div>
                                        <span className="text-[10px] md:text-[11px] font-bold text-stone-400 uppercase tracking-[0.15em]">{QUARTER_MONTHS[q]}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 md:gap-8">
                                    <div className="flex flex-col items-end">
                                        <span className="font-mono text-lg md:text-xl font-bold text-stone-900">{qProgress}%</span>
                                        <div className="w-16 md:w-24 bg-stone-100 h-1 md:h-1.5 rounded-full overflow-hidden mt-1 md:mt-1.5">
                                            <div className={`h-full rounded-full transition-all duration-700 ${isCurrentQ ? 'bg-nobel-gold' : isPast ? 'bg-stone-400' : 'bg-emerald-500'}`} style={{ width: `${qProgress}%` }} />
                                        </div>
                                    </div>
                                    <div className={`p-1.5 rounded-full transition-colors ${isExpanded ? 'bg-stone-100' : 'bg-transparent'}`}>
                                        <ChevronRight size={18} className={`text-stone-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                                    </div>
                                </div>
                            </button>

                            {/* Accordion Body */}
                            {isExpanded && (
                                <div className="p-4 md:p-6 border-t border-stone-100 bg-stone-50/50 animate-in slide-in-from-top-4 fade-in duration-300">
                                    
                                    {/* Summary Stats moved here inside the accordion */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
                                        <div className="bg-white p-3 md:p-4 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between">
                                            <div>
                                                <div className="text-[9px] md:text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-1">Completed</div>
                                                <div className="font-mono text-xl md:text-2xl font-bold text-emerald-600">{completed}</div>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><CheckCircle2 size={16} /></div>
                                        </div>
                                        <div className="bg-white p-3 md:p-4 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between">
                                            <div>
                                                <div className="text-[9px] md:text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-1">Active</div>
                                                <div className="font-mono text-xl md:text-2xl font-bold text-amber-600">{inProgress}</div>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600"><TrendingUp size={16} /></div>
                                        </div>
                                        <div className="bg-white p-3 md:p-4 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between">
                                            <div>
                                                <div className="text-[9px] md:text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-1">Planned</div>
                                                <div className="font-mono text-xl md:text-2xl font-bold text-stone-600">{upcoming}</div>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500"><Calendar size={16} /></div>
                                        </div>
                                        <div className="bg-white p-3 md:p-4 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between">
                                            <div>
                                                <div className="text-[9px] md:text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-1">Key Results</div>
                                                <div className="font-mono text-xl md:text-2xl font-bold text-blue-600">{totalKRs}</div>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Target size={16} /></div>
                                        </div>
                                    </div>

                                    {/* Goals Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {qGoals.length === 0 ? (
                                            <div className="col-span-full flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-dashed border-stone-200 text-center">
                                                <div className="w-12 h-12 bg-stone-50 rounded-xl flex items-center justify-center mb-4">
                                                    <Target className="w-6 h-6 text-stone-300" />
                                                </div>
                                                <p className="text-sm font-medium text-stone-600 mb-1">No goals set for {q}</p>
                                                <p className="text-[11px] text-stone-400 max-w-xs mb-4">Set clear objectives to keep your team aligned and moving forward this quarter.</p>
                                                <button
                                                    onClick={() => onAddGoal('Upcoming')}
                                                    className="text-xs font-bold uppercase tracking-wider bg-black text-white px-4 py-2 rounded-lg hover:bg-stone-800 transition-colors flex items-center gap-1.5"
                                                >
                                                    <Plus size={12} /> Add Objective
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                {qGoals.map(goal => {
                                                    const progress = calculateGoalProgress(goal);
                                                    const health = computeHealth(goal);
                                                    const hConfig = HEALTH_CONFIG[health];
                                                    const HealthIcon = hConfig.icon;
                                                    const isHovered = hoveredGoal === goal.id;

                                                    return (
                                                        <div
                                                            key={goal.id}
                                                            onClick={() => onEditGoal(goal.id)}
                                                            onMouseEnter={() => setHoveredGoal(goal.id)}
                                                            onMouseLeave={() => setHoveredGoal(null)}
                                                            className={`p-4 flex flex-col justify-between rounded-xl border cursor-pointer transition-all duration-300 group ${isHovered
                                                                    ? 'border-nobel-gold shadow-md bg-white -translate-y-0.5'
                                                                    : `${hConfig.border} bg-white hover:border-stone-300`
                                                                }`}
                                                        >
                                                            <div>
                                                                {/* Top row: type badge + health badge */}
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${goal.type === 'Strategic'
                                                                            ? 'bg-purple-50 text-purple-600'
                                                                            : goal.type === 'Objective'
                                                                                ? 'bg-blue-50 text-blue-600'
                                                                                : 'bg-stone-50 text-stone-500'
                                                                        }`}>
                                                                        {goal.type}
                                                                    </span>
                                                                    <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${hConfig.bg} ${hConfig.color}`}>
                                                                        <HealthIcon size={10} />
                                                                        {hConfig.label}
                                                                    </span>
                                                                </div>

                                                                {/* Title */}
                                                                <h4 className="text-sm font-bold text-stone-900 leading-snug mb-3 line-clamp-2 md:line-clamp-3 group-hover:text-nobel-gold transition-colors">
                                                                    {goal.title}
                                                                </h4>
                                                            </div>

                                                            <div>
                                                                {/* Progress bar */}
                                                                <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden mb-3">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all duration-500 ${health === 'on_track' ? 'bg-emerald-500'
                                                                                : health === 'at_risk' ? 'bg-amber-500'
                                                                                    : 'bg-red-500'
                                                                            }`}
                                                                        style={{ width: `${progress}%` }}
                                                                    />
                                                                </div>

                                                                {/* Bottom row: KRs + progress */}
                                                                <div className="flex items-center justify-between text-[10px] text-stone-500">
                                                                    <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                                                                        <Target size={12} className="text-stone-400" />
                                                                        {goal.keyResults?.length || 0} KRs
                                                                    </span>
                                                                    <span className="font-mono font-bold text-stone-900 text-xs">{progress}%</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                
                                                {/* Add goal button at end of grid */}
                                                <button
                                                    onClick={() => onAddGoal('Upcoming')}
                                                    className="w-full min-h-[160px] p-4 border-2 border-dashed border-stone-200 rounded-xl text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-nobel-gold hover:border-nobel-gold/50 hover:bg-nobel-gold/5 transition-all flex flex-col items-center justify-center gap-2 group"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-stone-50 group-hover:bg-nobel-gold/10 flex items-center justify-center transition-colors">
                                                        <Plus size={16} />
                                                    </div>
                                                    Add Objective
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Info footer ── */}
            <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-stone-400 px-2 pt-4">
                <Zap className="w-3.5 h-3.5 text-nobel-gold" />
                <span>Health badges auto-compute from Key Result progress. Click any goal to update progress.</span>
            </div>
        </div>
    );
};

export default QuarterlyRoadmap;
