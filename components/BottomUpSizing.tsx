import React, { useState, useEffect, useRef } from 'react';
import { StartupData, MarketVersion, AISettings, RolePermissions, CanvasSection, calculateARPU } from '../types';
import { useMutation, useQuery } from "convex/react";
import { useCreateDocument } from "../hooks/useCreate";
import { api } from "@/convex/_generated/api";
import { Plus, Check, ChevronDown, Save, History, Trash2, Brain, Loader2, FileText, Target, PieChart, Info, Upload, X, Edit3, Eye, ChevronLeft, ChevronRight, BarChart3, TrendingUp, AlertCircle, MousePointerClick, Mic, Paperclip, Maximize2, Minimize2, Copy, FolderPlus, Calculator, LayoutGrid, Sliders, Zap, Home, Sparkles } from 'lucide-react';
import TabNavigation from './TabNavigation';
import ProjectSelector from './ProjectSelector';
import { Logo } from './Logo';
import AttributionBadge from './AttributionBadge';
import { toast } from 'sonner';
import { marked } from 'marked';
import { SaveToFilesDialog } from './nobel_chat/SaveToFilesDialog';
import { Id } from "@/convex/_generated/dataModel";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Heading1, Heading2, List as ListIcon } from 'lucide-react';
import TurndownService from 'turndown';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DotPatternBackground from './DotPatternBackground';
import { generateBottomUpSizing } from '../services/geminiService';
import SizingConfigSheet from './SizingConfigSheet';
import { motion, AnimatePresence } from 'framer-motion';
import { ModelSelect } from './ModelSelector';
import { useActiveModel } from '../hooks/useActiveModel';

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
                <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded hover:bg-white transition-colors ${editor.isActive('bold') ? 'bg-white shadow-sm text-nobel-gold' : 'text-stone-500'}`} title="Bold"><Bold className="w-4 h-4" /></button>
                <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded hover:bg-white transition-colors ${editor.isActive('italic') ? 'bg-white shadow-sm text-nobel-gold' : 'text-stone-500'}`} title="Italic"><Italic className="w-4 h-4" /></button>
                <div className="w-px h-5 bg-stone-200 mx-1" />
                <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-2 rounded hover:bg-white transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-white shadow-sm text-nobel-gold' : 'text-stone-500'}`} title="Heading 1"><Heading1 className="w-4 h-4" /></button>
                <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2 rounded hover:bg-white transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-white shadow-sm text-nobel-gold' : 'text-stone-500'}`} title="Heading 2"><Heading2 className="w-4 h-4" /></button>
                <div className="w-px h-5 bg-stone-200 mx-1" />
                <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-2 rounded hover:bg-white transition-colors ${editor.isActive('bulletList') ? 'bg-white shadow-sm text-nobel-gold' : 'text-stone-500'}`} title="Bullet List"><ListIcon className="w-4 h-4" /></button>
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

    useEffect(() => {
        if (value > 0) {
            const best = getBestUnit(value);
            if (value / multiplier < 1 || value / multiplier > 10000) {
                setMultiplier(best);
            }
        }
    }, [value]);

    const displayValue = value === 0 ? '' : (value / multiplier).toLocaleString('en-US', { maximumFractionDigits: 2 });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const cleanValue = e.target.value.replace(/,/g, '');
        const val = parseFloat(cleanValue);
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
                type="text"
                inputMode="decimal"
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

interface BottomUpSizingProps {
    data: StartupData;
    allProjects: StartupData[];
    onUpdateProject: (updater: (project: StartupData) => StartupData) => void;
    onUpdateCanvas: (section: CanvasSection, content: string) => void;
    onSwitchProject: (id: string) => void;
    onNewProject: () => void;
    onNavigate: (view: any) => void;
    currentView: any;
    settings: AISettings;
    allowedPages?: string[];
    permissions?: RolePermissions;
}

const BottomUpSizing: React.FC<BottomUpSizingProps> = ({ data, allProjects, onUpdateProject, onUpdateCanvas, onSwitchProject, onNewProject, onNavigate, currentView, settings: aiSettings, allowedPages, permissions }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const { activeModel, capabilities } = useActiveModel();
    const hasTools = capabilities.includes('tools') || capabilities.includes('websearch');

    // Sizing Configuration
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [sizingConfig, setSizingConfig] = useState({
        samPercentage: data.marketConfig?.samPercentage || 30,
        somPercentage: data.marketConfig?.somPercentage || 5,
        naicsCode: data.marketConfig?.naicsCode,
        naicsTitle: data.marketConfig?.naicsTitle,
        geography: data.marketConfig?.geography || 'US',
        selectedSegments: data.marketConfig?.selectedSegments || [],
        yearRange: data.marketConfig?.yearRange
    });

    useEffect(() => {
        if (data.marketConfig) {
            setSizingConfig({
                samPercentage: data.marketConfig.samPercentage || 30,
                somPercentage: data.marketConfig.somPercentage || 5,
                naicsCode: data.marketConfig.naicsCode,
                naicsTitle: data.marketConfig.naicsTitle,
                geography: data.marketConfig.geography || 'US',
                selectedSegments: data.marketConfig.selectedSegments || [],
                yearRange: data.marketConfig.yearRange
            });
        }
    }, [data.marketConfig]);

    const handleConfigChange = (newConfig: typeof sizingConfig) => {
        setSizingConfig(newConfig);
        onUpdateProject(p => ({ ...p, marketConfig: newConfig }));
    };

    const hasCustomerData = data.customerInterviews && data.customerInterviews.length > 0;
    const canEdit = permissions ? (permissions.global?.edit ?? false) : true;

    let sizingTooltip = "";
    if (!hasCustomerData) sizingTooltip = "Add Customer Interviews first to enable Bottom-Up Sizing.";
    else if (!canEdit) sizingTooltip = "You do not have permission to generate sizing.";
    else if (isGenerating) sizingTooltip = "Generating analysis...";

    const isDisabled = isGenerating || !hasCustomerData || !canEdit;

    const updateBottomUp = useMutation(api.bottomUp.updateBottomUp);
    const createDocument = useCreateDocument();
    const currentUser = useQuery(api.users.getUser);

    const { bottomUpSizing } = data;
    const projectId = data.id;

    // Mutations & Actions
    const updateMarket = useMutation(api.market.updateMarket);
    // const generateBottomUpSizing = useAction(api.ai.generateBottomUpSizing); // OLD
    const startBottomUp = useMutation(api.bottomUp.startBottomUp); // NEW Workflow

    // Polling Logic
    const [isPolling, setIsPolling] = useState(false);

    // Check status from data prop (assuming data is refreshed by parent or we need to refresh)
    // Actually, 'data' prop might not update automatically if it's passed from parent query.
    // We should ideally subscribe to the market data here if we want live updates.
    // Let's rely on the fact that if the parent query updates, 'data' updates.
    // We can also force a re-fetch if we had the query here, but we don't.
    // We'll trust the parent 'StartupData' comes from a live query. 

    // Monitor workflow status
    useEffect(() => {
        if (bottomUpSizing?.status === 'analyzing') {
            setIsPolling(true);
            setIsGenerating(true);
        } else if (bottomUpSizing?.status === 'completed' && isPolling) {
            setIsPolling(false);
            setIsGenerating(false);
            toast.success("Market Sizing Analysis Completed!");
        } else if (bottomUpSizing?.status === 'failed' && isPolling) {
            setIsPolling(false);
            setIsGenerating(false);
            toast.error("Market Sizing Analysis Failed.");
        }
    }, [bottomUpSizing?.status, isPolling]);

    const handleSaveBottomUp = async (updates: Partial<typeof bottomUpSizing>) => {
        const newData = { ...bottomUpSizing, ...updates };

        if (updates.reportContent && !isGenerating) {
            newData.source = 'Human';
            if (!newData.tags?.includes('Human')) {
                newData.tags = [...(newData.tags || []), 'Human'];
            }
        }

        onUpdateProject(p => ({ ...p, bottomUpSizing: newData }));
        try {
            await updateBottomUp({
                projectId: data.id as Id<"projects">,
                tam: newData.tam,
                sam: newData.sam,
                som: newData.som,
                reportContent: newData.reportContent,
                keywords: newData.keywords,
                tags: newData.tags,
                creatorProfile: newData.creatorProfile,
                source: newData.source
            });
        } catch (error) {
        }
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsGenerating(false);
        setIsPolling(false);
        // Reset the status so the UI stops showing the loading state
        onUpdateProject(p => ({
            ...p,
            bottomUpSizing: {
                ...p.bottomUpSizing,
                status: 'failed'
            }
        }));
        toast.info("Analysis stopped.");
    };

    const handleGenerateReport = async () => {
        if (!data || !data.revenueModel) {
            toast.error("Please ensure Revenue Model data is available first.");
            return;
        }

        try {
            setIsGenerating(true);
            setIsPolling(true);

            // Start Workflow with Global Toast
            toast.promise(
                startBottomUp({
                    projectId: projectId as Id<"projects">,
                    data: data,
                    settings: { ...aiSettings, modelName: activeModel || aiSettings.modelName }
                }),
                {
                    loading: 'Initializing Bottom-Up Analysis...',
                    success: 'Analysis Initiated. Data will sync automatically.',
                    error: 'Failed to start analysis.'
                }
            );

            setIsReportOpen(true);

        } catch (error) {
            // Error handled by toast.promise
            setIsGenerating(false);
            setIsPolling(false);
        }
    };

    const handleExportToCanvas = async () => {
        const tam = formatCurrency(bottomUpSizing.tam);
        const sam = formatCurrency(bottomUpSizing.sam);
        const som = formatCurrency(bottomUpSizing.som);

        const content = `### Bottom - Up Market Sizing\n - ** TAM **: ${tam} \n - ** SAM **: ${sam} \n - ** SOM **: ${som} \n\n * Validated via Bottom - Up Intelligence Engine.* `;

        onUpdateCanvas(CanvasSection.KEY_METRICS, content);
        toast.success("Market sizing exported to Canvas");
        onNavigate('CANVAS');
    };

    const handleCopyReport = () => {
        if (!bottomUpSizing.reportContent) return;
        navigator.clipboard.writeText(bottomUpSizing.reportContent);
        toast.success("Analysis copied to clipboard");
    };

    const handleSaveToDocs = async (filename: string, folderId?: string) => {
        if (!bottomUpSizing.reportContent) return;

        try {
            const htmlContent = await marked.parse(bottomUpSizing.reportContent);
            const docTags = bottomUpSizing.tags?.map(tag => ({
                name: tag,
                color: tag === 'AI Assisted' ? '#7c007c' : '#f17a35'
            })) || [];

            await createDocument({
                projectId: data.id,
                folderId: folderId ? folderId as Id<"folders"> : undefined,
                title: filename.endsWith('.md') ? filename : `${filename}.md`,
                content: htmlContent,
                type: 'doc',
                tags: docTags
            });
            toast.success("Saved to documents successfully");
            setIsSaveDialogOpen(false);
        } catch (error) {
            toast.error("Failed to save to documents");
        }
    };

    const [selectedSection, setSelectedSection] = useState<'TAM' | 'SAM' | 'SOM' | null>(null);
    const [hoveredSection, setHoveredSection] = useState<'TAM' | 'SAM' | 'SOM' | null>(null);
    const activeSection = hoveredSection || selectedSection;

    const definitions = {
        TAM: {
            title: "Internal TAM (Bottom-Up)",
            subtitle: "Global Potential Scaled",
            description: "Calculated by: (Target Customer Profiles) × (Surveyed Willingness to Pay). This represents the absolute max potential based on your unit economics.",
            color: "bg-stone-400",
            textColor: "text-stone-600",
            borderColor: "border-stone-400"
        },
        SAM: {
            title: "Internal SAM (Bottom-Up)",
            subtitle: "Validated Target Reach",
            description: "Calculated by: (Qualified Leads in Pipeline) × (Validated ARPU). This represents the segments you've actually scanned and validated via surveys.",
            color: "bg-nobel-gold",
            textColor: "text-nobel-gold",
            borderColor: "border-nobel-gold"
        },
        SOM: {
            title: "Internal SOM (Bottom-Up)",
            subtitle: "Immediate Capture Goal",
            description: "Calculated by: (Target Conversion Rate) × (SAM). This is your realistic target for the next 12 months based on your sales velocity.",
            color: "bg-stone-900",
            textColor: "text-stone-900",
            borderColor: "border-stone-900"
        }
    };

    const formatCurrency = (val: number) => {
        if (!val) return '$0';
        if (val >= 1000000000000) return `$${(val / 1000000000000).toFixed(1)} T`;
        if (val >= 1000000000) return `$${(val / 1000000000).toFixed(1)} B`;
        if (val >= 1000000) return `$${(val / 1000000).toFixed(1)} M`;
        if (val >= 1000) return `$${(val / 1000).toFixed(1)} K`;
        return `$${val} `;
    };

    const getFounderScript = (section: 'TAM' | 'SAM' | 'SOM') => {
        const val = bottomUpSizing[section.toLowerCase() as keyof typeof bottomUpSizing] as number;
        const formatted = formatCurrency(val);
        switch (section) {
            case 'TAM': return `"Based on our verified ARPU of $X, our total addressable bottom-up market is ${formatted}."`;
            case 'SAM': return `"Within our current serviceable segment, our validated revenue potential is ${formatted}."`;
            case 'SOM': return `"We are targeting ${formatted} in immediate revenue based on our current sales capacity."`;
        }
    };

    return (
        <div className="h-screen flex bg-nobel-cream relative overflow-hidden">
            {/* LEFT SIDE: HERO IMAGE (20%) - Hidden when report is open */}
            <AnimatePresence>
                {!isReportOpen && (
                    <motion.div
                        initial={{ width: '20%', opacity: 1 }}
                        animate={{ width: '20%', opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="h-full relative overflow-hidden bg-stone-900 border-r border-stone-200 shadow-2xl z-20"
                    >
                        <img
                            src="/Focused.png"
                            className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105"
                            alt="Bottom-Up Sizing Hero"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/40 via-transparent to-stone-900/80" />

                        <div className="absolute top-8 left-8 z-30">
                            <Logo imageClassName="h-8 w-auto brightness-0 invert" />
                        </div>

                        <div className="absolute inset-x-0 bottom-0 p-8 space-y-4 bg-gradient-to-t from-stone-900 via-stone-900/60 to-transparent pt-24">
                            <div className="space-y-3">
                                <h2 className="text-white text-2xl font-serif font-bold leading-tight">
                                    Bottom-Up <br />
                                    <span className="text-nobel-gold italic underline underline-offset-8 decoration-white/20">Sizing.</span>
                                </h2>
                                <div className="h-1 w-10 bg-nobel-gold/50 rounded-full" />
                                <p className="text-stone-300 text-sm leading-relaxed font-medium">
                                    Build credible logic for your market size focused on <strong>captured demand</strong> and validated customer data.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* RIGHT SIDE: MAIN CONTENT */}
            <motion.div
                animate={{ width: isReportOpen ? '100%' : '80%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="h-full flex flex-col relative z-10"
            >
                <DotPatternBackground color="#a8a29e" />

                {/* Header */}
                <header className="px-10 py-4 flex items-center justify-between relative z-30 bg-white/80 backdrop-blur-sm border-b border-stone-200">
                    <TabNavigation currentView={currentView} onNavigate={onNavigate} allowedPages={allowedPages} mode="light" />
                    <div className="flex items-center gap-3">
                        <ModelSelect className="w-48 hidden lg:block" />
                        {/* HUB BUTTON REMOVED */}
                        {isGenerating ? (
                            <button onClick={handleStop} className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center gap-2 shadow-md">
                                <X className="w-4 h-4" /> Stop
                            </button>
                        ) : (
                            <div className="relative group/tooltip">
                                <button onClick={handleGenerateReport} disabled={isDisabled || !hasTools} className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 shadow-md ${(isDisabled || !hasTools) ? 'bg-stone-300 text-stone-500 cursor-not-allowed' : 'bg-stone-900 text-white hover:bg-nobel-gold'}`}>
                                    <Brain className="w-4 h-4" /> Analysis
                                </button>
                                {(!hasTools && !isDisabled && !isGenerating) && (
                                    <div className="absolute top-full mt-2 right-0 bg-stone-900 text-white text-[10px] px-3 py-1.5 rounded-md whitespace-nowrap opacity-100 z-50 pointer-events-none">
                                        Selected model does not support tool calling.
                                    </div>
                                )}
                                {(isDisabled && !isGenerating) && (
                                    <div className="absolute top-full mt-2 right-0 bg-stone-900 text-white text-[10px] px-3 py-1.5 rounded-md whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-50 pointer-events-none">
                                        {sizingTooltip}
                                    </div>
                                )}
                            </div>
                        )}
                        {bottomUpSizing.reportContent && !isReportOpen && (
                            <button
                                onClick={() => setIsReportOpen(true)}
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
                    <div className={`${isReportOpen ? 'w-1/2' : 'w-full'} flex flex-col px-12 py-6 overflow-y-auto transition-all duration-300`}>
                        <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
                            {/* Header Area */}
                            <div className={`mt-8 mb-4 shrink-0 flex ${!isReportOpen ? 'flex-row items-start justify-between gap-4' : 'flex-col gap-3'}`}>
                                <h2 className="font-serif text-3xl text-stone-900 flex items-center gap-3">
                                    Bottom-Up Market Sizing
                                    {(bottomUpSizing.tags?.includes('AI Assisted') || bottomUpSizing.source === 'AI') && (
                                        <AttributionBadge type="AI Assisted" />
                                    )}
                                    {(bottomUpSizing.tags?.includes('Human') || bottomUpSizing.source === 'Human') && (
                                        <AttributionBadge type="Human" />
                                    )}
                                </h2>

                                {/* Help Accordion */}
                                <div className="w-60 bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden transition-all shrink-0">
                                    <button
                                        onClick={() => setShowHelp(!showHelp)}
                                        className="w-full px-5 py-3 flex justify-between items-center text-xs font-bold uppercase tracking-widest text-stone-500 hover:bg-stone-50 hover:text-nobel-gold transition-colors"
                                    >
                                        <span className="flex items-center gap-2"><Info className="w-3 h-3" /> How This Works</span>
                                        <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${showHelp ? 'rotate-180' : ''}`} />
                                    </button>
                                    <div className={`overflow-hidden transition-all duration-500 ease-in-out ${showHelp ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="px-5 pb-5 pt-4 text-xs text-stone-200 font-sans leading-relaxed bg-stone-900">
                                            <p className="mb-2 uppercase tracking-wider font-bold text-nobel-gold">Precision Market Sizing</p>
                                            <p className="mb-3 text-stone-400">Calculates market value using validated customer data points (Bottom-Up Approach).</p>
                                            <p className="text-stone-400 mb-4"><strong>Data Used:</strong> Input: Customer Interview counts, defined Segments, and validated Pricing (ARPU).</p>
                                            <div className="grid grid-cols-1 gap-3 text-xs font-mono">
                                                <div className="p-3 bg-stone-800 rounded-lg border border-stone-700">
                                                    <strong className="block text-nobel-gold mb-1">TAM</strong>
                                                    <span className="text-stone-400">Total Establishments × ARPU</span>
                                                </div>
                                                <div className="p-3 bg-stone-800 rounded-lg border border-stone-700">
                                                    <strong className="block text-nobel-gold mb-1">SAM</strong>
                                                    <span className="text-stone-400">Serviceable Segments × ARPU</span>
                                                </div>
                                                <div className="p-3 bg-stone-800 rounded-lg border border-stone-700">
                                                    <strong className="block text-nobel-gold mb-1">SOM</strong>
                                                    <span className="text-stone-400">SAM × Target Share</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Chart Area */}
                            <div className="flex-grow flex items-center justify-center relative z-10">
                                <div className="flex flex-row items-center justify-center gap-12 w-full px-8">
                                    {/* Bars */}
                                    <div className="flex-grow flex flex-col justify-center gap-8 w-full max-w-xl">
                                        {['TAM', 'SAM', 'SOM'].map((section: any) => (
                                            <div key={section} className="group cursor-pointer" onMouseEnter={() => setHoveredSection(section)} onMouseLeave={() => setHoveredSection(null)} onClick={() => setSelectedSection(activeSection === section ? null : section)}>
                                                <div className="flex justify-between items-end mb-2">
                                                    <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${activeSection === section ? 'text-nobel-gold' : 'text-stone-400'}`}>{section}</span>
                                                    <span className="font-serif font-bold text-stone-900">{formatCurrency(bottomUpSizing[section.toLowerCase() as keyof typeof bottomUpSizing] as number)}</span>
                                                </div>
                                                <div className="w-full h-14 bg-stone-100 rounded-r-full rounded-bl-full overflow-hidden relative">
                                                    <div className={`h-full ${section === 'SAM' ? 'bg-nobel-gold' : section === 'SOM' ? 'bg-stone-900' : 'bg-stone-400'} transition-all duration-1000 ease-out`} style={{ width: section === 'TAM' ? '100%' : `${((bottomUpSizing[section.toLowerCase() as keyof typeof bottomUpSizing] as number) / (bottomUpSizing.tam || 1) * 100) || 0}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Side-by-Side Explainer Card */}
                                    <div className={`flex-shrink-0 transition-all duration-500 ease-in-out overflow-hidden ${activeSection ? 'w-72 opacity-100' : 'w-0 opacity-0'}`}>
                                        {activeSection && definitions[activeSection] ? (
                                            <div className={`bg-white rounded-xl shadow-2xl border-l-4 p-6 w-72 relative ${definitions[activeSection].borderColor}`}>
                                                <button
                                                    onClick={() => setSelectedSection(null)}
                                                    className="absolute top-3 right-3 p-1.5 bg-nobel-gold rounded-full text-white shadow-lg z-50 hover:bg-yellow-600 transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <MousePointerClick className="w-3 h-3 text-stone-400" />
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${definitions[activeSection].textColor}`}>{activeSection}</span>
                                                </div>
                                                <h3 className="font-serif text-xl text-stone-900 mb-1">{definitions[activeSection].title}</h3>
                                                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-4">{definitions[activeSection].subtitle}</p>

                                                <div className="space-y-4">
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Definition</p>
                                                        <p className="text-xs text-stone-600 leading-relaxed font-light">
                                                            {definitions[activeSection].description}
                                                        </p>
                                                    </div>

                                                    <div className="bg-stone-50 p-4 rounded-lg border border-stone-100 relative overflow-hidden">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-nobel-gold mb-1 flex items-center gap-1 relative z-10">
                                                            <Mic className="w-3 h-3" /> Investor FAQ Script
                                                        </p>
                                                        <p className="text-xs text-stone-800 font-serif italic leading-relaxed relative z-10">
                                                            {getFounderScript(activeSection)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-72 h-80"></div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Market Value Inputs - Fixed at bottom */}
                            <div className="pt-4 pb-8 shrink-0">
                                <div className={`grid gap-6 ${isReportOpen ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
                                    {/* TAM Input Card */}
                                    <div
                                        className={`bg-white p-6 rounded-2xl border shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden ${activeSection === 'TAM' ? 'border-stone-400 ring-1 ring-stone-200' : 'border-stone-200'}`}
                                        onClick={() => setSelectedSection(selectedSection === 'TAM' ? null : 'TAM')}
                                        onMouseEnter={() => setHoveredSection('TAM')}
                                        onMouseLeave={() => setHoveredSection(null)}
                                    >
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Total Addressable (TAM)</label>
                                        <MarketValueInput value={bottomUpSizing.tam} onChange={(val) => handleSaveBottomUp({ tam: val })} theme="light" />
                                    </div>

                                    {/* SAM Input Card */}
                                    <div
                                        className={`bg-white p-6 rounded-2xl border shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden ${activeSection === 'SAM' ? 'border-nobel-gold ring-1 ring-nobel-gold' : 'border-nobel-gold/30 ring-1 ring-nobel-gold/10'}`}
                                        onClick={() => setSelectedSection(selectedSection === 'SAM' ? null : 'SAM')}
                                        onMouseEnter={() => setHoveredSection('SAM')}
                                        onMouseLeave={() => setHoveredSection(null)}
                                    >
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-nobel-gold">Serviceable (SAM)</label>
                                        <MarketValueInput value={bottomUpSizing.sam} onChange={(val) => handleSaveBottomUp({ sam: val })} theme="gold" />
                                    </div>

                                    {/* SOM Input Card */}
                                    <div
                                        className={`bg-white p-6 rounded-2xl border shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden ${activeSection === 'SOM' ? 'border-stone-600 ring-1 ring-stone-500' : 'border-stone-200'}`}
                                        onClick={() => setSelectedSection(selectedSection === 'SOM' ? null : 'SOM')}
                                        onMouseEnter={() => setHoveredSection('SOM')}
                                        onMouseLeave={() => setHoveredSection(null)}
                                    >
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Obtainable (SOM)</label>
                                        <MarketValueInput value={bottomUpSizing.som} onChange={(val) => handleSaveBottomUp({ som: val })} theme="dark" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Toggle Button */}
                {!isReportOpen && bottomUpSizing.reportContent && (
                    <button
                        onClick={() => setIsReportOpen(true)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-3 bg-emerald-500 text-white rounded-l-full hover:bg-emerald-600 transition-all z-50 shadow-lg group"
                        title="Open Report"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                )}
            </motion.div>

            {/* Report Panel - Fixed overlay taking full height */}
            <AnimatePresence>
                {isReportOpen && (
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
                                    <Calculator className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="font-serif text-xl text-white">Strategic Analysis</h2>
                                    <p className="text-[10px] text-stone-400 uppercase tracking-widest">Bottom-Up Market Sizing</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {bottomUpSizing.reportContent && (
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
                                    onClick={() => setIsReportOpen(false)}
                                    className="p-2 text-stone-400 hover:text-white transition-colors rounded-full hover:bg-stone-800"
                                    title="Close Report"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Export to Canvas Prompt */}
                        {/* Export to Canvas Prompt Removed per user request */}

                        {/* Report Content */}
                        <div className="flex-1 overflow-y-auto px-8 py-4">
                            {isGenerating ? (
                                <div className="flex flex-col items-center justify-center py-20 text-stone-400">
                                    <Loader2 className="w-16 h-16 mb-4 animate-spin text-nobel-gold" />
                                    <p className="animate-pulse">Generating Bottom-Up Analysis...</p>
                                </div>
                            ) : bottomUpSizing.reportContent ? (
                                isEditing ? (
                                    <MiniStoryEditor content={bottomUpSizing.reportContent} onChange={(newContent) => handleSaveBottomUp({ reportContent: newContent })} />
                                ) : (
                                    <div onClick={() => { if (canEdit) setIsEditing(true) }} className="cursor-text animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="prose prose-invert prose-stone max-w-none prose-p:text-stone-300 prose-headings:text-white prose-strong:text-white prose-li:text-stone-300">
                                            <MarkdownRenderer content={bottomUpSizing.reportContent} theme="dark" />
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-stone-400">
                                    <TrendingUp className="w-16 h-16 mb-4 opacity-20" />
                                    <p>No bottom-up analysis generated yet.</p>
                                    <button onClick={handleGenerateReport} disabled={isDisabled} className="mt-4 text-nobel-gold font-bold hover:underline disabled:opacity-50">
                                        Calculate sizing from your data
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
                title="Save Market Analysis"
            />

            <SizingConfigSheet
                isOpen={isConfigOpen}
                onClose={() => setIsConfigOpen(false)}
                config={sizingConfig}
                onConfigChange={handleConfigChange}
                canvasSegments={data.canvas?.[CanvasSection.CUSTOMER_SEGMENTS] ? data.canvas[CanvasSection.CUSTOMER_SEGMENTS].split(/\n|,|•/).map((s: string) => s.trim()).filter(Boolean).filter(s => !s.includes('![AI Assisted]')) : []}
                topDownData={data.market ? { tam: data.market.tam, sam: data.market.sam, som: data.market.som } : undefined}
                bottomUpData={data.bottomUpSizing ? { tam: data.bottomUpSizing.tam, sam: data.bottomUpSizing.sam, som: data.bottomUpSizing.som } : undefined}
                arpu={calculateARPU(data.revenueModel)}
            />
        </div>
    );
};

export default BottomUpSizing;
