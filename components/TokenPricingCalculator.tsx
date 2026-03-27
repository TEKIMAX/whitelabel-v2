import React, { useState } from 'react';
import { Search, Plus, Loader2, TrendingUp, Calculator, Zap, Users } from 'lucide-react';
import { StartupData, CostItem, ViewState, RolePermissions } from '../types';
import { toast } from 'sonner';
import { useMutation } from 'convex/react';
import { api } from "../convex/_generated/api";
import { useAIGetModelPricing } from '../hooks/useAI';
import DotPatternBackground from './DotPatternBackground';
import { Logo } from './Logo';
import TabNavigation from './TabNavigation';
import CustomSelect from './CustomSelect';

interface TokenPricingCalculatorProps {
    currentProject?: StartupData;
    onUpdateProject?: (updater: (project: StartupData) => StartupData) => void;
    currentView: ViewState;
    onNavigate: (view: ViewState) => void;
    allowedPages?: string[];
    permissions?: RolePermissions;
}

// Updated interface based on API documentation
interface ModelPricing {
    model_id: string;
    name: string; // "GPT-5 Codex"
    provider_name: string; // "ZenMux"
    cost_per_1m_input: number;
    cost_per_1m_output: number;
    context_window: number;
    capabilities: string[];
}

interface PricingApiResponse {
    models: ModelPricing[];
    total_matched: number;
}

export const TokenPricingCalculator: React.FC<TokenPricingCalculatorProps> = ({
    currentProject,
    onUpdateProject,
    currentView,
    onNavigate,
    allowedPages,
    permissions
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [providerFilter, setProviderFilter] = useState('');
    const [models, setModels] = useState<ModelPricing[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    // Calculator State
    const [selectedModel, setSelectedModel] = useState<ModelPricing | null>(null);
    const [inputTokens, setInputTokens] = useState<number>(1000000); // Default 1M
    const [outputTokens, setOutputTokens] = useState<number>(100000);   // Default 100k
    const [estimatedCost, setEstimatedCost] = useState<number>(0);

    // Traffic Mode State
    const [calculatorMode, setCalculatorMode] = useState<'simple' | 'traffic'>('simple');
    const [mau, setMau] = useState<number>(1000);
    const [requestsPerUser, setRequestsPerUser] = useState<number>(50);
    const [avgInputTokens, setAvgInputTokens] = useState<number>(500);
    const [avgOutputTokens, setAvgOutputTokens] = useState<number>(1000);

    // Sync Traffic Mode Calculations
    React.useEffect(() => {
        if (calculatorMode === 'traffic') {
            const totalRequests = mau * requestsPerUser;
            setInputTokens(totalRequests * avgInputTokens);
            setOutputTokens(totalRequests * avgOutputTokens);
        }
    }, [calculatorMode, mau, requestsPerUser, avgInputTokens, avgOutputTokens]);

    // Provider badge helper
    const getProviderColor = (provider: string) => {
        const p = provider.toLowerCase();
        if (p.includes('openai')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (p.includes('anthropic')) return 'bg-amber-50 text-amber-700 border-amber-200';
        if (p.includes('google')) return 'bg-blue-50 text-blue-700 border-blue-200';
        if (p.includes('mistral')) return 'bg-orange-50 text-orange-700 border-orange-200';
        if (p.includes('meta') || p.includes('llama')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
        return 'bg-stone-50 text-stone-700 border-stone-200';
    };

    // Use the new backend action
    const getModelPricing = useAIGetModelPricing();
    const updateProject = useMutation(api.projects.update);

    const fetchModels = async (reset = false) => {
        setIsLoading(true);
        try {
            const result = await getModelPricing({
                provider: providerFilter || undefined,
                query: searchQuery || undefined,
                limit: 60,
                offset: reset ? 0 : offset
            }) as PricingApiResponse; // Type cast the return value

            const newModels = result.models || [];

            if (reset) {
                setModels(newModels);
                setOffset(newModels.length);
            } else {
                setModels(prev => [...prev, ...newModels]);
                setOffset(prev => prev + newModels.length);
            }

            // Refresh selected model if it exists in the new results to ensure pricing is up to date
            if (selectedModel) {
                const match = newModels.find(m => m.model_id === selectedModel.model_id);
                if (match) {
                    setSelectedModel(match);
                }
            }

            setHasMore(newModels.length === 60);

        } catch (error) {
            toast.error("Failed to load model pricing.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchModels(true);
    };

    const calculateCost = () => {
        if (!selectedModel) return;
        // Use correct field names: cost_per_1m_input / cost_per_1m_output
        const inputCost = (inputTokens / 1_000_000) * (selectedModel.cost_per_1m_input || 0);
        const outputCost = (outputTokens / 1_000_000) * (selectedModel.cost_per_1m_output || 0);
        setEstimatedCost(inputCost + outputCost);
    };

    React.useEffect(() => {
        calculateCost();
    }, [selectedModel, inputTokens, outputTokens]);

    React.useEffect(() => {
        fetchModels(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleAddToExpenses = () => {
        if (!selectedModel || !currentProject || !onUpdateProject) return;

        const newCostItem: CostItem = {
            id: Date.now().toString(),
            name: `AI Inference: ${selectedModel.name}`,
            amount: parseFloat(estimatedCost.toFixed(2)),
            frequency: 'Monthly',
            category: 'AI Infrastructure',
            source: 'Human' // Or 'AI' depending on perspective, but user is adding it manually
        };

        const updatedLibrary = [...(currentProject.expenseLibrary || []), newCostItem];

        // Add to Expense Library (Local)
        onUpdateProject(project => ({
            ...project,
            expenseLibrary: updatedLibrary
        }));

        // Persist to Backend
        if (currentProject.id) {
            updateProject({
                id: currentProject.id as any,
                updates: { expenseLibrary: updatedLibrary }
            });
        }

        toast.success(`Added ${newCostItem.name} to Expense Library`);
    };

    return (
        <div className="h-screen flex bg-[#F0F0F0] relative overflow-hidden font-sans">
            {/* Left Side - Image (20% reduced width) */}
            <div className="hidden md:flex w-[20%] h-full relative overflow-hidden bg-stone-900 border-r border-stone-200 shadow-2xl z-20">
                <img
                    src="/images/Cozy.png"
                    alt="Token Intelligence"
                    className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-stone-900/40 via-transparent to-stone-900/80" />

                {/* Top Logo */}
                <div className="absolute top-12 left-8 z-30">
                    <Logo imageClassName="h-8 w-auto brightness-0 invert" />
                </div>

                {/* Bottom Overlay Content */}
                <div className="absolute inset-x-0 bottom-0 p-8 space-y-6 bg-gradient-to-t from-stone-900 via-stone-900/60 to-transparent pt-32">
                    <div className="space-y-4">
                        <div className="bg-white/10 backdrop-blur-md p-2 rounded-lg inline-block mb-2 border border-white/20">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-white text-3xl font-serif font-bold leading-tight">
                            Token <br />
                            <span className="text-nobel-gold italic underline underline-offset-8 decoration-white/20">Intelligence.</span>
                        </h2>
                        <div className="h-1 w-12 bg-nobel-gold/50 rounded-full" />
                        <p className="text-stone-300 text-sm leading-relaxed font-medium">
                            Optimize your AI infrastructure. Compare models, forecast costs, and choose the right intelligence for your startup.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Content (80%) */}
            <div className="w-[80%] h-full flex flex-col relative z-10 bg-[#E5E5E5]">
                <DotPatternBackground color="#a8a29e" />

                <header className="px-8 py-4 flex items-center justify-between relative z-30 bg-white/50 backdrop-blur-sm border-b border-white/20">
                    <div className="flex items-center gap-6">
                        <TabNavigation currentView={currentView} onNavigate={onNavigate} allowedPages={allowedPages} mode="light" />
                    </div>
                </header>

                {/* Content Scroll Area */}
                <div className="flex-1 overflow-hidden p-6 relative z-10">
                    <div className="max-w-[1600px] mx-auto h-full flex gap-6 justify-center">

                        {/* Left Column: Search & List (Flexible Width) */}
                        <div className="flex-1 flex flex-col h-full bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden max-w-4xl">
                            {/* Header */}
                            <div className="p-5 border-b border-stone-100 bg-white flex gap-3 shrink-0 items-center">
                                <div className="relative flex-1">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search models..."
                                        className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-nobel-gold focus:border-nobel-gold outline-none transition-all placeholder:text-stone-400 text-sm"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <CustomSelect
                                    value={providerFilter}
                                    onChange={(val) => setProviderFilter(val as string)}
                                    options={[
                                        { label: "All Providers", value: "" },
                                        { label: "OpenAI", value: "openai" },
                                        { label: "Anthropic", value: "anthropic" },
                                        { label: "Google", value: "google" },
                                        { label: "Mistral", value: "mistral" }
                                    ]}
                                    className="w-48"
                                    placeholder="Provider"
                                />
                                <button
                                    onClick={() => fetchModels(true)}
                                    className="px-6 py-3.5 bg-stone-900 text-white rounded-xl hover:bg-black transition-colors shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-2 text-sm font-medium border border-transparent hover:border-stone-700"
                                >
                                    {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Search className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Column Headers */}
                            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-stone-50/80 backdrop-blur-sm sticky top-0 font-bold text-xs text-stone-500 uppercase tracking-wider shrink-0 border-b border-stone-100 z-10">
                                <div className="col-span-6">Model Definition</div>
                                <div className="col-span-3 text-right">Input / 1M</div>
                                <div className="col-span-3 text-right">Output / 1M</div>
                            </div>

                            {/* List */}
                            <div className="flex-1 overflow-y-auto min-h-0 bg-white">
                                {models.length === 0 && !isLoading ? (
                                    <div className="h-full flex flex-col items-center justify-center text-stone-400">
                                        <TrendingUp className="w-10 h-10 mb-3 opacity-20" />
                                        <p className="text-sm">No models found.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-stone-50">
                                        {models.map((model, idx) => {
                                            const providerBadgeColor = getProviderColor(model.provider_name);
                                            return (
                                                <div
                                                    key={`${model.provider_name}-${model.name}-${idx}`}
                                                    className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors cursor-pointer group ${selectedModel?.model_id === model.model_id ? 'bg-nobel-gold/5 border-l-4 border-nobel-gold pl-[20px]' : 'hover:bg-stone-50 pl-6 border-l-4 border-transparent'}`}
                                                    onClick={() => setSelectedModel(model)}
                                                >
                                                    <div className="col-span-6 flex flex-col items-start gap-1 p-0.5">
                                                        <div className="font-bold text-stone-900 text-[15px] group-hover:text-black transition-colors">{model.name}</div>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${providerBadgeColor}`}>
                                                            {model.provider_name}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-3 text-right font-mono text-[14px] text-stone-600 font-semibold group-hover:text-stone-900">
                                                        ${(model.cost_per_1m_input || 0).toFixed(2)}
                                                    </div>
                                                    <div className="col-span-3 text-right font-mono text-[14px] text-stone-600 font-semibold group-hover:text-stone-900">
                                                        ${(model.cost_per_1m_output || 0).toFixed(2)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {/* Load More */}
                                        {hasMore && models.length > 0 && (
                                            <div className="p-6 flex justify-center border-t border-stone-100">
                                                <button
                                                    onClick={() => fetchModels()}
                                                    disabled={isLoading}
                                                    className="px-6 py-2 rounded-full border border-stone-200 text-xs font-bold uppercase tracking-widest text-stone-500 hover:border-stone-400 hover:text-stone-900 transition-all"
                                                >
                                                    {isLoading ? "Loading..." : "Load More Models"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Dark Mode Calculator (Fixed Width) */}
                        <div className="w-[400px] shrink-0 flex flex-col h-fit rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5 relative bg-[#1c1c1e]">
                            {/* Calculator Bezel/Frame */}
                            <div className="absolute inset-0 border-[6px] border-[#2c2c2e] rounded-3xl pointer-events-none z-50 rounded-b-3xl"></div>

                            {/* Screen Area */}
                            <div className="bg-[#121212] p-8 pb-6 flex flex-col items-end justify-center border-b border-[#333] relative h-[180px]">
                                <span className="text-[#555] font-medium text-xs uppercase tracking-widest mb-auto w-full flex justify-between">
                                    <span>Cost / Month</span>
                                    {selectedModel && <span className="px-2 py-0.5 rounded bg-[#333] text-white text-[10px]">{selectedModel.provider_name}</span>}
                                </span>
                                <div className="text-[#4CD964] font-mono text-5xl font-light tracking-tighter truncate w-full text-right drop-shadow-[0_0_10px_rgba(76,217,100,0.3)]">
                                    ${estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                {!selectedModel && <div className="text-[#333] text-sm font-mono mt-2">SELECT MODEL</div>}
                            </div>

                            {/* Controls Area */}
                            <div className="bg-[#1c1c1e] p-6 flex flex-col gap-6">

                                {selectedModel ? (
                                    <>
                                        <div>
                                            <div className="text-white font-medium text-lg mb-1">{selectedModel.name}</div>
                                            <div className="flex gap-4 text-[#666] text-xs font-mono mb-6">
                                                <div>
                                                    IN: <span className="text-[#ccc]">${selectedModel.cost_per_1m_input?.toFixed(2)}</span>
                                                </div>
                                                <div>
                                                    OUT: <span className="text-[#ccc]">${selectedModel.cost_per_1m_output?.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {/* Mode Toggle */}
                                            <div className="bg-[#2c2c2e] p-1 rounded-lg flex mb-2">
                                                <button
                                                    onClick={() => setCalculatorMode('simple')}
                                                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${calculatorMode === 'simple' ? 'bg-[#555] text-white shadow-sm' : 'text-[#888] hover:text-white'}`}
                                                >
                                                    Simple
                                                </button>
                                                <button
                                                    onClick={() => setCalculatorMode('traffic')}
                                                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${calculatorMode === 'traffic' ? 'bg-[#555] text-white shadow-sm' : 'text-[#888] hover:text-white'}`}
                                                >
                                                    Traffic Model
                                                </button>
                                            </div>

                                            {calculatorMode === 'simple' ? (
                                                <>
                                                    {/* Input Input */}
                                                    <div className="space-y-2">
                                                        <label className="text-[#888] text-[10px] uppercase font-bold tracking-wider">Input Tokens</label>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                value={inputTokens}
                                                                onChange={(e) => setInputTokens(parseInt(e.target.value) || 0)}
                                                                className="w-full bg-[#2c2c2e] text-white text-xl font-mono p-4 rounded-xl border border-[#3c3c3e] focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold outline-none transition-all text-right shadow-inner"
                                                            />
                                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555] text-xs font-bold">IN</span>
                                                        </div>
                                                        <div className="text-right text-[#555] text-xs font-medium">{(inputTokens / 1000000).toFixed(2)}M</div>
                                                    </div>

                                                    {/* Output Input */}
                                                    <div className="space-y-2">
                                                        <label className="text-[#888] text-[10px] uppercase font-bold tracking-wider">Output Tokens</label>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                value={outputTokens}
                                                                onChange={(e) => setOutputTokens(parseInt(e.target.value) || 0)}
                                                                className="w-full bg-[#2c2c2e] text-white text-xl font-mono p-4 rounded-xl border border-[#3c3c3e] focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold outline-none transition-all text-right shadow-inner"
                                                            />
                                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555] text-xs font-bold">OUT</span>
                                                        </div>
                                                        <div className="text-right text-[#555] text-xs font-medium">{(outputTokens / 1000000).toFixed(2)}M</div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                    {/* Traffic Inputs - Grid Layout */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <label className="text-[#888] text-[9px] uppercase font-bold tracking-wider">Active Users</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={mau}
                                                                    onChange={(e) => setMau(parseInt(e.target.value) || 0)}
                                                                    className="w-full bg-[#2c2c2e] text-white text-sm font-mono p-2.5 rounded-lg border border-[#3c3c3e] focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold outline-none text-right transition-all shadow-inner"
                                                                />
                                                                <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#555] w-3 h-3" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[#888] text-[9px] uppercase font-bold tracking-wider">Reqs / User</label>
                                                            <input
                                                                type="number"
                                                                value={requestsPerUser}
                                                                onChange={(e) => setRequestsPerUser(parseInt(e.target.value) || 0)}
                                                                className="w-full bg-[#2c2c2e] text-white text-sm font-mono p-2.5 rounded-lg border border-[#3c3c3e] focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold outline-none text-right transition-all shadow-inner"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <label className="text-[#888] text-[9px] uppercase font-bold tracking-wider">Input / Req</label>
                                                            <input
                                                                type="number"
                                                                value={avgInputTokens}
                                                                onChange={(e) => setAvgInputTokens(parseInt(e.target.value) || 0)}
                                                                className="w-full bg-[#2c2c2e] text-white text-sm font-mono p-2.5 rounded-lg border border-[#3c3c3e] focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold outline-none text-right transition-all shadow-inner"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[#888] text-[9px] uppercase font-bold tracking-wider">Output / Req</label>
                                                            <input
                                                                type="number"
                                                                value={avgOutputTokens}
                                                                onChange={(e) => setAvgOutputTokens(parseInt(e.target.value) || 0)}
                                                                className="w-full bg-[#2c2c2e] text-white text-sm font-mono p-2.5 rounded-lg border border-[#3c3c3e] focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold outline-none text-right transition-all shadow-inner"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="pt-2 border-t border-[#333] grid grid-cols-2 gap-2 text-[10px] text-[#666] font-mono">
                                                        <div className="flex justify-between">
                                                            <span>Total In:</span>
                                                            <span className="text-[#bbb]">{(inputTokens / 1000000).toFixed(2)}M</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Total Out:</span>
                                                            <span className="text-[#bbb]">{(outputTokens / 1000000).toFixed(2)}M</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-auto pt-6">
                                            <button
                                                onClick={handleAddToExpenses}
                                                className="w-full py-4 bg-nobel-gold text-white rounded-2xl hover:bg-nobel-gold/90 active:scale-[0.98] transition-all font-bold text-[15px] tracking-wide shadow-lg hover:shadow-nobel-gold/20 flex items-center justify-center gap-2 group"
                                            >
                                                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                                                ADD TO EXPENSES
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center opacity-20">
                                        <Calculator className="w-24 h-24 text-white" />
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};
