import React, { useState } from 'react';
import { Plus, Search, Filter, Paperclip, FileText, Link, Zap, Star, MapPin, Flag, List, X, Calendar, Activity, AlertTriangle, ShieldCheck, Trash2, Rocket, DollarSign, Users, PenTool, TrendingUp, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { StartupData, Milestone, TractionType } from '../../types';
import { MilestoneIcon } from './MilestoneIcon';
import { YEAR_THEMES } from './constants';
import { YearSegment } from './YearSegment';

interface TimelinePanelProps {
    data: StartupData;
    expandedYear: number | null;
    setExpandedYear: (year: number | null) => void;
    onEditMilestone: (milestone: Milestone) => void;
    onAddMilestone: () => void;
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
    data,
    expandedYear,
    setExpandedYear,
    onEditMilestone,
    onAddMilestone
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sheetMilestones, setSheetMilestones] = useState<Milestone[] | null>(null);
    const [showWhy, setShowWhy] = useState(false);

    const milestones = data.milestones || [];
    const foundingYear = data.foundingDate ? new Date(data.foundingDate).getFullYear() : new Date().getFullYear();

    // Calculate minYear considering both milestones and founding date
    const milestoneMinYear = milestones.length > 0 ? Math.min(...milestones.map(m => new Date(m.date).getFullYear())) : foundingYear;
    const minYear = Math.min(foundingYear, milestoneMinYear);

    const maxYear = Math.max(new Date().getFullYear() + 1, ...milestones.map(m => new Date(m.date).getFullYear()));
    const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

    const getYearColor = (year: number) => {
        const yearMilestones = milestones.filter(m => new Date(m.date).getFullYear() === year);
        if (yearMilestones.length === 0) return '#d6d3d1';

        // Priority 1: Check for explicit theme in ANY milestone of that year (Priority to Featured)
        const featuredWithTheme = yearMilestones.find(m => m.isFeatured && m.theme);
        if (featuredWithTheme && featuredWithTheme.theme && YEAR_THEMES[featuredWithTheme.theme as keyof typeof YEAR_THEMES]) {
            return YEAR_THEMES[featuredWithTheme.theme as keyof typeof YEAR_THEMES].color;
        }

        const anyWithTheme = yearMilestones.find(m => m.theme);
        if (anyWithTheme && anyWithTheme.theme && YEAR_THEMES[anyWithTheme.theme as keyof typeof YEAR_THEMES]) {
            return YEAR_THEMES[anyWithTheme.theme as keyof typeof YEAR_THEMES].color;
        }

        // Fallback: Default colors
        if (yearMilestones.some(m => m.tractionType === 'Traction')) return '#10b981';
        if (yearMilestones.some(m => m.tractionType === 'Pivot')) return '#f43f5e';
        return '#78716c';
    };

    const getTractionColorClass = (type?: TractionType) => {
        if (type === 'Traction') return 'border-emerald-500 text-emerald-600 bg-emerald-50';
        if (type === 'Pivot') return 'border-rose-500 text-rose-600 bg-rose-50';
        return 'border-stone-300 text-stone-600 bg-stone-50';
    };

    const getTractionDotClass = (type?: TractionType) => {
        if (type === 'Traction') return 'bg-emerald-500';
        if (type === 'Pivot') return 'bg-rose-500';
        return 'bg-stone-300';
    };

    const getMonthPosition = (monthIndex: number) => {
        return `${((monthIndex + 0.5) / 12) * 100}%`;
    };

    return (
        <div className="flex-1 w-full bg-nobel-cream relative flex flex-col h-full overflow-hidden">
            {/* Header Section */}
            <div className="w-full px-12 py-10 flex flex-col md:flex-row justify-between items-start z-20 relative bg-[#F9F8F4] border-b border-stone-200">
                <div className="mb-6 md:mb-0">
                    <h1 className="font-serif text-5xl text-stone-900 mb-2">Our Journey</h1>
                    <p className="text-stone-500 font-light">Timeline of pivots, traction, and key decisions.</p>
                </div>

                <div className="flex gap-4 items-end flex-col">
                    <button
                        onClick={onAddMilestone}
                        className="pl-3 pr-4 py-2 bg-stone-900 text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-nobel-gold transition-colors shadow-lg flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add Milestone
                    </button>

                    {/* Why Accordion */}
                    <div className="w-80 bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden transition-all group">
                        <button
                            onClick={() => setShowWhy(!showWhy)}
                            className="w-full px-5 py-3 flex justify-between items-center text-xs font-bold uppercase tracking-widest text-stone-500 hover:bg-stone-50 hover:text-nobel-gold transition-colors"
                        >
                            <span className="flex items-center gap-2"><Activity className="w-3 h-3" /> Why this matters</span>
                            <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${showWhy ? 'rotate-180' : ''}`} />
                        </button>
                        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${showWhy ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="px-5 pb-5 pt-4 text-xs text-stone-200 font-sans leading-relaxed bg-stone-900">
                                The founder journey is incredibly hard. Visualizing how far you've come provides a vital sense of accomplishment.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline Scroll Area */}
            <div className="flex-grow w-full flex items-center justify-start overflow-x-auto custom-scrollbar pb-10 px-8">
                <style>{`
                    .clip-arrow { clip-path: polygon(0% 0%, 95% 0%, 100% 50%, 95% 100%, 0% 100%, 5% 50%); }
                    .custom-scrollbar::-webkit-scrollbar { height: 6px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #d6d3d1; border-radius: 3px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                `}</style>

                <div className="flex items-center relative min-w-max mx-auto px-24 h-full pt-20">
                    <div className="h-1 w-24 bg-stone-300 rounded-r-full shrink-0 opacity-30"></div>

                    {years.map(year => {
                        const isExpanded = expandedYear === year;
                        const yearMs = milestones.filter(m => new Date(m.date).getFullYear() === year);

                        // Filter by search if active
                        const displayMs = searchTerm
                            ? yearMs.filter(m => m.title.toLowerCase().includes(searchTerm.toLowerCase()))
                            : yearMs;

                        if (searchTerm && displayMs.length === 0 && !isExpanded) return null; // Only hide if collapsed

                        const featuredYear = displayMs.filter(m => m.isFeatured);
                        const regularYear = displayMs.filter(m => !m.isFeatured);
                        const monthsData = Array.from({ length: 12 }, (_, i) => {
                            return {
                                monthIndex: i,
                                milestones: regularYear.filter(m => new Date(m.date).getMonth() === i)
                            };
                        }).filter(g => g.milestones.length > 0);

                        return (
                            <YearSegment
                                key={year}
                                year={year}
                                color={getYearColor(year)}
                                isExpanded={isExpanded}
                                onToggle={() => setExpandedYear(isExpanded ? null : year)}
                            >
                                {featuredYear.length > 0 && (
                                    featuredYear.length >= 2 ? (
                                        <div className="absolute bottom-full mb-8 left-1/2 -translate-x-1/2 flex flex-col items-center z-30 group cursor-pointer"
                                            onClick={(e) => { e.stopPropagation(); setSheetMilestones(featuredYear); }}>
                                            <MilestoneIcon type={featuredYear[0].type} isFeatured={true} count={featuredYear.length} />
                                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-3 bg-stone-900 text-white text-[10px] px-3 py-1.5 rounded-full whitespace-nowrap transition-opacity shadow-lg uppercase font-bold tracking-wider">
                                                {year} Highlights
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="absolute bottom-full mb-8 flex flex-col items-center z-30 group cursor-pointer"
                                            style={{ left: getMonthPosition(new Date(featuredYear[0].date).getMonth()) }}
                                            onClick={(e) => { e.stopPropagation(); setSheetMilestones(featuredYear); }}>
                                            <MilestoneIcon type={featuredYear[0].type} isFeatured={true} />
                                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-3 bg-stone-900 text-white text-[10px] px-3 py-1.5 rounded-full whitespace-nowrap transition-opacity shadow-lg uppercase font-bold tracking-wider">
                                                {featuredYear[0].title}
                                            </div>
                                        </div>
                                    )
                                )}

                                {monthsData.map(({ monthIndex, milestones }) => (
                                    <div
                                        key={monthIndex}
                                        className="absolute top-full mt-8 flex flex-col items-center z-20 group cursor-pointer"
                                        style={{ left: getMonthPosition(monthIndex) }}
                                        onClick={(e) => { e.stopPropagation(); setSheetMilestones(milestones); }}
                                    >
                                        <div className="absolute -top-8 w-px h-8 bg-stone-300 group-hover:bg-stone-400 transition-colors"></div>
                                        <div onClick={(e) => { e.stopPropagation(); setSheetMilestones(milestones); }}>
                                            <MilestoneIcon type={milestones[0].type} isFeatured={false} size="small" count={milestones.length} />
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 absolute top-full mt-3 bg-white border border-stone-200 text-stone-600 text-[10px] px-3 py-1.5 rounded-full whitespace-nowrap transition-opacity shadow-lg uppercase font-bold tracking-wider z-40">
                                            {milestones.length > 1 ? `${milestones.length} Events` : milestones[0].title}
                                        </div>
                                    </div>
                                ))}
                            </YearSegment>
                        );
                    })}

                    <div className="w-0 h-0 border-t-[32px] border-t-transparent border-l-[32px] border-l-stone-300 border-b-[32px] border-b-transparent ml-1 shrink-0 opacity-30"></div>
                </div>
            </div>

            {/* --- SIDE SHEET FOR DETAILS --- */}
            {sheetMilestones && (
                <div className="fixed inset-y-0 right-0 w-[450px] bg-stone-950 shadow-2xl z-50 transform transition-transform animate-in slide-in-from-right duration-300 border-l border-stone-800 flex flex-col">
                    <div className="p-6 border-b border-stone-800 flex justify-between items-center bg-stone-900/50 backdrop-blur">
                        <div className="flex items-center gap-2">
                            <List className="w-5 h-5 text-stone-500" />
                            <h3 className="font-serif text-xl text-white">Milestone Details</h3>
                        </div>
                        <button onClick={() => setSheetMilestones(null)} className="p-2 hover:bg-stone-800 rounded-full transition-colors text-stone-500 hover:text-white"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="flex-grow overflow-y-auto p-6 bg-stone-900">
                        <div className="space-y-10">
                            {sheetMilestones.sort((a, b) => b.date - a.date).map((m, idx) => {
                                const dotColorClass = getTractionDotClass(m.tractionType);
                                const borderClass = m.tractionType === 'Traction' ? 'border-emerald-900/50' : m.tractionType === 'Pivot' ? 'border-rose-900/50' : 'border-stone-800';

                                return (
                                    <div
                                        key={m.id}
                                        className={`relative pl-6 border-l-2 ${borderClass} transition-colors group cursor-pointer`}
                                        onClick={() => onEditMilestone(m)}
                                    >
                                        <div className={`absolute -left-[5px] top-0 w-2 h-2 rounded-full ${dotColorClass} group-hover:scale-125 transition-transform`}></div>

                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-serif font-bold text-lg leading-tight text-white transition-colors">
                                                    {m.title}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1.5 text-[10px] uppercase font-bold tracking-wider text-stone-500">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(m.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                                </div>
                                            </div>
                                            <button className="text-stone-600 opacity-0 group-hover:opacity-100 group-hover:text-white transition-all">
                                                <PenTool className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Badges */}
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            <span className="inline-flex items-center gap-1 text-[10px] bg-stone-900 text-stone-300 px-2 py-0.5 rounded border border-stone-800 font-bold uppercase tracking-wider shadow-sm">
                                                <Flag className="w-3 h-3 text-stone-500" /> {m.type}
                                            </span>
                                            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider shadow-sm ${m.tractionType === 'Traction' ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400' :
                                                    m.tractionType === 'Pivot' ? 'bg-rose-950/30 border-rose-900/50 text-rose-400' :
                                                        'bg-stone-900 border-stone-800 text-stone-400'
                                                }`}>
                                                {m.tractionType === 'Traction' ? <Activity className="w-3 h-3" /> : m.tractionType === 'Pivot' ? <AlertTriangle className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                                                {m.tractionType}
                                            </span>
                                            {m.isFeatured && (
                                                <span className="inline-flex items-center gap-1 text-[10px] bg-amber-950/30 text-amber-500 px-2 py-0.5 rounded border border-amber-900/50 font-bold uppercase tracking-wider shadow-sm">
                                                    <Star className="w-3 h-3 fill-current" /> Featured
                                                </span>
                                            )}
                                        </div>

                                        {m.imageUrl && (
                                            <div className="rounded-xl overflow-hidden border border-stone-800/50 mb-4 bg-stone-900/50 p-2">
                                                <img src={m.imageUrl} alt="Asset" className="w-full h-32 object-contain rounded-lg" />
                                            </div>
                                        )}

                                        {/* Linked Documents */}
                                        {m.documents && m.documents.length > 0 && (
                                            <div className="mb-4 bg-stone-900/30 rounded-lg p-3 border border-stone-800/50">
                                                <h5 className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1">
                                                    <Paperclip className="w-3 h-3" /> Reference Documents
                                                </h5>
                                                <div className="space-y-1.5">
                                                    {m.documents.map(doc => (
                                                        <a
                                                            key={doc.id}
                                                            href={doc.url || '#'}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 p-2 rounded-md border border-stone-800 bg-stone-900 hover:bg-stone-800 hover:border-stone-700 transition-all text-xs text-stone-300 group/doc"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {doc.type === 'Legal' ? <FileText className="w-3 h-3 text-stone-500 group-hover/doc:text-stone-300 transition-colors" /> : <Link className="w-3 h-3 text-stone-500 group-hover/doc:text-stone-300 transition-colors" />}
                                                            <span className="truncate flex-1 font-medium">{doc.name}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <p className="text-sm text-stone-400 leading-relaxed font-light mt-2">
                                            {m.description}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
