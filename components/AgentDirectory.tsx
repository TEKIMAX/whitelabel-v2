import React, { useState, useEffect, useRef } from "react";
import {
    Bot,
    Plus,
    Search,
    Settings,
    Cpu,
    HardDrive,
    Edit2,
    Trash2,
    ChevronDown,
    Check,
} from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "./Logo";
import DotPatternBackground from "./DotPatternBackground";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

interface AgentDirectoryProps {
    currentProjectId?: string;
    onNavigate: (view: any) => void;
}

export const AgentDirectory: React.FC<AgentDirectoryProps> = ({
    currentProjectId,
    onNavigate,
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [objective, setObjective] = useState("");
    const [systemMessage, setSystemMessage] = useState("");
    const [modelName, setModelName] = useState("cloud");
    const [availableModels, setAvailableModels] = useState<any[]>([
        { name: "cloud", title: "Default Cloud Model" },
        { name: "gemini-2.0-flash", title: "Gemini 2.0 Flash" },
    ]);
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Click outside handler for dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsModelDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const customAgents = useQuery(
        api.aiAgents.listAgents,
        currentProjectId
            ? { projectId: currentProjectId as Id<"projects"> }
            : "skip"
    );
    const createAgent = useMutation(api.aiAgents.createAgent);
    const deleteAgent = useMutation(api.aiAgents.deleteAgent);
    const listModels = useAction(api.ollamaService.listModels);

    // Fetch Ollama models statically or via an endpoint if possible. For now, we list common defaults.
    useEffect(() => {
        const fetchModels = async () => {
            try {
                // Fetching from Ollama cloud registry via backend action
                const response = await listModels();

                // Response might be an array directly or an object with a models property
                // from the https://ollama.com/api/tags endpoint
                let models: any[] = [];
                if (Array.isArray(response)) {
                    models = response;
                } else if (
                    response &&
                    typeof response === "object" &&
                    "models" in response
                ) {
                    models = (response as any).models;
                }

                if (models.length > 0) {
                    // standardize if older backend returns strings
                    const standardizedModels = models.map((m) =>
                        typeof m === "string" ? { name: m } : m,
                    );

                    setAvailableModels([
                        { name: "cloud", title: "Default Cloud Model" },
                        { name: "gemini-2.0-flash", title: "Gemini 2.0 Flash" },
                        ...standardizedModels,
                    ]);
                }
            } catch (err) {
            }
        };
        fetchModels();
    }, [listModels]);

    const handleCreate = async () => {
        if (!name || !systemMessage) return;
        await createAgent({
            projectId: currentProjectId as Id<"projects">,
            orgId: "default", // Should fetch from context in a real app
            name,
            role,
            objective,
            systemMessage,
            modelName,
        });
        setIsCreateModalOpen(false);
        // Reset form
        setName("");
        setRole("");
        setObjective("");
        setSystemMessage("");
        setModelName("cloud");
    };

    const handleDelete = async (id: Id<"ai_agents">) => {
        if (confirm("Are you sure you want to delete this agent?")) {
            await deleteAgent({ id });
        }
    };

    const AgentCard = ({
        agent,
        isDefault = false,
    }: {
        agent: any;
        isDefault?: boolean;
    }) => (
        <div className="bg-white rounded-2xl border border-stone-200/50 p-6 shadow-sm hover:shadow-md transition-all group flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div
                        className={`p-3 rounded-xl ${isDefault ? "bg-indigo-50 text-indigo-600" : "bg-stone-50 text-stone-600"}`}
                    >
                        {isDefault ? <Bot size={24} /> : <Cpu size={24} />}
                    </div>
                    <div>
                        <h3 className="font-serif text-lg text-stone-900">{agent.name}</h3>
                        <p className="text-xs text-stone-500 font-medium tracking-wide uppercase">
                            {agent.role || "General AI"}
                        </p>
                    </div>
                </div>
                {!isDefault && (
                    <button
                        onClick={() => handleDelete(agent._id)}
                        className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            <p className="text-sm text-stone-600 mb-6 flex-grow line-clamp-3">
                {agent.objective ||
                    "No specific objective defined. Ready to assist with general tasks."}
            </p>

            <div className="flex flex-wrap items-center justify-between pt-4 border-t border-stone-100 gap-2">
                <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium bg-stone-50 px-2.5 py-1.5 rounded-lg max-w-full min-w-0">
                    <HardDrive size={12} className="flex-shrink-0" />
                    <span className="truncate">
                        {agent.modelName === "cloud"
                            ? "Default Cloud Model"
                            : agent.modelName === "gemini-2.0-flash"
                                ? "Gemini 2.0 Flash"
                                : agent.modelName}
                    </span>
                </div>
                {isDefault && (
                    <span className="whitespace-nowrap flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-1 rounded-md">
                        Active Global
                    </span>
                )}
            </div>
        </div>
    );

    return (
        <div className="h-screen flex bg-nobel-cream relative overflow-hidden font-sans">
            {/* Left Side Branding */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-[30%] h-full relative overflow-hidden bg-stone-900 border-r border-stone-200 shadow-2xl z-20 hidden md:block"
            >
                <img
                    src="https://images.unsplash.com/photo-1620121692029-d088224ddc74?q=80&w=2832&auto=format&fit=crop"
                    className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105"
                    alt="Agent Directory Vertical"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-stone-900/40 via-transparent to-stone-900/80" />
                <div className="absolute top-12 left-12 z-30">
                    <Logo imageClassName="h-10 w-auto brightness-0 invert" />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-12 space-y-6 bg-gradient-to-t from-stone-900 via-stone-900/60 to-transparent pt-32">
                    <div className="space-y-4">
                        <h2 className="text-white text-4xl font-serif font-bold leading-tight">
                            AI Agent
                            <br />
                            <span className="text-nobel-gold italic">Directory.</span>
                        </h2>
                        <div className="h-1 w-12 bg-nobel-gold/50 rounded-full" />
                        <p className="text-stone-300 text-sm leading-relaxed max-w-sm">
                            Manage specialized AI agents to automate and refine different
                            aspects of your startup journey.
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Right Side Content */}
            <div className="flex-1 h-full flex flex-col relative z-10 overflow-y-auto">
                <DotPatternBackground color="#a8a29e" />
                <div className="p-8 md:p-12 relative z-10 w-full max-w-5xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-serif text-stone-900 mb-2">
                                My Agents
                            </h1>
                            <p className="text-stone-500">
                                Configure and deploy custom AI models.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => onNavigate("AI_ASSISTANT")}
                                className="flex items-center gap-2 px-6 py-2.5 bg-white border border-stone-200 text-stone-600 rounded-full text-sm font-semibold hover:bg-stone-50 transition-colors shadow-sm"
                            >
                                Exit Directory
                            </button>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-white rounded-full text-sm font-semibold hover:bg-stone-800 transition-colors shadow-sm"
                            >
                                <Plus size={18} />
                                Create Agent
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative mb-8 max-w-md">
                        <Search
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                            size={18}
                        />
                        <input
                            type="text"
                            placeholder="Search agents by name or role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5"
                        />
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                        <AgentCard
                            isDefault={true}
                            agent={{
                                name: "Adaptive Copilot",
                                role: "System Default",
                                objective:
                                    "Provides context-aware assistance across all tools, including the Canvas, Deck Builder, and Calculator.",
                                modelName: "cloud",
                            }}
                        />

                        {customAgents
                            ?.filter(
                                (a) =>
                                    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    a.role?.toLowerCase().includes(searchQuery.toLowerCase()),
                            )
                            .map((agent: any) => (
                                <AgentCard key={agent._id} agent={agent} />
                            ))}
                    </div>
                </div>
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-stone-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <div>
                                <h2 className="text-xl font-serif text-stone-900">
                                    Configure New Agent
                                </h2>
                                <p className="text-sm text-stone-500">
                                    Define the behavior and identity of your custom AI assistant.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-2 hover:bg-stone-100 rounded-full text-stone-500"
                            >
                                <Plus className="rotate-45" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                                        Agent Name
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Finance Wizard"
                                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                                        Role
                                    </label>
                                    <input
                                        type="text"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        placeholder="e.g. Financial Analyst"
                                        className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="relative" ref={dropdownRef}>
                                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                                    Model Selection
                                </label>

                                <button
                                    type="button"
                                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-colors hover:bg-stone-100"
                                >
                                    <span className="truncate">
                                        {modelName === "cloud"
                                            ? "Default Cloud Model"
                                            : modelName === "gemini-2.0-flash"
                                                ? "Gemini 2.0 Flash"
                                                : modelName}
                                    </span>
                                    <ChevronDown
                                        className={`w-4 h-4 text-stone-400 transition-transform ${isModelDropdownOpen ? "rotate-180" : ""}`}
                                    />
                                </button>

                                {isModelDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-2 bg-stone-800 border border-stone-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                                        <div className="p-1">
                                            {availableModels.map((option, idx) => {
                                                const id = option.name;
                                                const label = option.title || id;
                                                const paramSize = option.details?.parameter_size;
                                                const quant = option.details?.quantization_level;
                                                const capabilities: string[] =
                                                    option.capabilities || [];

                                                const lowerId = id.toLowerCase();
                                                const hasVision =
                                                    capabilities.includes("vision") ||
                                                    lowerId.includes("vl") ||
                                                    lowerId.includes("vision") ||
                                                    lowerId.includes("llava") ||
                                                    option.details?.families?.includes("llava");
                                                const hasCode =
                                                    lowerId.includes("coder") || lowerId.includes("code");
                                                const hasTools = capabilities.includes("tools");
                                                const hasThinking = capabilities.includes("thinking");

                                                // Filter out the known ones that we handle explicitly, and 'completion' which is implicit
                                                const otherCaps = capabilities.filter(
                                                    (c) =>
                                                        ![
                                                            "vision",
                                                            "tools",
                                                            "thinking",
                                                            "completion",
                                                        ].includes(c),
                                                );

                                                return (
                                                    <button
                                                        key={id + idx}
                                                        type="button"
                                                        onClick={() => {
                                                            setModelName(id);
                                                            setIsModelDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2.5 rounded-lg flex flex-col gap-1 transition-colors ${modelName === id
                                                            ? "bg-blue-500/20 text-blue-400 font-medium"
                                                            : "text-stone-300 hover:bg-stone-700 hover:text-white"
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between w-full">
                                                            <div className="flex items-center gap-2 truncate">
                                                                <span className="truncate text-sm">
                                                                    {label}
                                                                </span>
                                                                {option.size && (
                                                                    <span className="text-[10px] text-stone-500 flex-shrink-0">
                                                                        {(option.size / 1024 / 1024 / 1024).toFixed(
                                                                            1,
                                                                        )}{" "}
                                                                        GB
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {modelName === id && (
                                                                <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                                            )}
                                                        </div>
                                                        {(paramSize ||
                                                            quant ||
                                                            hasVision ||
                                                            hasCode ||
                                                            hasTools ||
                                                            hasThinking ||
                                                            otherCaps.length > 0) && (
                                                                <div className="flex gap-1.5 mt-0.5 whitespace-nowrap text-xs overflow-x-auto no-scrollbar">
                                                                    {hasThinking && (
                                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-md text-amber-300 bg-amber-500/20 font-medium uppercase tracking-wider">
                                                                            Thinking
                                                                        </span>
                                                                    )}
                                                                    {hasTools && (
                                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-md text-sky-300 bg-sky-500/20 font-medium uppercase tracking-wider">
                                                                            Tools
                                                                        </span>
                                                                    )}
                                                                    {hasVision && (
                                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-md text-fuchsia-300 bg-fuchsia-500/20 font-medium uppercase tracking-wider">
                                                                            Vision
                                                                        </span>
                                                                    )}
                                                                    {hasCode && (
                                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-md text-emerald-300 bg-emerald-500/20 font-medium uppercase tracking-wider">
                                                                            Code
                                                                        </span>
                                                                    )}

                                                                    {otherCaps.map((cap: string) => (
                                                                        <span
                                                                            key={cap}
                                                                            className="text-[9px] px-1.5 py-0.5 rounded-md text-purple-300 bg-purple-500/20 font-medium uppercase tracking-wider"
                                                                        >
                                                                            {cap}
                                                                        </span>
                                                                    ))}

                                                                    {paramSize && (
                                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-md text-blue-300 bg-blue-500/20 font-medium">
                                                                            {paramSize} Params
                                                                        </span>
                                                                    )}
                                                                    {quant && (
                                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-md text-stone-400 bg-stone-600/30 font-medium">
                                                                            {quant}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                <p className="text-xs text-stone-500 mt-2">
                                    Connecting to Ollama cloud registry to fetch available models.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                                    Objective
                                </label>
                                <input
                                    type="text"
                                    value={objective}
                                    onChange={(e) => setObjective(e.target.value)}
                                    placeholder="e.g. Audit our burn rate and suggest cost-saving measures."
                                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                                    System Directives
                                </label>
                                <textarea
                                    value={systemMessage}
                                    onChange={(e) => setSystemMessage(e.target.value)}
                                    placeholder="You are a strict financial analyst. Always ask for exact numbers before providing advice..."
                                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 text-sm h-32 resize-none"
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-stone-100 flex justify-end gap-3 bg-stone-50 rounded-b-2xl">
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-5 py-2.5 text-stone-600 font-medium hover:bg-stone-200/50 rounded-full transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!name || !systemMessage}
                                className="px-5 py-2.5 bg-stone-900 text-white font-medium rounded-full hover:bg-stone-800 transition-colors disabled:opacity-50 text-sm shadow-sm"
                            >
                                Deploy Agent
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
