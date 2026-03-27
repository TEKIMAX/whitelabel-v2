
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ViewState, PageAccess } from '../types';
import {
    ChevronDown, ArrowLeft, LayoutTemplate, Globe, Target, Users, DollarSign,
    FileText, Briefcase, Code, Map, Folder, Scale, FileCheck, ShieldCheck,
    Clock, Settings, Swords, Plug, Laptop, PenTool, MessageSquare, Lock, Search, TrendingUp
} from 'lucide-react';
import { useEntitlements } from '../hooks/useEntitlements';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

interface TabNavigationProps {
    currentView: ViewState;
    onNavigate: (view: ViewState) => void;
    allowedPages?: string[]; // If undefined, allow all (or default)
    currentUserRole?: string;
    projectFeatures?: {
        canvasEnabled?: boolean;
        marketResearchEnabled?: boolean;
    };
    mode?: 'light' | 'dark';
}

export const TABS: { id: ViewState; label: string; icon: any; children?: { id: ViewState; label: string }[] }[] = [
    {
        id: 'MARKET',
        label: 'Research Hub',
        icon: Search,
        children: [
            // { id: 'MARKET', label: 'Hub Overview' },
            { id: 'MARKET_RESEARCH', label: 'Top-Down Sizing' },
            { id: 'BOTTOM_UP_SIZING', label: 'Bottom-Up Sizing' },
            { id: 'CUSTOMERS', label: 'Customer Discovery' },
            { id: 'COMPETITIVE_MATRIX', label: 'Competitive Matrix' },
            { id: 'CANVAS_LANDING', label: 'Business Model Canvas' },
        ]
    },
    {
        id: 'CANVAS',
        label: 'Strategy',
        icon: LayoutTemplate,
        children: [


            { id: 'GOALS', label: 'Goals & Objectives' },
            { id: 'CALENDAR', label: 'Calendar' },
            // { id: 'IDEATION', label: 'Ideation & Whiteboard' }, // Hidden for now
            { id: 'BUSINESS_PLAN_BUILDER', label: 'Business Plan Builder' },
            { id: 'JOURNEY', label: 'Startup Journey' },
        ]
    },
    {
        id: 'WORKSPACE', // Using WORKSPACE ID for Operations group to maintain compatibility if needed, or stick to simple ID
        label: 'Operations',
        icon: Briefcase,
        children: [
            { id: 'EISENHOWER', label: 'Priority Matrix' },
            { id: 'TEAM', label: 'Team & Roles' },
            { id: 'FILES', label: 'Files & Assets' },
            { id: 'LEGAL', label: 'Documents' },
            // { id: 'WIKI', label: 'Team Wiki' }, // Hidden for now
        ]
    },
    // Growth tab removed per user request
    {
        id: 'FORECASTING',
        label: 'Forecasting',
        icon: TrendingUp,
        children: [
            { id: 'REVENUE', label: 'Financial Forecast' },
            { id: 'EXPENSES', label: 'Operating Expenses' },
            { id: 'TOKEN_PRICING', label: 'Token Pricing' },
            { id: 'CALCULATOR_AI', label: 'Calculator AI' },
        ]
    },

    {
        id: 'AI_ASSISTANT',
        label: 'AI Assistant',
        icon: MessageSquare,
        children: [
            { id: 'AI_ASSISTANT', label: 'Adaptive Engine' },
            { id: 'HUMAN_AI_COOPERATION', label: 'Cooperation Report' },

        ]
    },
];

const TabNavigation: React.FC<TabNavigationProps> = ({ currentView, onNavigate, allowedPages, currentUserRole, projectFeatures, mode = 'light' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { tierName } = useEntitlements();
    const showTrialBadges = tierName === 'Explorer';

    // Read ALL page configs from Convex (synced from Customer Portal)
    // Pages NOT in Convex default to visible — only explicitly hidden pages are filtered out
    const allPageConfigs = useQuery(api.pageConfigs.getByOrg, { orgId: '_global' });
    const hiddenPageKeys = useMemo(() => {
        if (!allPageConfigs || allPageConfigs.length === 0) return null; // loading or no configs → show all defaults
        const hidden = new Set<string>();
        for (const p of allPageConfigs as any[]) {
            if (p.visible === false) hidden.add(p.pageKey);
        }
        return hidden;
    }, [allPageConfigs]);

    // Find active tab to auto-expand submenu
    const activeParentTab = TABS.find(t => t.children?.some(c => c.id === currentView));
    const [activeSubmenu, setActiveSubmenu] = useState<string | null>(activeParentTab?.id || null);

    // Auto-close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Find active tab, considering children
    let currentTab = TABS.find(t => t.id === currentView || t.children?.some(c => c.id === currentView));

    // Fallback for Startup Overview since it's removed from TABS
    if (!currentTab && currentView === 'STARTUP_OVERVIEW') {
        currentTab = { id: 'STARTUP_OVERVIEW', label: 'Startup Overview', icon: LayoutTemplate };
    }

    currentTab = currentTab || TABS[0];
    const currentChild = currentTab.children?.find(c => c.id === currentView);
    const displayLabel = currentChild ? `${currentTab.label} / ${currentChild.label}` : currentTab.label;

    // Filter tabs based on allowedPages
    // DEBUG: Expose to window
    try { (window as any).DEBUG_TABS = TABS; (window as any).DEBUG_ALLOWED = allowedPages; } catch (e) { }

    // BYPASS: If role is Founder or Admin, always allow all tabs --> REMOVED
    // We now rely on the parent (App.tsx) to pass the correct 'allowedPages' based on both RBAC and Subscription.
    // const isUnrestricted = currentUserRole === 'Founder' || currentUserRole === 'Admin';

    const visibleTabs = (allowedPages && !showTrialBadges)
        ? TABS.filter(t => {
            // Map tab ID (ViewState) to PageAccess string
            // e.g. 'CANVAS' -> 'Canvas'
            // We need to map both the parent tab and checks its children if any

            // Direct match check (for simple tabs)
            const permission = PageAccess[t.id as keyof typeof PageAccess];
            if (permission && allowedPages.includes(permission)) return true;

            // Check if ANY child is allowed (for grouped tabs)
            if (t.children) {
                return t.children.some(child => {
                    const childPermission = PageAccess[child.id as keyof typeof PageAccess];
                    return childPermission && allowedPages.includes(childPermission);
                });
            }

            return false;
        })
        : TABS;

    const filteredTabs = visibleTabs.filter(tab => {
        // 1. Check Feature Flags
        if (tab.id === 'CANVAS' && projectFeatures?.canvasEnabled === false) return false;
        if (tab.id === 'MARKET' && projectFeatures?.marketResearchEnabled === false) return false;

        if (tab.id === 'SETTINGS') {
            const normalizedRole = currentUserRole?.toLowerCase() || '';
            const isFounderOrAdmin = normalizedRole === 'founder' || normalizedRole === 'admin';
            if (!isFounderOrAdmin) return false;
        }

        return true;
    })
        // Filter by Convex page visibility (from Customer Portal page config)
        .map(tab => {
            if (!hiddenPageKeys || !tab.children) return tab;
            const visibleChildren = tab.children.filter(c => !hiddenPageKeys.has(c.id));
            // Always keep the group — show with filtered children (may be empty)
            return { ...tab, children: visibleChildren };
        });


    // Market Sub-tool Check
    const isMarketSubTool = ['MARKET_RESEARCH', 'BOTTOM_UP_SIZING', 'COMPETITIVE_MATRIX', 'CUSTOMERS'].includes(currentView);
    return (
        <div className="relative z-[50] flex items-center gap-3" ref={menuRef}>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="group flex items-center gap-2"
            >
                <div className={`flex items-center gap-3 px-4 py-2 backdrop-blur-xl border rounded-full shadow-sm transition-all duration-300 ${mode === 'dark'
                    ? 'bg-stone-900/50 border-white/10 hover:border-white/20'
                    : 'bg-white/80 border-slate-200 hover:border-slate-300'}`}>
                    <div className="flex items-center gap-2 font-sans text-xs uppercase tracking-widest">
                        <span className={`font-bold transition-colors ${mode === 'dark' ? 'text-white group-hover:text-nobel-gold' : 'text-slate-900 group-hover:text-nobel-gold'}`}>{currentTab.label}</span>
                        {currentChild && (
                            <>
                                <span className={`text-[10px] font-light ${mode === 'dark' ? 'text-white/30' : 'text-slate-300'}`}>/</span>
                                <span className={`${mode === 'dark' ? 'text-white/90' : 'text-slate-500'} font-medium`}>{currentChild.label}</span>
                            </>
                        )}
                    </div>
                    <div className={`ml-1 w-5 h-5 flex items-center justify-center rounded-full bg-stone-900 hover:bg-stone-800 shadow-sm transition-all ${isOpen ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-3 h-3 text-white" />
                    </div>
                </div>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden z-[100] py-2 max-h-[80vh] overflow-y-auto">
                    <div className="px-2 mb-2 flex gap-2">
                        <button
                            onClick={() => {
                                onNavigate('ONBOARDING');
                                setIsOpen(false);
                            }}
                            className="flex-1 px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-white bg-black hover:bg-stone-900 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Startups
                        </button>

                        <button
                            onClick={() => {
                                onNavigate('STARTUP_OVERVIEW');
                                setIsOpen(false);
                            }}
                            className="flex-1 px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-white bg-nobel-gold hover:bg-nobel-gold/90 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <LayoutTemplate className="w-3.5 h-3.5" />
                            Overview
                        </button>
                    </div>

                    <div className="h-px bg-stone-100 mx-4 mb-2"></div>

                    <div className="px-2 space-y-0.5">
                        {filteredTabs.map(tab => {
                            const Icon = tab.icon;
                            // Check if current view is this tab OR one of its children
                            const isActive = currentView === tab.id || tab.children?.some(c => c.id === currentView);

                            if (tab.children) {
                                const isSubmenuOpen = activeSubmenu === tab.id;
                                return (
                                    <div key={tab.id} className="space-y-0.5">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveSubmenu(isSubmenuOpen ? null : tab.id);
                                            }}
                                            className={`w-full px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${isActive ? 'text-stone-900 bg-stone-50' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-md flex items-center justify-center transition-all ${isActive
                                                    ? 'bg-white shadow-sm ring-1 ring-stone-200 text-stone-900'
                                                    : 'bg-transparent text-stone-400'
                                                    }`}>
                                                    <Icon strokeWidth={isActive ? 2 : 1.5} className="w-4 h-4" />
                                                </div>
                                                <span className="font-bold">{tab.label}</span>
                                            </div>
                                            <div className="ml-1 rounded-full bg-nobel-gold p-0.5">
                                                <ChevronDown className={`w-3 h-3 text-white transition-transform ${isSubmenuOpen ? 'rotate-180' : ''}`} />
                                            </div>
                                        </button>

                                        {isSubmenuOpen && (
                                            <div className="ml-3 mr-1 pl-3 pr-2 py-2 mb-1 mt-0.5 space-y-0.5 bg-stone-50/80 rounded-xl animate-in slide-in-from-top-1 duration-200 border border-stone-100">
                                                {tab.children.length === 0 ? (
                                                    <div className="px-3 py-2 text-xs text-stone-400 italic">No pages enabled</div>
                                                ) : tab.children.map(child => {
                                                    const isChildActive = currentView === child.id;

                                                    // Helper to check precise permission for child
                                                    const childPermission = PageAccess[child.id as keyof typeof PageAccess];
                                                    const isChildAllowed = !allowedPages || (childPermission && allowedPages.includes(childPermission));

                                                    return (
                                                        <button
                                                            key={child.id}
                                                            onClick={() => {
                                                                onNavigate(child.id);
                                                                setIsOpen(false);
                                                            }}
                                                            className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-all flex items-center justify-between ${isChildActive
                                                                ? 'bg-white shadow-sm text-stone-900 font-bold ring-1 ring-stone-200/50'
                                                                : 'text-stone-500 hover:text-stone-900 hover:bg-white hover:shadow-sm'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {showTrialBadges && !isChildAllowed && <Lock className="w-3 h-3 text-nobel-gold" />}
                                                                <span className={showTrialBadges && !isChildAllowed ? "text-stone-400" : ""}>{child.label}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {child.id === 'ADAPTIVE_LEARNING' ? (
                                                                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-nobel-gold text-white">
                                                                        Coming Soon
                                                                    </span>
                                                                ) : (showTrialBadges && !isChildAllowed) && (
                                                                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-nobel-gold text-white">
                                                                        Pro
                                                                    </span>
                                                                )}
                                                                {isChildActive && <div className="w-1.5 h-1.5 bg-stone-900 rounded-full" />}
                                                            </div>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // Check permission for single tabs
                            const permission = PageAccess[tab.id as keyof typeof PageAccess];
                            const isAllowed = !allowedPages || (permission && allowedPages.includes(permission));

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        onNavigate(tab.id);
                                        setIsOpen(false);
                                    }}
                                    className={`group w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${isActive
                                        ? 'bg-stone-100 text-stone-900'
                                        : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-md flex items-center justify-center transition-all ${isActive
                                            ? 'bg-white shadow-sm ring-1 ring-stone-200 text-stone-900'
                                            : 'bg-transparent text-stone-400 group-hover:bg-white group-hover:text-stone-600 group-hover:shadow-sm group-hover:ring-1 group-hover:ring-stone-200'
                                            }`}>
                                            <Icon strokeWidth={isActive ? 2 : 1.5} className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={isActive ? 'font-bold' : 'font-medium'}>
                                                {tab.label}
                                            </span>
                                        </div>
                                    </div>

                                    {showTrialBadges && !isAllowed && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-nobel-gold text-white">
                                                Pro
                                            </span>
                                            <Lock className="w-3 h-3 text-stone-400" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TabNavigation;