
import React, { useState } from 'react';
import { StartupData, AISettings, Feature, EisenhowerQuadrant } from '../types';
import { Plus, GripVertical, Check, AlertCircle, Clock, Trash2, ArrowRight, ChevronDown, LayoutGrid, List as ListIcon, CheckCircle2, Brain, Sparkles, Loader2, Settings2, X, AlertTriangle, Briefcase, Target, Filter, ArrowUp, ArrowLeft, ArrowRight as ArrowRightIcon, BookOpen, Quote, Pencil } from 'lucide-react';
import TabNavigation from './TabNavigation';
import ProjectSelector from './ProjectSelector';
import { Logo } from './Logo';

import CustomSelect from './CustomSelect';
import AttributionBadge from './AttributionBadge';
import { ModelSelect } from './ModelSelector';

interface EisenhowerMatrixProps {
    data: StartupData;
    allProjects: StartupData[];
    onUpdateProject: (updater: (project: StartupData) => StartupData) => void;
    onSwitchProject: (id: string) => void;
    onNewProject: () => void;
    onNavigate: (view: any) => void;
    currentView: any;
    settings: AISettings;
    allowedPages?: string[];
}

const QUADRANTS: {
    id: EisenhowerQuadrant,
    label: string,
    sub: string,
    color: string,
    bg: string,
    text: string,
    icon: any
}[] = [
        { id: 'Do', label: 'Do First', sub: 'Urgent & Important', color: 'border-l-emerald-500', bg: 'bg-emerald-50/30', text: 'text-emerald-900', icon: Target },
        { id: 'Schedule', label: 'Schedule', sub: 'Important, Not Urgent', color: 'border-l-blue-500', bg: 'bg-blue-50/30', text: 'text-blue-900', icon: Clock },
        { id: 'Delegate', label: 'Delegate', sub: 'Urgent, Not Important', color: 'border-l-amber-500', bg: 'bg-amber-50/30', text: 'text-amber-900', icon: Briefcase },
        { id: 'Eliminate', label: 'Eliminate', sub: 'Not Urgent & Not Important', color: 'border-l-stone-400', bg: 'bg-stone-50/50', text: 'text-stone-500', icon: Trash2 }
    ];

import { useEisenhowerMatrixLogic } from '../hooks/useEisenhowerMatrixLogic';

const EisenhowerMatrix: React.FC<EisenhowerMatrixProps> = ({
    data,
    allProjects,
    onUpdateProject,
    onSwitchProject,
    onNewProject,
    onNavigate,
    currentView,
    settings,
    allowedPages
}) => {
    const {
        draggedFeatureId,
        viewMode, setViewMode,
        isAddModalOpen, setIsAddModalOpen,
        formStep, setFormStep,
        newTaskTitle, setNewTaskTitle,
        newTaskDesc, setNewTaskDesc,
        targetQuadrant, setTargetQuadrant,
        selectedGoalId, setSelectedGoalId,
        selectedKeyResultId, setSelectedKeyResultId,
        filterGoalId, setFilterGoalId,
        editingFeatureId,
        deleteConfirmId, setDeleteConfirmId,
        assignedUserIds, setAssignedUserIds,
        taskTags, setTaskTags,
        tagInput, setTagInput,
        filterTag, setFilterTag,
        showContext, setShowContext,
        showPhilosophy, setShowPhilosophy,
        humanSkills, setHumanSkills,
        resources, setResources,
        isAnalyzing,
        isAIConfigOpen, setIsAIConfigOpen,
        aiConfig, updateAiConfig,
        dragOverQuadrant,
        activeGoals, keyResultsForSelectedGoal,
        users, allTags, uncategorized, completed, filteredFeatures,
        runAIPrioritization,
        handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop,
        updateFeatureQuadrant,
        openAddModal, openEditModal,
        handleSaveTask, handleDelete, confirmDelete, toggleComplete,
        getInitials, getRandomColor
    } = useEisenhowerMatrixLogic(data, onUpdateProject, settings);

    const TaskCard: React.FC<{ f: Feature; mini?: boolean }> = ({ f, mini = false }) => {
        const assignedUsers = f.assignedTo?.map(uid => users?.find(u => u._id === uid)).filter(Boolean) || [];

        return (
            <div
                draggable
                onDragStart={(e) => handleDragStart(e, f.id)}
                onDragEnd={handleDragEnd}
                className={`
                bg-white rounded-xl border border-stone-200 shadow-sm cursor-grab active:cursor-grabbing group hover:shadow-md transition-all relative flex flex-col justify-between select-none
                ${mini ? 'p-3 hover:-translate-y-1 hover:border-nobel-gold/50' : 'p-4'}
                ${draggedFeatureId === f.id ? 'opacity-50' : 'opacity-100'}
            `}
            >
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-start gap-3 flex-grow">
                        <div className="mt-1 cursor-grab active:cursor-grabbing text-stone-300 hover:text-stone-500">
                            <GripVertical className="w-4 h-4" />
                        </div>
                        {/* Checkbox */}
                        <button
                            onClick={() => toggleComplete(f.id, f.status)}
                            className={`mt-0.5 w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${f.status === 'Done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-300 hover:border-nobel-gold'}`}
                        >
                            {f.status === 'Done' && <Check className="w-3 h-3" />}
                        </button>
                        <div>
                            <span className={`text-sm font-bold block leading-tight text-stone-900 ${f.status === 'Done' ? 'text-stone-400 line-through' : ''}`}>
                                {f.title}
                            </span>
                            {!mini && f.description && (
                                <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">{f.description}</p>
                            )}
                        </div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 -mr-2 -mt-1">
                        <button
                            onClick={() => openEditModal(f)}
                            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-all"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {!mini && f.eisenhowerQuadrant !== 'Uncategorized' && (
                            <button
                                onClick={() => updateFeatureQuadrant(f.id, 'Uncategorized')}
                                title="Move to Backlog"
                                className="p-1.5 bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-700 rounded-full transition-all mr-1"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <button
                            onClick={() => handleDelete(f.id)}
                            className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Tags */}
                {f.tags && f.tags.filter(t => t !== 'AI Assisted' && t !== 'Human Edited').length > 0 && (
                    <div className="flex flex-wrap gap-1 px-4 mt-1 mb-2">
                        {f.tags.filter(t => t !== 'AI Assisted' && t !== 'Human Edited').map(tag => (
                            <span key={tag} className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded border border-stone-200">#{tag}</span>
                        ))}
                    </div>
                )}

                {/* Badges, Assignees & Attribution */}
                <div className="flex justify-between items-center mt-2 ml-4 mr-4 pb-2">
                    <div className="flex gap-2 items-center">
                        {f.priority === 'High' && <span className="text-[9px] bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">High</span>}
                        {f.priority === 'Medium' && <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Med</span>}
                        {f.status === 'In Progress' && <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1"><Clock className="w-2 h-2" /> WIP</span>}

                        {/* Connected Goal Badge */}
                        {f.connectedGoalId && (
                            <span className="text-[9px] bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1" title="Linked to OKR">
                                <Target className="w-2 h-2" /> OKR
                            </span>
                        )}

                        {/* Attribution Badge Next to Priority */}
                        {(f.tags?.includes('AI Assisted') || f.source === 'AI') && (
                            <AttributionBadge type="AI Assisted" />
                        )}
                        {(f.tags?.includes('Human Edited') || f.source === 'Human') && (
                            <AttributionBadge type="Human Edited" />
                        )}
                    </div>

                    {assignedUsers.length > 0 && (
                        <div className="flex -space-x-1">
                            {assignedUsers.map((u: any) => (
                                <div
                                    key={u._id}
                                    className={`w-5 h-5 rounded-full border border-white flex items-center justify-center text-[8px] font-bold text-white ${getRandomColor(u._id)}`}
                                    title={u.name}
                                >
                                    {u.pictureUrl ? <img src={u.pictureUrl} alt={u.name} className="w-full h-full rounded-full object-cover" /> : getInitials(u.name || "?")}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );


    };

    const KeyResultCard: React.FC<{ kr: any; goalTitle: string }> = ({ kr, goalTitle }) => {
        const [isExpanded, setIsExpanded] = useState(false);
        return (
            <div className="bg-stone-800/50 rounded-xl border border-stone-700/50 p-3 hover:bg-stone-800 transition-all group">
                <div className="flex items-start gap-2">
                    <div className="p-1 bg-nobel-gold/10 rounded shrink-0">
                        <Target className="w-3 h-3 text-nobel-gold" />
                    </div>
                    <div className="min-w-0 flex-grow">
                        <span className="text-[9px] text-nobel-gold uppercase font-black tracking-widest block truncate opacity-80 mb-0.5">
                            {goalTitle}
                        </span>
                        <p className={`text-xs text-stone-200 leading-snug ${isExpanded ? '' : 'line-clamp-2'}`}>
                            {kr.description}
                        </p>
                        {kr.description && kr.description.length > 60 && (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="text-[10px] text-nobel-gold/50 hover:text-nobel-gold mt-1 font-bold uppercase tracking-tighter"
                            >
                                {isExpanded ? 'Show Less' : 'Read More'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-screen flex bg-nobel-cream relative overflow-hidden">
            {/* Left Sidebar - Vertical Image */}
            <div className="w-[20%] h-full relative overflow-hidden bg-stone-900 border-r border-stone-200 shadow-2xl z-20">
                <img src="/images/manworking.png" className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105" alt="Priority Matrix" />
                <div className="absolute inset-0 bg-gradient-to-b from-stone-900/40 via-transparent to-stone-900/80" />
                <div className="absolute top-8 left-8 z-30">
                    <Logo imageClassName="h-8 w-auto brightness-0 invert" />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-8 space-y-4 bg-gradient-to-t from-stone-900 via-stone-900/60 to-transparent pt-24">
                    <div className="space-y-3">
                        <span className="text-nobel-gold font-medium tracking-wider uppercase text-xs block">Productivity</span>
                        <h2 className="text-white text-2xl font-serif font-bold leading-tight">Priority Matrix</h2>
                        <div className="h-1 w-10 bg-nobel-gold/50 rounded-full" />
                        <p className="text-stone-300 text-sm leading-relaxed">Organize tasks by urgency and importance.</p>
                    </div>
                </div>
            </div>

            {/* Right Content */}
            <div className="w-[80%] h-full flex flex-col relative z-10">
                <header className="px-10 py-4 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-stone-200 shrink-0 relative z-50">
                    <TabNavigation currentView={currentView} onNavigate={onNavigate} allowedPages={allowedPages} projectFeatures={{ canvasEnabled: data.canvasEnabled, marketResearchEnabled: data.marketResearchEnabled }} mode="light" />
                    <div className="flex items-center gap-3">
                        <ModelSelect className="w-48 hidden lg:block" />
                        {allTags.length > 0 && <CustomSelect value={filterTag} onChange={setFilterTag} options={[{ label: 'All Categories', value: 'all' }, ...allTags.map(tag => ({ label: tag, value: tag }))]} className="w-40" placeholder="Filter by..." />}
                        <div className="bg-white border border-stone-200 rounded-lg p-1 flex">
                            <button onClick={() => setViewMode('matrix')} className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${viewMode === 'matrix' ? 'bg-stone-900 text-white shadow' : 'text-stone-500 hover:bg-stone-50'}`}><LayoutGrid className="w-3 h-3" /> Matrix</button>
                            <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${viewMode === 'list' ? 'bg-stone-900 text-white shadow' : 'text-stone-500 hover:bg-stone-50'}`}><ListIcon className="w-3 h-3" /> List</button>
                            <button onClick={() => setViewMode('completed')} className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${viewMode === 'completed' ? 'bg-stone-900 text-white shadow' : 'text-stone-500 hover:bg-stone-50'}`}><CheckCircle2 className="w-3 h-3" /> Done</button>
                        </div>
                        {activeGoals.length > 0 && <select value={filterGoalId} onChange={(e) => setFilterGoalId(e.target.value)} className="bg-white border border-stone-200 text-stone-600 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-stone-400 max-w-[150px]"><option value="all">All Objectives</option>{activeGoals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select>}
                        <button
                            onClick={() => runAIPrioritization()}
                            disabled={isAnalyzing}
                            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-2 rounded-full hover:from-purple-500 hover:to-purple-600 transition-all flex items-center justify-center disabled:opacity-50 shadow-lg shadow-purple-900/20"
                            title="AI Organize"
                        >
                            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        </button>
                        <button onClick={() => openAddModal('Do')} className="bg-stone-900 text-white p-2 rounded-full hover:bg-nobel-gold transition-colors flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                        <button onClick={() => setShowPhilosophy(true)} className={`p-2 rounded-lg border transition-all ${showPhilosophy ? 'bg-stone-900 text-white border-stone-900' : 'bg-white border-stone-200 text-stone-400 hover:text-stone-600'}`}><BookOpen className="w-4 h-4" /></button>
                    </div>
                </header>
                <main className="flex-grow overflow-auto relative p-8">
                    <div className="max-w-6xl mx-auto">

                        {viewMode === 'matrix' && (
                            <div className="max-w-6xl mx-auto flex flex-col relative">
                                {/* Top Axis Label */}
                                <div className="flex justify-between px-12 mb-4 text-xs font-bold uppercase tracking-widest text-stone-400 select-none">
                                    <div className="flex items-center gap-2 text-rose-500/70"><AlertTriangle className="w-3 h-3" /> Urgent</div>
                                    <div className="flex items-center gap-2 text-stone-400">Not Urgent <ArrowRight className="w-3 h-3" /></div>
                                </div>

                                <div className="flex-grow flex relative">
                                    {/* Left Axis Label */}
                                    <div className="w-8 flex flex-col justify-between py-16 items-center text-xs font-bold uppercase tracking-widest text-stone-400 select-none mr-3">
                                        <div className="writing-mode-vertical rotate-180 flex items-center gap-2 text-emerald-600/70"><Target className="w-3 h-3" /> Important</div>
                                        <div className="writing-mode-vertical rotate-180 flex items-center gap-2 text-stone-400">Not Important <ArrowLeft className="w-3 h-3" /></div>
                                    </div>

                                    {/* The Grid - taller cards */}
                                    <div className="flex-grow grid grid-cols-2 grid-rows-2 gap-4 h-[calc(100vh-220px)]">
                                        {QUADRANTS.map(q => {
                                            const items = filteredFeatures.filter(f => f.eisenhowerQuadrant === q.id && f.status !== 'Done');
                                            return (
                                                <div
                                                    key={q.id}
                                                    onDragOver={(e) => handleDragOver(e, q.id)}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={(e) => handleDrop(e, q.id)}
                                                    className={`
                                                    relative flex flex-col rounded-xl border transition-all group overflow-hidden bg-white shadow-sm hover:shadow-md
                                                    ${dragOverQuadrant === q.id ? 'border-nobel-gold border-dashed ring-4 ring-nobel-gold/10 bg-nobel-gold/5' : 'border-stone-200'}
                                                `}
                                                >
                                                    {/* Header */}
                                                    <div className={`px-4 py-3 border-b border-stone-100 flex items-center justify-between shrink-0 ${q.bg}`}>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`p-1 rounded bg-white shadow-sm ${q.text.replace('text-', 'text-opacity-80 ')}`}>
                                                                <q.icon className="w-3.5 h-3.5" />
                                                            </div>
                                                            <div>
                                                                <h3 className={`font-serif text-base font-bold ${q.text}`}>{q.label}</h3>
                                                                <p className="text-[9px] font-bold uppercase tracking-wider text-stone-500 opacity-70">{q.sub}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => openAddModal(q.id)}
                                                                className="p-1.5 rounded hover:bg-white/50 text-stone-400 hover:text-nobel-gold transition-colors"
                                                                title="Add Task"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                            </button>
                                                            <span className="text-xs font-bold text-stone-400 bg-white/50 px-2 py-0.5 rounded-full border border-stone-100">
                                                                {items.length}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Task Container - scrollable */}
                                                    <div className="flex-grow p-3 overflow-y-auto space-y-2 bg-stone-50/30 custom-scrollbar">
                                                        {items.length === 0 ? (
                                                            <div className="h-full flex items-center justify-center">
                                                                <button
                                                                    onClick={() => openAddModal(q.id)}
                                                                    className="text-stone-400 hover:text-stone-600 text-xs font-bold uppercase tracking-widest flex items-center gap-2 border-b border-transparent hover:border-stone-400 transition-all pb-0.5"
                                                                >
                                                                    <Plus className="w-3 h-3" /> Add Task
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            items.map(f => <TaskCard key={f.id} f={f} />)
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {viewMode === 'list' && (
                            <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                                <div className="grid grid-cols-12 bg-stone-50 border-b border-stone-200 text-xs font-bold uppercase tracking-widest text-stone-500">
                                    <div className="col-span-1 px-4 py-3 text-center">Status</div>
                                    <div className="col-span-5 px-4 py-3">Task</div>
                                    <div className="col-span-3 px-4 py-3">Description</div>
                                    <div className="col-span-2 px-4 py-3 text-center">Priority</div>
                                    <div className="col-span-1 px-4 py-3 text-center">Action</div>
                                </div>
                                <div className="divide-y divide-stone-100">
                                    {filteredFeatures.filter(f => f.status !== 'Done').length === 0 ? (
                                        <div className="p-12 text-center text-stone-400 italic">
                                            No tasks yet. Click "Quick Add" to create one.
                                        </div>
                                    ) : (
                                        filteredFeatures.filter(f => f.status !== 'Done').map(f => {
                                            const q = QUADRANTS.find(q => q.id === f.eisenhowerQuadrant) || QUADRANTS[3];
                                            return (
                                                <div
                                                    key={f.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, f.id)}
                                                    onDragEnd={handleDragEnd}
                                                    className={`grid grid-cols-12 items-center hover:bg-stone-50 transition-colors cursor-grab active:cursor-grabbing ${draggedFeatureId === f.id ? 'opacity-50' : ''}`}
                                                >
                                                    <div className="col-span-1 px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => toggleComplete(f.id, f.status)}
                                                            className="w-5 h-5 rounded-full border-2 border-stone-300 hover:border-nobel-gold flex items-center justify-center"
                                                        ></button>
                                                    </div>
                                                    <div className="col-span-5 px-4 py-3">
                                                        <div className="font-bold text-sm text-stone-800 flex items-center gap-2">
                                                            {f.title}
                                                            {(f.tags?.includes('AI Assisted') || f.source === 'AI') && <AttributionBadge type="AI Assisted" size="xs" />}
                                                            {(f.tags?.includes('Human Edited') || f.source === 'Human') && <AttributionBadge type="Human Edited" size="xs" />}
                                                        </div>
                                                    </div>
                                                    <div className="col-span-3 px-4 py-3">
                                                        <div className="text-xs text-stone-500 line-clamp-1">{f.description || '-'}</div>
                                                    </div>
                                                    <div className="col-span-2 px-4 py-3 text-center">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${q.bg} ${q.color} ${q.text}`}>
                                                            <q.icon className="w-3 h-3" />
                                                            {q.label}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-1 px-4 py-3 text-center">
                                                        <button onClick={() => handleDelete(f.id)} className="text-stone-300 hover:text-red-500 transition-colors p-1">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        {viewMode === 'completed' && (
                            <div className="max-w-3xl mx-auto">
                                <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
                                        <h3 className="font-serif text-lg font-bold text-stone-900">Completed Tasks</h3>
                                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
                                            <Check className="w-3 h-3" /> {completed.length} Done
                                        </span>
                                    </div>
                                    <div className="divide-y divide-stone-100">
                                        {completed.length === 0 ? (
                                            <div className="p-12 text-center text-stone-400 italic flex flex-col items-center">
                                                <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
                                                Nothing completed yet. Get to work!
                                            </div>
                                        ) : (
                                            completed.map(f => (
                                                <div key={f.id} className="p-4 flex justify-between items-center group hover:bg-stone-50 transition-colors">
                                                    <div className="flex items-center gap-3 opacity-50">
                                                        <button
                                                            onClick={() => toggleComplete(f.id, f.status)}
                                                            className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center"
                                                        >
                                                            <Check className="w-3 h-3" />
                                                        </button>
                                                        <span className="font-bold text-stone-800 text-sm line-through">{f.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 bg-stone-100 px-2 py-1 rounded">{f.eisenhowerQuadrant || 'Uncategorized'}</span>
                                                        <button onClick={() => handleDelete(f.id)} className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>


                    {/* DELETE CONFIRMATION MODAL */}
                    {
                        deleteConfirmId && (
                            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 p-6 text-center">
                                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                                        <Trash2 className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-serif text-xl text-stone-900 mb-2">Delete this task?</h3>
                                    <p className="text-stone-500 text-sm mb-6">This action cannot be undone.</p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setDeleteConfirmId(null)}
                                            className="flex-1 py-2.5 border border-stone-200 rounded-lg text-sm font-bold text-stone-600 hover:bg-stone-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={confirmDelete}
                                            className="flex-1 py-2.5 bg-red-600 rounded-lg text-sm font-bold text-white hover:bg-red-700 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    }



                    <style>{`
                .writing-mode-vertical {
                    writing-mode: vertical-rl;
                }
            `}</style>

                    {/* AI CONFIGURATION DIALOG */}
                    {isAIConfigOpen && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden" style={{ animation: 'fadeInScale 0.2s ease-out' }}>
                                {/* Header */}
                                <div className="px-6 py-5 bg-stone-900 text-white relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-nobel-gold/10 via-transparent to-stone-900" />
                                    <div className="relative flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-nobel-gold/20 rounded-xl border border-nobel-gold/20">
                                                <Sparkles className="w-5 h-5 text-nobel-gold" />
                                            </div>
                                            <div>
                                                <h3 className="font-serif text-xl font-bold tracking-tight">Strategy Engine</h3>
                                                <p className="text-stone-400 text-xs mt-0.5 font-medium">
                                                    {uncategorized.length > 0
                                                        ? `Configure AI to organize ${uncategorized.length} task${uncategorized.length !== 1 ? 's' : ''}`
                                                        : 'Set your team constraints & preferences'
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setIsAIConfigOpen(false)}
                                            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-stone-500 hover:text-white"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Fields */}
                                <div className="p-6 max-h-[55vh] overflow-y-auto">
                                    {/* Team Skills - Full Width */}
                                    <div className="mb-5">
                                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">
                                            <Brain className="w-3 h-3 text-nobel-gold" /> Team Skills & Expertise
                                        </label>
                                        <input
                                            value={aiConfig.teamSkills}
                                            onChange={e => updateAiConfig('teamSkills', e.target.value)}
                                            placeholder="e.g. React, Node.js, Sales, UI Design"
                                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-nobel-gold focus:ring-2 focus:ring-nobel-gold/20 text-sm font-medium hover:border-stone-300 transition-colors"
                                        />
                                    </div>

                                    {/* Separator */}
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="h-px flex-grow bg-stone-200" />
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">Resources</span>
                                        <div className="h-px flex-grow bg-stone-200" />
                                    </div>

                                    {/* 2-Column Grid: Budget + Timeline */}
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">
                                                <AlertCircle className="w-3 h-3 text-emerald-500" /> Budget
                                            </label>
                                            <input
                                                value={aiConfig.budget}
                                                onChange={e => updateAiConfig('budget', e.target.value)}
                                                placeholder="$5k/mo, bootstrapped"
                                                className="w-full px-3.5 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-nobel-gold focus:ring-2 focus:ring-nobel-gold/20 text-sm font-medium hover:border-stone-300 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">
                                                <Clock className="w-3 h-3 text-blue-500" /> Timeline
                                            </label>
                                            <input
                                                value={aiConfig.timeline}
                                                onChange={e => updateAiConfig('timeline', e.target.value)}
                                                placeholder="2 weeks, Q2 launch"
                                                className="w-full px-3.5 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-nobel-gold focus:ring-2 focus:ring-nobel-gold/20 text-sm font-medium hover:border-stone-300 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {/* 2-Column Grid: Manpower + Tech Stack */}
                                    <div className="grid grid-cols-2 gap-4 mb-5">
                                        <div>
                                            <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">
                                                <Briefcase className="w-3 h-3 text-amber-500" /> Team Size
                                            </label>
                                            <input
                                                value={aiConfig.manpower}
                                                onChange={e => updateAiConfig('manpower', e.target.value)}
                                                placeholder="3 devs, 1 designer"
                                                className="w-full px-3.5 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-nobel-gold focus:ring-2 focus:ring-nobel-gold/20 text-sm font-medium hover:border-stone-300 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">
                                                <Target className="w-3 h-3 text-purple-500" /> Tech Stack
                                            </label>
                                            <input
                                                value={aiConfig.techStack}
                                                onChange={e => updateAiConfig('techStack', e.target.value)}
                                                placeholder="Next.js, Convex"
                                                className="w-full px-3.5 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-nobel-gold focus:ring-2 focus:ring-nobel-gold/20 text-sm font-medium hover:border-stone-300 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {/* Separator */}
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="h-px flex-grow bg-stone-200" />
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-300">Advanced</span>
                                        <div className="h-px flex-grow bg-stone-200" />
                                    </div>

                                    {/* Custom Instructions */}
                                    <div>
                                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">
                                            <Settings2 className="w-3 h-3 text-stone-400" /> Custom Instructions
                                        </label>
                                        <textarea
                                            value={aiConfig.customInstructions}
                                            onChange={e => updateAiConfig('customInstructions', e.target.value)}
                                            placeholder="Any additional context, priorities, or restrictions for the AI to consider..."
                                            rows={2}
                                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-nobel-gold focus:ring-2 focus:ring-nobel-gold/20 text-sm resize-none hover:border-stone-300 transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="px-6 py-4 border-t border-stone-100 bg-gradient-to-r from-stone-50 to-stone-100/50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {uncategorized.length > 0 && (
                                            <span className="px-2.5 py-1 bg-nobel-gold/10 text-nobel-gold text-[10px] font-black uppercase tracking-wider rounded-full border border-nobel-gold/20">
                                                {uncategorized.length} pending
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2.5">
                                        <button
                                            onClick={() => setIsAIConfigOpen(false)}
                                            className="px-4 py-2.5 text-sm font-bold text-stone-500 hover:text-stone-700 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => runAIPrioritization(aiConfig)}
                                            disabled={uncategorized.length === 0}
                                            className="px-6 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-bold hover:bg-nobel-gold hover:text-stone-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-stone-900/20 hover:shadow-nobel-gold/30"
                                        >
                                            <Sparkles className="w-4 h-4" /> Organize Tasks
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PHILOSOPHY SHEET */}
                    <div className={`fixed inset-0 z-[100] pointer-events-none transition-opacity duration-300 ${showPhilosophy ? 'opacity-100' : 'opacity-0'}`}>
                        {/* Backdrop */}
                        <div
                            className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${showPhilosophy ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                            onClick={() => setShowPhilosophy(false)}
                        />

                        {/* Sheet */}
                        <div className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl transform transition-transform duration-300 ease-in-out pointer-events-auto flex flex-col ${showPhilosophy ? 'translate-x-0' : 'translate-x-full'}`}>
                            <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-[#F9F8F4]">
                                <h2 className="font-serif text-2xl font-bold text-stone-900 flex items-center gap-3">
                                    <BookOpen className="w-6 h-6 text-stone-900" />
                                    The Method
                                </h2>
                                <button
                                    onClick={() => setShowPhilosophy(false)}
                                    className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-500 hover:text-stone-900"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-grow overflow-y-auto p-8 space-y-8">

                                <section>
                                    <h3 className="text-lg font-bold text-stone-900 mb-3 flex items-center gap-2">
                                        <Quote className="w-4 h-4 text-nobel-gold" />
                                        The Philosophy
                                    </h3>
                                    <p className="text-stone-600 leading-relaxed text-sm">
                                        "What is important is seldom urgent, and what is urgent is seldom important."
                                        <br /><br />
                                        This decision matrix helps you distinguish between what's truly clear and high-impact versus what's just loud and distracting. The goal is to spend more time in the <strong>Schedule</strong> quadrant (Strategy) and less in the <strong>Do</strong> quadrant (Firefighting).
                                    </p>
                                </section>

                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-stone-900">The 4 Quadrants</h3>

                                    <div className="grid grid-cols-1 gap-4">
                                        {/* Do First */}
                                        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-sm hover:shadow-md transition-all group">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                                                    <Target className="w-4 h-4" />
                                                </div>
                                                <h4 className="font-serif text-stone-900 font-bold text-base">1. Do First</h4>
                                            </div>
                                            <p className="text-stone-600 text-xs leading-relaxed pl-11">
                                                <span className="font-bold text-emerald-700 block mb-1">Urgent & Important</span>
                                                Crises, deadlines, and problems that require immediate attention. Living here leads to burnout.
                                            </p>
                                        </div>

                                        {/* Schedule */}
                                        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-sm hover:shadow-md transition-all group">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                                                    <Clock className="w-4 h-4" />
                                                </div>
                                                <h4 className="font-serif text-stone-900 font-bold text-base">2. Schedule</h4>
                                            </div>
                                            <p className="text-stone-600 text-xs leading-relaxed pl-11">
                                                <span className="font-bold text-blue-700 block mb-1">Not Urgent, but Important</span>
                                                Strategic planning, relationship building, and personal growth. This is where success is built.
                                            </p>
                                        </div>

                                        {/* Delegate */}
                                        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-sm hover:shadow-md transition-all group">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
                                                    <Briefcase className="w-4 h-4" />
                                                </div>
                                                <h4 className="font-serif text-stone-900 font-bold text-base">3. Delegate</h4>
                                            </div>
                                            <p className="text-stone-600 text-xs leading-relaxed pl-11">
                                                <span className="font-bold text-amber-700 block mb-1">Urgent, Not Important</span>
                                                Interruptions, most meetings, and other people's priorities. Delegate or automate these.
                                            </p>
                                        </div>

                                        {/* Eliminate */}
                                        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-sm hover:shadow-md transition-all group">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 rounded-lg bg-stone-100 text-stone-500 group-hover:bg-stone-200 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </div>
                                                <h4 className="font-serif text-stone-900 font-bold text-base">4. Eliminate</h4>
                                            </div>
                                            <p className="text-stone-600 text-xs leading-relaxed pl-11">
                                                <span className="font-bold text-stone-500 block mb-1">Not Urgent & Not Important</span>
                                                Time wasters, busy work, and excessive entertainment. Cut these ruthlessly.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <section className="bg-nobel-gold/10 p-5 rounded-xl border border-nobel-gold/20">
                                    <h3 className="font-bold text-nobel-gold mb-2 text-sm uppercase tracking-wide">Key Takeaway</h3>
                                    <p className="text-stone-700 text-sm leading-relaxed">
                                        Effective founders don't just work hard; they work on the right things. Use this tool to protect your time for high-leverage strategic work.
                                    </p>
                                </section>

                            </div>
                        </div>

                    </div>

                    {/* Multi-Stage Add Task Modal - OUTSIDE philosophy wrapper */}
                    {isAddModalOpen && (
                        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
                                {/* Header */}
                                <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-900 text-white">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-nobel-gold/20 rounded-lg">
                                            {editingFeatureId ? <Pencil className="w-4 h-4 text-nobel-gold" /> : <Plus className="w-4 h-4 text-nobel-gold" />}
                                        </div>
                                        <div>
                                            <h3 className="font-serif text-lg font-bold">
                                                {editingFeatureId ? 'Edit Task' : 'New Task'}
                                            </h3>
                                            <p className="text-stone-400 text-[10px] uppercase tracking-widest font-bold">
                                                Step {formStep} of 3
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-stone-400 hover:text-white">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Step Indicator */}
                                <div className="px-6 pt-4 pb-2">
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3].map(step => (
                                            <div key={step} className="flex items-center flex-1">
                                                <div className={`h-1.5 rounded-full flex-1 transition-all ${step <= formStep ? 'bg-nobel-gold' : 'bg-stone-200'
                                                    }`} />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between mt-1.5">
                                        <span className={`text-[9px] font-bold uppercase tracking-wider ${formStep >= 1 ? 'text-nobel-gold' : 'text-stone-400'}`}>Basics</span>
                                        <span className={`text-[9px] font-bold uppercase tracking-wider ${formStep >= 2 ? 'text-nobel-gold' : 'text-stone-400'}`}>Organize</span>
                                        <span className={`text-[9px] font-bold uppercase tracking-wider ${formStep >= 3 ? 'text-nobel-gold' : 'text-stone-400'}`}>Connect</span>
                                    </div>
                                </div>

                                {/* Step Content */}
                                <div className="p-6 space-y-4 overflow-y-auto flex-grow">

                                    {/* STEP 1: Title & Description */}
                                    {formStep === 1 && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wide text-stone-500 mb-1.5">Task Title *</label>
                                                <input
                                                    value={newTaskTitle}
                                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                                    placeholder="What needs to be done?"
                                                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold/30 font-medium text-base"
                                                    autoFocus
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wide text-stone-500 mb-1.5">Description</label>
                                                <textarea
                                                    value={newTaskDesc}
                                                    onChange={(e) => setNewTaskDesc(e.target.value)}
                                                    placeholder="Add details, context, or acceptance criteria..."
                                                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold/30 text-sm h-32 resize-none"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* STEP 2: Quadrant & Tags */}
                                    {formStep === 2 && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wide text-stone-500 mb-2">Priority Quadrant</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {[
                                                        { value: 'Uncategorized', label: 'Backlog', sub: 'Sort later', color: 'stone' },
                                                        { value: 'Do', label: 'Do First', sub: 'Urgent & Important', color: 'emerald' },
                                                        { value: 'Schedule', label: 'Schedule', sub: 'Important', color: 'blue' },
                                                        { value: 'Delegate', label: 'Delegate', sub: 'Urgent', color: 'amber' },
                                                        { value: 'Eliminate', label: 'Eliminate', sub: 'Neither', color: 'stone' },
                                                    ].map(q => (
                                                        <button
                                                            key={q.value}
                                                            onClick={() => setTargetQuadrant(q.value as any)}
                                                            className={`p-3 rounded-lg border-2 text-left transition-all ${targetQuadrant === q.value
                                                                ? 'border-nobel-gold bg-nobel-gold/5 shadow-sm'
                                                                : 'border-stone-200 hover:border-stone-300 bg-white'
                                                                }`}
                                                        >
                                                            <span className={`text-sm font-bold block ${targetQuadrant === q.value ? 'text-stone-900' : 'text-stone-700'}`}>{q.label}</span>
                                                            <span className="text-[10px] text-stone-400">{q.sub}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wide text-stone-500 mb-1.5">Tags</label>
                                                <input
                                                    value={tagInput}
                                                    onChange={(e) => setTagInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && tagInput.trim()) {
                                                            e.preventDefault();
                                                            if (!taskTags.includes(tagInput.trim())) {
                                                                setTaskTags([...taskTags, tagInput.trim()]);
                                                            }
                                                            setTagInput('');
                                                        }
                                                    }}
                                                    placeholder="Type tag and press Enter..."
                                                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold/30 text-sm"
                                                />
                                                {taskTags.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {taskTags.map(tag => (
                                                            <span key={tag} className="px-2.5 py-1 bg-stone-100 text-stone-600 text-xs rounded-lg flex items-center gap-1.5 font-medium">
                                                                #{tag}
                                                                <button onClick={() => setTaskTags(taskTags.filter(t => t !== tag))} className="hover:text-red-500 transition-colors">
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {/* STEP 3: OKR Connection */}
                                    {formStep === 3 && (
                                        <>
                                            <div className="text-center py-4">
                                                <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <Target className="w-6 h-6 text-purple-600" />
                                                </div>
                                                <h4 className="font-serif text-lg font-bold text-stone-900">Connect to Objective</h4>
                                                <p className="text-stone-500 text-sm mt-1">Link this task to an OKR for tracking</p>
                                            </div>

                                            {activeGoals.length > 0 ? (
                                                <div className="space-y-3">
                                                    <select
                                                        value={selectedGoalId}
                                                        onChange={(e) => {
                                                            setSelectedGoalId(e.target.value);
                                                            setSelectedKeyResultId('');
                                                        }}
                                                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold/30 text-sm"
                                                    >
                                                        <option value="">Select an Objective...</option>
                                                        {activeGoals.map(g => (
                                                            <option key={g.id} value={g.id}>{g.title}</option>
                                                        ))}
                                                    </select>

                                                    {selectedGoalId && (
                                                        <select
                                                            value={selectedKeyResultId}
                                                            onChange={(e) => setSelectedKeyResultId(e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold/30 text-sm"
                                                            disabled={keyResultsForSelectedGoal.length === 0}
                                                        >
                                                            <option value="">Select a Key Result...</option>
                                                            {keyResultsForSelectedGoal.map(kr => (
                                                                <option key={kr.id} value={kr.id}>{kr.description}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-center py-6 text-stone-400 text-sm border-2 border-dashed border-stone-200 rounded-xl">
                                                    No objectives created yet. You can skip this step.
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Footer Navigation */}
                                <div className="px-6 py-4 border-t border-stone-100 flex justify-between items-center bg-stone-50/50">
                                    <div>
                                        {formStep > 1 ? (
                                            <button
                                                onClick={() => setFormStep(formStep - 1)}
                                                className="flex items-center gap-1.5 px-4 py-2 text-stone-500 hover:text-stone-700 font-medium text-sm transition-colors"
                                            >
                                                <ArrowLeft className="w-4 h-4" /> Back
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setIsAddModalOpen(false)}
                                                className="px-4 py-2 text-stone-500 hover:text-stone-700 font-medium text-sm transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        {formStep < 3 ? (
                                            <button
                                                onClick={() => setFormStep(formStep + 1)}
                                                disabled={formStep === 1 && !newTaskTitle.trim()}
                                                className="px-5 py-2 bg-stone-900 text-white rounded-lg font-bold text-sm hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                                            >
                                                Next <ArrowRight className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <>
                                                {!editingFeatureId && (
                                                    <button
                                                        onClick={() => { handleSaveTask(); }}
                                                        disabled={!newTaskTitle.trim()}
                                                        className="px-4 py-2 border border-stone-200 text-stone-600 rounded-lg font-bold text-sm hover:bg-stone-100 transition-colors"
                                                    >
                                                        Skip & Create
                                                    </button>
                                                )}
                                                <button
                                                    onClick={handleSaveTask}
                                                    disabled={!newTaskTitle.trim()}
                                                    className="px-5 py-2 bg-stone-900 text-white rounded-lg font-bold text-sm hover:bg-nobel-gold hover:text-stone-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                                >
                                                    <Check className="w-4 h-4" />
                                                    {editingFeatureId ? 'Save Changes' : 'Create Task'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default EisenhowerMatrix;
