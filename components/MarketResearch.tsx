

import React, { useState, useEffect, useRef } from 'react';
import { StartupData, MarketVersion, AISettings, RolePermissions } from '../types';
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useCreateDocument } from "../hooks/useCreate";
import { useMarketResearchLogic } from "../hooks/useMarketResearchLogic";
import { Plus, Check, ChevronDown, Save, History, Trash2, Brain, Loader2, FileText, Target, PieChart, Info, Upload, X, Edit3, Eye, ChevronLeft, ChevronRight, BarChart3, TrendingUp, AlertCircle, MousePointerClick, Mic, Paperclip, Maximize2, Minimize2, Copy, FolderPlus, LayoutGrid, Home } from 'lucide-react';
import TabNavigation from './TabNavigation';
import ProjectSelector from './ProjectSelector';
import { Logo } from './Logo';
import AttributionBadge from './AttributionBadge';
import { toast } from 'sonner';
import { marked } from 'marked';
import { SaveToFilesDialog } from './nobel_chat/SaveToFilesDialog';
import { ModelSelect } from './ModelSelector';
import { useActiveModel } from '../hooks/useActiveModel';
import { Id } from '../convex/_generated/dataModel';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Heading1, Heading2, List as ListIcon } from 'lucide-react';
import TurndownService from 'turndown';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';

const turndownService = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });
turndownService.remove(['style', 'script']);

// Mini TipTap Editor
interface MiniStoryEditorProps {
    content: string;
    onChange: (html: string) => void;
}

const MiniStoryEditor: React.FC<MiniStoryEditorProps> = ({ content, onChange }) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
        ],
        content: '',
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            const markdown = turndownService.turndown(html);
            onChange(markdown);
        },
        editorProps: {
            attributes: {
                class: 'prose prose-nobel max-w-none focus:outline-none min-h-[50vh] px-8 py-6 text-stone-800 font-sans leading-loose',
            },
        },
    });

    const isFirstRun = useRef(true);
    useEffect(() => {
        const parseContent = async () => {
            if (content && editor && (!editor.isFocused || isFirstRun.current)) {
                const html = await marked.parse(content);
                editor.commands.setContent(html);
                isFirstRun.current = false;
            }
        };
        parseContent();
    }, [content, editor]);

    if (!editor) return null;

    return (
        <div className="border border-stone-200 rounded-xl overflow-hidden bg-white mb-8">
            <div className="flex items-center gap-1 px-3 py-2 bg-stone-50 border-b border-stone-200">
                <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p - 2 rounded hover: bg - white transition - colors ${editor.isActive('bold') ? 'bg-white shadow-sm text-nobel-gold' : 'text-stone-500'} `} title="Bold"><Bold className="w-4 h-4" /></button>
                <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p - 2 rounded hover: bg - white transition - colors ${editor.isActive('italic') ? 'bg-white shadow-sm text-nobel-gold' : 'text-stone-500'} `} title="Italic"><Italic className="w-4 h-4" /></button>
                <div className="w-px h-5 bg-stone-200 mx-1" />
                <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p - 2 rounded hover: bg - white transition - colors ${editor.isActive('heading', { level: 1 }) ? 'bg-white shadow-sm text-nobel-gold' : 'text-stone-500'} `} title="Heading 1"><Heading1 className="w-4 h-4" /></button>
                <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p - 2 rounded hover: bg - white transition - colors ${editor.isActive('heading', { level: 2 }) ? 'bg-white shadow-sm text-nobel-gold' : 'text-stone-500'} `} title="Heading 2"><Heading2 className="w-4 h-4" /></button>
                <div className="w-px h-5 bg-stone-200 mx-1" />
                <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p - 2 rounded hover: bg - white transition - colors ${editor.isActive('bulletList') ? 'bg-white shadow-sm text-nobel-gold' : 'text-stone-500'} `} title="Bullet List"><ListIcon className="w-4 h-4" /></button>
                <div className="w-px h-5 bg-stone-200 mx-1" />
                <button
                    onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                    className="p-2 rounded hover:bg-white transition-colors text-stone-500"
                    title="Insert Table"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
            <EditorContent editor={editor} />
        </div>
    );
};

interface MarketResearchProps {
    data: StartupData;
    allProjects: StartupData[];
    onUpdateProject: (updater: (project: StartupData) => StartupData) => void;
    onSwitchProject: (id: string) => void;
    onNewProject: () => void;
    onNavigate: (view: any) => void;
    currentView: any;
    settings: AISettings;
    allowedPages?: string[];
    permissions?: RolePermissions;
}




import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MarkdownRenderer: React.FC<{ content: string; theme?: 'light' | 'dark' }> = ({ content, theme = 'light' }) => {
    if (!content) return null;
    return (
        <div className="border border-stone-200 rounded-xl overflow-hidden bg-white mb-8">
            <article className="prose prose-nobel max-w-none text-stone-800 font-sans leading-loose px-8 py-6">
                <Markdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        h1: ({ children }) => <h1 className="text-3xl font-bold text-stone-900 mb-6 mt-8 leading-tight font-serif">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-2xl font-bold text-stone-800 mb-4 mt-8 leading-tight font-serif">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-xl font-bold text-stone-800 mb-3 mt-6 leading-tight font-serif">{children}</h3>,
                        p: ({ children }) => <p className="mb-4 leading-loose text-stone-600">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-outside ml-6 mb-6 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-outside ml-6 mb-6 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="pl-1 leading-loose text-stone-600">{children}</li>,
                        strong: ({ children }) => <strong className="font-bold text-stone-900">{children}</strong>,
                        blockquote: ({ children }) => <blockquote className="border-l-4 border-nobel-gold pl-4 italic my-4 text-stone-500 bg-stone-50 py-2 pr-2 rounded-r">{children}</blockquote>,
                        a: ({ href, children }) => (
                            <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline decoration-nobel-gold/40 hover:decoration-nobel-gold transition-all"
                            >
                                {children}
                            </a>
                        ),
                        img: ({ alt, src }) => {
                            if (alt === 'AI Assisted') return <AttributionBadge type="AI Assisted" />;
                            if (alt === 'Human Edited') return <AttributionBadge type="Human Edited" />;
                            return <img alt={alt} src={src} className="rounded-lg shadow-md my-4 max-w-full" />;
                        }
                    }}
                >
                    {content}
                </Markdown>
            </article>
        </div>
    );
};

const MarketValueInput = ({ value, onChange, theme = 'light' }: { value: number, onChange: (val: number) => void, theme?: 'light' | 'dark' | 'gold' }) => {
    const getBestUnit = (val: number) => {
        if (val >= 1000000000000) return 1000000000000;
        if (val >= 1000000000) return 1000000000;
        if (val >= 1000000) return 1000000;
        return 1;
    };

    const [multiplier, setMultiplier] = useState(() => value > 0 ? getBestUnit(value) : 1000000000);

    // Sync internal multiplier state if value changes significantly from outside (e.g. initial load or AI update)
    useEffect(() => {
        if (value > 0) {
            const best = getBestUnit(value);
            // If the current multiplier is widely off (e.g. value is 100 but multiplier is 1B -> 0.0000001)
            // Or if value is massive but multiplier is 1
            // Improved logic: If value is 1 unit (e.g. 0.39B), switch down.
            if (value / multiplier < 1 || value / multiplier > 10000) {
                setMultiplier(best);
            }
        }
    }, [value]);

    const displayValue = value === 0 ? '' : parseFloat((value / multiplier).toFixed(2));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (isNaN(val)) onChange(0);
        else onChange(val * multiplier);
    };

    const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setMultiplier(parseFloat(e.target.value));
    };

    let bgClass = 'bg-white text-stone-900 border-stone-200';
    let inputClass = 'text-stone-900 placeholder-stone-300';
    let selectClass = 'text-stone-900';

    if (theme === 'dark') {
        bgClass = 'bg-nobel-gold text-white border-nobel-gold';
        inputClass = 'text-white placeholder-white/50';
        selectClass = 'text-stone-900';
    } else if (theme === 'gold') {
        bgClass = 'bg-white text-nobel-gold border-nobel-gold ring-1 ring-nobel-gold/20';
        inputClass = 'text-nobel-gold placeholder-nobel-gold/30';
        selectClass = 'text-nobel-gold';
    }

    return (
        <div className={`flex items-center rounded-xl border ${bgClass} overflow-hidden transition-all focus-within:ring-2 focus-within:ring-opacity-50 h-14 shadow-sm`}>
            <div className="pl-4 pr-1 font-serif font-bold opacity-70 text-lg">$</div>
            <input
                type="number"
                value={displayValue}
                onChange={handleChange}
                className={`flex-grow outline-none font-serif font-bold text-2xl p-2 bg-transparent ${inputClass} min-w-0`}
                placeholder="0"
            />
            <div className="relative border-l border-current opacity-70 h-full flex items-center">
                <select
                    value={multiplier}
                    onChange={handleUnitChange}
                    className={`appearance-none pl-4 pr-8 py-2 bg-transparent text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer h-full ${selectClass}`}
                >
                    <option className="text-stone-900" value={1}>USD</option>
                    <option className="text-stone-900" value={1000}>Thou (K)</option>
                    <option className="text-stone-900" value={1000000}>Mill (M)</option>
                    <option className="text-stone-900" value={1000000000}>Bill (B)</option>
                    <option className="text-stone-900" value={1000000000000}>Trill (T)</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
            </div>
        </div>
    );
};

import DotPatternBackground from './DotPatternBackground';
import { motion, AnimatePresence } from 'framer-motion';

// ... (existing imports and code)

const MarketResearch: React.FC<MarketResearchProps> = ({ data, allProjects, onUpdateProject, onSwitchProject, onNewProject, onNavigate, currentView, settings, allowedPages, permissions }) => {
    const { activeModel, capabilities } = useActiveModel();
    const hasTools = capabilities.includes('tools') || capabilities.includes('websearch');
    const modifiedSettings = { ...settings, modelName: activeModel || settings.modelName };

    const {
        isGenerating,
        setIsGenerating,
        attachedFiles,
        keywords,
        newKeyword,
        setNewKeyword,
        isSaveDialogOpen,
        setIsSaveDialogOpen,
        isEditing,
        setIsEditing,
        handleSaveMarket,
        handleAddKeyword,
        handleRemoveKeyword,
        handleFileUpload,
        removeFile,
        handleStop,
        handleGenerate,
        handleSaveToDocs
    } = useMarketResearchLogic(data, onUpdateProject, modifiedSettings);

    // Sync isGenerating with backend status
    const isAnalyzing = isGenerating || data.market.status === 'analyzing';

    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(true);
    const [showHelp, setShowHelp] = useState(false);
    const [warningDismissed, setWarningDismissed] = useState(false);

    // Permission and Data Checks
    const hasCanvasData = data.canvas && Object.values(data.canvas).some(val => val && typeof val === 'string' && val.trim().length > 20);
    // Fallback: If permissions is undefined (e.g. Founder/Admin legacy), assume true.
    // If permissions IS defined (Member role), use it.
    const canEdit = permissions ? (permissions.global?.edit ?? false) : true;

    // Tooltip message
    let deepResearchTooltip = "";
    if (!hasCanvasData) deepResearchTooltip = "Fill out Canvas first to enable Deep Research.";
    else if (!canEdit) deepResearchTooltip = "You do not have permission to generate research.";
    else if (isGenerating) deepResearchTooltip = "Generating research...";
    else if (!hasTools) deepResearchTooltip = "Selected model does not support required Web Search tools.";

    const isDisabled = isGenerating || !hasCanvasData || !canEdit || !hasTools;

    // Separate hover and selection states
    const [selectedSection, setSelectedSection] = useState<'TAM' | 'SAM' | 'SOM' | null>(null);
    const [hoveredSection, setHoveredSection] = useState<'TAM' | 'SAM' | 'SOM' | null>(null);

    // Active section is hover if present, otherwise selection
    const activeSection = hoveredSection || selectedSection;

    const fileInputRef = useRef<HTMLInputElement>(null);

    const { market } = data;


    const handleCopyReport = () => {
        if (!market.reportContent) return;

        // Strip markdown backticks if any
        const cleanContent = market.reportContent.replace(/^```markdown\n /, '').replace(/\n```$/, '');

        navigator.clipboard.writeText(cleanContent);
        toast.success("Market research copied to clipboard");
    };



    const definitions = {
        TAM: {
            title: "Total Addressable Market",
            subtitle: "The Big Vision",
            description: "The total market demand for a product or service. This is the big picture number.",
            color: "bg-stone-400",
            textColor: "text-stone-600",
            borderColor: "border-stone-400"
        },
        SAM: {
            title: "Serviceable Available Market",
            subtitle: "Your Target Segment",
            description: "The segment of the TAM targeted by your products and services which is within your geographical reach.",
            color: "bg-nobel-gold",
            textColor: "text-nobel-gold",
            borderColor: "border-nobel-gold"
        },
        SOM: {
            title: "Serviceable Obtainable Market",
            subtitle: "Immediate Goal (1-3 Years)",
            description: "The portion of SAM that you can capture. This is your short-term target.",
            color: "bg-stone-900",
            textColor: "text-stone-900",
            borderColor: "border-stone-900"
        }
    };

    const formatCurrency = (val: number) => {
        if (!val) return '$0';
        if (val >= 1000000000000) return `$${(val / 1000000000000).toFixed(1)}T`;
        if (val >= 1000000000) return `$${(val / 1000000000).toFixed(1)}B`;
        if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
        return `$${val}`;
    };

    const getFounderScript = (section: 'TAM' | 'SAM' | 'SOM') => {
        const val = market[section.toLowerCase() as keyof typeof market] as number;
        const formatted = formatCurrency(val);

        switch (section) {
            case 'TAM':
                return `"We are addressing a massive opportunity. Our Total Addressable Market is ${formatted}, representing the global demand for this solution."`;
            case 'SAM':
                return `"Realistically, our Serviceable Available Market is ${formatted}, targeting the specific segment where our solution fits best."`;
            case 'SOM':
                return `"Our immediate focus is to capture ${formatted} in the next 18-24 months. This is our Serviceable Obtainable Market."`;
        }
    };

    const renderBars = () => {
        const { tam, sam, som } = market;
        const maxVal = Math.max(tam, sam, som, 1);

        const getWidth = (val: number) => {
            if (val <= 0) return '0%';
            const pct = (val / maxVal) * 100;
            return `${Math.max(pct, 1)}%`;
        };

        // Best practice validation: TAM >= SAM >= SOM
        const hasViolation = (tam > 0 || sam > 0 || som > 0) && (sam > tam || som > sam);

        return (
            <div className="flex flex-row items-center justify-center gap-12 w-full px-8">
                <div className="flex-grow flex flex-col justify-center gap-8 w-full max-w-xl">
                    {/* Validation Warning */}
                    {hasViolation && !warningDismissed && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-xs text-amber-800 space-y-3 relative">
                            <button onClick={() => setWarningDismissed(true)} className="absolute top-3 right-3 p-1 text-amber-400 hover:text-amber-700 transition-colors rounded-full hover:bg-amber-100" title="Dismiss">
                                <X className="w-4 h-4" />
                            </button>
                            <div className="flex items-start gap-3 pr-6">
                                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-sm mb-1">Top-Down best practice: TAM ≥ SAM ≥ SOM</p>
                                    <p className="text-amber-700 leading-relaxed">
                                        {sam > tam && (
                                            <>Your <strong>SAM ({formatCurrency(sam)})</strong> exceeds your <strong>TAM ({formatCurrency(tam)})</strong>. The Serviceable Available Market must be a <em>subset</em> of the Total Addressable Market — you cannot serve more than the entire market. </>
                                        )}
                                        {som > sam && (
                                            <>Your <strong>SOM ({formatCurrency(som)})</strong> exceeds your <strong>SAM ({formatCurrency(sam)})</strong>. The Obtainable Market must be a <em>subset</em> of your Serviceable Market — you cannot realistically capture more than you can serve. </>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-amber-100/50 rounded-lg p-3 space-y-1.5">
                                <p className="font-bold uppercase tracking-wider text-[10px] text-amber-600">Why this matters</p>
                                <p className="text-amber-700 leading-relaxed">Investors expect a logical funnel: <strong>TAM → SAM → SOM</strong>. When SAM exceeds TAM, it signals the market scope may be too narrow, or the serviceable segment was calculated independently. Re-scope your TAM to encompass your SAM, or narrow your SAM to a true subset.</p>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-amber-500 font-bold uppercase tracking-wider pt-1">
                                <Info className="w-3 h-3" />
                                <span>
                                    Data source: {(market.tags?.includes('AI Assisted') || market.source === 'AI') ? 'AI-Generated (Deep Research)' : 'Manually entered'}
                                    {market.tags?.includes('Human') && ' + Human edited'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* TAM */}
                    <div
                        className="group cursor-pointer"
                        onClick={() => setSelectedSection(selectedSection === 'TAM' ? null : 'TAM')}
                        onMouseEnter={() => setHoveredSection('TAM')}
                        onMouseLeave={() => setHoveredSection(null)}
                    >
                        <div className="flex justify-between items-end mb-2">
                            <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${activeSection === 'TAM' ? 'text-stone-900' : 'text-stone-400'}`}>TAM</span>
                            <span className="font-serif font-bold text-stone-900">{formatCurrency(tam)}</span>
                        </div>
                        <div className="w-full h-14 bg-stone-100 rounded-r-full rounded-bl-full overflow-hidden relative">
                            <div
                                className={`h-full bg-stone-400 transition-all duration-1000 ease-out rounded-r-full ${activeSection === 'TAM' ? 'opacity-100' : 'opacity-60'}`}
                                style={{ width: getWidth(tam) }}
                            />
                        </div>
                    </div>

                    {/* SAM */}
                    <div
                        className="group cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setSelectedSection(selectedSection === 'SAM' ? null : 'SAM'); }}
                        onMouseEnter={(e) => { e.stopPropagation(); setHoveredSection('SAM'); }}
                        onMouseLeave={(e) => { e.stopPropagation(); setHoveredSection(null); }}
                    >
                        <div className="flex justify-between items-end mb-2">
                            <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${activeSection === 'SAM' ? 'text-nobel-gold' : 'text-stone-400'}`}>SAM</span>
                            <span className="font-serif font-bold text-nobel-gold">{formatCurrency(sam)}</span>
                        </div>
                        <div className="w-full h-14 bg-stone-100 rounded-r-full rounded-bl-full overflow-hidden relative">
                            <div
                                className={`h-full bg-nobel-gold transition-all duration-1000 ease-out rounded-r-full ${activeSection === 'SAM' ? 'opacity-100' : 'opacity-80'}`}
                                style={{ width: getWidth(sam) }}
                            />
                        </div>
                    </div>

                    {/* SOM */}
                    <div
                        className="group cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setSelectedSection(selectedSection === 'SOM' ? null : 'SOM'); }}
                        onMouseEnter={(e) => { e.stopPropagation(); setHoveredSection('SOM'); }}
                        onMouseLeave={(e) => { e.stopPropagation(); setHoveredSection(null); }}
                    >
                        <div className="flex justify-between items-end mb-2">
                            <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${activeSection === 'SOM' ? 'text-stone-900' : 'text-stone-400'}`}>SOM</span>
                            <span className="font-serif font-bold text-stone-900">{formatCurrency(som)}</span>
                        </div>
                        <div className="w-full h-14 bg-stone-100 rounded-r-full rounded-bl-full overflow-hidden relative">
                            <div
                                className={`h-full bg-stone-900 transition-all duration-1000 ease-out rounded-r-full ${activeSection === 'SOM' ? 'opacity-100' : 'opacity-90'}`}
                                style={{ width: getWidth(som) }}
                            />
                        </div>
                    </div>
                </div>

                {/* Explainer Card */}
                <div className={`flex-shrink-0 transition-all duration-500 ease-in-out overflow-hidden ${activeSection ? 'w-80 opacity-100' : 'w-0 opacity-0'}`}>
                    {activeSection && definitions[activeSection] ? (
                        <div className={`bg-white rounded-xl shadow-2xl border-l-4 p-8 w-80 ${definitions[activeSection].borderColor}`}>
                            <div className="flex items-center gap-2 mb-4">
                                <MousePointerClick className="w-4 h-4 text-stone-400" />
                                <span className={`text-xs font-bold uppercase tracking-widest ${definitions[activeSection].textColor}`}>{activeSection}</span>
                            </div>
                            <h3 className="font-serif text-3xl text-stone-900 mb-2">{definitions[activeSection].title}</h3>
                            <p className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-8">{definitions[activeSection].subtitle}</p>

                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">Definition</p>
                                    <p className="text-sm text-stone-600 leading-relaxed font-light">
                                        {definitions[activeSection].description}
                                    </p>
                                </div>

                                <div className="bg-stone-50 p-5 rounded-lg border border-stone-100 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-nobel-gold/10 rounded-bl-full -mr-8 -mt-8"></div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-nobel-gold mb-2 flex items-center gap-1 relative z-10">
                                        <Mic className="w-3 h-3" /> Pitch Script
                                    </p>
                                    <p className="text-sm text-stone-800 font-serif italic leading-relaxed relative z-10">
                                        {getFounderScript(activeSection)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-80 h-96"></div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="h-screen flex bg-nobel-cream relative overflow-hidden">
            {/* LEFT SIDE: HERO IMAGE (20%) - Hidden when report is open */}
            <AnimatePresence>
                {isLeftCollapsed && (
                    <motion.div
                        initial={{ width: '20%', opacity: 1 }}
                        animate={{ width: '20%', opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="h-full relative overflow-hidden bg-stone-900 border-r border-stone-200 shadow-2xl z-20"
                    >
                        <img
                            src="/OfficeDiscussion.png"
                            className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105"
                            alt="Top-Down Sizing Hero"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/40 via-transparent to-stone-900/80" />

                        <div className="absolute top-8 left-8 z-30">
                            <Logo imageClassName="h-8 w-auto brightness-0 invert" />
                        </div>

                        <div className="absolute inset-x-0 bottom-0 p-8 space-y-4 bg-gradient-to-t from-stone-900 via-stone-900/60 to-transparent pt-24">
                            <div className="space-y-3">
                                <h2 className="text-white text-2xl font-serif font-bold leading-tight">
                                    Market <br />
                                    <span className="text-nobel-gold italic underline underline-offset-8 decoration-white/20">Intelligence.</span>
                                </h2>
                                <div className="h-1 w-10 bg-nobel-gold/50 rounded-full" />
                                <p className="text-stone-300 text-sm leading-relaxed font-medium">
                                    Unlock deep insights into your target market, trends, and opportunities using <strong>top-down analysis</strong>.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* RIGHT SIDE: MAIN CONTENT */}
            <motion.div
                animate={{ width: isLeftCollapsed ? '80%' : '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="h-full flex flex-col relative z-10"
            >
                <DotPatternBackground color="#a8a29e" />

                {/* Header */}
                <header className="px-10 py-4 flex items-center justify-between relative z-30 bg-white/80 backdrop-blur-sm border-b border-stone-200">
                    <TabNavigation
                        currentView={currentView}
                        onNavigate={onNavigate}
                        allowedPages={allowedPages}
                        projectFeatures={{
                            canvasEnabled: data.canvasEnabled,
                            marketResearchEnabled: data.marketResearchEnabled
                        }}
                        mode="light"
                    />
                    <div className="flex items-center gap-3">
                        <ModelSelect className="w-48" />
                        <input type="file" ref={fileInputRef} className="hidden" multiple accept=".pdf,.txt,.md" onChange={handleFileUpload} disabled={!canEdit} />
                        {isAnalyzing ? (
                            <div className="flex items-center gap-2">
                                <div className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-stone-900 via-nobel-gold to-stone-900 bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite] text-white flex items-center gap-2 shadow-lg">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="animate-pulse">Deep Searching...</span>
                                </div>
                                <button onClick={handleStop} className="p-2 rounded-full bg-red-500/90 text-white hover:bg-red-600 transition-colors shadow-md" title="Stop">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <div className="relative group/tooltip">
                                <button onClick={handleGenerate} disabled={isDisabled} className={`px-5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 shadow-sm border ${isDisabled ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed' : 'bg-stone-900 border-stone-800 text-white hover:bg-black hover:text-nobel-gold'}`}>
                                    <Brain className="w-4 h-4" /> Analysis
                                </button>
                                {isDisabled && !isGenerating && (
                                    <div className="absolute top-full mt-2 right-0 bg-stone-900 text-white text-[10px] px-3 py-1.5 rounded-md whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-50 pointer-events-none">
                                        {deepResearchTooltip}
                                    </div>
                                )}
                            </div>
                        )}
                        {market.reportContent && isLeftCollapsed && (
                            <button
                                onClick={() => setIsLeftCollapsed(false)}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 transition-colors flex items-center gap-2 border border-emerald-500 shadow-lg active:scale-95"
                            >
                                <FileText className="w-4 h-4" /> Report
                            </button>
                        )}
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-grow flex relative z-10 overflow-hidden">
                    {/* Visualization Panel */}
                    <div className={`${!isLeftCollapsed ? 'w-1/2' : 'w-full'} flex flex-col px-12 py-6 overflow-y-auto transition-all duration-300`}>
                        <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
                            {/* Header Area */}
                            <div className={`mt-8 mb-4 shrink-0 flex ${!isLeftCollapsed ? 'flex-col gap-3' : 'flex-row items-start justify-between gap-4'}`}>
                                <h2 className="font-serif text-3xl text-stone-900 flex items-center gap-3">
                                    Top-Down Market Sizing
                                    {(market.tags?.includes('AI Assisted') || market.source === 'AI') && (
                                        <AttributionBadge type="AI Assisted" />
                                    )}
                                    {market.tags?.includes('Human') && (
                                        <AttributionBadge type="Human" />
                                    )}
                                </h2>

                                {/* Help Accordion */}
                                <div className={`${!isLeftCollapsed ? 'w-72' : 'w-60'} bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden transition-all shrink-0`}>
                                    <button
                                        onClick={() => setShowHelp(!showHelp)}
                                        className="w-full px-5 py-3 flex justify-between items-center text-xs font-bold uppercase tracking-widest text-stone-500 hover:bg-stone-50 hover:text-nobel-gold transition-colors"
                                    >
                                        <span className="flex items-center gap-2"><Info className="w-3 h-3" /> How This Works</span>
                                        <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${showHelp ? 'rotate-180' : ''}`} />
                                    </button>
                                    <div className={`overflow-hidden transition-all duration-500 ease-in-out ${showHelp ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="px-5 pb-5 pt-4 text-xs text-stone-200 font-sans leading-relaxed bg-stone-900">
                                            <p className="mb-2 uppercase tracking-wider font-bold text-nobel-gold">General Market Intelligence</p>
                                            <p className="mb-3 text-stone-400">Uses AI to analyze macro-economic trends, industry reports, and global search data (Top-Down Approach).</p>
                                            <p className="text-stone-400 mb-4"><strong>Data Used:</strong> Your Business Canvas (Problem/Solution) + Keywords to generate broad TAM/SAM estimates.</p>

                                            <div className={`grid ${!isLeftCollapsed ? 'grid-cols-3' : 'grid-cols-1'} gap-3 text-xs font-mono`}>
                                                <div className="p-3 bg-stone-800 rounded-lg border border-stone-700">
                                                    <strong className="block text-nobel-gold mb-1">TAM</strong>
                                                    <span className="text-stone-400">Total Industry Revenue</span>
                                                </div>
                                                <div className="p-3 bg-stone-800 rounded-lg border border-stone-700">
                                                    <strong className="block text-nobel-gold mb-1">SAM</strong>
                                                    <span className="text-stone-400">Target Segment Revenue</span>
                                                </div>
                                                <div className="p-3 bg-stone-800 rounded-lg border border-stone-700">
                                                    <strong className="block text-nobel-gold mb-1">SOM</strong>
                                                    <span className="text-stone-400">Realistic Capture (1-3 Years)</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Chart Area */}
                            <div className="flex-grow flex items-center justify-center relative z-10">
                                {renderBars()}
                            </div>

                            {/* Market Value Inputs - Inline below chart */}
                            {canEdit && (
                                <div className="pt-4 pb-8 shrink-0">
                                    <div className={`grid gap-6 ${!isLeftCollapsed ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
                                        <div
                                            className={`bg-white p-6 rounded-2xl border shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden ${activeSection === 'TAM' ? 'border-stone-400 ring-1 ring-stone-200' : 'border-stone-200'}`}
                                            onClick={() => setSelectedSection(selectedSection === 'TAM' ? null : 'TAM')}
                                            onMouseEnter={() => setHoveredSection('TAM')}
                                            onMouseLeave={() => setHoveredSection(null)}
                                        >
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Total Addressable (TAM)</label>
                                            <MarketValueInput value={market.tam || 0} onChange={(v) => handleSaveMarket({ tam: v })} theme="light" />
                                        </div>
                                        <div
                                            className={`bg-white p-6 rounded-2xl border shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden ${activeSection === 'SAM' ? 'border-nobel-gold ring-1 ring-nobel-gold' : 'border-nobel-gold/30 ring-1 ring-nobel-gold/10'}`}
                                            onClick={() => setSelectedSection(selectedSection === 'SAM' ? null : 'SAM')}
                                            onMouseEnter={() => setHoveredSection('SAM')}
                                            onMouseLeave={() => setHoveredSection(null)}
                                        >
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-nobel-gold">Serviceable (SAM)</label>
                                            <MarketValueInput value={market.sam || 0} onChange={(v) => handleSaveMarket({ sam: v })} theme="gold" />
                                        </div>
                                        <div
                                            className={`bg-white p-6 rounded-2xl border shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden ${activeSection === 'SOM' ? 'border-stone-600 ring-1 ring-stone-500' : 'border-stone-200'}`}
                                            onClick={() => setSelectedSection(selectedSection === 'SOM' ? null : 'SOM')}
                                            onMouseEnter={() => setHoveredSection('SOM')}
                                            onMouseLeave={() => setHoveredSection(null)}
                                        >
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Obtainable (SOM)</label>
                                            <MarketValueInput value={market.som || 0} onChange={(v) => handleSaveMarket({ som: v })} theme="dark" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                {/* Toggle Button */}
                {isLeftCollapsed && market.reportContent && (
                    <button
                        onClick={() => setIsLeftCollapsed(false)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-3 bg-emerald-500 text-white rounded-l-full hover:bg-emerald-600 transition-all z-50 shadow-lg group"
                        title="Open Report"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                )}
            </motion.div>

            {/* Report Panel - Fixed overlay taking full height */}
            <AnimatePresence>
                {!isLeftCollapsed && (
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed top-0 right-0 h-full w-1/2 bg-stone-900 border-l border-stone-800 overflow-hidden flex flex-col z-50 shadow-2xl text-white"
                    >
                        {/* Report Header */}
                        <div className="px-8 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-stone-800 rounded-full text-white">
                                    <Brain className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="font-serif text-xl text-white">Market Intelligence</h2>
                                    <p className="text-[10px] text-stone-400 uppercase tracking-widest">Top-Down Research Report</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {market.reportContent && (
                                    <>
                                        <button
                                            onClick={() => setIsEditing(!isEditing)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm ${isEditing ? 'bg-nobel-gold text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}`}
                                        >
                                            {isEditing ? <Check className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                                            {isEditing ? 'Done' : 'Edit'}
                                        </button>
                                        <button
                                            onClick={handleCopyReport}
                                            className="p-2 text-stone-400 hover:text-white transition-colors rounded-full hover:bg-stone-800"
                                            title="Copy Report"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setIsSaveDialogOpen(true)}
                                            className="p-2 text-stone-400 hover:text-white transition-colors rounded-full hover:bg-stone-800"
                                            title="Save to Documents"
                                        >
                                            <FolderPlus className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => setIsLeftCollapsed(true)}
                                    className="p-2 text-stone-400 hover:text-white transition-colors rounded-full hover:bg-stone-800"
                                    title="Close Report"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Keywords Section */}
                        <div className="px-8 py-3 border-b border-stone-800 bg-stone-950/30">
                            <div className="flex flex-wrap gap-2 items-center">
                                <div className="flex items-center bg-stone-900 rounded-lg px-2 py-1 border border-stone-800 focus-within:border-nobel-gold focus-within:ring-1 focus-within:ring-nobel-gold/50">
                                    <Target className="w-3 h-3 text-stone-500 mr-2" />
                                    <input
                                        type="text"
                                        value={newKeyword}
                                        onChange={(e) => setNewKeyword(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                                        placeholder="Add keyword..."
                                        className="bg-transparent border-none text-xs focus:outline-none w-32 text-stone-300 placeholder-stone-600"
                                    />
                                    <button onClick={handleAddKeyword} className="ml-2 text-stone-400 hover:text-nobel-gold">
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                                {keywords.map(k => (
                                    <span key={k} className="inline-flex items-center gap-1 bg-stone-800 text-[10px] font-bold uppercase tracking-wider text-stone-300 px-2 py-1 rounded-md border border-stone-700 shadow-sm">
                                        {k}
                                        <button onClick={() => handleRemoveKeyword(k)} className="hover:text-red-500 ml-1"><X className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Report Content */}
                        <div className="flex-1 overflow-y-auto px-8 py-4">
                            {market.reportContent ? (
                                isEditing ? (
                                    <MiniStoryEditor
                                        content={market.reportContent}
                                        onChange={(newContent) => handleSaveMarket({ reportContent: newContent })}
                                    />
                                ) : (
                                    <div onClick={() => { if (canEdit) setIsEditing(true) }} className="cursor-text animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="prose prose-invert prose-stone max-w-none prose-p:text-stone-300 prose-headings:text-white prose-strong:text-white prose-li:text-stone-300">
                                            <MarkdownRenderer content={market.reportContent} theme="dark" />
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-stone-400">
                                    <TrendingUp className="w-16 h-16 mb-4 opacity-20" />
                                    <p>No market research generated yet.</p>
                                    <button onClick={handleGenerate} disabled={isDisabled} className="mt-4 text-nobel-gold font-bold hover:underline disabled:opacity-50">
                                        Run Deep Research to analyze your market
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <SaveToFilesDialog
                isOpen={isSaveDialogOpen}
                onClose={() => setIsSaveDialogOpen(false)}
                projectId={data.id}
                onSave={handleSaveToDocs}
                title="Save Market Research"
            />
        </div>
    );
};

export default MarketResearch;