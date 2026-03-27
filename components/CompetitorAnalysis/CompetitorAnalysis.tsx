
import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from "../../convex/_generated/api";
import { StartupData, AISettings, Competitor, Slide, CanvasSection, CompetitorSubTab, RolePermissions } from '../../types';
import { generateCompetitorAnalysis, fillEmptyCompetitorCells, chatWithAIAnalyst } from '../../services/geminiService';
import { Plus, Check, ChevronDown, Loader2, Target, Trophy, Trash2, Edit2, Swords, Presentation, Sparkles, RefreshCw, X, Globe, Search, AlertTriangle, Send, LayoutGrid, Home } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import TabNavigation from '../TabNavigation';
import ProjectSelector from '../ProjectSelector';
import { Logo } from '../Logo';

interface CompetitorAnalysisProps {
    data: StartupData;
    allProjects: StartupData[];
    onUpdateProject: (updater: (project: StartupData) => StartupData) => void;
    onSwitchProject: (id: string) => void;
    onNewProject: () => void;
    onNavigate: (view: any) => void;
    onAddSlideToDeck: (slide: Slide) => void;
    currentView: any;
    settings: AISettings;
    allowedPages?: string[];
    permissions?: RolePermissions;
}

const deduplicateCompetitors = (competitors: any[]) => {

    const groups = new Map<string, any[]>();

    // 1. Group by normalized name
    competitors.forEach(c => {
        const key = c.name.trim().toLowerCase();
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(c);
    });

    // 2. Select best candidate for each group
    const uniqueConf = Array.from(groups.values()).map(backendList => {
        if (backendList.length === 1) return backendList[0];

        // Preference: Match Probability > Has Description > Has more keys > First one
        return backendList.reduce((best, current) => {
            const getProb = (item: any) => parseInt((item['Match Probability'] || "0").toString().replace(/\D/g, '')) || 0;

            const bestProb = getProb(best);
            const currProb = getProb(current);

            if (bestProb > currProb) return best;
            if (currProb > bestProb) return current;

            const bestDesc = best['Description'] || "";
            const currDesc = current['Description'] || "";

            const bestHasDesc = bestDesc && bestDesc !== "Empty";
            const currHasDesc = currDesc && currDesc !== "Empty";

            if (bestHasDesc && !currHasDesc) return best;
            if (!bestHasDesc && currHasDesc) return current;

            // Tie-breaker: More keys
            const bestKeys = Object.keys(best).length;
            const currKeys = Object.keys(current).length;

            return currKeys > bestKeys ? current : best;
        });
    });


    return uniqueConf;
};

const CompetitorAnalysis: React.FC<CompetitorAnalysisProps> = ({
    data,
    allProjects,
    onUpdateProject,
    onSwitchProject,
    onNewProject,
    onNavigate,
    onAddSlideToDeck,
    currentView,
    settings,
    allowedPages,
    permissions
}) => {
    // Permission Verification
    const canEdit = permissions ? (permissions.global?.edit ?? false) : true;

    const [showPrerequisitesDialog, setShowPrerequisitesDialog] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const saveAnalysis = useMutation(api.competitors.saveCompetitorAnalysisV2);

    const { attributes: rootAttributes, analysisSummary, subTabs: rootSubTabs, competitors: rootCompetitors } = data.competitorAnalysis || { attributes: [], analysisSummary: '', subTabs: [], competitors: [] };

    // Initialize tabs from data. If no subTabs, create a default "General" tab from root properties.
    const tabs = (rootSubTabs && rootSubTabs.length > 0)
        ? rootSubTabs
        : [{ id: 'tab_general', name: 'General', attributes: rootAttributes || [], competitors: rootCompetitors || [] }];

    const [activeTabId, setActiveTabId] = useState<string>(tabs[0]?.id || 'tab_general');

    // Derived state for current view
    const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
    const competitors = activeTab?.competitors || [];
    const attributes = activeTab?.attributes || rootAttributes || [];

    const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(null);
    const [editingCompetitor, setEditingCompetitor] = useState<Competitor | null>(null);
    const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());

    // Sync editingCompetitor when selectedCompetitorId changes
    React.useEffect(() => {
        if (selectedCompetitorId) {
            const comp = competitors.find(c => c.id === selectedCompetitorId);
            if (comp) {
                setEditingCompetitor(JSON.parse(JSON.stringify(comp)));
            }
        } else {
            setEditingCompetitor(null);
        }
    }, [selectedCompetitorId]); // Only sync on ID change, ignore background updates while editing

    const selectedCompetitor = editingCompetitor; // Use local state for rendering the sheet

    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [deleteAttributeTarget, setDeleteAttributeTarget] = useState<string | null>(null);

    const [showAddAttributeDialog, setShowAddAttributeDialog] = useState(false);
    const [newAttributeName, setNewAttributeName] = useState("");

    const [isInsightOpen, setIsInsightOpen] = useState(false);
    const [showContextWarning, setShowContextWarning] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [userQuestion, setUserQuestion] = useState("");
    const [isChatLoading, setIsChatLoading] = useState(false);

    const handleFollowUpChat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userQuestion.trim() || isChatLoading) return;

        const question = userQuestion;
        setUserQuestion("");
        setChatHistory(prev => [...prev, { role: 'user', content: question }]);
        setIsChatLoading(true);

        try {
            const response = await chatWithAIAnalyst(data, 'competitors', chatHistory, question, settings);
            setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (err) {
        } finally {
            setIsChatLoading(false);
        }
    };

    const performGeneration = async () => {
        setShowPrerequisitesDialog(false);
        setIsGenerating(true);

        // Check if we have existing competitors with empty cells
        const hasExistingCompetitors = competitors.length > 0;
        let hasEmptyCells = false;

        if (hasExistingCompetitors) {
            // Check for empty cells in existing competitors
            hasEmptyCells = competitors.some(c => {
                try {
                    const attrData = typeof c.attributesData === 'string'
                        ? JSON.parse(c.attributesData || '{}')
                        : c;
                    return attributes.some(attr =>
                        !attrData[attr] || attrData[attr] === '' || attrData[attr] === 'Empty'
                    );
                } catch {
                    return true;
                }
            });
        }

        // If we have competitors with empty cells, fill them instead of regenerating
        if (hasExistingCompetitors && hasEmptyCells) {
            try {
                const fillResult = await fillEmptyCompetitorCells(
                    data,
                    competitors.map(c => ({
                        id: c.id,
                        name: c.name,
                        attributesData: typeof c.attributesData === 'string'
                            ? c.attributesData
                            : JSON.stringify(c),
                        tabId: c.tabId
                    })),
                    attributes,
                    { ...settings, modelName: 'gpt-oss:120b-cloud' }
                );

                // Update with filled data
                const updatedCompetitors = fillResult.competitors.map((c: any) => {
                    const parsed = typeof c.attributesData === 'string'
                        ? JSON.parse(c.attributesData)
                        : c.attributesData || {};
                    return {
                        ...c,
                        ...parsed
                    };
                });

                const updatedTabs = tabs.map(t => {
                    if (t.id !== activeTabId) return t;

                    const comps = updatedCompetitors.filter((c: any) => c.tabId === t.id);

                    // Deduplicate
                    let uniqueComps = deduplicateCompetitors(comps);

                    // Sort by Match Probability (Descending)
                    uniqueComps = uniqueComps.sort((a, b) => {
                        const getProb = (item: any) => parseInt((item['Match Probability'] || "0").toString().replace(/\D/g, '')) || 0;
                        return getProb(b) - getProb(a);
                    });

                    return { ...t, competitors: uniqueComps };
                });

                const allCompetitors = updatedTabs.flatMap(t => t.competitors.map(c => ({ ...c, tabId: t.id })));

                onUpdateProject(p => ({
                    ...p,
                    competitorAnalysis: {
                        ...p.competitorAnalysis,
                        subTabs: updatedTabs,
                        competitors: allCompetitors
                    }
                }));

                await saveAnalysis({
                    projectId: data.id,
                    attributes: attributes,
                    analysisSummary: analysisSummary,
                    subTabs: updatedTabs.map(t => ({ id: t.id, name: t.name, attributes: t.attributes })),
                    competitors: allCompetitors.map(c => {
                        const { id, name, tabId, ...attrs } = c;
                        return {
                            id: c.id,
                            name: c.name,
                            tabId: tabId,
                            attributesData: JSON.stringify(attrs)
                        };
                    })
                });

                setIsGenerating(false);
                return;
            } catch (error) {
            }
        }

        // Full generation (no existing competitors or fallback)
        // Specific Override for Competitor Analysis as requested
        const ollamaSettings = { ...settings, modelName: 'gpt-oss:120b-cloud' };
        const result = await generateCompetitorAnalysis(data, ollamaSettings);

        // ... existing merge logic ...
        let mergedSubTabs = result.subTabs || [];

        if (mergedSubTabs.length > 0) {
            // If we got new subtabs, try to preserve IDs from existing tabs
            mergedSubTabs = mergedSubTabs.map(newTab => {
                const existingTab = tabs.find(t => t.id === newTab.id);
                if (!existingTab) return newTab;

                const mergedComps = newTab.competitors.map(newComp => {
                    const existingComp = existingTab.competitors.find(c => c.name === newComp.name);
                    return existingComp ? { ...newComp, id: existingComp.id } : newComp;
                });

                // Deduplicate (case-insensitive, trimmed, preferring content)
                let uniqueMergedComps = deduplicateCompetitors(mergedComps);

                // Sort by Match Probability (Descending)
                uniqueMergedComps = uniqueMergedComps.sort((a, b) => {
                    const getProb = (item: any) => parseInt((item['Match Probability'] || "0").toString().replace(/\D/g, '')) || 0;
                    return getProb(b) - getProb(a);
                });


                return { ...newTab, competitors: uniqueMergedComps };
            });
        } else {
            // Fallback if AI didn't return subTabs (error case or old prompt)
            // We just update the current tab or default tab
            const mergedComps = result.competitors.map(newComp => {
                const existing = competitors.find(c => c.name === newComp.name);
                return existing ? { ...newComp, id: existing.id } : newComp;
            });

            // Deduplicate mergedComps by name (case-insensitive, trimmed, preferring content)
            let uniqueMergedComps = deduplicateCompetitors(mergedComps);

            // Sort by Match Probability (Descending)
            uniqueMergedComps = uniqueMergedComps.sort((a, b) => {
                const getProb = (item: any) => parseInt((item['Match Probability'] || "0").toString().replace(/\D/g, '')) || 0;
                return getProb(b) - getProb(a);
            });


            mergedSubTabs = tabs.map(t => t.id === activeTabId ? {
                ...t,
                attributes: result.attributes,
                competitors: uniqueMergedComps
            } : t);
        }

        // Flatten competitors for legacy support and saving
        const allCompetitors = mergedSubTabs.flatMap(t => t.competitors.map(c => ({ ...c, tabId: t.id })));

        // Optimistic Update
        onUpdateProject(p => ({
            ...p,
            competitorAnalysis: {
                ...result,
                subTabs: mergedSubTabs,
                competitors: allCompetitors, // Update legacy list too
                attributes: mergedSubTabs.find(t => t.id === 'tab_competitors')?.attributes || result.attributes
            }
        }));

        // Persist to Backend
        await saveAnalysis({
            projectId: data.id,
            attributes: result.attributes, // Legacy
            analysisSummary: result.analysisSummary,
            subTabs: mergedSubTabs.map(t => ({ id: t.id, name: t.name, attributes: t.attributes })),
            competitors: allCompetitors.map(c => {
                const { id, name, tabId, ...attrs } = c;
                return {
                    id: c.id,
                    name: c.name,
                    tabId: tabId,
                    attributesData: JSON.stringify(attrs)
                };
            })
        });

        // Set active tab to first one if we generated new tabs
        if (mergedSubTabs.length > 0) {
            setActiveTabId(mergedSubTabs[0].id);
        }

        setIsGenerating(false);
    };

    const handleGenerate = async () => {
        if (!canEdit) return; // Guard clause

        // Validation: Check if there is enough context
        const hasProblem = !!data.canvas[CanvasSection.PROBLEM];
        const hasSolution = !!data.canvas[CanvasSection.SOLUTION];
        const hasMarket = !!data.market.tam;
        const hasRevenue = !!data.revenueModel.businessModelType;

        if (!hasProblem && !hasSolution) {
            setShowContextWarning(true);
            setTimeout(() => setShowContextWarning(false), 5000);
            return;
        }

        if (!hasMarket || !hasRevenue) {
            setShowPrerequisitesDialog(true);
            return;
        }

        await performGeneration();
    };

    const handleAddAttribute = () => {
        setNewAttributeName("");
        setShowAddAttributeDialog(true);
    };

    const confirmAddAttribute = async () => {
        if (newAttributeName && !attributes.includes(newAttributeName)) {
            const updatedAttributes = [...attributes, newAttributeName];
            const updatedCompetitors = competitors.map(c => ({
                ...c,
                [newAttributeName]: '' // Empty string initially
            }));

            // Update the current tab in the tabs list
            const updatedTabs = tabs.map(t => t.id === activeTabId ? {
                ...t,
                attributes: updatedAttributes,
                competitors: updatedCompetitors
            } : t);

            const allCompetitors = updatedTabs.flatMap(t => t.competitors.map(c => ({ ...c, tabId: t.id })));

            onUpdateProject(p => ({
                ...p,
                competitorAnalysis: {
                    ...p.competitorAnalysis,
                    subTabs: updatedTabs,
                    competitors: allCompetitors
                }
            }));

            // Persist
            await saveAnalysis({
                projectId: data.id,
                attributes: updatedAttributes, // Update legacy if it's the general tab, or just keep as is
                analysisSummary: analysisSummary,
                subTabs: updatedTabs.map(t => ({ id: t.id, name: t.name, attributes: t.attributes })),
                competitors: allCompetitors.map(c => {
                    const { id, name, tabId, ...attrs } = c;
                    return {
                        id: c.id,
                        name: c.name,
                        tabId: tabId,
                        attributesData: JSON.stringify(attrs)
                    };
                })
            });
            setShowAddAttributeDialog(false);
        }
    };

    const handleAddCompetitor = async () => {
        const newComp: Competitor = {
            id: Date.now().toString(),
            name: "New Competitor"
        };
        // Initialize empty attributes
        attributes.forEach(attr => newComp[attr] = "");

        const updatedCompetitors = [...competitors, newComp];

        // Update tabs
        const updatedTabs = tabs.map(t => t.id === activeTabId ? {
            ...t,
            competitors: updatedCompetitors
        } : t);

        const allCompetitors = updatedTabs.flatMap(t => t.competitors.map(c => ({ ...c, tabId: t.id })));

        onUpdateProject(p => ({
            ...p,
            competitorAnalysis: {
                ...p.competitorAnalysis,
                subTabs: updatedTabs,
                competitors: allCompetitors
            }
        }));

        // Open the sheet immediately for editing
        setSelectedCompetitorId(newComp.id);

        // Persist
        await saveAnalysis({
            projectId: data.id,
            attributes: attributes,
            analysisSummary: analysisSummary,
            subTabs: updatedTabs.map(t => ({ id: t.id, name: t.name, attributes: t.attributes })),
            competitors: allCompetitors.map(c => {
                const { id, name, tabId, ...attrs } = c;
                return {
                    id: c.id,
                    name: c.name,
                    tabId: tabId,
                    attributesData: JSON.stringify(attrs)
                };
            })
        });
    };

    const updateCompetitorValue = (compId: string, field: string, value: string) => {
        if (!editingCompetitor) return;
        setEditingCompetitor({ ...editingCompetitor, [field]: value });
    };

    const deleteCompetitor = (id: string) => {
        setDeleteTargetId(id);
    };

    const confirmDelete = async () => {
        if (!deleteTargetId) return;

        const updatedTabs = tabs.map(t => ({
            ...t,
            competitors: t.competitors.filter(c => c.id !== deleteTargetId)
        }));

        const allCompetitors = updatedTabs.flatMap(t => t.competitors.map(c => ({ ...c, tabId: t.id })));

        // Optimistic Update
        onUpdateProject(p => ({
            ...p,
            competitorAnalysis: {
                ...p.competitorAnalysis,
                subTabs: updatedTabs,
                competitors: allCompetitors
            }
        }));

        if (selectedCompetitorId === deleteTargetId) setSelectedCompetitorId(null);
        setDeleteTargetId(null);

        // Persist
        await saveAnalysis({
            projectId: data.id,
            attributes: attributes,
            analysisSummary: analysisSummary,
            subTabs: updatedTabs.map(t => ({ id: t.id, name: t.name, attributes: t.attributes })),
            competitors: allCompetitors.map(c => {
                const { id, name, tabId, ...attrs } = c;
                return {
                    id: c.id,
                    name: c.name,
                    tabId: tabId,
                    attributesData: JSON.stringify(attrs)
                };
            })
        });
    };

    const deleteAttribute = (attr: string) => {
        setDeleteAttributeTarget(attr);
    };

    const confirmDeleteAttribute = async () => {
        if (!deleteAttributeTarget) return;

        const updatedAttributes = attributes.filter(a => a !== deleteAttributeTarget);

        const updatedTabs = tabs.map(t => t.id === activeTabId ? {
            ...t,
            attributes: updatedAttributes
        } : t);

        const allCompetitors = updatedTabs.flatMap(t => t.competitors.map(c => ({ ...c, tabId: t.id })));

        onUpdateProject(p => ({
            ...p,
            competitorAnalysis: {
                ...p.competitorAnalysis,
                subTabs: updatedTabs,
                competitors: allCompetitors
            }
        }));

        // Persist
        await saveAnalysis({
            projectId: data.id,
            attributes: updatedAttributes,
            analysisSummary: analysisSummary,
            subTabs: updatedTabs.map(t => ({ id: t.id, name: t.name, attributes: t.attributes })),
            competitors: allCompetitors.map(c => {
                const { id, name, tabId, ...attrs } = c;
                return {
                    id: c.id,
                    name: c.name,
                    tabId: tabId,
                    attributesData: JSON.stringify(attrs)
                };
            })
        });

        setDeleteAttributeTarget(null);
    };

    const handleExportToDeck = () => {
        // Visual Slide Content: Clean, high-level list (better for slides)
        const slideContent = `## Competitive Landscape\n\n${competitors.map(c => {
            // Find a key differentiator attribute if possible, else just list name
            const diff = c['Differentiation'] || c[attributes[0]] || 'Direct Competitor';
            return `- **${c.name}**: ${diff}`;
        }).join('\n')}`;

        // Speaker Notes: The heavy detail goes here
        const tableRow = (c: Competitor) => `| ${c.name} | ${attributes.map(a => c[a] || '-').join(' | ')} |`;
        const headerRow = `| Competitor | ${attributes.join(' | ')} |`;
        const separatorRow = `| :--- | ${attributes.map(() => ':---').join(' | ')} |`;

        const fullTable = `${headerRow}\n${separatorRow}\n${competitors.map(tableRow).join('\n')}`;

        const notes = `**Strategic Analysis**\n${analysisSummary || "No summary available."}\n\n**Full Data Reference**\n${competitors.map(c => `${c.name}: ${attributes.map(a => `${a}=${c[a]}`).join(', ')}`).join('\n')}`;

        const slide: Slide = {
            id: 'slide-competition',
            title: 'Competition',
            content: slideContent,
            notes: notes,
            imagePrompt: "A strategic 2x2 matrix placing us in the top-right quadrant."
        };

        onAddSlideToDeck(slide);
        alert("Competitor slide updated in Pitch Deck! Detailed data moved to speaker notes.");
    };

    const handleBlurSave = async () => {
        if (!editingCompetitor) return;

        // 1. Update Global State (Optimistic)
        const updatedTabs = tabs.map(t => ({
            ...t,
            competitors: t.competitors.map(c => c.id === editingCompetitor.id ? editingCompetitor : c)
        }));

        const allCompetitors = updatedTabs.flatMap(t => t.competitors.map(c => ({ ...c, tabId: t.id })));

        onUpdateProject(p => ({
            ...p,
            competitorAnalysis: {
                ...p.competitorAnalysis,
                subTabs: updatedTabs,
                competitors: allCompetitors
            }
        }));

        // 2. Persist to Backend
        await saveAnalysis({
            projectId: data.id,
            attributes: attributes,
            analysisSummary: analysisSummary,
            subTabs: updatedTabs.map(t => ({ id: t.id, name: t.name, attributes: t.attributes })),
            competitors: allCompetitors.map(c => {
                const { id, name, tabId, ...attrs } = c;
                return {
                    id: c.id,
                    name: c.name,
                    tabId: tabId,
                    attributesData: JSON.stringify(attrs)
                };
            })
        });
    };

    return (
        <div className="min-h-screen flex flex-col bg-nobel-cream canvas-pattern text-stone-900 font-sans" style={{ backgroundSize: '24px 24px' }}>
            {/* Header */}
            <header className="px-6 py-4 bg-nobel-cream/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between border-b border-stone-200">
                <div className="flex items-center gap-4">

                    <div className="relative">

                        {/* HUB BUTTON REMOVED */}
                    </div>

                    <TabNavigation
                        currentView={currentView}
                        onNavigate={onNavigate}
                        allowedPages={allowedPages}
                        projectFeatures={{
                            canvasEnabled: data.canvasEnabled,
                        }}
                    />
                </div>

                <div className="flex items-center gap-3">
                    {selectedForDeletion.size > 0 && canEdit && (
                        <button
                            onClick={() => setShowDeleteDialog(true)}
                            className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete ({selectedForDeletion.size})
                        </button>
                    )}



                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !canEdit}
                        className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 shadow-sm
                            ${isGenerating || !canEdit
                                ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                                : 'bg-stone-900 text-white hover:bg-nobel-gold'
                            }`}
                        title={!canEdit ? "You do not have permission to generate analysis" : competitors.length > 0 ? "Fill empty cells using AI" : `Generate using ${settings.provider}`}
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : competitors.length > 0 ? <RefreshCw className="w-4 h-4" /> : <Swords className="w-4 h-4" />}
                        Deep Research
                    </button>
                </div>
            </header>

            <main className="flex-grow flex flex-col relative">
                {/* Active Header */}
                <div className="relative h-64 w-full bg-stone-900 overflow-hidden shrink-0">
                    <img
                        src="/images/ManTypingbyWindow.png"
                        alt="Competitive Landscape"
                        className="absolute inset-0 w-full h-full object-cover object-center opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-stone-900 via-stone-900/80 to-transparent"></div>
                    <div className="relative z-10 px-12 h-full flex flex-col justify-center max-w-7xl mx-auto w-full">
                        <span className="text-nobel-gold font-medium tracking-wider uppercase text-xs mb-2 block">Landscape</span>
                        <h2 className="text-4xl md:text-5xl font-serif text-white mb-2">Competitive Matrix</h2>
                        <p className="text-gray-300 text-lg">Analyze and outmaneuver the competition.</p>
                    </div>
                </div>

                <div className={`flex-grow p-8 md:p-12 transition-all duration-300 ${selectedCompetitorId ? 'mr-[450px]' : ''}`}>
                    <div className="max-w-[1400px] mx-auto">


                        <div className="mb-12 relative">
                            {/* Validation Warning Toast */}
                            {showContextWarning && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-full shadow-lg animate-in fade-in slide-in-from-top-2 z-50">
                                    <AlertTriangle className="w-5 h-5" />
                                    <span className="text-sm font-bold">Please fill the Canvas (Problem & Solution) first.</span>
                                </div>
                            )}
                        </div>

                        {/* AI Summary */}
                        {analysisSummary && (
                            <div className="bg-white rounded-xl border border-stone-200 shadow-sm mb-12 max-w-4xl mx-auto overflow-hidden">
                                <button
                                    onClick={() => setIsInsightOpen(!isInsightOpen)}
                                    className="w-full flex items-center justify-between p-6 hover:bg-stone-50 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Trophy className="w-5 h-5 text-nobel-gold" />
                                        <h3 className="text-xs font-serif font-bold tracking-widest text-stone-400">AI Analyst</h3>
                                    </div>
                                    <div className={`w-6 h-6 bg-stone-900 rounded-full flex items-center justify-center transition-transform duration-300 ${isInsightOpen ? '' : 'rotate-180'}`}>
                                        <ChevronDown className="w-4 h-4 text-white" />
                                    </div>
                                </button>

                                {isInsightOpen && (
                                    <div className="animate-in slide-in-from-top-2 duration-200 border-t border-stone-100 font-sans flex flex-col h-[500px]">
                                        <div className="flex-grow overflow-y-auto px-8 py-6 custom-scrollbar">
                                            <div className="prose prose-stone prose-sm max-w-none text-stone-700">
                                                <ReactMarkdown
                                                    components={{
                                                        h3: ({ children }) => <h3 className="text-sm font-bold uppercase tracking-widest text-stone-800 mt-4 mb-2 first:mt-0 flex items-center gap-2 font-serif">{children}</h3>,
                                                        p: ({ children }) => <p className="text-stone-600 text-sm leading-relaxed mb-3">{children}</p>,
                                                        ul: ({ children }) => <ul className="space-y-1 mb-4">{children}</ul>,
                                                        ol: ({ children }) => <ol className="space-y-2 mb-4 list-decimal list-inside">{children}</ol>,
                                                        li: ({ children }) => <li className="text-stone-600 text-sm leading-relaxed">{children}</li>,
                                                        strong: ({ children }) => {
                                                            const text = String(children);
                                                            // Detect money, percentages, or specific keywords for badges
                                                            const isMoney = text.includes('$');
                                                            const isPercent = text.includes('%');
                                                            const isChurn = text.toLowerCase().includes('churn');
                                                            const isGrowth = text.toLowerCase().includes('growth');

                                                            if (isMoney || isPercent || isChurn || isGrowth) {
                                                                return (
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mx-0.5 ${isChurn ? 'bg-red-50 text-red-700 border border-red-100' :
                                                                        isGrowth ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                                            isMoney ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                                                'bg-stone-100 text-stone-600 border border-stone-200'
                                                                        }`}>
                                                                        {children}
                                                                    </span>
                                                                );
                                                            }
                                                            return <strong className="font-bold text-stone-900">{children}</strong>;
                                                        },
                                                        code: ({ children }) => (
                                                            <span className="bg-stone-100 text-stone-800 px-1.5 py-0.5 rounded font-mono text-[11px] border border-stone-200">
                                                                {children}
                                                            </span>
                                                        )
                                                    }}
                                                >
                                                    {analysisSummary}
                                                </ReactMarkdown>
                                            </div>

                                            {/* Chat History */}
                                            {chatHistory.length > 0 && (
                                                <div className="mt-8 pt-8 border-t border-stone-100 space-y-6">
                                                    {chatHistory.map((msg, i) => (
                                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user'
                                                                ? 'bg-stone-900 text-white shadow-md'
                                                                : 'bg-stone-50 text-stone-700 border border-stone-100'
                                                                }`}>
                                                                {msg.role === 'assistant' ? (
                                                                    <ReactMarkdown
                                                                        components={{
                                                                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                                            strong: ({ children }) => <strong className="font-bold text-stone-900">{children}</strong>, // Reuse badge logic if needed, but for chat simple bold is fine or we can reuse.
                                                                        }}
                                                                    >
                                                                        {msg.content}
                                                                    </ReactMarkdown>
                                                                ) : (
                                                                    msg.content
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {isChatLoading && (
                                                        <div className="flex justify-start">
                                                            <div className="bg-stone-50 border border-stone-100 rounded-2xl px-4 py-3">
                                                                <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Chat Input - Fixed at bottom of section */}
                                        <div className="px-8 py-4 border-t border-stone-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] rounded-b-2xl">
                                            <form onSubmit={handleFollowUpChat} className="relative">
                                                <input
                                                    type="text"
                                                    value={userQuestion}
                                                    onChange={(e) => setUserQuestion(e.target.value)}
                                                    placeholder="Ask follow-up question about the analysis..."
                                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-4 pl-6 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-nobel-gold/20 focus:border-nobel-gold transition-all"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={isChatLoading || !userQuestion.trim()}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                >
                                                    {isChatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="flex items-center gap-2 mb-6 border-b border-stone-200">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTabId(tab.id)}
                                    className={`px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTabId === tab.id ? 'border-nobel-gold text-stone-900' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
                                >
                                    {tab.name}
                                </button>
                            ))}
                        </div>

                        {/* The Matrix */}
                        <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden mb-8">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="bg-[#F5F4F0]">
                                        <tr>
                                            <th className="w-12 px-6 py-5 border-b border-stone-200 border-r border-stone-100 text-center">
                                                {canEdit && (
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-stone-900 focus:ring-stone-500 cursor-pointer"
                                                        checked={competitors.length > 0 && selectedForDeletion.size === competitors.length}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedForDeletion(new Set(competitors.map(c => c.id)));
                                                            } else {
                                                                setSelectedForDeletion(new Set());
                                                            }
                                                        }}
                                                    />
                                                )}
                                            </th>
                                            <th className="px-6 py-5 border-b border-stone-200 border-r border-stone-100 font-bold uppercase text-[10px] tracking-widest text-stone-500 w-64 min-w-[200px]">Competitor</th>
                                            {attributes.map(attr => (
                                                <th key={attr} className={`px-6 py-5 border-b border-stone-200 border-r border-stone-100 font-bold uppercase text-[10px] tracking-widest text-stone-500 group relative ${attr === 'Description' ? 'min-w-[300px]' : attr.includes('Investor') ? 'min-w-[250px]' : 'min-w-[150px]'}`}>
                                                    <div className="flex justify-between items-center">
                                                        {attr}
                                                        {canEdit && (
                                                            <button onClick={(e) => { e.stopPropagation(); deleteAttribute(attr) }} className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="px-2 py-5 border-b border-stone-200 w-12 text-center">
                                                {canEdit && (
                                                    <button onClick={handleAddAttribute} title="Add Attribute / Column" className="p-1.5 bg-stone-50 border border-nobel-gold text-nobel-gold hover:bg-nobel-gold hover:text-white rounded-md transition-all shadow-sm">
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {competitors.length === 0 ? (
                                            <tr>
                                                <td colSpan={attributes.length + 3} className="p-12 text-center text-stone-400 italic">
                                                    No competitors in this tab yet.
                                                    <br />
                                                    {canEdit ? (
                                                        <>
                                                            <button onClick={handleGenerate} className="mt-2 text-nobel-gold hover:underline font-bold">Generate with AI</button>
                                                            <span className="mx-1">or</span>
                                                            <button onClick={handleAddCompetitor} className="text-stone-600 hover:text-stone-900 font-bold underline">Add Manually</button>.
                                                        </>
                                                    ) : (
                                                        <span className="mt-2 block text-xs">You do not have permission to add competitors.</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ) : (
                                            competitors.map((comp) => (
                                                <tr
                                                    key={comp.id}
                                                    onClick={() => setSelectedCompetitorId(comp.id)}
                                                    className={`group border-b border-stone-100 last:border-0 hover:bg-[#F9F8F4] transition-colors cursor-pointer ${selectedCompetitorId === comp.id ? 'bg-[#F5F4F0]' : ''} ${comp.name.includes('(Us)') ? 'bg-stone-50' : ''}`}
                                                >
                                                    <td className="px-6 py-4 border-r border-stone-100 text-center" onClick={(e) => e.stopPropagation()}>
                                                        {canEdit && (
                                                            <input
                                                                type="checkbox"
                                                                className="rounded border-gray-300 text-stone-900 focus:ring-stone-500 cursor-pointer"
                                                                checked={selectedForDeletion.has(comp.id)}
                                                                onChange={(e) => {
                                                                    const next = new Set(selectedForDeletion);
                                                                    if (e.target.checked) next.add(comp.id);
                                                                    else next.delete(comp.id);
                                                                    setSelectedForDeletion(next);
                                                                }}
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 border-r border-stone-100 font-serif font-bold text-stone-900 text-base">
                                                        {comp.name}
                                                    </td>
                                                    {attributes.map(attr => (
                                                        <td key={attr} className="px-6 py-4 border-r border-stone-100 relative group/cell">
                                                            <div className={`text-stone-600 ${attr === 'Description' ? 'line-clamp-4 leading-relaxed' : 'line-clamp-2'}`}>
                                                                {attr === 'Match Probability' && comp[attr] && comp[attr] !== 'Empty' ? (
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                                                                        {comp[attr]}
                                                                    </span>
                                                                ) : (
                                                                    comp[attr] || <span className="text-stone-200 italic">Empty</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    ))}
                                                    <td className="px-2 py-4 text-center">
                                                        {canEdit && (
                                                            <button onClick={(e) => { e.stopPropagation(); deleteCompetitor(comp.id); }} className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}

                                        {/* Add Row Button */}
                                        <tr>
                                            <td colSpan={attributes.length + 2} className="p-2">
                                                {canEdit && (
                                                    <button
                                                        onClick={handleAddCompetitor}
                                                        className="w-full py-3 border border-dashed border-stone-300 rounded-lg text-nobel-gold bg-stone-50/50 hover:bg-stone-50 hover:border-nobel-gold font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Plus className="w-4 h-4" /> Add Competitor
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Prerequisites Warning Dialog */}
                {showPrerequisitesDialog && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-stone-100 scale-100 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-3 mb-4 text-nobel-gold">
                                <div className="p-2 bg-stone-50 rounded-full border border-stone-100">
                                    <Sparkles className="w-6 h-6 text-nobel-gold" />
                                </div>
                                <h3 className="text-lg font-bold font-serif text-stone-900">Missing Context</h3>
                            </div>

                            <p className="text-stone-600 mb-8 leading-relaxed">
                                For best results, please fill out the <span className="font-bold text-stone-900">Market Research</span> and <span className="font-bold text-stone-900">Revenue Model</span> sections first.
                                <br /><br />
                                The AI uses this data to find relevant competitors effectively.
                            </p>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowPrerequisitesDialog(false)}
                                    className="px-4 py-2 text-stone-500 hover:text-stone-900 font-bold text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={performGeneration}
                                    className="px-6 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-bold text-sm shadow-sm transition-all transform active:scale-95 flex items-center gap-2"
                                >
                                    Generate Anyway <ChevronDown className="w-3 h-3 -rotate-90" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Competitor Confirmation Dialog */}
                {deleteTargetId && (
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-stone-100 scale-100 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-3 mb-4 text-red-600">
                                <div className="p-2 bg-red-50 rounded-full">
                                    <Trash2 className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold font-serif text-stone-900">Delete Competitor?</h3>
                            </div>

                            <p className="text-stone-600 mb-8 leading-relaxed">
                                Are you sure you want to delete <span className="font-bold text-stone-900">{competitors.find(c => c.id === deleteTargetId)?.name}</span>?
                                This action cannot be undone.
                            </p>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setDeleteTargetId(null)}
                                    className="px-4 py-2 text-stone-500 hover:text-stone-900 font-bold text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all transform active:scale-95"
                                >
                                    Delete Competitor
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Attribute Confirmation Dialog */}
                {deleteAttributeTarget && (
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-stone-100 scale-100 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-3 mb-4 text-red-600">
                                <div className="p-2 bg-red-50 rounded-full">
                                    <Trash2 className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold font-serif text-stone-900">Delete Column?</h3>
                            </div>

                            <p className="text-stone-600 mb-8 leading-relaxed">
                                Are you sure you want to delete the column <span className="font-bold text-stone-900">{deleteAttributeTarget}</span>?
                                This will remove this data for all competitors.
                            </p>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setDeleteAttributeTarget(null)}
                                    className="px-4 py-2 text-stone-500 hover:text-stone-900 font-bold text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDeleteAttribute}
                                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all transform active:scale-95"
                                >
                                    Delete Column
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Attribute Dialog */}
                {showAddAttributeDialog && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6">
                                <h3 className="font-serif text-xl text-stone-900 mb-4">Add New Attribute</h3>
                                <input
                                    type="text"
                                    value={newAttributeName}
                                    onChange={(e) => setNewAttributeName(e.target.value)}
                                    placeholder="e.g. Pricing, Funding, Technology"
                                    className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold mb-6"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && confirmAddAttribute()}
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowAddAttributeDialog(false)}
                                        className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-lg font-bold uppercase tracking-wider text-xs hover:bg-stone-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmAddAttribute}
                                        disabled={!newAttributeName}
                                        className="flex-1 py-3 bg-stone-900 text-white rounded-lg font-bold uppercase tracking-wider text-xs hover:bg-nobel-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Add Column
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Detail Sheet Overlay */}
                <div className={`fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl border-l border-stone-200 transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) z-40 overflow-y-auto ${selectedCompetitorId ? 'translate-x-0' : 'translate-x-full'}`}>
                    {selectedCompetitor ? (
                        <div className="flex flex-col h-full">
                            {/* Sheet Header */}
                            <div className="px-8 py-8 border-b border-stone-100 flex justify-between items-start bg-[#F9F8F4]">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Globe className="w-5 h-5 text-stone-400" />
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500">Competitor Profile</h3>
                                    </div>
                                    <input
                                        value={selectedCompetitor.name}
                                        onChange={(e) => canEdit && updateCompetitorValue(selectedCompetitor.id, 'name', e.target.value)}
                                        onBlur={handleBlurSave}
                                        className={`text-2xl font-serif text-stone-900 bg-transparent border-b border-transparent focus:border-stone-300 outline-none w-full ${!canEdit ? 'cursor-default' : ''}`}
                                        placeholder="Competitor Name"
                                        readOnly={!canEdit}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    {canEdit && (
                                        <button onClick={() => deleteCompetitor(selectedCompetitor.id)} className="text-stone-300 hover:text-red-500 p-2 hover:bg-white rounded-full transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button onClick={() => setSelectedCompetitorId(null)} className="text-stone-400 hover:text-stone-900 p-2 hover:bg-white rounded-full transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Sheet Content */}
                            <div className="p-8 flex-grow overflow-y-auto space-y-8">
                                <div className="space-y-6">
                                    {attributes.map(header => (
                                        <div key={header} className="group">
                                            <div className="flex justify-between items-baseline mb-2">
                                                <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-stone-400 group-hover:text-nobel-gold transition-colors">
                                                    {header}
                                                </label>
                                            </div>
                                            <textarea
                                                value={selectedCompetitor[header] || ''}
                                                onChange={(e) => canEdit && updateCompetitorValue(selectedCompetitor.id, header, e.target.value)}
                                                onBlur={handleBlurSave}
                                                className={`w-full p-4 bg-white border border-stone-200 rounded-lg text-sm min-h-[100px] resize-y focus:outline-none focus:border-nobel-gold transition-all text-stone-700 leading-relaxed placeholder-stone-300 font-sans ${!canEdit ? 'bg-stone-50 cursor-default focus:border-stone-200' : ''}`}
                                                placeholder={canEdit ? `Enter details for ${header}...` : ''}
                                                readOnly={!canEdit}
                                            />
                                        </div>
                                    ))}

                                    <div className="pt-6 border-t border-stone-100">
                                        {canEdit && (
                                            <button
                                                onClick={handleAddAttribute}
                                                className="w-full py-3 border border-dashed border-stone-200 text-stone-400 hover:text-nobel-gold hover:border-nobel-gold rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Plus className="w-3 h-3" /> Add New Attribute
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer with Save Button */}
                            {canEdit && (
                                <div className="p-6 border-t border-stone-200 bg-[#F9F8F4]">
                                    <button
                                        onClick={() => {
                                            handleBlurSave();
                                            setSelectedCompetitorId(null);
                                        }}
                                        className="w-full py-4 bg-nobel-gold hover:bg-stone-900 text-white rounded-lg font-bold uppercase tracking-widest text-sm shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-4 h-4" /> Save Competitor
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-stone-300">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    )}
                </div>
            </main>


            {/* Delete Confirmation Dialog */}
            {
                showDeleteDialog && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4 text-red-600">
                                    <div className="p-2 bg-red-100 rounded-full">
                                        <AlertTriangle className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-bold">Delete Competitors?</h3>
                                </div>
                                <p className="text-stone-600 mb-6">
                                    Are you sure you want to delete <strong>{selectedForDeletion.size}</strong> selected competitors? This action cannot be undone.
                                </p>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowDeleteDialog(false)}
                                        className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg font-bold text-sm transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            // Batch delete logic
                                            const updatedTabs = tabs.map(t => ({
                                                ...t,
                                                competitors: t.competitors.filter(c => !selectedForDeletion.has(c.id))
                                            }));
                                            const allCompetitors = updatedTabs.flatMap(t => t.competitors.map(c => ({ ...c, tabId: t.id })));

                                            onUpdateProject(p => ({
                                                ...p,
                                                competitorAnalysis: {
                                                    ...p.competitorAnalysis,
                                                    subTabs: updatedTabs,
                                                    competitors: allCompetitors
                                                }
                                            }));

                                            saveAnalysis({
                                                projectId: data.id,
                                                attributes: attributes, // Legacy
                                                analysisSummary: analysisSummary,
                                                subTabs: updatedTabs.map(t => ({ id: t.id, name: t.name, attributes: t.attributes })),
                                                competitors: allCompetitors.map(c => {
                                                    const { id, name, tabId, ...attrs } = c;
                                                    return { id: c.id, name: c.name, tabId: tabId, attributesData: JSON.stringify(attrs) };
                                                })
                                            });

                                            setSelectedForDeletion(new Set());
                                            setShowDeleteDialog(false);
                                        }}
                                        className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-bold text-sm transition-colors"
                                    >
                                        Delete {selectedForDeletion.size} Items
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default CompetitorAnalysis;
