import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from "../convex/_generated/api";
import { StartupData, AISettings, RolePermissions, Slide } from '../types';
import { Plus, Trash2, Loader2, Search, ChevronLeft, ChevronRight, Sparkles, RefreshCw, X, Filter, Edit3, Check, Swords, LayoutGrid, Home } from 'lucide-react';
import TabNavigation from './TabNavigation';
import ProjectSelector from './ProjectSelector';
import { Logo } from './Logo';
import AttributionBadge from './AttributionBadge';
import { toast } from 'sonner';
import { generateCompetitorAnalysis, fillEmptyCompetitorCells } from '../services/geminiService';
import { useCreateManualCompetitor } from '../hooks/useCreate';
import { useUpdateManualCompetitor } from '../hooks/useUpdate';
import { useBulkDeleteCompetitors } from '../hooks/useDelete';
import { ModelSelect } from './ModelSelector';
import { useActiveModel } from '../hooks/useActiveModel';
import { Id } from '../convex/_generated/dataModel';
import DotPatternBackground from './DotPatternBackground';

// Hardcoded columns - the system expects these
const COMPETITOR_COLUMNS = [
    { key: 'name', label: 'Competitor', width: 'w-48', editable: true },
    { key: 'Description', label: 'Description', width: 'min-w-[250px]', editable: true },
    { key: 'Focus', label: 'Focus', width: 'w-40', editable: true },
    { key: 'Technology', label: 'Technology', width: 'w-40', editable: true },
    { key: 'Differentiation', label: 'Differentiation', width: 'min-w-[200px]', editable: true },
    { key: 'Match Probability', label: 'Match %', width: 'w-32', editable: false }, // AI-only
];

interface CompetitiveMatrixProps {
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

const CompetitiveMatrix: React.FC<CompetitiveMatrixProps> = ({
    data, allProjects, onUpdateProject, onSwitchProject, onNewProject, onNavigate, onAddSlideToDeck, currentView, settings, allowedPages, permissions
}) => {
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [attributionFilter, setAttributionFilter] = useState<'all' | 'ai' | 'human'>('all');
    const [isGenerating, setIsGenerating] = useState(false);

    const { activeModel, capabilities } = useActiveModel();
    const hasTools = capabilities.includes('tools') || capabilities.includes('websearch');
    const modifiedSettings = { ...settings, modelName: activeModel || settings.modelName };

    // Accuracy filter (Match Probability)
    const [minAccuracy, setMinAccuracy] = useState(0);

    // Multi-select for bulk delete
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // Add dialog state
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [addForm, setAddForm] = useState<Record<string, string>>({ name: '', Description: '', Focus: '', Technology: '', Differentiation: '' });

    // Edit dialog state
    const [editingCompetitor, setEditingCompetitor] = useState<any | null>(null);
    const [editForm, setEditForm] = useState<Record<string, string>>({});

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Expanded descriptions
    const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

    // Permissions
    const canEdit = permissions ? (permissions.global?.edit ?? false) : true;

    // Fetch competitors from Convex
    const competitors = useQuery(api.manual_competitors.listManualCompetitors,
        data?.id ? { projectId: data.id } : "skip"
    ) || [];

    const addCompetitor = useCreateManualCompetitor();
    const updateCompetitor = useUpdateManualCompetitor();
    const bulkDeleteCompetitors = useBulkDeleteCompetitors();

    // Filter competitors
    const filteredCompetitors = competitors.filter((c: any) => {
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
        const isAI = c.source === 'AI' || c.tags?.includes('AI Assisted');
        const isHuman = c.source === 'Human' || c.tags?.includes('Human');
        const matchesFilter = attributionFilter === 'all' ||
            (attributionFilter === 'ai' && isAI) ||
            (attributionFilter === 'human' && isHuman);

        // Accuracy filter - parse match probability and filter
        let matchesAccuracy = true;
        if (minAccuracy > 0) {
            const matchProb = c['Match Probability'] || c.matchProbability || '';
            const numericValue = parseFloat(matchProb.toString().replace('%', ''));
            matchesAccuracy = !isNaN(numericValue) && numericValue >= minAccuracy;
        }

        return matchesSearch && matchesFilter && matchesAccuracy;
    });

    // Pagination
    const totalPages = Math.ceil(filteredCompetitors.length / itemsPerPage);
    const paginatedCompetitors = filteredCompetitors.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Toggle single selection
    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    // Toggle all
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredCompetitors.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredCompetitors.map((c: any) => c.id)));
        }
    };

    // Open Add Competitor dialog
    const handleAddCompetitor = () => {
        setAddForm({ name: '', Description: '', Focus: '', Technology: '', Differentiation: '' });
        setShowAddDialog(true);
    };

    // Submit Add Competitor
    const handleSubmitAdd = async () => {
        if (!addForm.name.trim()) {
            toast.error('Competitor name is required');
            return;
        }
        try {
            await addCompetitor({
                projectId: data.id,
                name: addForm.name,
                description: addForm.Description,
                focus: addForm.Focus,
                technology: addForm.Technology,
                differentiation: addForm.Differentiation,
                source: 'Human',
            });
            toast.success('Competitor added!');
            setShowAddDialog(false);
            setAddForm({ name: '', Description: '', Focus: '', Technology: '', Differentiation: '' });
        } catch (error: any) {
            toast.error(`Failed to add: ${error.message}`);
        }
    };

    // Bulk delete
    const handleBulkDelete = async () => {
        try {
            const ids = Array.from(selectedIds) as Id<"competitors">[];
            await bulkDeleteCompetitors({ ids });
            toast.success(`Deleted ${selectedIds.size} competitors`);
            setSelectedIds(new Set());
            setShowDeleteDialog(false);
        } catch (error: any) {
            toast.error(`Delete failed: ${error.message}`);
        }
    };

    // Open edit dialog
    const handleEdit = (competitor: any) => {
        setEditingCompetitor(competitor);
        setEditForm({
            name: competitor.name || '',
            Description: competitor.Description || '',
            Focus: competitor.Focus || '',
            Technology: competitor.Technology || '',
            Differentiation: competitor.Differentiation || '',
        });
    };

    // Save edit
    const handleSaveEdit = async () => {
        if (!editingCompetitor) return;

        try {
            const { name, ...attrs } = editForm;
            await updateCompetitor({
                id: editingCompetitor.id as Id<"competitors">,
                updates: {
                    name: name,
                    description: attrs.Description,
                    focus: attrs.Focus,
                    technology: attrs.Technology,
                    differentiation: attrs.Differentiation,
                }
            });
            toast.success('Competitor updated!');
            setEditingCompetitor(null);
            setEditForm({});
        } catch (error: any) {
            toast.error(`Update failed: ${error.message}`);
        }
    };

    // Deep Research - AI generation
    const handleDeepResearch = async () => {
        if (!data || isGenerating) return;
        setIsGenerating(true);

        try {
            toast.info('Starting AI Deep Research...');

            const result = await generateCompetitorAnalysis(
                data,
                modifiedSettings
            );

            if (result.competitors && result.competitors.length > 0) {
                // Add each AI-generated competitor with all fields
                for (const comp of result.competitors) {
                    await addCompetitor({
                        projectId: data.id,
                        name: comp.name || 'Unknown Competitor',
                        description: comp.Description || comp.description || '',
                        website: comp.Website || comp.website || '',
                        source: 'AI',
                        focus: comp.Focus || comp.focus || '',
                        technology: comp.Technology || comp.technology || '',
                        differentiation: comp.Differentiation || comp.differentiation || '',
                        matchProbability: comp['Match Probability'] || comp.matchProbability || '',
                    });
                }
                toast.success(`Added ${result.competitors.length} competitors from AI research!`);
            } else {
                toast.info('No new competitors found.');
            }
        } catch (error: any) {
            toast.error(`AI Research failed: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-nobel-cream canvas-pattern overflow-hidden">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-3 border-b border-stone-200 bg-white/80 backdrop-blur-sm shrink-0 z-50">
                <div className="flex items-center gap-4">
                    <Logo imageClassName="h-8 w-auto" />
                    <div className="h-6 w-px bg-stone-200" />
                    {/* ProjectSelector temporarily disabled
                    */}
                    <TabNavigation onNavigate={onNavigate} currentView={currentView} allowedPages={allowedPages} />
                </div>

                <div className="flex items-center gap-3">
                    <ModelSelect className="w-48" />

                    {/* Bulk Delete Button */}
                    {selectedIds.size > 0 && canEdit && (
                        <button
                            onClick={() => setShowDeleteDialog(true)}
                            className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-red-200 transition-colors flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" /> Delete ({selectedIds.size})
                        </button>
                    )}

                    {/* HUB BUTTON REMOVED */}

                    {/* Deep Research Button */}
                    {canEdit && (
                        <div className="relative group/tooltip">
                            <button
                                onClick={handleDeepResearch}
                                disabled={isGenerating || !hasTools}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors border shadow-sm ${
                                    isGenerating || !hasTools
                                        ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                                        : 'bg-stone-900 border-stone-800 text-white hover:bg-black hover:text-nobel-gold'
                                }`}
                            >
                                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
                                Deep Research
                            </button>
                            {!isGenerating && !hasTools && (
                                <div className="absolute top-full mt-2 right-0 bg-stone-900 text-white text-[10px] px-3 py-1.5 rounded-md whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-50 pointer-events-none">
                                    Selected model does not support tool calling.
                                </div>
                            )}
                        </div>
                    )}

                    {canEdit && (
                        <button
                            onClick={handleAddCompetitor}
                            className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors border shadow-sm bg-nobel-gold border-nobel-gold text-white hover:bg-[#a68546] hover:border-[#a68546]"
                        >
                            <Plus className="w-4 h-4" /> Add
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-grow flex overflow-hidden relative">
                {/* Left Panel - AI Analysis Report (only shown when expanded) */}
                {!isLeftCollapsed && (
                    <div className="w-96 bg-white border-r border-stone-200 flex flex-col shrink-0 overflow-y-auto">
                        <div className="p-6 space-y-6">
                            {/* AI Analysis Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-stone-900">
                                    <Sparkles className="w-5 h-5 text-nobel-gold" />
                                    <span className="text-lg font-bold font-serif">AI Analysis Report</span>
                                </div>
                                <button
                                    onClick={() => setIsLeftCollapsed(true)}
                                    className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors"
                                >
                                    <X className="w-4 h-4 text-nobel-gold" />
                                </button>
                            </div>

                            <div className="p-4 space-y-4 overflow-y-auto flex-grow">


                                {/* Stats Overview */}
                                <div className="bg-stone-50 rounded-lg p-4 space-y-3">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Overview</div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="text-center p-2 bg-white rounded-lg border border-stone-100">
                                            <div className="text-2xl font-bold text-stone-900">{competitors.length}</div>
                                            <div className="text-[10px] uppercase tracking-wide text-stone-400">Total</div>
                                        </div>
                                        <div className="text-center p-2 bg-white rounded-lg border border-stone-100">
                                            <div className="text-2xl font-bold text-nobel-gold">{competitors.filter((c: any) => c.source === 'AI').length}</div>
                                            <div className="text-[10px] uppercase tracking-wide text-stone-400">AI Found</div>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Recommendations */}
                                <div className="space-y-3">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Recommendations</div>

                                    {competitors.length === 0 ? (
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                            <div className="flex items-start gap-2">
                                                <Swords className="w-4 h-4 text-amber-600 mt-0.5" />
                                                <div>
                                                    <div className="text-sm font-bold text-amber-800">Run Deep Research</div>
                                                    <div className="text-xs text-amber-700 mt-1">Use AI to discover competitors in your market.</div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                                <div className="flex items-start gap-2">
                                                    <Check className="w-4 h-4 text-green-600 mt-0.5" />
                                                    <div>
                                                        <div className="text-sm font-bold text-green-800">Strong Position</div>
                                                        <div className="text-xs text-green-700 mt-1">You have {competitors.length} competitors mapped.</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                <div className="flex items-start gap-2">
                                                    <Sparkles className="w-4 h-4 text-blue-600 mt-0.5" />
                                                    <div>
                                                        <div className="text-sm font-bold text-blue-800">Key Insight</div>
                                                        <div className="text-xs text-blue-700 mt-1">Focus on differentiating through technology and customer experience.</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Market Landscape */}
                                <div className="pt-4 border-t border-stone-100 space-y-3">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Market Landscape</div>
                                    <div className="text-xs text-stone-600 leading-relaxed">
                                        {competitors.length > 0
                                            ? `Your competitive landscape includes ${competitors.length} identified players. ${competitors.filter((c: any) => c.source === 'AI').length > 0 ? 'AI-discovered competitors may have gaps - consider filling in missing data manually.' : 'All entries are manually verified.'}`
                                            : 'No competitors mapped yet. Start by running Deep Research or adding competitors manually.'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Right Panel - Table */}
                <div className="flex-grow p-8 overflow-auto relative">
                    <DotPatternBackground className="opacity-30" color="#a8a29e" />
                    {/* Toggle Button - Show Report (only when collapsed) */}
                    {isLeftCollapsed && (
                        <button
                            onClick={() => setIsLeftCollapsed(false)}
                            className="absolute top-1/2 -translate-y-1/2 left-4 p-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white transition-all z-20 shadow-lg"
                            title="Show AI Analysis Report"
                        >
                            <ChevronRight className="w-5 h-5 text-white" />
                        </button>
                    )}

                    <div className="max-w-[1400px] mx-auto">
                        {/* Header with Search & Filter */}
                        <div className="flex items-start justify-between mb-8">
                            <div>
                                <h1 className="text-3xl font-serif text-stone-900 mb-2">Competitive Matrix</h1>
                                <p className="text-stone-500">Track and analyze your competitors in one place.</p>
                            </div>

                            {/* Search & Filter moved here */}
                            <div className="flex items-center gap-4">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-48 pl-10 pr-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-nobel-gold bg-white"
                                    />
                                </div>

                                {/* Filter Tabs */}
                                <div className="flex bg-stone-100 p-1 rounded-lg">
                                    {(['all', 'ai', 'human'] as const).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setAttributionFilter(type)}
                                            className={`px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${attributionFilter === type
                                                ? 'bg-white text-stone-900 shadow-sm'
                                                : 'text-stone-500 hover:text-stone-700'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>

                                {/* Accuracy Filter Slider */}
                                <div className="flex items-center gap-3 bg-white border border-stone-200 rounded-lg px-3 py-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 whitespace-nowrap">Min Match %</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={minAccuracy}
                                        onChange={(e) => setMinAccuracy(parseInt(e.target.value))}
                                        className="w-24 h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-nobel-gold"
                                    />
                                    <span className="text-xs font-bold text-nobel-gold min-w-[36px]">{minAccuracy}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="bg-[#F5F4F0]">
                                        <tr>
                                            {/* Checkbox Column */}
                                            <th className="w-12 px-4 py-4 border-b border-stone-200 text-center">
                                                {canEdit && (
                                                    <input
                                                        type="checkbox"
                                                        checked={filteredCompetitors.length > 0 && selectedIds.size === filteredCompetitors.length}
                                                        onChange={toggleSelectAll}
                                                        className="rounded border-stone-300 text-stone-900 focus:ring-stone-500 cursor-pointer"
                                                    />
                                                )}
                                            </th>
                                            {COMPETITOR_COLUMNS.map(col => (
                                                <th key={col.key} className={`px-6 py-4 border-b border-stone-200 font-bold uppercase text-[10px] tracking-widest text-stone-500 ${col.width}`}>
                                                    {col.label}
                                                </th>
                                            ))}
                                            <th className="px-4 py-4 border-b border-stone-200 font-bold uppercase text-[10px] tracking-widest text-stone-500 w-24">Source</th>
                                            <th className="px-4 py-4 border-b border-stone-200 w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCompetitors.length === 0 ? (
                                            <tr>
                                                <td colSpan={COMPETITOR_COLUMNS.length + 3} className="p-12 text-center text-stone-400">
                                                    No competitors yet.
                                                    {canEdit && (
                                                        <>
                                                            <button onClick={handleAddCompetitor} className="ml-2 text-nobel-gold hover:underline font-bold">
                                                                Add one manually
                                                            </button>
                                                            <span className="mx-2">or</span>
                                                            <button onClick={handleDeepResearch} className="text-stone-700 hover:underline font-bold">
                                                                Run Deep Research
                                                            </button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedCompetitors.map((comp: any) => {
                                                const isAI = comp.source === 'AI' || comp.tags?.includes('AI Assisted');
                                                const isHumanEdited = comp.tags?.includes('Human Edited');

                                                // Determine badge type
                                                let badgeType: 'AI Assisted' | 'Human' | 'Human Edited' = 'Human';
                                                if (isAI && isHumanEdited) {
                                                    badgeType = 'Human Edited';
                                                } else if (isAI) {
                                                    badgeType = 'AI Assisted';
                                                }

                                                return (
                                                    <tr key={comp.id} className={`border-b border-stone-100 hover:bg-stone-50 group ${selectedIds.has(comp.id) ? 'bg-stone-50' : ''}`}>
                                                        {/* Checkbox */}
                                                        <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                            {canEdit && (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedIds.has(comp.id)}
                                                                    onChange={() => toggleSelect(comp.id)}
                                                                    className="rounded border-stone-300 text-stone-900 focus:ring-stone-500 cursor-pointer"
                                                                />
                                                            )}
                                                        </td>
                                                        {COMPETITOR_COLUMNS.map(col => {
                                                            const cellKey = `${comp.id}-${col.key}`;
                                                            const cellValue = comp[col.key];
                                                            const isLongText = cellValue && typeof cellValue === 'string' && cellValue.length > 100;
                                                            const isExpanded = expandedDescriptions.has(cellKey);

                                                            return (
                                                                <td key={col.key} className="px-6 py-4">
                                                                    {col.key === 'name' ? (
                                                                        <span className="font-bold text-stone-900">
                                                                            {cellValue || <span className="text-stone-300 italic">-</span>}
                                                                        </span>
                                                                    ) : col.key === 'Match Probability' ? (
                                                                        <span className="text-stone-600">
                                                                            {cellValue || <span className="text-stone-300 italic">-</span>}
                                                                        </span>
                                                                    ) : (
                                                                        <div>
                                                                            <span className={`text-stone-600 ${!isExpanded ? 'line-clamp-3' : ''}`}>
                                                                                {cellValue || <span className="text-stone-300 italic">-</span>}
                                                                            </span>
                                                                            {isLongText && (
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        const next = new Set(expandedDescriptions);
                                                                                        if (next.has(cellKey)) next.delete(cellKey);
                                                                                        else next.add(cellKey);
                                                                                        setExpandedDescriptions(next);
                                                                                    }}
                                                                                    className="text-nobel-gold text-xs font-bold hover:underline mt-1 block"
                                                                                >
                                                                                    {isExpanded ? 'Show less' : 'Read more'}
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                        {/* Source Badge */}
                                                        <td className="px-4 py-4">
                                                            <div className="flex flex-wrap gap-1">
                                                                {isAI && <AttributionBadge type="AI Assisted" size="sm" />}
                                                                {(comp.source === 'Human' || comp.tags?.includes('Human')) && <AttributionBadge type="Human" size="sm" />}
                                                                {isHumanEdited && <AttributionBadge type="Human Edited" size="sm" />}
                                                            </div>
                                                        </td>
                                                        {/* Actions */}
                                                        <td className="px-4 py-4">
                                                            <button
                                                                onClick={() => handleEdit(comp)}
                                                                className="w-7 h-7 rounded-full bg-stone-100 text-stone-400 hover:bg-stone-200 hover:text-stone-600 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                                                                title="Edit"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}

                                        {/* Add Row */}
                                        {canEdit && (
                                            <tr>
                                                <td colSpan={COMPETITOR_COLUMNS.length + 3} className="p-2">
                                                    <button
                                                        onClick={handleAddCompetitor}
                                                        className="w-full py-3 border border-dashed border-stone-300 rounded-lg text-nobel-gold bg-stone-50/50 hover:bg-stone-50 hover:border-nobel-gold font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Plus className="w-4 h-4" /> Add Competitor
                                                    </button>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-stone-100">
                                    <div className="text-sm text-stone-500">
                                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredCompetitors.length)} of {filteredCompetitors.length}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1.5 text-sm font-bold text-stone-500 hover:text-stone-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Previous
                                        </button>
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 rounded-full text-sm font-bold transition-colors ${currentPage === page ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100'}`}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-1.5 text-sm font-bold text-stone-500 hover:text-stone-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bulk Delete Confirmation Dialog */}
            {showDeleteDialog && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4 text-red-600">
                            <div className="p-2 bg-red-100 rounded-full">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-stone-900">Delete Competitors?</h3>
                        </div>
                        <p className="text-stone-600 mb-6">
                            Are you sure you want to delete <strong>{selectedIds.size}</strong> competitor{selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteDialog(false)}
                                className="px-4 py-2 text-stone-500 hover:text-stone-900 font-bold text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Competitor Dialog */}
            {editingCompetitor && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold font-serif text-stone-900">Edit Competitor</h3>
                            <button
                                onClick={() => { setEditingCompetitor(null); setEditForm({}); }}
                                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4 text-stone-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {COMPETITOR_COLUMNS.filter(c => c.editable).map(col => (
                                <div key={col.key}>
                                    <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                                        {col.label}
                                    </label>
                                    {col.key === 'Description' || col.key === 'Differentiation' ? (
                                        <textarea
                                            value={editForm[col.key] || ''}
                                            onChange={(e) => setEditForm({ ...editForm, [col.key]: e.target.value })}
                                            rows={3}
                                            className="w-full px-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-nobel-gold resize-none"
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            value={editForm[col.key] || ''}
                                            onChange={(e) => setEditForm({ ...editForm, [col.key]: e.target.value })}
                                            className="w-full px-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-nobel-gold"
                                        />
                                    )}
                                </div>
                            ))}

                            {/* Match Probability (read-only for manual edits) */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-1 block">
                                    Match % <span className="text-stone-300 font-normal">(AI-generated only)</span>
                                </label>
                                <input
                                    type="text"
                                    value={editingCompetitor['Match Probability'] || '-'}
                                    disabled
                                    className="w-full px-4 py-2 border border-stone-100 bg-stone-50 rounded-lg text-sm text-stone-400 cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-stone-100">
                            <button
                                onClick={() => { setEditingCompetitor(null); setEditForm({}); }}
                                className="px-4 py-2 text-stone-500 hover:text-stone-900 font-bold text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="px-6 py-2 bg-stone-900 hover:bg-nobel-gold text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
                            >
                                <Check className="w-4 h-4" /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Competitor Dialog */}
            {showAddDialog && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold font-serif text-stone-900">Add Competitor</h3>
                            <button
                                onClick={() => setShowAddDialog(false)}
                                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4 text-stone-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Name */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-1 block">
                                    Competitor Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={addForm.name || ''}
                                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                    placeholder="e.g., Acme Inc."
                                    className="w-full px-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-nobel-gold"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-1 block">Description</label>
                                <textarea
                                    value={addForm.Description || ''}
                                    onChange={(e) => setAddForm({ ...addForm, Description: e.target.value })}
                                    rows={3}
                                    placeholder="What does this competitor do?"
                                    className="w-full px-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-nobel-gold resize-none"
                                />
                            </div>

                            {/* Focus */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-1 block">Focus</label>
                                <input
                                    type="text"
                                    value={addForm.Focus || ''}
                                    onChange={(e) => setAddForm({ ...addForm, Focus: e.target.value })}
                                    placeholder="e.g., B2B SaaS, Enterprise"
                                    className="w-full px-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-nobel-gold"
                                />
                            </div>

                            {/* Technology */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-1 block">Technology</label>
                                <input
                                    type="text"
                                    value={addForm.Technology || ''}
                                    onChange={(e) => setAddForm({ ...addForm, Technology: e.target.value })}
                                    placeholder="e.g., AI, Cloud, Mobile"
                                    className="w-full px-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-nobel-gold"
                                />
                            </div>

                            {/* Differentiation */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-1 block">Differentiation</label>
                                <textarea
                                    value={addForm.Differentiation || ''}
                                    onChange={(e) => setAddForm({ ...addForm, Differentiation: e.target.value })}
                                    rows={2}
                                    placeholder="How do they stand out?"
                                    className="w-full px-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-nobel-gold resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-stone-100">
                            <button
                                onClick={() => setShowAddDialog(false)}
                                className="px-4 py-2 text-stone-500 hover:text-stone-900 font-bold text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitAdd}
                                className="px-6 py-2 bg-nobel-gold hover:bg-[#a68546] text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Add Competitor
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompetitiveMatrix;
