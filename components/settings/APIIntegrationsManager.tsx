import React, { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Plug, Plus, Trash2, Key, Globe, FileText, CheckCircle2, ChevronDown, ChevronRight, Hash } from 'lucide-react';

interface Props {
    orgId: string;
}

export const APIIntegrationsManager: React.FC<Props> = ({ orgId }) => {
    const integrations = useQuery(api.apiIntegrations.listIntegrations, { orgId });
    const addIntegrationMutation = useMutation(api.apiIntegrations.addIntegration);
    const removeIntegrationMutation = useMutation(api.apiIntegrations.removeIntegration);

    const [isAdding, setIsAdding] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state
    const [name, setName] = useState("");
    const [endpoint, setEndpoint] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState("");

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!name || !endpoint || !apiKey || !description) {
            setError("All fields are required.");
            return;
        }
        
        try {
            setIsSubmitting(true);
            await addIntegrationMutation({
                orgId,
                name,
                endpoint,
                apiKey,
                description
            });
            setIsAdding(false);
            setName("");
            setEndpoint("");
            setApiKey("");
            setDescription("");
        } catch (err: any) {
            setError(err.message || "Failed to add integration");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemove = async (id: Id<"custom_api_integrations">) => {
        if (confirm("Are you sure you want to remove this API integration? The AI will no longer be able to use it as a tool.")) {
            await removeIntegrationMutation({ integrationId: id });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-black font-serif text-stone-900 tracking-tight">Custom AI Integrations</h2>
                    <p className="text-stone-500 text-sm mt-1 max-w-xl leading-relaxed">
                        Configure private APIs for your AI Agents. These integrations will automatically appear as dynamic tools the AI can use during conversations to fetch real-time data or trigger internal workflows.
                    </p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-black text-white text-sm font-bold uppercase tracking-widest rounded-xl transition-all shadow-sm border border-stone-800"
                    >
                        <Plus className="w-4 h-4" /> Add Integration
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="bg-white border-2 border-stone-900 p-6 shadow-[4px_4px_0px_#1C1917] animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-stone-100 flex items-center justify-center border border-stone-200">
                                <Plug className="w-4 h-4 text-stone-600" />
                            </div>
                            <h3 className="font-bold text-stone-900 uppercase tracking-widest text-sm">New API Connection</h3>
                        </div>
                        <button 
                            onClick={() => setIsAdding(false)}
                            className="text-stone-400 hover:text-stone-900 text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>

                    <form onSubmit={handleAdd} className="space-y-5">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-sm font-medium rounded">
                                {error}
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Integration Name</label>
                                <div className="relative">
                                    <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="e.g. Acme Financials API"
                                        className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border-2 border-stone-200 focus:bg-white focus:border-stone-900 outline-none transition-all font-mono text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">API Endpoint URL</label>
                                <div className="relative">
                                    <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                    <input
                                        type="url"
                                        value={endpoint}
                                        onChange={e => setEndpoint(e.target.value)}
                                        placeholder="https://api.acme.com/v1/metrics"
                                        className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border-2 border-stone-200 focus:bg-white focus:border-stone-900 outline-none transition-all font-mono text-sm"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">API Token / Bearer Key</label>
                            <div className="relative">
                                <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={e => setApiKey(e.target.value)}
                                    placeholder="sk_live_..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border-2 border-stone-200 focus:bg-white focus:border-stone-900 outline-none transition-all font-mono text-sm"
                                    required
                                />
                            </div>
                            <p className="text-[10px] text-stone-400 mt-2 uppercase tracking-wide">Injected securely as 'Authorization: Bearer [KEY]' during execution.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Instructions for AI (Tool Description)</label>
                            <div className="relative">
                                <FileText className="w-4 h-4 absolute left-3 top-4 text-stone-400" />
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Explain EXACTLY when and how the AI should use this tool. Example: 'Use this tool to fetch the latest MRR and Churn rate. Pass a query string if filtering by date.'"
                                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border-2 border-stone-200 focus:bg-white focus:border-stone-900 outline-none transition-all text-sm h-28 resize-none font-medium text-stone-700"
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-2.5 bg-nobel-gold hover:bg-nobel-gold-dark text-stone-900 text-sm font-bold uppercase tracking-widest rounded-xl transition-all shadow-sm border border-stone-900 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Saving...' : 'Save Integration'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {!isAdding && integrations === undefined && (
                <div className="h-40 flex items-center justify-center font-mono text-sm text-stone-400 animate-pulse">
                    Loading integrations...
                </div>
            )}

            {!isAdding && integrations && integrations.length === 0 && (
                <div className="border border-stone-200 border-dashed rounded-2xl p-12 text-center bg-stone-50/50">
                    <Plug className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-stone-900 mb-2">No custom integrations</h3>
                    <p className="text-stone-500 text-sm max-w-sm mx-auto mb-6">
                        Connect external APIs to give your AI Agent the ability to read and write data across your organization's tools.
                    </p>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="px-6 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold uppercase tracking-widest rounded border border-stone-300 transition-colors inline-block"
                    >
                        Add your first API
                    </button>
                </div>
            )}

            {!isAdding && integrations && integrations.length > 0 && (
                <div className="space-y-4">
                    {integrations.map((api) => (
                        <div key={api._id} className="bg-white border border-stone-200 hover:border-stone-300 hover:shadow-sm transition-all p-5 rounded-xl group relative">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 mt-1">
                                        <Plug className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-stone-900">{api.name}</h4>
                                            <span className="px-2 py-0.5 bg-stone-100 text-stone-500 text-[10px] font-mono rounded uppercase">{api.method || 'POST'}</span>
                                            {(api as any).isGlobal && (
                                                <span className="px-2 py-0.5 bg-stone-100/50 text-stone-400 border border-stone-200 text-[10px] font-mono rounded uppercase flex items-center gap-1">
                                                    <Globe className="w-3 h-3" /> Global
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-stone-500 text-sm mb-3">
                                            {api.description}
                                        </p>
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-50 border border-stone-200 rounded font-mono text-[10px] text-stone-600 break-all">
                                            <Globe className="w-3 h-3 text-stone-400 shrink-0" />
                                            {api.endpoint}
                                        </div>
                                    </div>
                                </div>
                                {!(api as any).isGlobal && (
                                    <button
                                        onClick={() => handleRemove(api._id)}
                                        className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                        title="Remove Integration"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            
                            <div className="absolute top-5 right-14 flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-widest rounded border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Active
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
