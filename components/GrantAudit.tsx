
import React, { useState, useEffect, useRef } from 'react';
import { StartupData, DataSource, CanvasSection, AISettings } from '../types';
import { PieChart, Upload, Tag, Search, Plus, Trash2, ChevronDown, Check, FileText, Bot, User, RefreshCw, Download, File, AlertCircle } from 'lucide-react';
import CustomSelect from './CustomSelect';
import TabNavigation from './TabNavigation';
import ProjectSelector from './ProjectSelector';
import { Logo } from './Logo';

interface GrantAuditProps {
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

const COLORS = {
    AI: '#C5A059', // Nobel Gold
    Human: '#1c1917', // Stone 900
};

const GrantAudit: React.FC<GrantAuditProps> = ({
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
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync Data Logic: Ensures internal app data is reflected in the audit log
    const syncData = () => {
        const existingIds = new Set(data.dataSources.map(d => d.id));
        const newSources: DataSource[] = [];

        // 1. Sync Canvas Sections
        Object.entries(data.canvas).forEach(([key, content]) => {
            if (!content) return;
            const id = `canvas-${key}`;
            if (!existingIds.has(id)) {
                newSources.push({
                    id,
                    name: `Canvas: ${key}`,
                    type: 'Canvas',
                    source: 'Human', // Default to Human, user can tag as AI
                    content: content as string,
                    wordCount: (content as string).split(/\s+/).length,
                    tags: ['Draft'],
                    timestamp: Date.now()
                });
            }
        });

        // 2. Sync Reports
        if (data.whitePaperContent && !existingIds.has('report-whitepaper')) {
            newSources.push({
                id: 'report-whitepaper',
                name: 'White Paper Report',
                type: 'Report',
                source: 'AI', // Reports are usually AI generated in this app
                content: data.whitePaperContent,
                wordCount: data.whitePaperContent.split(/\s+/).length,
                tags: ['Generated'],
                timestamp: Date.now()
            });
        }

        if (data.businessPlanContent && !existingIds.has('report-bizplan')) {
            newSources.push({
                id: 'report-bizplan',
                name: 'Business Plan',
                type: 'Report',
                source: 'AI',
                content: data.businessPlanContent,
                wordCount: data.businessPlanContent.split(/\s+/).length,
                tags: ['Generated'],
                timestamp: Date.now()
            });
        }

        // 3. Update Project
        if (newSources.length > 0) {
            onUpdateProject(p => ({
                ...p,
                dataSources: [...p.dataSources, ...newSources]
            }));
        }
    };

    // Auto-sync on mount
    useEffect(() => {
        syncData();
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Simple text read for simplicity, or just metadata log
        const newSource: DataSource = {
            id: `upload-${Date.now()}`,
            name: file.name,
            type: 'Upload',
            source: 'Human',
            wordCount: Math.round(file.size / 6), // Rough estimate for non-text files
            tags: ['Evidence'],
            timestamp: Date.now()
        };

        const reader = new FileReader();
        reader.onload = (event) => {
            if (typeof event.target?.result === 'string') {
                newSource.content = event.target.result;
                newSource.wordCount = event.target.result.split(/\s+/).length;
            }
            onUpdateProject(p => ({
                ...p,
                dataSources: [newSource, ...p.dataSources]
            }));
        };

        // Try reading as text, if fail just log metadata
        try {
            reader.readAsText(file);
        } catch {
            onUpdateProject(p => ({
                ...p,
                dataSources: [newSource, ...p.dataSources]
            }));
        }
    };

    const toggleSource = (id: string) => {
        onUpdateProject(p => ({
            ...p,
            dataSources: p.dataSources.map(ds =>
                ds.id === id ? { ...ds, source: ds.source === 'AI' ? 'Human' : 'AI' } : ds
            )
        }));
    };

    const addTag = (id: string) => {
        const tag = prompt("Enter tag:");
        if (tag) {
            onUpdateProject(p => ({
                ...p,
                dataSources: p.dataSources.map(ds =>
                    ds.id === id ? { ...ds, tags: [...ds.tags, tag] } : ds
                )
            }));
        }
    };

    const removeTag = (id: string, tagToRemove: string) => {
        onUpdateProject(p => ({
            ...p,
            dataSources: p.dataSources.map(ds =>
                ds.id === id ? { ...ds, tags: ds.tags.filter(t => t !== tagToRemove) } : ds
            )
        }));
    };

    const handleDelete = (id: string) => {
        if (confirm("Remove this entry from the audit log?")) {
            onUpdateProject(p => ({
                ...p,
                dataSources: p.dataSources.filter(ds => ds.id !== id)
            }));
        }
    };

    // --- Stats Calculation ---
    const totalWords = data.dataSources.reduce((sum, ds) => sum + ds.wordCount, 0);
    const aiWords = data.dataSources.filter(ds => ds.source === 'AI').reduce((sum, ds) => sum + ds.wordCount, 0);
    const humanWords = data.dataSources.filter(ds => ds.source === 'Human').reduce((sum, ds) => sum + ds.wordCount, 0);

    const aiPercentage = totalWords > 0 ? Math.round((aiWords / totalWords) * 100) : 0;
    const humanPercentage = 100 - aiPercentage;

    // --- Graph Rendering (SVG Donut) ---
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const aiOffset = circumference - (aiPercentage / 100) * circumference;

    const filteredSources = data.dataSources.filter(ds =>
        ds.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ds.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="min-h-screen flex flex-col bg-[#F9F8F4] text-stone-900 font-sans">
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

                <div className="w-24"></div>
            </header>

            <main className="flex-grow p-8 md:p-12 overflow-y-auto">
                <div className="max-w-[1400px] mx-auto">

                    <div className="flex flex-col md:flex-row gap-12 mb-12">
                        {/* LEFT: Stats & Graph */}
                        <div className="md:w-1/3 flex flex-col gap-6">
                            <div className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm flex flex-col items-center text-center">
                                <h2 className="font-serif text-2xl text-stone-900 mb-6">Data Provenance</h2>

                                <div className="relative w-64 h-64 mb-6">
                                    <svg width="100%" height="100%" viewBox="0 0 200 200" className="transform -rotate-90">
                                        {/* Human Circle (Base) */}
                                        <circle cx="100" cy="100" r={radius} fill="none" stroke={COLORS.Human} strokeWidth="20" />

                                        {/* AI Circle (Overlay) */}
                                        <circle
                                            cx="100"
                                            cy="100"
                                            r={radius}
                                            fill="none"
                                            stroke={COLORS.AI}
                                            strokeWidth="20"
                                            strokeDasharray={circumference}
                                            strokeDashoffset={aiOffset}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000 ease-out"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-4xl font-serif font-bold text-stone-900">{humanPercentage}%</span>
                                        <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Human Owned</span>
                                    </div>
                                </div>

                                <div className="flex justify-center gap-8 w-full">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-stone-900"></div>
                                        <div className="text-left">
                                            <div className="text-sm font-bold">{humanWords.toLocaleString()}</div>
                                            <div className="text-[10px] uppercase text-stone-400 tracking-wider">Human Words</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-nobel-gold"></div>
                                        <div className="text-left">
                                            <div className="text-sm font-bold text-nobel-gold">{aiWords.toLocaleString()}</div>
                                            <div className="text-[10px] uppercase text-stone-400 tracking-wider">AI Generated</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-stone-900 text-white p-6 rounded-xl shadow-lg border border-stone-800">
                                <div className="flex items-center gap-3 mb-4">
                                    <AlertCircle className="w-5 h-5 text-nobel-gold" />
                                    <h3 className="font-bold text-sm uppercase tracking-wider">Grant Eligibility</h3>
                                </div>
                                <p className="text-sm font-light text-stone-300 leading-relaxed mb-4">
                                    Many grants require {'>'}50% human-generated content. You are currently at <strong className="text-white">{humanPercentage}%</strong>.
                                </p>
                                {humanPercentage >= 50 ? (
                                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                                        <Check className="w-4 h-4" /> Likely Eligible
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                                        <AlertCircle className="w-4 h-4" /> Add more human input
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Data Table */}
                        <div className="md:w-2/3 flex flex-col h-full">
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <h3 className="font-serif text-3xl text-stone-900 mb-2">Audit Log</h3>
                                    <p className="text-stone-500 text-sm">Tag and classify your IP assets.</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={syncData} className="p-2 text-stone-400 hover:text-stone-900 transition-colors" title="Sync Data">
                                        <RefreshCw className="w-5 h-5" />
                                    </button>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                                        <input
                                            type="text"
                                            placeholder="Search assets..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-full text-sm outline-none focus:border-nobel-gold transition-colors shadow-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Upload Area */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-stone-200 rounded-xl p-8 mb-8 flex flex-col items-center justify-center text-stone-400 hover:border-nobel-gold hover:bg-stone-50 transition-all cursor-pointer group"
                            >
                                <Upload className="w-8 h-8 mb-3 group-hover:text-nobel-gold transition-colors" />
                                <span className="text-xs font-bold uppercase tracking-widest">Upload Supporting Documents</span>
                                <span className="text-[10px] mt-1">PDF, DOCX, TXT (Auto-tagged as Human)</span>
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                            </div>

                            {/* Table */}
                            <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden flex-grow">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="bg-[#F5F4F0] text-[10px] uppercase font-bold tracking-widest text-stone-500">
                                        <tr>
                                            <th className="px-6 py-4 border-b border-stone-200">Asset Name</th>
                                            <th className="px-6 py-4 border-b border-stone-200">Type</th>
                                            <th className="px-6 py-4 border-b border-stone-200">Volume</th>
                                            <th className="px-6 py-4 border-b border-stone-200">Source Tag</th>
                                            <th className="px-6 py-4 border-b border-stone-200">Tags</th>
                                            <th className="px-6 py-4 border-b border-stone-200 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSources.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-stone-400 italic">No assets found. Upload documents or sync project data.</td>
                                            </tr>
                                        ) : (
                                            filteredSources.map(ds => (
                                                <tr key={ds.id} className="border-b border-stone-100 last:border-0 hover:bg-[#F9F8F4] transition-colors">
                                                    <td className="px-6 py-4 font-serif font-medium text-stone-900">{ds.name}</td>
                                                    <td className="px-6 py-4 text-xs text-stone-500">{ds.type}</td>
                                                    <td className="px-6 py-4 text-xs font-mono">{ds.wordCount.toLocaleString()} words</td>
                                                    <td className="px-6 py-4">
                                                        <button
                                                            onClick={() => toggleSource(ds.id)}
                                                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${ds.source === 'AI'
                                                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                                                : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                                                                }`}
                                                        >
                                                            {ds.source === 'AI' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                                            {ds.source}
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {ds.tags.map(tag => (
                                                                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-stone-200 rounded text-[10px] text-stone-500">
                                                                    {tag}
                                                                    <button onClick={() => removeTag(ds.id, tag)} className="hover:text-red-500"><Trash2 className="w-2 h-2" /></button>
                                                                </span>
                                                            ))}
                                                            <button onClick={() => addTag(ds.id)} className="p-0.5 text-stone-300 hover:text-nobel-gold"><Plus className="w-3 h-3" /></button>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={() => handleDelete(ds.id)} className="text-stone-300 hover:text-red-500 transition-colors">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default GrantAudit;
