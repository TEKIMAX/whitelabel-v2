import React, { useState } from 'react';
import { useAIChat } from "../hooks/useAI";
import { AISettings, ViewState, PageAccess } from "../types";
import { Sparkles, Terminal, Activity, AlertCircle, CheckCircle, RefreshCw, ChevronRight, LayoutDashboard, Settings as SettingsIcon } from 'lucide-react';

interface AIDiagnosticProps {
    onNavigate: (view: ViewState) => void;
    allProjects: any[];
    currentProjectId: string | null;
    onSwitchProject: (id: string) => void;
    onNewProject: () => void;
    currentView: ViewState;
    settings: AISettings;
    allowedPages: PageAccess[];
}

const AIDiagnostic: React.FC<AIDiagnosticProps> = ({
    onNavigate,
    allProjects,
    currentProjectId,
    onSwitchProject,
    onNewProject,
    currentView,
    settings,
    allowedPages
}) => {
    const [prompt, setPrompt] = useState('Hello, are you connected to api.tekimax.com?');
    const [modelName, setModelName] = useState('gemini-3-flash-preview');
    const [provider, setProvider] = useState<'google' | 'openai' | 'ollama' | 'anthropic'>('ollama');
    const [ollamaApiKey, setOllamaApiKey] = useState(settings.ollamaApiKey || '');
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const testAI = useAIChat();

    const handleTest = async () => {
        setIsLoading(true);
        setResponse(null);
        setError(null);
        try {
            const result = await testAI({
                prompt,
                modelName,
                provider,
                ollamaApiKey,
            });
            setResponse(result);
        } catch (err: any) {
            setError(err.message || 'An error occurred during the AI call');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-stone-50 overflow-y-auto w-full">
            <main className="max-w-7xl mx-auto p-8 lg:p-12">
                <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-serif text-stone-900 flex items-center gap-3">
                            <Activity className="w-8 h-8 text-nobel-gold" />
                            AI Diagnostics
                        </h1>
                        <p className="text-stone-500 mt-2">Test AI endpoint connectivity and response formats for api.tekimax.com</p>
                    </div>
                    <button
                        onClick={() => onNavigate('CANVAS')}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg font-bold uppercase tracking-wider text-xs hover:bg-nobel-gold transition-colors"
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Back to Canvas
                    </button>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Configuration Card */}
                    <section className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
                        <h2 className="text-lg font-bold text-stone-900 mb-6 flex items-center gap-2">
                            <SettingsIcon className="w-5 h-5 text-stone-400" />
                            Test Configuration
                        </h2>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Provider</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['ollama', 'google', 'openai', 'anthropic'].map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setProvider(p as any)}
                                            className={`px-4 py-3 rounded-xl border font-bold text-sm transition-all ${provider === p
                                                ? 'bg-nobel-gold/10 border-nobel-gold text-nobel-gold'
                                                : 'bg-stone-50 border-stone-100 text-stone-400 hover:border-stone-200'
                                                }`}
                                        >
                                            {p.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Model Name</label>
                                <input
                                    type="text"
                                    value={modelName}
                                    onChange={(e) => setModelName(e.target.value)}
                                    className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl focus:outline-none focus:border-nobel-gold font-mono text-sm"
                                    placeholder="e.g. gemini-3-flash-preview"
                                />
                            </div>

                            {provider === 'ollama' && (
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Cloud API Key</label>
                                    <input
                                        type="password"
                                        value={ollamaApiKey}
                                        onChange={(e) => setOllamaApiKey(e.target.value)}
                                        className="w-full px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl focus:outline-none focus:border-nobel-gold font-mono text-sm"
                                        placeholder="Enter api.tekimax.com key"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Test Prompt</label>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    className="w-full h-32 px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl focus:outline-none focus:border-nobel-gold font-sans text-sm resize-none"
                                    placeholder="Ask something to test the connection..."
                                />
                            </div>

                            <button
                                onClick={handleTest}
                                disabled={isLoading}
                                className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-nobel-gold transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-stone-200"
                            >
                                {isLoading ? (
                                    <>
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                        Testing Connectivity...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        Run Diagnostic Test
                                    </>
                                )}
                            </button>
                        </div>
                    </section>

                    {/* Response Card */}
                    <section className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 flex flex-col min-h-[500px]">
                        <h2 className="text-lg font-bold text-stone-900 mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Terminal className="w-5 h-5 text-stone-400" />
                                Raw Response Data
                            </div>
                            {response && <CheckCircle className="w-5 h-5 text-green-500" />}
                            {error && <AlertCircle className="w-5 h-5 text-red-500" />}
                        </h2>

                        <div className="flex-1 bg-stone-900 rounded-xl p-6 overflow-auto font-mono text-xs text-stone-300 relative">
                            {!isLoading && !response && !error && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-600 space-y-3 pointer-events-none">
                                    <Terminal className="w-12 h-12 opacity-20" />
                                    <p>Run a test to see response output here.</p>
                                </div>
                            )}

                            {isLoading && (
                                <div className="animate-pulse space-y-3">
                                    <div className="h-4 bg-stone-800 rounded w-1/4"></div>
                                    <div className="h-4 bg-stone-800 rounded w-3/4"></div>
                                    <div className="h-4 bg-stone-800 rounded w-1/2"></div>
                                    <div className="h-4 bg-stone-800 rounded w-2/3"></div>
                                </div>
                            )}

                            {error && (
                                <div className="text-red-400 bg-red-400/10 p-4 rounded-lg border border-red-400/20">
                                    <span className="font-bold uppercase text-[10px] block mb-1">Diagnostic Error</span>
                                    {error}
                                </div>
                            )}

                            {response && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px] font-bold">SUCCESS 200</span>
                                        <span className="text-stone-500 text-[10px]">Endpoint: api.tekimax.com/api/cloud/chat</span>
                                    </div>

                                    <div className="space-y-2">
                                        <span className="text-nobel-gold font-bold">AI Content:</span>
                                        <p className="text-white leading-relaxed text-sm p-4 bg-stone-800/50 rounded-lg border border-stone-800">
                                            {typeof response === 'string' ? response : JSON.stringify(response, null, 2)}
                                        </p>
                                    </div>

                                    <div className="space-y-2 mt-6 pt-6 border-t border-stone-800">
                                        <span className="text-stone-500 font-bold uppercase tracking-widest text-[10px]">Full JSON Response Properties:</span>
                                        <pre className="text-stone-400 overflow-x-auto">
                                            {JSON.stringify({
                                                model: modelName,
                                                provider,
                                                timestamp: new Date().toISOString(),
                                                responseTimeMs: "calculated at runtime",
                                                resultPreview: typeof response === 'string' ? response.substring(0, 100) + '...' : response
                                            }, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default AIDiagnostic;
