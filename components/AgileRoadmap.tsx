
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { StartupData, Feature, FeatureStatus, AISettings, StackLayer } from '../types';
import { Plus, Trash2, ChevronDown, Check, GripVertical, Workflow, LayoutList, Layers, Cpu, Database, Server, AppWindow, Globe, Search, X, Zap, Smartphone, Cloud, Code, Box, AlertCircle } from 'lucide-react';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, addEdge, Connection, Edge, Node, Handle, Position, NodeTypes } from '@xyflow/react';
import CustomSelect from './CustomSelect';
import TabNavigation from './TabNavigation';
import ProjectSelector from './ProjectSelector';
import { Logo } from './Logo';

interface AgileRoadmapProps {
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

// --- CONSTANTS & DATA ---

type TechCategory = 'Frontend' | 'Backend' | 'Database' | 'Infrastructure' | 'Mobile' | 'Tools';

interface TechOption {
    id: string;
    name: string;
    category: TechCategory;
    logo: string; // URL to simpleicons or similar
}

const TECH_STACK_DB: TechOption[] = [
    // Frontend
    { id: 'react', name: 'React', category: 'Frontend', logo: 'https://cdn.simpleicons.org/react/61DAFB' },
    { id: 'nextjs', name: 'Next.js', category: 'Frontend', logo: 'https://cdn.simpleicons.org/nextdotjs/000000' },
    { id: 'vue', name: 'Vue.js', category: 'Frontend', logo: 'https://cdn.simpleicons.org/vuedotjs/4FC08D' },
    { id: 'svelte', name: 'Svelte', category: 'Frontend', logo: 'https://cdn.simpleicons.org/svelte/FF3E00' },
    { id: 'tailwind', name: 'Tailwind CSS', category: 'Frontend', logo: 'https://cdn.simpleicons.org/tailwindcss/06B6D4' },
    { id: 'vite', name: 'Vite', category: 'Frontend', logo: 'https://cdn.simpleicons.org/vite/646CFF' },

    // Backend
    { id: 'node', name: 'Node.js', category: 'Backend', logo: 'https://cdn.simpleicons.org/nodedotjs/339933' },
    { id: 'python', name: 'Python', category: 'Backend', logo: 'https://cdn.simpleicons.org/python/3776AB' },
    { id: 'go', name: 'Go', category: 'Backend', logo: 'https://cdn.simpleicons.org/go/00ADD8' },
    { id: 'convex', name: 'Convex', category: 'Backend', logo: 'https://cdn.simpleicons.org/convex/EC5800' },
    { id: 'supabase', name: 'Supabase', category: 'Backend', logo: 'https://cdn.simpleicons.org/supabase/3ECF8E' },
    { id: 'firebase', name: 'Firebase', category: 'Backend', logo: 'https://cdn.simpleicons.org/firebase/FFCA28' },

    // Database
    { id: 'postgres', name: 'PostgreSQL', category: 'Database', logo: 'https://cdn.simpleicons.org/postgresql/4169E1' },
    { id: 'mysql', name: 'MySQL', category: 'Database', logo: 'https://cdn.simpleicons.org/mysql/4479A1' },
    { id: 'mongo', name: 'MongoDB', category: 'Database', logo: 'https://cdn.simpleicons.org/mongodb/47A248' },
    { id: 'redis', name: 'Redis', category: 'Database', logo: 'https://cdn.simpleicons.org/redis/DC382D' },

    // Infrastructure
    { id: 'aws', name: 'AWS', category: 'Infrastructure', logo: 'https://cdn.simpleicons.org/amazonaws/232F3E' },
    { id: 'azure', name: 'Azure', category: 'Infrastructure', logo: 'https://cdn.simpleicons.org/microsoftazure/0078D4' },
    { id: 'googlecloud', name: 'Google Cloud', category: 'Infrastructure', logo: 'https://cdn.simpleicons.org/googlecloud/4285F4' },
    { id: 'vercel', name: 'Vercel', category: 'Infrastructure', logo: 'https://cdn.simpleicons.org/vercel/000000' },
    { id: 'netlify', name: 'Netlify', category: 'Infrastructure', logo: 'https://cdn.simpleicons.org/netlify/00C7B7' },
    { id: 'docker', name: 'Docker', category: 'Infrastructure', logo: 'https://cdn.simpleicons.org/docker/2496ED' },

    // Mobile
    { id: 'reactnative', name: 'React Native', category: 'Mobile', logo: 'https://cdn.simpleicons.org/react/61DAFB' },
    { id: 'expo', name: 'Expo', category: 'Mobile', logo: 'https://cdn.simpleicons.org/expo/000020' },
    { id: 'flutter', name: 'Flutter', category: 'Mobile', logo: 'https://cdn.simpleicons.org/flutter/02569B' },
    { id: 'swift', name: 'Swift', category: 'Mobile', logo: 'https://cdn.simpleicons.org/swift/F05138' },
    { id: 'kotlin', name: 'Kotlin', category: 'Mobile', logo: 'https://cdn.simpleicons.org/kotlin/7F52FF' },
];

const CATEGORIES: { id: TechCategory, icon: any }[] = [
    { id: 'Frontend', icon: AppWindow },
    { id: 'Backend', icon: Server },
    { id: 'Database', icon: Database },
    { id: 'Infrastructure', icon: Cloud },
    { id: 'Mobile', icon: Smartphone },
];

// --- CUSTOM REACT FLOW NODE ---
const TechNode = ({ data, selected }: { data: any, selected?: boolean }) => {
    const [imgError, setImgError] = useState(false);

    return (
        <div className={`
            relative flex items-center gap-3 px-4 py-3 min-w-[180px] bg-white rounded-xl shadow-sm transition-all duration-300
            ${selected ? 'ring-2 ring-nobel-gold shadow-md' : 'border border-stone-200 hover:border-stone-400'}
        `}>
            <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-stone-300" />

            <div className="w-10 h-10 flex items-center justify-center bg-stone-50 rounded-lg border border-stone-100 p-1.5 overflow-hidden">
                {!imgError && data.logo ? (
                    <img
                        src={data.logo}
                        alt=""
                        className="w-full h-full object-contain"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <Layers className="w-5 h-5 text-stone-400" />
                )}
            </div>
            <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-0.5">{data.category}</div>
                <div className="font-bold text-sm text-stone-900 leading-tight">{data.label}</div>
            </div>

            <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-stone-300" />
        </div>
    );
};

const LAYER_OPTIONS: { label: string; value: StackLayer; icon: React.FC<any> }[] = [
    { label: 'Frontend', value: 'Frontend', icon: AppWindow },
    { label: 'Backend', value: 'Backend', icon: Server },
    { label: 'Database', value: 'Database', icon: Database },
    { label: 'API', value: 'API', icon: Globe },
    { label: 'Infrastructure', value: 'Infrastructure', icon: Cpu },
    { label: 'Other', value: 'Other', icon: Layers },
];

import { useQuery, useMutation } from 'convex/react';
import { api } from "../convex/_generated/api";
import { useCreateFeature } from '../hooks/useCreate';
import { useUpdateFeature, useSaveArchitectureNode } from '../hooks/useUpdate';
import { useDeleteFeature, useDeleteArchitectureNode } from '../hooks/useDelete';

// ... (imports)

// ... (TechNode component)

const AgileRoadmap: React.FC<AgileRoadmapProps> = ({
    data,
    allProjects,
    onUpdateProject,
    onSwitchProject,
    onNewProject,
    onNavigate,
    currentView,
    allowedPages
}) => {
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [viewMode, setViewMode] = useState<'kanban' | 'architecture'>('kanban');

    // Tech Stack Sheet State
    const [isStackSheetOpen, setIsStackSheetOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<TechCategory>('Frontend');
    const [stackSearch, setStackSearch] = useState('');

    // Backend Hooks
    const dbNodes = useQuery(api.engineering.getArchitectureNodes, { projectId: data.id });
    const saveNode = useSaveArchitectureNode();
    const deleteNode = useDeleteArchitectureNode();

    const addFeature = useCreateFeature();
    const updateFeature = useUpdateFeature();
    const deleteFeature = useDeleteFeature();

    // React Flow State
    const nodeTypes = useMemo(() => ({ techNode: TechNode }), []);
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Sync DB nodes to React Flow
    React.useEffect(() => {
        if (dbNodes) {
            setNodes(dbNodes.map((n: any) => ({
                id: n.id,
                type: n.type,
                position: n.position,
                data: n.data
            })));
        }
    }, [dbNodes, setNodes]);

    const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#d6d3d1' } }, eds)), [setEdges]);

    // Save node position on drag end (simplified for now, ideally use onNodeDragStop)
    const onNodeDragStop = useCallback((event: any, node: Node) => {
        saveNode({
            projectId: data.id,
            nodeId: node.id,
            type: node.type || 'techNode',
            position: node.position,
            data: JSON.stringify(node.data)
        });
    }, [data.id, saveNode]);

    // DnD State
    const [draggedFeatureId, setDraggedFeatureId] = useState<string | null>(null);

    const handleAddFeature = (status: FeatureStatus) => {
        addFeature({
            projectId: data.id,
            title: 'New Feature',
            description: '',
            status: status,
            priority: 'Medium'
        });
    };

    const handleUpdateFeature = (id: string, updates: Partial<Feature>) => {
        // Optimistic update
        onUpdateProject(p => ({
            ...p,
            features: p.features.map(f => f.id === id ? { ...f, ...updates } : f)
        }));

        updateFeature({
            id: id as any,
            updates: updates as any
        });
    };

    const handleDeleteFeature = (id: string) => {
        if (window.confirm('Delete this feature?')) {
            onUpdateProject(p => ({
                ...p,
                features: p.features.filter(f => f.id !== id)
            }));
            deleteFeature({ id: id as any });
        }
    };

    const handleAddTechNode = async (tech: TechOption) => {
        const position = { x: Math.random() * 400 + 50, y: Math.random() * 200 + 50 };
        const nodeData = {
            label: tech.name,
            category: tech.category,
            logo: tech.logo
        };

        await saveNode({
            projectId: data.id,
            type: 'techNode',
            position,
            data: JSON.stringify(nodeData)
        });

        if (viewMode !== 'architecture') setViewMode('architecture');
        setIsStackSheetOpen(false);
    };

    const handleAddManualNode = async () => {
        const name = prompt("Enter Node Name:");
        if (!name) return;

        const position = { x: 250, y: 250 };
        const nodeData = { label: name, category: 'Custom' };

        await saveNode({
            projectId: data.id,
            type: 'techNode',
            position,
            data: JSON.stringify(nodeData)
        });
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedFeatureId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, status: FeatureStatus) => {
        e.preventDefault();
        if (draggedFeatureId) {
            handleUpdateFeature(draggedFeatureId, { status });
            setDraggedFeatureId(null);
        }
    };

    const Column = ({ title, status, colorClass, dotColor }: { title: string, status: FeatureStatus, colorClass: string, dotColor: string }) => (
        <div
            className="flex-1 min-w-[320px] bg-white rounded-xl border border-stone-200 flex flex-col h-full overflow-hidden shadow-sm"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
        >
            <div className={`flex justify-between items-center p-4 border-b border-stone-100 ${colorClass}`}>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${dotColor}`}></div>
                    <h3 className="font-serif text-lg text-stone-900">{title}</h3>
                </div>
                <span className="text-[10px] font-bold text-stone-500 bg-white/50 px-2 py-1 rounded-full border border-stone-200/50">
                    {data.features.filter(f => f.status === status).length}
                </span>
            </div>

            <div className="space-y-3 p-4 flex-grow overflow-y-auto bg-stone-50/50">
                {data.features.filter(f => f.status === status).map(feature => {
                    const SystemIcon = LAYER_OPTIONS.find(l => l.value === feature.stackLayer)?.icon || Layers;
                    const linkedNode = nodes.find(n => n.id === feature.systemId);

                    return (
                        <div
                            key={feature.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, feature.id)}
                            className="bg-white p-4 rounded-lg shadow-sm border border-stone-100 group hover:border-nobel-gold/50 hover:shadow-md transition-all duration-300 relative cursor-grab active:cursor-grabbing"
                        >
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-stone-300">
                                <GripVertical className="w-4 h-4" />
                            </div>

                            <input
                                className="font-serif font-bold text-base w-[90%] outline-none mb-2 bg-transparent text-stone-900 placeholder-stone-300 border-b border-transparent focus:border-stone-200 transition-colors pb-1"
                                value={feature.title}
                                onChange={(e) => handleUpdateFeature(feature.id, { title: e.target.value })}
                                placeholder="Feature Title"
                            />
                            <textarea
                                className="w-full text-xs text-stone-500 bg-transparent outline-none resize-none h-12 mb-3 leading-relaxed placeholder-stone-200 font-sans"
                                value={feature.description}
                                onChange={(e) => handleUpdateFeature(feature.id, { description: e.target.value })}
                                placeholder="Add implementation details..."
                            />

                            {/* System & Layer Badges/Selectors */}
                            <div className="flex flex-wrap gap-2 mb-3">
                                {/* Stack Layer Selector */}
                                <div className="relative group/layer">
                                    <button className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-wider transition-colors ${feature.stackLayer ? 'bg-stone-50 border-stone-200 text-stone-600' : 'bg-transparent border-dashed border-stone-300 text-stone-300 hover:text-stone-500'}`}>
                                        <SystemIcon className="w-3 h-3" />
                                        {feature.stackLayer || 'Stack Layer'}
                                    </button>
                                    <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-stone-200 rounded shadow-lg z-20 hidden group-hover/layer:block">
                                        {LAYER_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => handleUpdateFeature(feature.id, { stackLayer: opt.value })}
                                                className="w-full text-left px-3 py-2 text-xs hover:bg-stone-50 flex items-center gap-2 text-stone-600"
                                            >
                                                <opt.icon className="w-3 h-3" /> {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Architecture Node Link */}
                                <div className="relative group/system">
                                    <button className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-wider transition-colors ${linkedNode ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-transparent border-dashed border-stone-300 text-stone-300 hover:text-stone-500'}`}>
                                        <Workflow className="w-3 h-3" />
                                        {linkedNode ? linkedNode.data.label as string : 'Link Node'}
                                    </button>
                                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-stone-200 rounded shadow-lg z-20 hidden group-hover/system:block max-h-40 overflow-y-auto">
                                        <button
                                            onClick={() => handleUpdateFeature(feature.id, { systemId: undefined })}
                                            className="w-full text-left px-3 py-2 text-xs hover:bg-stone-50 text-stone-400 italic"
                                        >
                                            No Association
                                        </button>
                                        {nodes.map(node => (
                                            <button
                                                key={node.id}
                                                onClick={() => handleUpdateFeature(feature.id, { systemId: node.id })}
                                                className="w-full text-left px-3 py-2 text-xs hover:bg-stone-50 text-stone-600"
                                            >
                                                {node.data.label as string}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-stone-50">
                                <CustomSelect
                                    value={feature.priority}
                                    onChange={(val) => handleUpdateFeature(feature.id, { priority: val })}
                                    options={[{ label: 'Low', value: 'Low' }, { label: 'Medium', value: 'Medium' }, { label: 'High', value: 'High' }]}
                                    className="w-24"
                                />

                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleDeleteFeature(feature.id)}
                                        className="p-1.5 hover:bg-red-50 rounded-md text-stone-300 hover:text-red-500 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <button
                onClick={() => handleAddFeature(status)}
                className="w-full py-3 border-t border-stone-200 text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-nobel-gold hover:bg-stone-50 transition-all flex items-center justify-center gap-2"
            >
                <Plus className="w-3 h-3" /> Add Card
            </button>
        </div>
    );

    const filteredTechOptions = TECH_STACK_DB.filter(t =>
        t.category === activeTab &&
        t.name.toLowerCase().includes(stackSearch.toLowerCase())
    );

    return (
        <div className="min-h-screen flex flex-col bg-nobel-cream canvas-pattern text-stone-900 font-sans overflow-hidden" style={{ backgroundSize: '24px 24px' }}>
            {/* Header */}
            <header className="px-6 py-3 bg-white/80 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between border-b border-stone-200">
                <div className="flex items-center gap-4">
                    <Logo imageClassName="h-8 w-auto" />
                    <div className="h-6 w-px bg-stone-200" />
                    <div className="h-6 w-px bg-stone-200" />
                    <TabNavigation
                        currentView={currentView}
                        onNavigate={onNavigate}
                        allowedPages={allowedPages}
                        projectFeatures={{
                            canvasEnabled: data.canvasEnabled,
                            marketResearchEnabled: data.marketResearchEnabled
                        }}
                    />
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-white border border-stone-200 rounded-lg p-1 shadow-sm">
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${viewMode === 'kanban' ? 'bg-stone-900 text-white shadow' : 'text-stone-500 hover:bg-stone-50'}`}
                        >
                            <LayoutList className="w-3 h-3" /> Roadmap
                        </button>
                        <button
                            onClick={() => setViewMode('architecture')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${viewMode === 'architecture' ? 'bg-stone-900 text-white shadow' : 'text-stone-500 hover:bg-stone-50'}`}
                        >
                            <Workflow className="w-3 h-3" /> Architecture
                        </button>
                    </div>
                    <button
                        onClick={() => setIsStackSheetOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 hover:border-nobel-gold text-stone-600 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm transition-all"
                    >
                        <Layers className="w-4 h-4" /> Add Tech
                    </button>
                </div>
            </header>

            <main className="flex-grow flex relative overflow-hidden">
                <div className={`flex-grow p-8 md:p-12 overflow-x-auto transition-all duration-300 ${isStackSheetOpen ? 'mr-[450px]' : ''}`}>
                    <div className="max-w-[1600px] mx-auto min-w-[1000px] h-full flex flex-col">



                        <div className="mb-10 flex items-end justify-between">
                            <div>
                                <div className="inline-block mb-3 text-xs font-bold tracking-[0.2em] text-stone-500 uppercase">Execution</div>
                                <h2 className="font-serif text-4xl text-stone-900">Engineering {viewMode === 'kanban' ? 'Roadmap' : 'Architecture'}</h2>
                            </div>
                            <div className="text-stone-400 text-sm font-light italic max-w-md text-right">
                                "Build, measure, learn. Prioritize features that validate your hypothesis."
                            </div>
                        </div>

                        {viewMode === 'kanban' ? (
                            <div className="flex gap-8 items-start h-[calc(100vh-250px)] pb-4">
                                <Column title="Backlog" status="Backlog" colorClass="bg-stone-50" dotColor="bg-stone-400" />
                                <Column title="In Progress" status="In Progress" colorClass="bg-amber-50" dotColor="bg-nobel-gold" />
                                <Column title="Done" status="Done" colorClass="bg-emerald-50" dotColor="bg-emerald-500" />
                            </div>
                        ) : (
                            <div className="flex-grow h-full min-h-[500px] border border-stone-200 rounded-xl bg-white shadow-sm overflow-hidden relative flex flex-col">
                                <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur p-2 rounded border border-stone-200 text-xs font-bold text-stone-500 uppercase tracking-wide pointer-events-none">
                                    System Architecture
                                </div>
                                <div className="absolute top-4 right-4 z-10 flex gap-2">
                                    <button onClick={() => setIsStackSheetOpen(true)} className="bg-white px-3 py-1.5 rounded shadow border border-stone-200 text-xs font-bold text-stone-600 hover:text-nobel-gold flex items-center gap-1 transition-colors">
                                        <Plus className="w-3 h-3" /> Custom Node
                                    </button>
                                </div>
                                <ReactFlow
                                    nodes={nodes}
                                    edges={edges}
                                    nodeTypes={nodeTypes}
                                    onNodesChange={onNodesChange}
                                    onEdgesChange={onEdgesChange}
                                    onConnect={onConnect}
                                    onNodeDragStop={onNodeDragStop}
                                    fitView
                                    className="bg-stone-50 h-full flex-grow"
                                >
                                    <Background color="#E7E5E4" gap={20} size={1} />
                                    <Controls className="bg-white border border-stone-200 rounded shadow-sm text-stone-600" />
                                </ReactFlow>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tech Stack Slide-over Sheet */}
                <div className={`fixed inset-y-0 right-0 w-[450px] bg-white/95 backdrop-blur-md shadow-2xl border-l border-stone-200 transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) z-40 flex flex-col ${isStackSheetOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    {/* Sheet Header */}
                    <div className="px-6 py-6 border-b border-stone-200 bg-white/50">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-serif text-2xl text-stone-900">Tech Stack</h3>
                            <button onClick={() => setIsStackSheetOpen(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400 hover:text-stone-900">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative mb-6">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                            <input
                                type="text"
                                placeholder="Search framework, tool, cloud..."
                                value={stackSearch}
                                onChange={(e) => setStackSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm outline-none focus:border-nobel-gold focus:bg-white transition-all"
                            />
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveTab(cat.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${activeTab === cat.id
                                        ? 'bg-stone-900 text-white border-stone-900'
                                        : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'
                                        }`}
                                >
                                    <cat.icon className="w-3 h-3" /> {cat.id}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sheet Content */}
                    <div className="flex-grow overflow-y-auto p-6 bg-stone-50/50">
                        <div className="grid grid-cols-2 gap-4">
                            {filteredTechOptions.map(tech => (
                                <button
                                    key={tech.id}
                                    onClick={() => handleAddTechNode(tech)}
                                    className="flex flex-col items-center justify-center p-6 bg-white border border-stone-200 rounded-xl hover:border-nobel-gold hover:shadow-md transition-all group"
                                >
                                    <div className="w-12 h-12 mb-3 bg-stone-50 rounded-lg flex items-center justify-center p-2 group-hover:scale-110 transition-transform overflow-hidden">
                                        <img src={tech.logo} alt={tech.name} className="w-full h-full object-contain" loading="lazy" />
                                    </div>
                                    <span className="font-serif font-bold text-stone-900 text-sm">{tech.name}</span>
                                    <span className="text-[10px] text-stone-400 uppercase tracking-wider mt-1 group-hover:text-nobel-gold transition-colors">Add to Stack</span>
                                </button>
                            ))}

                            {/* Custom Entry if no results */}
                            {filteredTechOptions.length === 0 && (
                                <div className="col-span-2 text-center py-12 text-stone-400">
                                    <Box className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-xs mb-4">No specific matches found.</p>
                                    <button
                                        onClick={() => {
                                            handleAddManualNode();
                                            setIsStackSheetOpen(false);
                                        }}
                                        className="text-xs font-bold uppercase tracking-widest text-nobel-gold hover:underline"
                                    >
                                        Create Custom Node
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AgileRoadmap;
