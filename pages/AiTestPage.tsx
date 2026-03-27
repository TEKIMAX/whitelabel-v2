import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings, Shield, User, Bot, AlertCircle } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

const SearchableSelect: React.FC<{
    options: string[];
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
}> = ({ options, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="relative" ref={wrapperRef}>
            <div
                className="w-full p-2 border border-stone-200 rounded text-sm focus-within:ring-2 focus-within:ring-stone-900 bg-white flex justify-between items-center cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={!value ? "text-stone-400" : ""}>{value || placeholder}</span>
                <span className="text-stone-400 text-xs">▼</span>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded shadow-lg max-h-60 overflow-y-auto">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search..."
                        className="w-full p-2 border-b border-stone-100 text-sm focus:outline-none sticky top-0 bg-white"
                        autoFocus
                    />
                    {filtered.map(opt => (
                        <div
                            key={opt}
                            className={`p-2 text-sm cursor-pointer hover:bg-stone-50 ${opt === value ? "font-bold bg-stone-50" : ""}`}
                            onClick={() => {
                                onChange(opt);
                                setIsOpen(false);
                                setSearch('');
                            }}
                        >
                            {opt}
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="p-2 text-xs text-stone-400 italic">No matches found</div>
                    )}
                </div>
            )}
        </div>
    );
};

export const AiTestPage: React.FC = () => {
    // Configuration State
    const [baseUrl, setBaseUrl] = useState('http://localhost:8080/v1');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('custom-model');
    const [showConfig, setShowConfig] = useState(true);

    // Chat State
    const [messages, setMessages] = useState<Message[]>([
        { role: 'system', content: 'You are a helpful AI assistant.' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            // Prepare request payload
            const payload = {
                model: model,
                input: messages.concat(userMessage).map(m => ({
                    type: 'message',
                    role: m.role,
                    content: m.content
                })),
                stream: true
            };

            // Prepare headers
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            // Logic: If user provides a custom URL that is NOT the default localhost:8080, 
            // we assume they want to use the "Universal Adapter" mode of localhost:8080 
            // OR they are talking directly to a provider.
            // 
            // Actually, per user request, they want to "talk to the docker endpoint".
            // So we always target the Rust API (localhost:8080), but we pass the "Target URL" as headers
            // IF the user considers the Rust API as a gateway.
            //
            // User said: "talk to the docker endpoint on the client side". 
            // The Rust API *IS* the Docker endpoint.
            // But they also said: "add configuration ... so I can talk to the docker endpoint".
            //
            // Let's assume the "Configuration" inputs on this page are for defining 
            // the x-custom headers to send TO the Rust API.

            headers['x-custom-base-url'] = baseUrl;
            if (apiKey) {
                headers['x-custom-api-key'] = apiKey;
            }

            // We always send to the Rust API's /responses endpoint
            // The Base URL input on the UI effectively configures 'x-custom-base-url'
            // UNLESS the user literally wants to change where the React app sends the request.
            //
            // User said: "I can give the ability to users to enter they ownd providers endpoitn ... and it will be router to our open response?"
            // So the React app should talk to OpenResponses (Rust API), and PASS the user's endpoint in headers.

            const RUST_API_URL = 'http://localhost:8080/v1/responses';

            const response = await fetch(RUST_API_URL, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantMessageContent = '';

            // Add placeholder assistant message
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            // Handle OpenResponse Event Format (Flat structure from Rust API)
                            if (parsed.type === 'response.output_text.delta') {
                                const delta = parsed.delta;
                                assistantMessageContent += delta;
                                setMessages(prev => {
                                    const newArgs = [...prev];
                                    newArgs[newArgs.length - 1].content = assistantMessageContent;
                                    return newArgs;
                                });
                            }
                            else if (parsed.type === 'error' || parsed.error) {
                                setError(parsed.error?.message || "Unknown error occurred");
                                // Remove the empty assistant message if we have an error and no content yet
                                if (!assistantMessageContent) {
                                    setMessages(prev => prev.slice(0, -1));
                                }
                            }
                        } catch (e) {
                        }
                    }
                }
            }

        } catch (err: any) {
            setError(err.message || 'Failed to fetch response.');
        } finally {
            setIsLoading(false);
        }
    };

    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [isFetchingModels, setIsFetchingModels] = useState(false);

    const fetchModels = async () => {
        setIsFetchingModels(true);
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            headers['x-custom-base-url'] = baseUrl;
            if (apiKey) headers['x-custom-api-key'] = apiKey;

            const response = await fetch('http://localhost:8080/v1/models', { headers });
            if (!response.ok) throw new Error("Failed to fetch models");
            const data = await response.json();
            if (data.data && Array.isArray(data.data)) {
                setAvailableModels(data.data.map((m: any) => m.id));
                // Auto-select first if current model is default
                if (data.data.length > 0 && model === 'custom-model') {
                    setModel(data.data[0].id);
                }
            }
        } catch (e) {
            setError("Failed to load models from endpoint.");
        } finally {
            setIsFetchingModels(false);
        }
    };

    // --- MODELS.DEV INTEGRATION ---
    const [providers, setProviders] = useState<any[]>([]);
    const [selectedProvider, setSelectedProvider] = useState<string>('');

    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const res = await fetch('https://models.dev/api.json');
                if (res.ok) {
                    const data = await res.json();
                    // Transform object to array
                    const providerList = Object.entries(data).map(([id, val]: [string, any]) => ({
                        id: id,
                        name: val.name || id,
                        api: val.api,
                        models: val.models ? Object.keys(val.models) : []
                    }));
                    // Sort by name
                    providerList.sort((a, b) => a.name.localeCompare(b.name));
                    setProviders(providerList);
                }
            } catch (e) {
            }
        };
        fetchProviders();
    }, []);

    const handleProviderSelect = (providerId: string) => {
        setSelectedProvider(providerId);
        const provider = providers.find(p => p.id === providerId);
        if (provider) {
            if (provider.api) {
                setBaseUrl(provider.api);
            }
            if (provider.models.length > 0) {
                setAvailableModels(provider.models);
                setModel(provider.models[0]);
            }
        }
    };

    return (
        <div className="flex h-screen bg-[#F9F8F4] font-sans text-stone-900">
            {/* Sidebar / Configuration */}
            <div className={`bg-white border-r border-stone-200 w-80 flex-shrink-0 flex flex-col transition-all duration-300 ${showConfig ? 'translate-x-0' : '-translate-x-full absolute h-full z-10'}`}>
                <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                    <h2 className="font-serif text-xl font-medium">Configuration</h2>
                    <button onClick={() => setShowConfig(false)} className="md:hidden">Close</button>
                </div>

                <div className="p-6 space-y-6 flex-1 overflow-y-auto">

                    {/* Provider Preset */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Provider Preset (models.dev)</label>
                        {providers.length > 0 ? (
                            <SearchableSelect
                                options={providers.map(p => p.id)}
                                value={selectedProvider}
                                onChange={handleProviderSelect}
                                placeholder="Select a provider..."
                            />
                        ) : (
                            <p className="text-xs text-stone-400 italic">Loading providers...</p>
                        )}
                        <p className="text-[10px] text-stone-400 mt-1">
                            Select to auto-fill URL and models from <a href="https://models.dev" target="_blank" className="underline hover:text-stone-600">models.dev</a>.
                        </p>
                    </div>

                    <div className="border-t border-stone-100 pt-4">
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Target Endpoint URL</label>
                        <input
                            type="text"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            placeholder="e.g. http://localhost:11434/v1"
                            className="w-full p-2 border border-stone-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                        />
                        <p className="text-[10px] text-stone-400 mt-1">
                            Your local/custom provider address. This will be passed via <code>x-custom-base-url</code>.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">API Key (Optional)</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-..."
                            className="w-full p-2 border border-stone-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">Model Name</label>
                            <button
                                onClick={fetchModels}
                                disabled={isFetchingModels}
                                className="text-[10px] text-stone-900 underline hover:text-stone-600 disabled:opacity-50"
                            >
                                {isFetchingModels ? 'Loading...' : 'Load Models'}
                            </button>
                        </div>

                        {availableModels.length > 0 ? (
                            <div className="relative">
                                <SearchableSelect
                                    options={availableModels}
                                    value={model}
                                    onChange={setModel}
                                    placeholder="Select or type model..."
                                />
                            </div>
                        ) : (
                            <input
                                type="text"
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                placeholder="e.g. gemma:2b"
                                className="w-full p-2 border border-stone-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                            />
                        )}
                        {availableModels.length > 0 && (
                            <p className="text-[10px] text-stone-400 mt-1 cursor-pointer hover:text-stone-600" onClick={() => { setAvailableModels([]); setModel('custom-model'); }}>
                                Wrong list? Click to reset.
                            </p>
                        )}
                    </div>

                    <div className="pt-6 border-t border-stone-100">
                        <div className="bg-amber-50 rounded p-3 border border-amber-100">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    Requests are sent to <strong>localhost:8080</strong> (The Rust API), which serves as a secure gateway proxying to your configured endpoint.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col relative">
                {!showConfig && (
                    <button
                        onClick={() => setShowConfig(true)}
                        className="absolute top-4 left-4 p-2 bg-white shadow rounded-full z-20 hover:bg-stone-50"
                    >
                        <Settings className="w-5 h-5 text-stone-600" />
                    </button>
                )}

                {/* Header */}
                <div className="p-4 border-b border-stone-200 bg-white/50 backdrop-blur flex justify-center">
                    <h1 className="font-serif font-medium text-lg flex items-center gap-2">
                        <Shield className="w-5 h-5 text-stone-900" />
                        Adaptive AI Test Client
                    </h1>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                    {messages.filter(m => m.role !== 'system').map((m, i) => (
                        <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {m.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-stone-900 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                            )}

                            <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${m.role === 'user'
                                ? 'bg-stone-200 text-stone-900 rounded-tr-none'
                                : 'bg-white border border-stone-100 shadow-sm rounded-tl-none'
                                }`}>
                                {m.content}
                            </div>

                            {m.role === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0">
                                    <User className="w-4 h-4 text-stone-600" />
                                </div>
                            )}
                        </div>
                    ))}

                    {isLoading && !messages[messages.length - 1].content && (
                        <div className="flex gap-4 justify-start">
                            <div className="w-8 h-8 rounded-full bg-stone-900 flex items-center justify-center flex-shrink-0">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div className="bg-white border border-stone-100 shadow-sm rounded-2xl rounded-tl-none px-5 py-3">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" />
                                    <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce delay-75" />
                                    <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce delay-150" />
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex justify-center">
                            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-stone-200">
                    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative cursor-text">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type to chat..."
                            className="w-full pl-6 pr-12 py-4 bg-stone-50 border border-stone-200 rounded-full focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="absolute right-2 top-2 p-2 bg-stone-900 text-white rounded-full hover:bg-stone-800 disabled:opacity-50 disabled:hover:bg-stone-900 transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                    <p className="text-center text-[10px] text-stone-400 mt-2">
                        AI can make mistakes. Please verify important information.
                    </p>
                </div>
            </div>
        </div>
    );
};
