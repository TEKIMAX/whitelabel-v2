import React, { useState, useEffect, useRef } from 'react';
import { StartupData, RevenueStreamItem, CostItem, Slide, RevenueModelVersion, AISettings, RevenueModelData, RolePermissions, ViewState } from '../../types';
import { analyzeRevenueModel, chatWithAIAnalyst } from '../../services/geminiService';
import { ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ReferenceLine, ReferenceDot } from 'recharts';
import { Plus, Trash2, TrendingUp, DollarSign, Users, ChevronDown, Check, ArrowRight, Loader2, BarChart3, Calculator, Info, Presentation, Calendar, Sparkles, RefreshCw, Save, History, X, Download, AlertTriangle, Clock, FileText, ExternalLink, Send, Receipt, Pencil } from 'lucide-react';
import CustomSelect from '../CustomSelect';
import TabNavigation from '../TabNavigation';
import ProjectSelector from '../ProjectSelector';
import { Logo } from '../Logo';
import { useMutation, useAction } from 'convex/react';
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import { ModelSelect } from '../ModelSelector';
import { useActiveModel } from '../../hooks/useActiveModel';

import { ExpenseSelector } from '../ExpenseSelector';
import { useCreateRevenueStream, useCreateCost } from '../../hooks/useCreate';
import { useUpdateRevenueStream, useUpdateCost } from "../../hooks/useUpdate";
import { useDeleteRevenueStream, useDeleteCost } from "../../hooks/useDelete";

interface RevenueModelProps {
    data: StartupData;
    allProjects: StartupData[];
    onUpdateProject: (updater: (project: StartupData) => StartupData) => void;
    onSwitchProject: (id: string) => void;
    onNewProject: () => void;
    onAddSlideToDeck: (slide: Slide) => void;
    onSaveVersion: (name: string) => void;
    onLoadVersion: (version: RevenueModelVersion) => void;
    onDeleteVersion: (id: string) => void;
    onNavigate: (view: ViewState) => void;
    currentView: any;
    settings: AISettings;
    allowedPages?: string[];
    permissions?: RolePermissions;
}

const ToolTip = ({ text, position = 'top' }: { text: string, position?: 'top' | 'bottom' }) => (
    <div className="group relative inline-block ml-1.5 align-middle z-[100]">
        <Info className="w-3.5 h-3.5 text-stone-400 cursor-help hover:text-nobel-gold transition-colors" />
        <div className={`invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute left-1/2 -translate-x-1/2 mb-2 w-56 bg-stone-900 text-white text-[10px] leading-relaxed rounded p-3 z-[9999] shadow-xl text-center pointer-events-none font-sans ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
            {text}
        </div>
    </div>
);

// --- PRESET EXAMPLES ---


const SmartText: React.FC<{ children: React.ReactNode, isStrong?: boolean }> = ({ children, isStrong }) => {
    const processText = (text: string) => {
        const regex = /(\$\d+(?:,\d+)*(?:\.\d+)?|\b\d+(?:\.\d+)?%|\b(?:churn|growth|cac|expenses?|costs?|burn rate|profitability)\b)/gi;
        const parts = text.split(regex);
        return parts.map((part, i) => {
            if (!part) return null;
            const lowerPart = part.toLowerCase();
            const isMoney = part.startsWith('$');
            const isPercent = part.endsWith('%');
            const isLowValue = lowerPart.includes('churn') || lowerPart.includes('cac') || lowerPart.includes('expense') || lowerPart.includes('cost') || lowerPart.includes('burn');
            const isGrowth = lowerPart.includes('growth') || lowerPart.includes('profit');

            if (isMoney || isPercent || isLowValue || isGrowth) {
                return (
                    <span key={i} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mx-0.5 whitespace-nowrap ${isLowValue ? 'bg-red-50 text-red-700 border border-red-100' :
                        isGrowth ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            isMoney ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                'bg-stone-100 text-stone-600 border border-stone-200'
                        }`}>
                        {part}
                    </span>
                );
            }
            return isStrong ? <strong key={i} className="font-bold text-stone-900">{part}</strong> : <React.Fragment key={i}>{part}</React.Fragment>;
        });
    };

    const renderChildren = (node: React.ReactNode): React.ReactNode => {
        if (typeof node === 'string') return processText(node);
        if (Array.isArray(node)) return node.map((child, i) => <React.Fragment key={i}>{renderChildren(child)}</React.Fragment>);
        if (React.isValidElement(node)) {
            const props = node.props as { children?: React.ReactNode };
            if (props.children) {
                try {
                    return React.cloneElement(node, {
                        children: renderChildren(props.children)
                    } as React.Attributes);
                } catch (e) {
                    return node;
                }
            }
        }
        return node;
    };


    return <>{renderChildren(children)}</>;
};

const RevenueModel: React.FC<RevenueModelProps> = ({
    data,
    allProjects,
    onUpdateProject,
    onSwitchProject,
    onNewProject,
    onNavigate,
    onAddSlideToDeck,
    onSaveVersion,
    onLoadVersion,
    onDeleteVersion,
    currentView,
    settings,
    allowedPages,
    permissions
}) => {
    // Permission Verification
    const canEdit = permissions ? (permissions.global?.edit ?? false) : true;
    const { activeModel, activeEntry } = useActiveModel();

    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [showVersions, setShowVersions] = useState(false);
    const [forecastYears, setForecastYears] = useState(2);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiInsight, setAiInsight] = useState('');
    const [showBreakEvenFormula, setShowBreakEvenFormula] = useState(false);
    const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);
    const [selectedExample, setSelectedExample] = useState<string>('');

    const [showDeleteRevenueDialog, setShowDeleteRevenueDialog] = useState(false);
    const [deleteRevenueTarget, setDeleteRevenueTarget] = useState<string | null>(null);
    const [showDeleteCostDialog, setShowDeleteCostDialog] = useState(false);
    const [deleteCostTarget, setDeleteCostTarget] = useState<string | null>(null);
    const [showNewVersionDialog, setShowNewVersionDialog] = useState(false);
    const [newVersionName, setNewVersionName] = useState('');
    const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [showExpenseSelector, setShowExpenseSelector] = useState(false);

    const handleImportExpense = (item: CostItem) => {
        addCost({
            projectId: data.id,
            name: item.name,
            amount: item.amount,
            frequency: item.frequency
        });
        toast.success(`Imported ${item.name}`, { icon: <Plus className="w-4 h-4 text-black" /> });
    };

    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [userQuestion, setUserQuestion] = useState("");
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [isAnalystOpen, setIsAnalystOpen] = useState(false);
    const [isConfigExpanded, setIsConfigExpanded] = useState(true);

    const handleFollowUpChat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userQuestion.trim() || isChatLoading) return;

        const question = userQuestion;
        setUserQuestion("");
        setChatHistory(prev => [...prev, { role: 'user', content: question }]);
        setIsChatLoading(true);

        try {
            const response = await chatWithAIAnalyst(data, 'revenue', chatHistory, question, { ...settings, modelName: activeModel || settings.modelName });
            setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (err) {
        } finally {
            setIsChatLoading(false);
        }
    };

    // Delete Version Dialog State
    const [showDeleteVersionDialog, setShowDeleteVersionDialog] = useState(false);
    const [deleteVersionTarget, setDeleteVersionTarget] = useState<string | null>(null);

    // Graph Interaction State
    const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
    const graphContainerRef = useRef<HTMLDivElement>(null);

    const { revenueModel, revenueModelVersions } = data;

    // Local state for number inputs to allow decimal typing and empty states
    const [localInputs, setLocalInputs] = useState({
        startingUsers: revenueModel.startingUsers.toString(),
        cac: revenueModel.cac.toString(),
        monthlyGrowthRate: revenueModel.monthlyGrowthRate.toString(),
        churnRate: revenueModel.churnRate.toString()
    });

    const [localStreamPrices, setLocalStreamPrices] = useState<Record<string, string>>({});
    const [localCostAmounts, setLocalCostAmounts] = useState<Record<string, string>>({});

    useEffect(() => {
        setLocalInputs({
            startingUsers: revenueModel.startingUsers.toString(),
            cac: revenueModel.cac.toString(),
            monthlyGrowthRate: revenueModel.monthlyGrowthRate.toString(),
            churnRate: revenueModel.churnRate.toString()
        });
    }, [revenueModel.startingUsers, revenueModel.cac, revenueModel.monthlyGrowthRate, revenueModel.churnRate]);

    useEffect(() => {
        setLocalStreamPrices(prev => {
            const next = { ...prev };
            revenueModel.revenueStreams.forEach(stream => {
                if (next[stream.id] === undefined) {
                    next[stream.id] = stream.price.toString();
                }
            });
            return next;
        });

        setLocalCostAmounts(prev => {
            const next = { ...prev };
            revenueModel.costStructure.forEach(cost => {
                if (next[cost.id] === undefined) {
                    next[cost.id] = cost.amount.toString();
                }
            });
            return next;
        });
    }, [revenueModel.revenueStreams, revenueModel.costStructure]);

    const handleInputBlur = (field: keyof typeof localInputs) => {
        const val = parseFloat(localInputs[field]);
        if (!isNaN(val)) {
            updateSettings({ [field]: val });
        } else {
            // Revert on invalid
            setLocalInputs(prev => ({ ...prev, [field]: (revenueModel as any)[field].toString() }));
        }
    };

    // --- Calculation Logic ---
    const totalMonths = forecastYears * 12;
    const months = Array.from({ length: totalMonths }, (_, i) => i + 1);

    const projections = months.map(month => {
        // Compound Monthly Growth Rate
        const growthFactor = Math.pow(1 + (revenueModel.monthlyGrowthRate / 100) - (revenueModel.churnRate / 100), month);
        const users = Math.round(revenueModel.startingUsers * growthFactor);

        // Revenue
        const monthlyRevenue = revenueModel.revenueStreams
            .filter(s => s.frequency === 'Monthly')
            .reduce((sum, s) => sum + (s.price * users), 0);
        const oneTimeRevenue = revenueModel.revenueStreams
            .filter(s => s.frequency === 'One-time')
            .reduce((sum, s) => sum + (s.price * (users * (revenueModel.monthlyGrowthRate / 100))), 0); // Approx new users paying one-time

        const totalRevenue = monthlyRevenue + oneTimeRevenue;

        // Costs
        const monthlyFixedCosts = revenueModel.costStructure
            .filter(c => c.frequency === 'Monthly')
            .reduce((sum, c) => sum + c.amount, 0);

        const yearlyFixedCosts = revenueModel.costStructure
            .filter(c => c.frequency === 'Yearly')
            .reduce((sum, c) => sum + c.amount, 0);

        // Apply yearly costs every 12 months (e.g. Month 1, 13, 25...)
        const currentMonthYearlyCosts = ((month - 1) % 12 === 0) ? yearlyFixedCosts : 0;

        // CAC applied to new users only
        const prevUsers = Math.round(revenueModel.startingUsers * Math.pow(1 + (revenueModel.monthlyGrowthRate / 100) - (revenueModel.churnRate / 100), month - 1));
        const newUsers = Math.max(0, users - prevUsers);
        const acquisitionCosts = newUsers * revenueModel.cac;

        const totalCosts = monthlyFixedCosts + currentMonthYearlyCosts + acquisitionCosts;

        return { month, revenue: totalRevenue, costs: totalCosts, profit: totalRevenue - totalCosts, users };
    });

    const breakEvenIndex = projections.findIndex(p => p.profit > 0);
    const breakEvenMonth = breakEvenIndex !== -1 ? projections[breakEvenIndex].month : null;
    const totalRevenueYear1 = projections.slice(0, 12).reduce((sum, p) => sum + p.revenue, 0);
    const totalProfitYear1 = projections.slice(0, 12).reduce((sum, p) => sum + p.profit, 0);

    // --- Graph Rendering Configuration ---
    const formatYAxis = (val: number) => {
        if (isNaN(val)) return '$0';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            maximumFractionDigits: 1
        }).format(val);
    };

    const formatTooltipCurrency = (val: number) => {
        if (isNaN(val)) return '$0';
        if (Math.abs(val) > 999999999) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                notation: 'compact',
                maximumFractionDigits: 2
            }).format(val);
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(val);
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const revenue = payload.find((p: any) => p.dataKey === 'revenue')?.value || 0;
            const costs = payload.find((p: any) => p.dataKey === 'costs')?.value || 0;
            const profit = revenue - costs;
            return (
                <div className="bg-white/95 backdrop-blur shadow-xl rounded-lg p-4 border border-stone-200 text-xs min-w-[180px]">
                    <div className="font-bold text-stone-900 mb-2 border-b border-stone-100 pb-1">Month {label} (Year {Math.ceil(label / 12)})</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <span className="text-stone-500">Revenue</span>
                        <span className="text-right font-mono font-bold text-amber-500">{formatTooltipCurrency(revenue)}</span>
                        <span className="text-stone-500">Costs</span>
                        <span className="text-right font-mono font-bold text-red-500">{formatTooltipCurrency(costs)}</span>
                        <span className="text-stone-500 pt-1 border-t border-stone-100 mt-1">Net</span>
                        <span className={`text-right font-mono font-bold pt-1 border-t border-stone-100 mt-1 ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatTooltipCurrency(profit)}
                        </span>
                    </div>
                </div>
            );
        }
        return null;
    };

    // --- Actions ---

    // Backend Hooks
    const addRevenueStream = useCreateRevenueStream();
    const updateRevenueStream = useUpdateRevenueStream();
    const deleteRevenueStream = useDeleteRevenueStream();
    const addCost = useCreateCost();
    const updateCost = useUpdateCost();
    const deleteCost = useDeleteCost();

    // ... (rest of state)

    // ... (graph logic)

    // ... (actions)

    const handleGenerateInsight = async () => {
        setIsAnalyzing(true);
        const useOllama = activeEntry?.provider === 'ollama';
        const insight = await analyzeRevenueModel(
            data, 
            { ...settings, modelName: activeModel || settings.modelName },
            useOllama,
            activeModel || undefined
        );
        setAiInsight(insight);
        setIsAnalyzing(false);
    };

    const updateProject = useMutation(api.projects.update);

    const updateSettings = (updates: Partial<RevenueModelData>) => {
        const newSettings = {
            businessModelType: data.revenueModel.businessModelType,
            startingUsers: data.revenueModel.startingUsers,
            monthlyGrowthRate: data.revenueModel.monthlyGrowthRate,
            churnRate: data.revenueModel.churnRate,
            cac: data.revenueModel.cac,
            modelDescription: data.revenueModel.modelDescription,
            ...updates
        };
        updateProject({
            id: data.id as any,
            updates: {
                revenueModelSettings: JSON.stringify(newSettings)
            }
        });
    };

    const handleLoadExample = async (exampleName: string) => {
        if (!exampleName) return;
        setSelectedExample(exampleName);

        try {
            if (exampleName === "NEW") {
                // 0. Clear existing data
                for (const s of data.revenueModel.revenueStreams) {
                    try { await deleteRevenueStream({ id: s.id as any }); } catch (e) { }
                }
                for (const c of data.revenueModel.costStructure) {
                    try { await deleteCost({ id: c.id as any }); } catch (e) { }
                }

                // 1. Reset Settings
                updateSettings({
                    businessModelType: "SaaS",
                    startingUsers: 0,
                    monthlyGrowthRate: 0,
                    churnRate: 0,
                    cac: 0,
                    modelDescription: ""
                });
                toast.success("Created new blank forecast", { icon: <Plus className="w-4 h-4 text-black" /> });
                return;
            }

            // Check saved templates
            let exampleData: Partial<RevenueModelData> | undefined;
            if (data.revenueModel.savedTemplates) {
                exampleData = data.revenueModel.savedTemplates[exampleName];
            }

            if (exampleData) {
                // 0. Clear existing data
                for (const s of data.revenueModel.revenueStreams) {
                    try { await deleteRevenueStream({ id: s.id as any }); } catch (e) { }
                }
                for (const c of data.revenueModel.costStructure) {
                    try { await deleteCost({ id: c.id as any }); } catch (e) { }
                }

                // 1. Update Settings
                updateSettings({
                    businessModelType: exampleData.businessModelType,
                    startingUsers: exampleData.startingUsers,
                    monthlyGrowthRate: exampleData.monthlyGrowthRate,
                    churnRate: exampleData.churnRate,
                    cac: exampleData.cac,
                    modelDescription: exampleData.modelDescription
                });

                // 2. Add Streams
                if (exampleData.revenueStreams) {
                    for (const s of exampleData.revenueStreams) {
                        await addRevenueStream({
                            projectId: data.id,
                            name: s.name,
                            price: s.price,
                            frequency: s.frequency
                        });
                    }
                }

                // 3. Add Costs
                if (exampleData.costStructure) {
                    for (const c of exampleData.costStructure) {
                        await addCost({
                            projectId: data.id,
                            name: c.name,
                            amount: c.amount,
                            frequency: c.frequency
                        });
                    }
                }
                toast.success("Template loaded successfully", { icon: <Check className="w-4 h-4 text-black" /> });
            }
        } catch (error) {
            toast.error("Failed to load template");
        }
    };

    const handleSaveTemplate = () => {
        setNewTemplateName('');
        setShowSaveTemplateDialog(true);
    };

    const confirmSaveTemplate = () => {
        if (!newTemplateName) return;

        const currentTemplate: Partial<RevenueModelData> = {
            businessModelType: revenueModel.businessModelType,
            startingUsers: revenueModel.startingUsers,
            monthlyGrowthRate: revenueModel.monthlyGrowthRate,
            churnRate: revenueModel.churnRate,
            cac: revenueModel.cac,
            modelDescription: revenueModel.modelDescription,
            revenueStreams: revenueModel.revenueStreams,
            costStructure: revenueModel.costStructure
        };

        const updatedTemplates = {
            ...(revenueModel.savedTemplates || {}),
            [newTemplateName]: currentTemplate
        };

        updateSettings({ savedTemplates: updatedTemplates });
        toast.success("Template saved successfully", { icon: <Save className="w-4 h-4 text-black" /> });
        setShowSaveTemplateDialog(false);
    };

    const handleAddRevenueStream = () => {
        addRevenueStream({
            projectId: data.id,
            name: 'New Stream',
            price: 0,
            frequency: 'Monthly'
        });
        toast.success("Revenue stream added", { icon: <Plus className="w-4 h-4 text-black" /> });
    };

    const handleAddCostItem = () => {
        addCost({
            projectId: data.id,
            name: 'New Expense',
            amount: 0,
            frequency: 'Monthly'
        });
        toast.success("Cost item added", { icon: <Plus className="w-4 h-4 text-black" /> });
    };

    const updateRevenueItem = (id: string, field: keyof RevenueStreamItem, value: any) => {
        updateRevenueStream({
            id: id as any,
            updates: { [field]: value }
        });
    };

    const updateCostItem = (id: string, field: keyof CostItem, value: any) => {
        updateCost({
            id: id as any,
            updates: { [field]: value }
        });
    };

    const deleteRevenueItem = (id: string) => {
        setDeleteRevenueTarget(id);
        setShowDeleteRevenueDialog(true);
    };

    const confirmDeleteRevenue = async () => {
        if (deleteRevenueTarget) {
            onUpdateProject(prev => {
                const updatedStreams = prev.revenueModel.revenueStreams.filter(s => s.id !== deleteRevenueTarget);
                return { ...prev, revenueModel: { ...prev.revenueModel, revenueStreams: updatedStreams } };
            });
            await deleteRevenueStream({ id: deleteRevenueTarget as any });
            toast.success("Revenue stream deleted", { icon: <Trash2 className="w-4 h-4 text-black" /> });
            setShowDeleteRevenueDialog(false);
            setDeleteRevenueTarget(null);
        }
    };

    const deleteCostItem = (id: string) => {
        setDeleteCostTarget(id);
        setShowDeleteCostDialog(true);
    };

    const confirmDeleteCost = async () => {
        if (deleteCostTarget) {
            onUpdateProject(prev => {
                const updatedCosts = prev.revenueModel.costStructure.filter(c => c.id !== deleteCostTarget);
                return { ...prev, revenueModel: { ...prev.revenueModel, costStructure: updatedCosts } };
            });
            await deleteCost({ id: deleteCostTarget as any });
            toast.success("Cost item deleted", { icon: <Trash2 className="w-4 h-4 text-black" /> });
            setShowDeleteCostDialog(false);
            setDeleteCostTarget(null);
        }
    };

    const handleNewVersion = () => {
        setNewVersionName('');
        setShowNewVersionDialog(true);
    };

    const confirmNewVersion = () => {
        if (newVersionName) {
            onSaveVersion(newVersionName);
            toast.success("Version saved successfully", { icon: <Save className="w-4 h-4 text-black" /> });
            setShowNewVersionDialog(false);
        }
    };

    const handleLoadVersion = async (version: RevenueModelVersion) => {
        // 1. Clear existing data
        for (const s of data.revenueModel.revenueStreams) {
            await deleteRevenueStream({ id: s.id as any });
        }
        for (const c of data.revenueModel.costStructure) {
            await deleteCost({ id: c.id as any });
        }

        // 2. Update Settings
        updateSettings({
            businessModelType: version.data.businessModelType,
            startingUsers: version.data.startingUsers,
            monthlyGrowthRate: version.data.monthlyGrowthRate,
            churnRate: version.data.churnRate,
            cac: version.data.cac,
            modelDescription: version.data.modelDescription
        });

        // 3. Add Streams
        if (version.data.revenueStreams) {
            for (const s of version.data.revenueStreams) {
                await addRevenueStream({
                    projectId: data.id,
                    name: s.name,
                    price: s.price,
                    frequency: s.frequency
                });
            }
        }

        // 4. Add Costs
        if (version.data.costStructure) {
            for (const c of version.data.costStructure) {
                await addCost({
                    projectId: data.id,
                    name: c.name,
                    amount: c.amount,
                    frequency: c.frequency
                });
            }
        }

        // 5. Notify Parent to update current version ID
        onLoadVersion(version);
        toast.success("Version loaded successfully", { icon: <Check className="w-4 h-4 text-black" /> });
        setShowVersions(false);
    };

    const handleDeleteVersion = (id: string) => {
        setDeleteVersionTarget(id);
        setShowDeleteVersionDialog(true);
    };

    const confirmDeleteVersion = () => {
        if (deleteVersionTarget) {
            onDeleteVersion(deleteVersionTarget);
            toast.success("Version deleted successfully", { icon: <Trash2 className="w-4 h-4 text-black" /> });
            setShowDeleteVersionDialog(false);
            setDeleteVersionTarget(null);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#F9F8F4] text-stone-900 font-sans overflow-hidden">
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
                    <ModelSelect className="w-48 hidden lg:block" />
                    <div className="w-64">
                        <CustomSelect
                            value={selectedExample}
                            onChange={handleLoadExample}
                            options={[
                                { label: "Actions...", value: "" },
                                { label: "+ Create New Forecast", value: "NEW" },
                                ...(revenueModel.savedTemplates ? Object.keys(revenueModel.savedTemplates).map(ex => ({ label: `${ex} (Saved Template)`, value: ex })) : [])
                            ]}
                            placeholder="Actions"
                            className={`text-xs ${!canEdit ? 'opacity-70 pointer-events-none' : ''}`}
                            align="right"
                        />
                    </div>

                    <div className="w-px h-6 bg-stone-300 mx-2"></div>

                    <div className="relative">
                        <button
                            onClick={() => setShowVersions(!showVersions)}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-stone-900 border border-stone-900 rounded-full transition-colors text-white hover:bg-stone-800 shadow-md"
                        >
                            <History className="w-3 h-3" />
                            <span className="hidden md:inline">
                                {data.revenueModelVersions?.find(v => v.id === data.currentRevenueModelId)?.name || "Versions"}
                            </span>
                        </button>
                        {showVersions && (
                            <div className="absolute top-12 right-0 w-72 bg-white border border-stone-200 rounded-lg shadow-xl overflow-hidden z-50">
                                <div className="p-3 bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-500 uppercase flex items-center gap-2">
                                    <Clock className="w-3 h-3" /> Model Versions
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {data.revenueModelVersions?.map((v) => (
                                        <div key={v.id} className={`px - 4 py - 3 border - b border - stone - 100 flex justify - between items - center hover: bg - stone - 50 ${v.id === data.currentRevenueModelId ? 'bg-stone-50' : ''} `}>
                                            <button onClick={() => handleLoadVersion(v)} className="text-left flex-grow">
                                                <div className={`font - serif text - sm ${v.id === data.currentRevenueModelId ? 'font-bold text-nobel-gold' : ''} `}>{v.name}</div>
                                                <div className="text-[10px] text-stone-400">{new Date(v.timestamp).toLocaleDateString()}</div>
                                            </button>
                                            <button onClick={() => handleDeleteVersion(v.id)} className={`text-stone-300 hover:text-red-500 ${!canEdit ? 'hidden' : ''}`} title="Delete Version"><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                    ))}
                                </div>
                                {canEdit && (
                                    <div className="p-2 border-t border-stone-100">
                                        <button
                                            onClick={handleNewVersion}
                                            className="w-full py-2 text-xs font-bold uppercase tracking-wider text-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors"
                                        >
                                            Create New Version
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Delete Version Confirmation Dialog */}
            {showDeleteVersionDialog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6">
                            <h3 className="text-lg font-serif font-bold text-stone-900 mb-2">Delete Version?</h3>
                            <p className="text-sm text-stone-500 mb-6">
                                Are you sure you want to delete this version? This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowDeleteVersionDialog(false)}
                                    className="px-4 py-2 text-sm font-bold text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDeleteVersion}
                                    className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
                                >
                                    Delete Version
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden relative">


                {/* Top Section: Visualization & AI */}
                <div className={`w-full flex bg-[#F9F8F4] border-b border-stone-200 transition-all duration-300 ease-in-out ${isConfigExpanded ? 'h-[60%]' : 'h-[calc(100%-60px)]'}`}>

                    {/* Graph Container */}
                    <div className="flex-grow p-8 flex flex-col relative">
                        <div className="flex justify-between items-start mb-6 z-10">
                            <div>
                                <h2 className="font-serif text-3xl text-stone-900 leading-tight">
                                    Financial Forecast
                                </h2>
                                <p className="text-stone-500 text-sm font-light mt-1 flex items-center gap-2">
                                    {breakEvenMonth ? (
                                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1 shadow-sm">
                                            <TrendingUp className="w-3 h-3" /> Break-even: Month {breakEvenMonth}
                                        </span>
                                    ) : (
                                        <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 text-xs font-bold shadow-sm">
                                            Not profitable in {forecastYears} years
                                        </span>
                                    )}
                                    <button onClick={() => setShowBreakEvenFormula(!showBreakEvenFormula)} className="text-[10px] uppercase font-bold tracking-wider text-stone-400 hover:text-nobel-gold underline decoration-stone-300">
                                        View Formula
                                    </button>
                                </p>
                                {selectedExample && selectedExample !== '' && selectedExample !== 'Blank Model' && (
                                    <p className="text-[10px] text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-200 mt-2 italic">
                                        ⚠️ This is for demo purposes only and does not represent the actual financial forecast of {selectedExample}.
                                    </p>
                                )}
                            </div>
                            <div className="w-40">
                                <CustomSelect
                                    value={forecastYears}
                                    onChange={setForecastYears}
                                    options={[
                                        { label: "1 Year", value: 1 },
                                        { label: "2 Years", value: 2 },
                                        { label: "3 Years", value: 3 },
                                        { label: "5 Years", value: 5 },
                                        { label: "10 Years", value: 10 },
                                        { label: "20 Years", value: 20 },
                                    ]}
                                    align="right"
                                />
                            </div>
                        </div>

                        <div className="flex-grow w-full relative bg-white border border-stone-200 rounded-xl shadow-inner overflow-hidden p-6">
                            <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
                                <ComposedChart data={projections} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorCosts" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e7e5e4" />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#a8a29e', fontSize: 10, fontWeight: 600 }}
                                        tickFormatter={(val) => `Mo ${val}`}
                                        minTickGap={30}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#a8a29e', fontSize: 10, fontWeight: 600 }}
                                        tickFormatter={formatYAxis}
                                        width={60}
                                    />
                                    <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#78716c', strokeWidth: 1.5, strokeDasharray: '2 2' }} />

                                    <Area type="monotone" dataKey="revenue" stroke="#fbbf24" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                    <Area type="monotone" dataKey="costs" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorCosts)" />

                                    {breakEvenMonth && (
                                        <ReferenceDot x={breakEvenMonth} y={projections[breakEvenMonth - 1]?.revenue} r={6} fill="#10b981" stroke="white" strokeWidth={2} />
                                    )}
                                </ComposedChart>
                            </ResponsiveContainer>

                            {/* Legend Overlay */}
                            <div className="absolute bottom-4 left-4 flex gap-4 bg-white/90 px-4 py-2 rounded-full border border-stone-100 shadow-sm backdrop-blur-sm z-10">
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-600">
                                    <div className="w-3 h-1 bg-amber-400 rounded-full"></div> Revenue
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-600">
                                    <div className="w-3 h-1 bg-red-500 rounded-full"></div> Costs
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI Analyst Card - Collapsible and Fixed Input */}
                    <div className={`${isAnalystOpen ? 'w-[420px]' : 'w-16'} bg-white border-l border-stone-200 flex flex-col transition-all duration-300 z-10 shadow-lg relative h-full`}>
                        <button
                            onClick={() => {
                                const nextState = !isAnalystOpen;
                                setIsAnalystOpen(nextState);
                                setIsConfigExpanded(!nextState);
                            }}
                            className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-stone-900 border border-stone-800 rounded-full flex items-center justify-center text-white hover:bg-black shadow-md z-20"
                        >
                            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isAnalystOpen ? '-rotate-90' : 'rotate-90'}`} />
                        </button>

                        {/* Header with Badges */}
                        <div className={`p-6 border-b border-stone-50 ${!isAnalystOpen && 'flex-col items-center px-0'}`}>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-stone-900 rounded-full flex items-center justify-center text-white shadow-md flex-shrink-0">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                {isAnalystOpen && (
                                    <div className="animate-in fade-in duration-300">
                                        <h3 className="text-sm font-serif font-bold tracking-widest text-stone-900">Financial AI</h3>
                                    </div>
                                )}
                            </div>

                            {isAnalystOpen && (
                                <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-500">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-stone-900 text-white text-[10px] font-bold uppercase tracking-wider">
                                        AI Analyst
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200 text-[10px] font-bold uppercase tracking-wider">
                                        Strategic Financial Insights
                                    </span>
                                    {aiInsight && aiInsight.match(/\[STATUS:\s*(CRITICAL|AT RISK|STABLE)\]/i) && (
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm border ${aiInsight.match(/CRITICAL/i) ? 'bg-red-500 text-white border-red-600' :
                                            aiInsight.match(/AT RISK/i) ? 'bg-amber-500 text-white border-amber-600' :
                                                'bg-emerald-500 text-white border-emerald-600'
                                            }`}>
                                            {aiInsight.match(/\[STATUS:\s*(CRITICAL|AT RISK|STABLE)\]/i)?.[1].replace('_', ' ')}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {isAnalystOpen && (
                            <div className="flex-grow flex flex-col min-h-0">
                                <div className="flex-grow overflow-y-auto p-6 custom-scrollbar">

                                    {aiInsight ? (
                                        <div className="prose prose-sm prose-stone mb-6 text-sm leading-relaxed font-sans text-stone-600 animate-in fade-in slide-in-from-right-4 overflow-hidden">
                                            <ReactMarkdown
                                                components={{
                                                    h3: ({ children }) => <h3 className="text-sm font-bold uppercase tracking-widest text-stone-800 mt-4 mb-2 first:mt-0 flex items-center gap-2 font-serif">{children}</h3>,
                                                    p: ({ children }) => <p className="text-stone-600 text-sm leading-relaxed mb-3"><SmartText>{children}</SmartText></p>,
                                                    ul: ({ children }) => <ul className="space-y-1 mb-4">{children}</ul>,
                                                    ol: ({ children }) => <ol className="space-y-2 mb-4 list-decimal list-inside">{children}</ol>,
                                                    li: ({ children }) => <li className="text-stone-600 text-sm leading-relaxed"><SmartText>{children}</SmartText></li>,
                                                    strong: ({ children }) => <SmartText isStrong>{children}</SmartText>,
                                                    code: ({ children }) => (
                                                        <span className="bg-stone-100 text-stone-800 px-1.5 py-0.5 rounded font-mono text-[11px] border border-stone-200">
                                                            {children}
                                                        </span>
                                                    )
                                                }}
                                            >
                                                {aiInsight.replace(/\[STATUS:\s*(CRITICAL|AT RISK|STABLE)\]/i, '').trim()}
                                            </ReactMarkdown>

                                            {/* Chat History within Insight area */}
                                            {chatHistory.length > 0 && (
                                                <div className="mt-6 pt-6 border-t border-stone-100 space-y-4">
                                                    {chatHistory.map((msg, i) => (
                                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                            <div className={`max-w-[90%] rounded-xl px-3 py-2 text-xs ${msg.role === 'user'
                                                                ? 'bg-stone-900 text-white shadow-sm'
                                                                : 'bg-stone-50 text-stone-700 border border-stone-100'
                                                                }`}>
                                                                {msg.role === 'assistant' ? (
                                                                    <ReactMarkdown
                                                                        components={{
                                                                            p: ({ children }) => <p className="mb-1 last:mb-0"><SmartText>{children}</SmartText></p>,
                                                                            strong: ({ children }) => <SmartText isStrong>{children}</SmartText>,
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
                                                            <div className="bg-stone-50 border border-stone-100 rounded-xl px-3 py-2">
                                                                <Loader2 className="w-3 h-3 animate-spin text-stone-400" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex-grow flex flex-col items-center justify-center text-center text-stone-400 mb-6">
                                            <BarChart3 className="w-8 h-8 mb-2 opacity-20" />
                                            <p className="text-xs">Generate analysis to see recommendations on burn rate and growth.</p>
                                        </div>
                                    )}

                                </div>

                                {/* Fixed Footer Actions */}
                                <div className="mt-auto p-6 border-t border-stone-100 bg-white space-y-3">
                                    {/* Chat Input at bottom of analyst card */}
                                    {aiInsight && (
                                        <div className="mb-4">
                                            <form onSubmit={handleFollowUpChat} className="relative">
                                                <input
                                                    type="text"
                                                    value={userQuestion}
                                                    onChange={(e) => setUserQuestion(e.target.value)}
                                                    placeholder="Follow-up question..."
                                                    className="w-full bg-stone-50 border border-stone-200 rounded-lg py-2.5 pl-4 pr-10 text-[11px] focus:outline-none focus:ring-2 focus:ring-nobel-gold/20 focus:border-nobel-gold transition-all"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={isChatLoading || !userQuestion.trim()}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-stone-900 text-white rounded-md hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                >
                                                    {isChatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                                </button>
                                            </form>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleGenerateInsight}
                                        disabled={isAnalyzing || !canEdit}
                                        className={`w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 group disabled:opacity-50 ${!canEdit ? 'cursor-not-allowed' : ''}`}
                                    >
                                        {isAnalyzing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Analyzing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                <span>{aiInsight ? 'Refresh Analysis' : 'Analyze Financials'}</span>
                                            </>
                                        )}
                                    </button>

                                    {/* 
                                    {aiInsight && (
                                        <button
                                            onClick={() => {
                                                onAddSlideToDeck({
                                                    id: 'financial-analysis',
                                                    title: 'Financial Analysis Insights',
                                                    content: aiInsight,
                                                    notes: 'Generated by AI Analyst based on current model.',
                                                    imagePrompt: 'A professional business presentation slide showing financial metrics and growth advice.'
                                                });
                                                toast.success("Analysis added correctly to deck");
                                            }}
                                            className="w-full py-3 px-4 bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2"
                                        >
                                            <Presentation className="w-3.5 h-3.5 text-nobel-gold" />
                                            Add to Deck
                                        </button>
                                    )}
                                    */}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Section: Configuration */}
                <div className={`w-full ${isConfigExpanded ? 'h-[40%] p-8 pb-16 overflow-y-auto' : 'h-[60px] p-4 pt-5 overflow-hidden'} bg-stone-900 border-t border-stone-800 transition-all duration-300 ease-in-out relative`} style={{ width: '100%' }}>
                    <button
                        onClick={() => setIsConfigExpanded(!isConfigExpanded)}
                        className="absolute right-8 top-4 w-8 h-8 bg-white rounded-full flex items-center justify-center text-stone-900 hover:bg-stone-50 shadow-lg transition-all z-30 group"
                    >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isConfigExpanded ? 'rotate-0' : 'rotate-180'}`} />
                        <span className="absolute right-10 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-stone-900/50 px-2 py-1 rounded">
                            {isConfigExpanded ? 'Collapse' : 'Expand'}
                        </span>
                    </button>


                    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-12 mt-4" style={{ width: '100%' }}>

                        {/* 1. Growth Mechanics (Redesigned) */}
                        <div className="col-span-1 md:col-span-3 mb-12">
                            <div className="flex flex-col md:flex-row gap-8 items-start border-b border-stone-800 pb-8">
                                {/* Left: Title */}
                                <div className="w-40 flex-shrink-0 pt-2">
                                    <div className="flex items-start gap-2">
                                        <ToolTip text="Key drivers of your user base and costs." />
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 leading-relaxed">
                                            Growth<br />Mechanics
                                        </h3>
                                    </div>
                                </div>

                                {/* Middle: Metrics Grid */}
                                <div className="grid grid-cols-2 gap-x-12 gap-y-8 flex-grow">
                                    {/* Start Users */}
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-2">
                                            Start Users <ToolTip text="The initial number of active users or customers when the forecast begins." position="bottom" />
                                        </label>
                                        <input
                                            type="number"
                                            value={localInputs.startingUsers}
                                            onChange={(e) => setLocalInputs(prev => ({ ...prev, startingUsers: e.target.value }))}
                                            onBlur={() => handleInputBlur('startingUsers')}
                                            className="w-full pb-2 border-b border-stone-700 focus:border-nobel-gold outline-none font-serif text-3xl font-medium text-white bg-transparent placeholder-stone-700 disabled:opacity-70 disabled:cursor-not-allowed"
                                            placeholder="0"
                                            disabled={!canEdit}
                                        />
                                    </div>
                                    {/* CAC */}
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-2">
                                            CAC ($) <ToolTip text="Customer Acquisition Cost. The average expense to acquire a single new paying customer (marketing, sales, etc.)." position="bottom" />
                                        </label>
                                        <input
                                            type="number"
                                            value={localInputs.cac}
                                            onChange={(e) => setLocalInputs(prev => ({ ...prev, cac: e.target.value }))}
                                            onBlur={() => handleInputBlur('cac')}
                                            className="w-full pb-2 border-b border-stone-700 focus:border-nobel-gold outline-none font-serif text-3xl font-medium text-white bg-transparent placeholder-stone-700 disabled:opacity-70 disabled:cursor-not-allowed"
                                            placeholder="0"
                                            disabled={!canEdit}
                                        />
                                    </div>
                                    {/* Growth */}
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-2">
                                            Growth % <ToolTip text="The month-over-month percentage increase in your user base." />
                                        </label>
                                        <input
                                            type="number"
                                            value={localInputs.monthlyGrowthRate}
                                            onChange={(e) => setLocalInputs(prev => ({ ...prev, monthlyGrowthRate: e.target.value }))}
                                            onBlur={() => handleInputBlur('monthlyGrowthRate')}
                                            className="w-full pb-2 border-b border-stone-700 focus:border-nobel-gold outline-none font-serif text-3xl font-medium text-emerald-400 bg-transparent placeholder-stone-700 disabled:opacity-70 disabled:cursor-not-allowed"
                                            placeholder="0"
                                            disabled={!canEdit}
                                        />
                                    </div>
                                    {/* Churn */}
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-2">
                                            Churn % <ToolTip text="The percentage of customers who stop using your service or cancel their subscription each month." />
                                        </label>
                                        <input
                                            type="number"
                                            value={localInputs.churnRate}
                                            onChange={(e) => setLocalInputs(prev => ({ ...prev, churnRate: e.target.value }))}
                                            onBlur={() => handleInputBlur('churnRate')}
                                            className="w-full pb-2 border-b border-stone-700 focus:border-nobel-gold outline-none font-serif text-3xl font-medium text-red-400 bg-transparent placeholder-stone-700 disabled:opacity-70 disabled:cursor-not-allowed"
                                            placeholder="0"
                                            disabled={!canEdit}
                                        />
                                    </div>
                                </div>

                                {/* Right: Strategy & Model Type */}
                                <div className="w-72 flex-shrink-0 space-y-6 pt-1">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-2">Business Model</label>
                                        <input
                                            type="text"
                                            value={revenueModel.businessModelType}
                                            onChange={(e) => updateSettings({ businessModelType: e.target.value })}
                                            className="w-full pb-2 border-b border-stone-700 focus:border-nobel-gold outline-none font-serif text-lg text-white bg-transparent placeholder-stone-700 disabled:opacity-70 disabled:cursor-not-allowed"
                                            placeholder="e.g. SaaS, Marketplace"
                                            disabled={!canEdit}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-2">Strategy Description</label>
                                        <textarea
                                            value={revenueModel.modelDescription || ''}
                                            onChange={(e) => updateSettings({ modelDescription: e.target.value })}
                                            className="w-full p-3 bg-stone-800 border border-stone-700 rounded text-xs text-stone-300 h-24 resize-none focus:outline-none focus:border-nobel-gold leading-relaxed disabled:opacity-70 disabled:cursor-not-allowed"
                                            placeholder="Describe your monetization strategy..."
                                            disabled={!canEdit}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-stone-800" style={{ marginLeft: '168px', marginRight: '304px' }}>
                                <h3
                                    onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                                    className="text-sm font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2 cursor-pointer hover:text-white transition-colors"
                                >
                                    <ChevronDown className={`w-4 h-4 transition-transform ${isDetailsExpanded ? '' : '-rotate-90'}`} />
                                    Financial Details
                                </h3>

                                {isDetailsExpanded && (
                                    <div className="flex flex-col xl:flex-row gap-8 w-full" style={{ width: '100%' }}>

                                        {/* 2. Revenue Streams */}
                                        <div className="flex-1 space-y-4">
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 border-b border-stone-800 pb-2 flex items-center justify-between">
                                                <span className="text-stone-400">Revenue Streams</span>
                                                {canEdit && <button onClick={handleAddRevenueStream} className="p-1.5 bg-white/10 hover:bg-white/20 border border-stone-600 rounded-full text-stone-400 hover:text-white transition-colors"><Plus className="w-3 h-3" /></button>}
                                            </h3>
                                            <div className="space-y-3">
                                                {revenueModel.revenueStreams.map((stream) => (
                                                    <div key={stream.id} className="group p-4 bg-stone-800 border border-stone-700 rounded-lg hover:border-nobel-gold transition-colors shadow-sm space-y-3">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex items-center gap-2 flex-grow min-w-0">
                                                                <input
                                                                    value={stream.name}
                                                                    onChange={(e) => updateRevenueItem(stream.id, 'name', e.target.value)}
                                                                    className="flex-grow text-sm font-serif font-medium bg-transparent outline-none text-white placeholder-stone-500 min-w-0 disabled:cursor-not-allowed"
                                                                    placeholder="Stream Name"
                                                                    disabled={!canEdit}
                                                                />
                                                                {canEdit && <Pencil className="w-3 h-3 text-stone-600 shrink-0" />}
                                                            </div>
                                                            <div className="flex items-center gap-1 shrink-0 bg-stone-900/50 px-2 py-1 rounded border border-stone-700/50">
                                                                <span className="text-xs text-stone-500">$</span>
                                                                <input
                                                                    type="number"
                                                                    value={localStreamPrices[stream.id] !== undefined ? localStreamPrices[stream.id] : stream.price.toString()}
                                                                    onChange={(e) => setLocalStreamPrices(prev => ({ ...prev, [stream.id]: e.target.value }))}
                                                                    onBlur={() => {
                                                                        const val = parseFloat(localStreamPrices[stream.id]);
                                                                        if (!isNaN(val)) updateRevenueItem(stream.id, 'price', val);
                                                                        else setLocalStreamPrices(prev => ({ ...prev, [stream.id]: stream.price.toString() }));
                                                                    }}
                                                                    className="w-16 text-right font-bold text-sm bg-transparent outline-none text-white disabled:cursor-not-allowed"
                                                                    disabled={!canEdit}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between gap-3">
                                                            <CustomSelect
                                                                value={stream.frequency}
                                                                onChange={(val) => updateRevenueItem(stream.id, 'frequency', val)}
                                                                options={[
                                                                    { label: "Monthly Recurring", value: "Monthly" },
                                                                    { label: "One-time / Transactional", value: "One-time" }
                                                                ]}
                                                                className={`flex-grow text-xs ${!canEdit ? 'opacity-70 pointer-events-none' : ''}`}
                                                            />
                                                            {canEdit && (
                                                                <button onClick={() => deleteRevenueItem(stream.id)} className="text-stone-500 hover:text-red-400 p-1.5 hover:bg-stone-700 rounded transition-colors" title="Delete Stream">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {revenueModel.revenueStreams.length === 0 && (
                                                    <div className="text-center py-8 border border-dashed border-stone-800 rounded-lg">
                                                        <p className="text-xs text-stone-500 italic mb-2">No revenue streams yet.</p>
                                                        {canEdit && <button onClick={handleAddRevenueStream} className="text-xs text-nobel-gold hover:underline">Add Stream</button>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 3. Cost Structure */}
                                        <div className="flex-1 space-y-4">
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 border-b border-stone-800 pb-2 flex items-center justify-between">
                                                <span className="text-stone-400">Cost Structure</span>
                                                {canEdit && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setShowExpenseSelector(true)}
                                                            className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-stone-600 rounded-lg text-[10px] text-stone-400 hover:text-white transition-colors flex items-center gap-1 font-bold"
                                                        >
                                                            <Receipt className="w-3 h-3" /> Library
                                                        </button>
                                                        <button onClick={handleAddCostItem} className="p-1.5 bg-white/10 hover:bg-white/20 border border-stone-600 rounded-full text-stone-400 hover:text-white transition-colors">
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </h3>

                                            <ExpenseSelector
                                                isOpen={showExpenseSelector}
                                                onClose={() => setShowExpenseSelector(false)}
                                                expenses={data.expenseLibrary || []}
                                                onSelect={handleImportExpense}
                                            />
                                            <div className="space-y-3">
                                                {revenueModel.costStructure.map((cost) => (
                                                    <div key={cost.id} className="group p-4 bg-stone-800 border border-stone-700 rounded-lg hover:border-stone-500 transition-colors shadow-sm space-y-3">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex items-center gap-2 flex-grow min-w-0">
                                                                <input
                                                                    value={cost.name}
                                                                    onChange={(e) => updateCostItem(cost.id, 'name', e.target.value)}
                                                                    className="flex-grow text-sm font-serif font-medium bg-transparent outline-none text-white placeholder-stone-500 min-w-0 disabled:cursor-not-allowed"
                                                                    placeholder="Expense Name"
                                                                    disabled={!canEdit}
                                                                />
                                                                {canEdit && <Pencil className="w-3 h-3 text-stone-600 shrink-0" />}
                                                            </div>
                                                            <div className="flex items-center gap-1 shrink-0 bg-stone-900/50 px-2 py-1 rounded border border-stone-700/50">
                                                                <span className="text-xs text-stone-500">$</span>
                                                                <input
                                                                    type="number"
                                                                    value={localCostAmounts[cost.id] !== undefined ? localCostAmounts[cost.id] : cost.amount.toString()}
                                                                    onChange={(e) => setLocalCostAmounts(prev => ({ ...prev, [cost.id]: e.target.value }))}
                                                                    onBlur={() => {
                                                                        const val = parseFloat(localCostAmounts[cost.id]);
                                                                        if (!isNaN(val)) updateCostItem(cost.id, 'amount', val);
                                                                        else setLocalCostAmounts(prev => ({ ...prev, [cost.id]: cost.amount.toString() }));
                                                                    }}
                                                                    className="w-16 text-right font-bold text-sm bg-transparent outline-none text-red-400 disabled:cursor-not-allowed"
                                                                    disabled={!canEdit}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between gap-3">
                                                            <CustomSelect
                                                                value={cost.frequency}
                                                                onChange={(val) => updateCostItem(cost.id, 'frequency', val)}
                                                                options={[
                                                                    { label: "Monthly Fixed", value: "Monthly" },
                                                                    { label: "One-time Setup", value: "One-time" }
                                                                ]}
                                                                className={`flex-grow text-xs ${!canEdit ? 'opacity-70 pointer-events-none' : ''}`}
                                                            />
                                                            {canEdit && (
                                                                <button onClick={() => deleteCostItem(cost.id)} className="text-stone-500 hover:text-red-400 p-1.5 hover:bg-stone-700 rounded transition-colors" title="Delete Cost">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {revenueModel.costStructure.length === 0 && (
                                                    <div className="text-center py-8 border border-dashed border-stone-800 rounded-lg">
                                                        <p className="text-xs text-stone-500 italic mb-2">No costs added yet.</p>
                                                        {canEdit && <button onClick={handleAddCostItem} className="text-xs text-nobel-gold hover:underline">Add Cost</button>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Collapsible Financial Details */}


                    </div>
                </div>


                {/* Break-even Formula Sheet */}
                {
                    showBreakEvenFormula && (
                        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowBreakEvenFormula(false)}>
                            <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-serif text-xl text-stone-900">Break-even Calculation</h3>
                                    <button onClick={() => setShowBreakEvenFormula(false)}><X className="w-5 h-5 text-stone-400" /></button>
                                </div>
                                <div className="space-y-4 text-sm text-stone-600 font-serif leading-relaxed">
                                    <p><strong>Formula:</strong> <code>Profit = Revenue - (Fixed Costs + Variable Costs)</code></p>
                                    <p>We calculate this month-over-month:</p>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li><strong>Revenue:</strong> Users × Price (for monthly streams).</li>
                                        <li><strong>Variable Costs:</strong> New Users × CAC.</li>
                                        <li><strong>Fixed Costs:</strong> Sum of monthly fixed expenses.</li>
                                    </ul>
                                    <div className="bg-stone-50 p-4 rounded border border-stone-100 mt-4">
                                        <p className="text-xs uppercase font-bold text-stone-400 mb-2">Current Variables</p>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <span>Fixed Costs:</span> <span className="font-bold">${revenueModel.costStructure.filter(c => c.frequency === 'Monthly').reduce((a, b) => a + b.amount, 0).toLocaleString()}</span>
                                            <span>CAC:</span> <span className="font-bold">${revenueModel.cac}</span>
                                            <span>ARPU (Approx):</span> <span className="font-bold">${Math.round(revenueModel.revenueStreams.reduce((a, b) => a + b.price, 0))}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Custom Dialogs */}
                {/* Delete Revenue Stream Dialog */}
                {
                    showDeleteRevenueDialog && (
                        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-stone-100 scale-100 animate-in zoom-in-95 duration-200">
                                <h3 className="font-serif text-lg font-bold text-stone-900 mb-2">Delete Revenue Stream?</h3>
                                <p className="text-sm text-stone-500 mb-6">This action cannot be undone.</p>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowDeleteRevenueDialog(false)}
                                        className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDeleteRevenue}
                                        className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Delete Cost Item Dialog */}
                {
                    showDeleteCostDialog && (
                        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-stone-100 scale-100 animate-in zoom-in-95 duration-200">
                                <h3 className="font-serif text-lg font-bold text-stone-900 mb-2">Delete Cost Item?</h3>
                                <p className="text-sm text-stone-500 mb-6">This action cannot be undone.</p>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowDeleteCostDialog(false)}
                                        className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDeleteCost}
                                        className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* New Version Dialog */}
                {
                    showNewVersionDialog && (
                        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-stone-100 scale-100 animate-in zoom-in-95 duration-200">
                                <h3 className="font-serif text-lg font-bold text-stone-900 mb-4">Save New Version</h3>
                                <input
                                    type="text"
                                    value={newVersionName}
                                    onChange={(e) => setNewVersionName(e.target.value)}
                                    placeholder="Version Name (e.g. 'Aggressive Growth')"
                                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg text-sm outline-none focus:border-nobel-gold mb-6"
                                    autoFocus
                                />
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowNewVersionDialog(false)}
                                        className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmNewVersion}
                                        disabled={!newVersionName}
                                        className="px-4 py-2 text-sm font-bold text-white bg-stone-900 hover:bg-nobel-gold rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Save Version
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Save Template Dialog */}
                {
                    showSaveTemplateDialog && (
                        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-stone-100 scale-100 animate-in zoom-in-95 duration-200">
                                <h3 className="font-serif text-lg font-bold text-stone-900 mb-4">Save as Template</h3>
                                <p className="text-xs text-stone-500 mb-4">Save the current model settings, revenue streams, and costs as a reusable template.</p>
                                <input
                                    type="text"
                                    value={newTemplateName}
                                    onChange={(e) => setNewTemplateName(e.target.value)}
                                    placeholder="Template Name (e.g. 'My SaaS Model')"
                                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg text-sm outline-none focus:border-nobel-gold mb-6"
                                    autoFocus
                                />
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowSaveTemplateDialog(false)}
                                        className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmSaveTemplate}
                                        disabled={!newTemplateName}
                                        className="px-4 py-2 text-sm font-bold text-white bg-stone-900 hover:bg-nobel-gold rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Save Template
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    );
};

export default RevenueModel;
