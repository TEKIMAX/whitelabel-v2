
import React, { useState } from 'react';
import { ArrowLeft, Smartphone, Monitor, Save, Check, Type, Palette, Layout, Link as LinkIcon, Image, Users, Eye, Plus, Trash2, Edit2, AlertTriangle, Sparkles, MessageSquare, Send, Bot } from 'lucide-react';
import { LandingPageConfig, ContentSection } from '../../types';
import { Preview } from './Preview';
import { ImagePicker } from './ImagePicker';
import { useAIChat } from '../../hooks/useAI';
import { searchPixabayImages } from '../../services/pixabayService';

interface EditorProps {
    config: LandingPageConfig;
    onUpdate: (config: LandingPageConfig) => void;
    onBack: () => void;
    pageName: string;
}

type Tab = 'design' | 'content' | 'leads';
type Section = 'hero' | 'features' | 'about' | 'form';

export const Editor: React.FC<EditorProps> = ({ config, onUpdate, onBack, pageName }) => {
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [activeTab, setActiveTab] = useState<Tab>('design');
    const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
    const [imagePickerTarget, setImagePickerTarget] = useState<'hero' | 'logo' | null>(null);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
    const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);

    // AI Chat State
    const chatAction = useAIChat();
    const [isAiMode, setIsAiMode] = useState(true);
    const [chatInput, setChatInput] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
        { role: 'assistant', content: "Hi! I'm your AI designer. Tell me what kind of landing page you want to build or how you'd like to change the current one." }
    ]);

    const updateConfig = (updates: Partial<LandingPageConfig>) => {
        onUpdate({ ...config, ...updates });
    };

    const updateTheme = (updates: Partial<LandingPageConfig['theme']>) => {
        updateConfig({ theme: { ...config.theme, ...updates } });
    };

    const updateHero = (updates: Partial<LandingPageConfig['hero']>) => {
        updateConfig({ hero: { ...config.hero, ...updates } });
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;

        const userMsg = chatInput;
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setChatInput('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
        setIsAiLoading(true);

        try {
            const systemInstruction = `
                You are an expert AI Web Designer named "Adaptive Startup AI".
                You have full control over a Landing Page Configuration JSON.
                
                YOUR GOAL:
                Listen to the user's request and update the configuration.
                
                RESPONSE FORMAT:
                Return a JSON object:
                {
                    "message": "Polite explanation...",
                    "updates": { ... }
                }
                
                CAPABILITIES (Too Calling):
                1. IMAGES: To search for an image, set any image URL field (mediaUrl, image, etc.) to "SEARCH:your query".
                   Example: "hero": { "mediaUrl": "SEARCH:modern startup office" }
                   Client will replace this with a real URL from Pixabay.
                
                2. SECTIONS & MENU:
                   - If you add a new Content Section, you MUST also add a corresponding item to 'header.navItems' so it appears in the menu.
                   - Ensure the 'target' in navItems matches the section 'id'.
                   - Use a unique ID for new sections (e.g., "section_features_1").
                
                3. FEATURES:
                   - You can add/edit items in the 'features' array.
                
                4. THEME:
                   - You can change 'theme' colors and fonts.
                
                Current Config Context:
                - Existing Content Sections: ${config.contentSections?.map(s => s.id).join(', ') || 'None'}
                - Existing Nav Items: ${config.header?.navItems?.map(n => n.id).join(', ') || 'None'}
            `;

            const prompt = `
                CURRENT CONFIGURATION:
                ${JSON.stringify(config)}

                USER REQUEST:
                ${userMsg}
            `;

            const responseText = await chatAction({
                prompt,
                systemInstruction,
                modelName: "gemini-2.5-flash"
            });

            // Clean and Parse Response
            let cleanText = responseText.trim();
            // Remove markdown code blocks if present
            if (cleanText.includes('```json')) {
                cleanText = cleanText.split('```json')[1].split('```')[0].trim();
            } else if (cleanText.includes('```')) {
                cleanText = cleanText.split('```')[1].split('```')[0].trim();
            }



            const responseData = JSON.parse(cleanText);

            if (responseData.message) {
                setMessages(prev => [...prev, { role: 'assistant', content: responseData.message }]);
            }

            if (responseData.updates && Object.keys(responseData.updates).length > 0) {
                // Process Updates for Tool Calls (SEARCH:)
                const processUpdates = async (obj: any): Promise<any> => {
                    if (typeof obj === 'string') {
                        if (obj.startsWith('SEARCH:')) {
                            const query = obj.replace('SEARCH:', '').trim();
                            try {
                                const images = await searchPixabayImages(query);
                                return images.length > 0 ? images[0] : '';
                            } catch (err) {
                                return '';
                            }
                        }
                        return obj;
                    }
                    if (Array.isArray(obj)) {
                        return Promise.all(obj.map(processUpdates));
                    }
                    if (typeof obj === 'object' && obj !== null) {
                        const newObj: any = {};
                        for (const key in obj) {
                            newObj[key] = await processUpdates(obj[key]);
                        }
                        return newObj;
                    }
                    return obj;
                };

                const processedUpdates = await processUpdates(responseData.updates);

                // Deep Merge Logic to prevent overwriting nested objects (like 'hero' or 'theme')
                const deepMerge = (current: any, update: any): any => {
                    const merged = { ...current };
                    for (const key in update) {
                        // Recurse if both are objects and not arrays
                        if (typeof update[key] === 'object' && update[key] !== null && !Array.isArray(update[key]) && current[key]) {
                            merged[key] = deepMerge(current[key], update[key]);
                        } else {
                            // Overwrite or add value
                            merged[key] = update[key];
                        }
                    }
                    return merged;
                };

                const newConfig = deepMerge(config, processedUpdates);
                onUpdate(newConfig);
            }

        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I ran into an issue. Please try again." }]);
        } finally {
            setIsAiLoading(false);
        }
    };

    // ... (Existing helper functions) ...

    // Color Palettes
    const primaryColors = [
        '#C5A059', // Gold
        '#1a1a1a', // Black
        '#E11D48', // Red
        '#2563EB', // Blue
        '#16A34A', // Green
        '#9333EA', // Purple
        '#EA580C', // Orange
        '#0891B2', // Cyan
        '#4F46E5', // Indigo
        '#BE123C', // Rose
    ];

    const backgroundColors = [
        '#FFFFFF', // White
        '#F9F8F4', // Cream
        '#F3F4F6', // Light Gray
        '#E5E7EB', // Gray
        '#000000', // Black
        '#18181B', // Zinc
        '#FFFBEB', // Amber Tint
        '#F0FDF4', // Green Tint
        '#EFF6FF', // Blue Tint
        '#FAF5FF', // Purple Tint
    ];

    const textColors = [
        '#1a1a1a', // Black
        '#374151', // Gray 700
        '#4B5563', // Gray 600
        '#6B7280', // Gray 500
        '#FFFFFF', // White
        '#F9FAFB', // Gray 50
        '#C5A059', // Gold
        '#1E3A8A', // Dark Blue
        '#064E3B', // Dark Green
        '#881337', // Dark Red
    ];

    const fontOptions = [
        { id: 'serif', label: 'Playfair Display (Serif)', value: 'serif' },
        { id: 'sans', label: 'Inter (Sans)', value: 'sans' },
    ];

    // Leads Data (Mock for UI)
    const [leads] = useState([
        { id: 1, name: 'John Doe', email: 'john@example.com', date: '2023-12-01' },
        { id: 2, name: 'Sarah Smith', email: 'sarah@example.com', date: '2023-12-05' },
        { id: 3, name: 'Michael Brown', email: 'mike@tech.co', date: '2023-12-10' },
    ]);

    const handleAddSection = () => {
        const newSection: ContentSection = {
            id: `section-${Date.now()}`,
            title: 'New Section',
            content: 'Add your content here...'
        };
        updateConfig({ contentSections: [...config.contentSections, newSection] });
        setEditingSectionId(newSection.id);
    };

    const handleUpdateSection = (id: string, updates: Partial<ContentSection>) => {
        const updatedSections = config.contentSections.map(s =>
            s.id === id ? { ...s, ...updates } : s
        );
        updateConfig({ contentSections: updatedSections });
    };

    const initiateDeleteSection = (id: string) => {
        setSectionToDelete(id);
    };

    const confirmDeleteSection = () => {
        if (sectionToDelete) {
            const updatedSections = config.contentSections.filter(s => s.id !== sectionToDelete);
            updateConfig({ contentSections: updatedSections });
            setSectionToDelete(null);
            if (editingSectionId === sectionToDelete) {
                setEditingSectionId(null);
            }
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-100 font-sans">
            {/* Top Bar */}
            <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-20 shrink-0 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-black"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="h-6 w-px bg-gray-200 mx-2"></div>
                    <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                        <span className="text-nobel-gold font-serif text-lg">Editor</span>
                        <span className="text-gray-400 text-sm font-normal">/ {pageName}</span>
                    </h2>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Modes */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200 mr-2">
                        <button
                            onClick={() => setViewMode('desktop')}
                            className={`p-1.5 rounded-md transition-all flex items-center gap-2 text-xs font-medium ${viewMode === 'desktop' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Monitor className="w-4 h-4" />
                            <span className="hidden sm:inline">Desktop</span>
                        </button>
                        <button
                            onClick={() => setViewMode('mobile')}
                            className={`p-1.5 rounded-md transition-all flex items-center gap-2 text-xs font-medium ${viewMode === 'mobile' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Smartphone className="w-4 h-4" />
                            <span className="hidden sm:inline">Mobile</span>
                        </button>
                    </div>

                    {/* AI Mode Toggle */}
                    <button
                        onClick={() => setIsAiMode(!isAiMode)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm font-medium ${isAiMode ? 'bg-purple-100 border-purple-200 text-purple-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Bot className="w-4 h-4" />
                        <span className="hidden sm:inline">{isAiMode ? 'AI Assistant' : 'Manual Mode'}</span>
                    </button>

                    <button
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                        className={`p-2 rounded-md border transition-colors ${isPreviewMode ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                        title="Toggle Preview Mode"
                    >
                        <Eye className="w-4 h-4" />
                    </button>

                    <button className="flex items-center gap-2 px-5 py-2.5 bg-nobel-gold text-white rounded-md hover:bg-black transition-colors font-medium text-sm shadow-md hover:shadow-lg">
                        <Save className="w-4 h-4" />
                        <span>Publish</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Sidebar Controls */}
                <div className={`w-96 bg-white border-r border-gray-200 overflow-y-auto flex flex-col z-10 shadow-lg transition-all duration-300 absolute md:static h-full ${isPreviewMode ? '-translate-x-full md:hidden' : 'translate-x-0'}`}>

                    {isAiMode ? (
                        /* AI Chat Interface */
                        <div className="flex flex-col h-full">
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-purple-50/50">
                                <div className="flex items-center gap-2 text-purple-800 font-medium">
                                    <Sparkles className="w-4 h-4" />
                                    <span>AI Designer</span>
                                </div>
                                <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">Beta</span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                            ? 'bg-black text-white rounded-br-none'
                                            : 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200'
                                            }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {isAiLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-gray-100 rounded-2xl px-4 py-3 rounded-bl-none border border-gray-200 flex items-center gap-2">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-gray-200 bg-white">
                                <div className="relative">
                                    <textarea
                                        ref={textareaRef}
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onInput={(e) => {
                                            const target = e.target as HTMLTextAreaElement;
                                            target.style.height = 'auto';
                                            target.style.height = target.scrollHeight + 'px';
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        placeholder="Describe changes (e.g., 'Make the hero dark blue with a serif font')"
                                        className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-purple-300 focus:ring-1 focus:ring-purple-300 outline-none text-sm resize-none min-h-[50px] max-h-32"
                                        rows={1}
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!chatInput.trim() || isAiLoading}
                                        className="absolute right-2 bottom-2 p-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="mt-2 flex gap-1 justify-center">
                                    <span className="text-[10px] text-gray-400">Powered by Gemini AI</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Tabs */}
                            <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10">
                                <button
                                    onClick={() => setActiveTab('design')}
                                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'design' ? 'border-nobel-gold text-nobel-gold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                >
                                    Design
                                </button>
                                <button
                                    onClick={() => setActiveTab('content')}
                                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'content' ? 'border-nobel-gold text-nobel-gold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                >
                                    Content
                                </button>
                                <button
                                    onClick={() => setActiveTab('leads')}
                                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'leads' ? 'border-nobel-gold text-nobel-gold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                >
                                    Leads
                                </button>
                            </div>

                            <div className="p-6 space-y-8 pb-32">
                                {activeTab === 'design' && (
                                    <>
                                        {/* Typography */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                                                <Type className="w-4 h-4 text-nobel-gold" />
                                                <h3>Typography</h3>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500 mb-2 block">Font Family</label>
                                                <div className="relative">
                                                    <select
                                                        value={config.theme.fontStyle}
                                                        onChange={(e) => updateTheme({ fontStyle: e.target.value })}
                                                        className="w-full appearance-none px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold cursor-pointer"
                                                    >
                                                        <option value="serif">Playfair Display (Serif)</option>
                                                        <option value="sans">Inter (Sans)</option>
                                                        <option value="roboto">Roboto (Sans)</option>
                                                        <option value="open-sans">Open Sans (Sans)</option>
                                                        <option value="lora">Lora (Serif)</option>
                                                        <option value="merriweather">Merriweather (Serif)</option>
                                                        <option value="montserrat">Montserrat (Sans)</option>
                                                        <option value="lato">Lato (Sans)</option>
                                                        <option value="poppins">Poppins (Sans)</option>
                                                        <option value="oswald">Oswald (Condensed)</option>
                                                        <option value="raleway">Raleway (Sans)</option>
                                                    </select>
                                                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                                                        <Monitor className="w-4 h-4" />
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
                                                    Choose from our curated collection of Google Fonts to match your brand's personality.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="border-t border-gray-100 my-4"></div>

                                        {/* Layout Configuration */}
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                                                <Layout className="w-4 h-4 text-nobel-gold" />
                                                <h3>Layouts</h3>
                                            </div>

                                            {/* Hero Layout */}
                                            <div>
                                                <label className="text-xs font-medium text-gray-500 mb-2 block">Hero Section Style</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        onClick={() => updateHero({ layout: 'default' })}
                                                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${config.hero.layout === 'default' ? 'border-nobel-gold bg-nobel-gold/5 ring-1 ring-nobel-gold' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                                                    >
                                                        <div className="w-full h-12 bg-gray-100 rounded border border-gray-200 flex flex-col items-center justify-center gap-1 p-1">
                                                            <div className="h-1 w-8 bg-gray-300 rounded-full"></div>
                                                            <div className="h-1 w-12 bg-gray-300 rounded-full"></div>
                                                            <div className="flex gap-1 mt-1">
                                                                <div className="h-2 w-6 bg-gray-300 rounded"></div>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-medium text-gray-700">Standard</span>
                                                    </button>

                                                    <button
                                                        onClick={() => updateHero({ layout: 'full-width' })}
                                                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${config.hero.layout === 'full-width' ? 'border-nobel-gold bg-nobel-gold/5 ring-1 ring-nobel-gold' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                                                    >
                                                        <div className="w-full h-12 bg-gray-400 rounded border border-gray-400 flex flex-col items-center justify-center relative overflow-hidden">
                                                            <div className="absolute inset-0 bg-gray-600 opacity-20"></div>
                                                            <div className="h-1 w-8 bg-white/80 rounded-full relative z-10 mb-1"></div>
                                                            <div className="h-2 w-6 bg-white/90 rounded relative z-10"></div>
                                                        </div>
                                                        <span className="text-xs font-medium text-gray-700">Full Width</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Features Layout */}
                                            <div>
                                                <label className="text-xs font-medium text-gray-500 mb-2 block">Features Section Style</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <button
                                                        onClick={() => updateConfig({ featuresLayout: 'grid' })}
                                                        className={`flex flex-col items-center gap-2 p-2 rounded-lg border transition-all ${config.featuresLayout === 'grid' || !config.featuresLayout ? 'border-nobel-gold bg-nobel-gold/5 ring-1 ring-nobel-gold' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                                                    >
                                                        <div className="grid grid-cols-2 gap-1 w-full p-1">
                                                            <div className="h-4 bg-gray-200 rounded"></div>
                                                            <div className="h-4 bg-gray-200 rounded"></div>
                                                        </div>
                                                        <span className="text-[10px] font-medium text-gray-700">Grid</span>
                                                    </button>

                                                    <button
                                                        onClick={() => updateConfig({ featuresLayout: 'list' })}
                                                        className={`flex flex-col items-center gap-2 p-2 rounded-lg border transition-all ${config.featuresLayout === 'list' ? 'border-nobel-gold bg-nobel-gold/5 ring-1 ring-nobel-gold' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                                                    >
                                                        <div className="flex flex-col gap-1 w-full p-1">
                                                            <div className="h-2 bg-gray-200 rounded w-full"></div>
                                                            <div className="h-2 bg-gray-200 rounded w-full"></div>
                                                        </div>
                                                        <span className="text-[10px] font-medium text-gray-700">List</span>
                                                    </button>

                                                    <button
                                                        onClick={() => updateConfig({ featuresLayout: 'accordion' })}
                                                        className={`flex flex-col items-center gap-2 p-2 rounded-lg border transition-all ${config.featuresLayout === 'accordion' ? 'border-nobel-gold bg-nobel-gold/5 ring-1 ring-nobel-gold' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                                                    >
                                                        <div className="flex flex-col gap-1 w-full p-1">
                                                            <div className="h-2 bg-gray-200 rounded w-full border-b border-gray-300"></div>
                                                            <div className="h-2 bg-gray-200 rounded w-full border-b border-gray-300"></div>
                                                        </div>
                                                        <span className="text-[10px] font-medium text-gray-700">Accordion</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t border-gray-100 my-4"></div>

                                        {/* Colors */}
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                                                <Palette className="w-4 h-4 text-nobel-gold" />
                                                <h3>Brand Palette</h3>
                                            </div>

                                            {/* Primary Color */}
                                            <div>
                                                <label className="text-xs font-medium text-gray-500 mb-2 block">Primary Color</label>
                                                <div className="grid grid-cols-5 gap-2">
                                                    {primaryColors.map(color => (
                                                        <button
                                                            key={color}
                                                            onClick={() => updateTheme({ primaryColor: color })}
                                                            className={`w-8 h-8 rounded-full border border-gray-200 transition-transform ${config.theme.primaryColor === color ? 'ring-2 ring-offset-2 ring-black scale-110' : 'hover:scale-110'}`}
                                                            style={{ backgroundColor: color }}
                                                            title={color}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Background Color */}
                                            <div>
                                                <label className="text-xs font-medium text-gray-500 mb-2 block">Background Color</label>
                                                <div className="grid grid-cols-5 gap-2">
                                                    {backgroundColors.map(color => (
                                                        <button
                                                            key={color}
                                                            onClick={() => updateTheme({ backgroundColor: color })}
                                                            className={`w-8 h-8 rounded-full border border-gray-200 transition-transform ${config.theme.backgroundColor === color ? 'ring-2 ring-offset-2 ring-black scale-110' : 'hover:scale-110'}`}
                                                            style={{ backgroundColor: color }}
                                                            title={color}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Text Color */}
                                            <div>
                                                <label className="text-xs font-medium text-gray-500 mb-2 block">Text Color</label>
                                                <div className="grid grid-cols-5 gap-2">
                                                    {textColors.map(color => (
                                                        <button
                                                            key={color}
                                                            onClick={() => updateTheme({ textColor: color })}
                                                            className={`w-8 h-8 rounded-full border border-gray-200 transition-transform ${config.theme.textColor === color ? 'ring-2 ring-offset-2 ring-black scale-110' : 'hover:scale-110'}`}
                                                            style={{ backgroundColor: color }}
                                                            title={color}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {activeTab === 'content' && (
                                    <div className="space-y-8">
                                        {/* Hero Section Edit */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm pb-2 border-b border-gray-100">
                                                <Layout className="w-4 h-4 text-nobel-gold" />
                                                <h3>Hero Section</h3>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Headline</label>
                                                <textarea
                                                    value={config.hero.title}
                                                    onChange={(e) => updateHero({ title: e.target.value })}
                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold outline-none min-h-[80px]"
                                                    placeholder="Enter headline..."
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Subheadline</label>
                                                <textarea
                                                    value={config.hero.subtitle}
                                                    onChange={(e) => updateHero({ subtitle: e.target.value })}
                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold outline-none min-h-[80px]"
                                                    placeholder="Enter subheadline..."
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Main Image</label>
                                                <div
                                                    onClick={() => {
                                                        setImagePickerTarget('hero');
                                                        setIsImagePickerOpen(true);
                                                    }}
                                                    className="w-full h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-nobel-gold hover:bg-nobel-gold/5 transition-colors group relative overflow-hidden"
                                                >
                                                    {config.hero.mediaUrl ? (
                                                        <>
                                                            <img src={config.hero.mediaUrl} alt="Hero" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-40 transition-opacity" />
                                                            <div className="relative z-10 flex flex-col items-center">
                                                                <Image className="w-6 h-6 text-gray-700 mb-1" />
                                                                <span className="text-xs font-medium text-gray-700">Change Image</span>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Image className="w-6 h-6 text-gray-400 mb-1" />
                                                            <span className="text-xs text-gray-400">Select Image</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Call to Action</label>
                                                <input
                                                    type="text"
                                                    value={config.hero.ctaText}
                                                    onChange={(e) => updateHero({ ctaText: e.target.value })}
                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold outline-none"
                                                    placeholder="e.g. Join Waitlist"
                                                />
                                            </div>
                                        </div>

                                        {/* Features Section Edit */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between gap-2 text-gray-900 font-semibold text-sm pb-2 border-b border-gray-100">
                                                <div className="flex items-center gap-2">
                                                    <Layout className="w-4 h-4 text-nobel-gold" />
                                                    <h3>Features</h3>
                                                </div>
                                            </div>

                                            {config.features.map((feature, index) => (
                                                <div key={feature.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-bold text-gray-500 uppercase">Feature {index + 1}</span>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setEditingSectionId(editingSectionId === feature.id ? null : feature.id)}
                                                                className="text-gray-400 hover:text-nobel-gold"
                                                            >
                                                                <Edit2 className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const updatedFeatures = config.features.filter(f => f.id !== feature.id);
                                                                    updateConfig({ features: updatedFeatures });
                                                                }}
                                                                className="text-gray-400 hover:text-red-500"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {editingSectionId === feature.id ? (
                                                        <div className="space-y-3 animate-fade-in pt-2">
                                                            <input
                                                                type="text"
                                                                value={feature.title}
                                                                onChange={(e) => {
                                                                    const updatedFeatures = config.features.map(f => f.id === feature.id ? { ...f, title: e.target.value } : f);
                                                                    updateConfig({ features: updatedFeatures });
                                                                }}
                                                                placeholder="Feature Title"
                                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-nobel-gold outline-none"
                                                            />
                                                            <textarea
                                                                value={feature.description}
                                                                onChange={(e) => {
                                                                    const updatedFeatures = config.features.map(f => f.id === feature.id ? { ...f, description: e.target.value } : f);
                                                                    updateConfig({ features: updatedFeatures });
                                                                }}
                                                                placeholder="Description..."
                                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-nobel-gold outline-none min-h-[80px]"
                                                            />
                                                            {/* Simple Image URL input for now, could be ImagePicker */}
                                                            {feature.image && (
                                                                <div className="relative w-full h-24 bg-gray-100 rounded overflow-hidden">
                                                                    <img src={feature.image} alt="" className="w-full h-full object-cover" />
                                                                    <button
                                                                        onClick={() => {
                                                                            const updatedFeatures = config.features.map(f => f.id === feature.id ? { ...f, image: undefined } : f);
                                                                            updateConfig({ features: updatedFeatures });
                                                                        }}
                                                                        className="absolute top-1 right-1 p-1 bg-white/80 rounded-full hover:bg-red-500 hover:text-white"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <h4 className="text-sm font-medium text-gray-800 line-clamp-1">{feature.title || '(Untitled)'}</h4>
                                                    )}
                                                </div>
                                            ))}

                                            <button
                                                onClick={() => {
                                                    const newFeature = { id: Date.now().toString(), title: 'New Feature', description: 'Describe your feature here.' };
                                                    updateConfig({ features: [...config.features, newFeature] });
                                                    setEditingSectionId(newFeature.id);
                                                }}
                                                className="w-full py-3 bg-black text-white rounded-full font-medium text-xs hover:bg-gray-800 transition-colors shadow-md flex items-center justify-center gap-2"
                                            >
                                                <Plus className="w-3 h-3" /> Add Feature
                                            </button>
                                        </div>

                                        {/* Custom Sections */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between gap-2 text-gray-900 font-semibold text-sm pb-2 border-b border-gray-100">
                                                <div className="flex items-center gap-2">
                                                    <Layout className="w-4 h-4 text-nobel-gold" />
                                                    <h3>Content Sections</h3>
                                                </div>
                                                <button onClick={handleAddSection} className="text-xs text-nobel-gold hover:text-black font-medium flex items-center gap-1">
                                                    <Plus className="w-3 h-3" /> Add
                                                </button>
                                            </div>

                                            {config.contentSections.map((section, index) => (
                                                <div key={section.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-gray-500 uppercase">Section {index + 1}</span>
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded-full text-gray-500 border border-gray-200">
                                                                {section.type === 'accordion' ? 'Accordion' : 'Text'}
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setEditingSectionId(editingSectionId === section.id ? null : section.id)}
                                                                className="text-gray-400 hover:text-nobel-gold"
                                                            >
                                                                <Edit2 className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={() => initiateDeleteSection(section.id)}
                                                                className="text-gray-400 hover:text-red-500"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {editingSectionId === section.id ? (
                                                        <div className="space-y-3 animate-fade-in pt-2">
                                                            <div className="flex gap-3 mb-2">
                                                                <div className="flex-1">
                                                                    <label className="text-xs font-medium text-gray-500 block mb-1">Type</label>
                                                                    <select
                                                                        value={section.type || 'text'}
                                                                        onChange={(e) => handleUpdateSection(section.id, {
                                                                            type: e.target.value as 'text' | 'accordion',
                                                                            items: e.target.value === 'accordion' && !section.items ? [{ id: Date.now().toString(), question: 'Example Question?', answer: 'Answer goes here.' }] : section.items
                                                                        })}
                                                                        className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 bg-white outline-none focus:border-nobel-gold"
                                                                    >
                                                                        <option value="text">Text Block</option>
                                                                        <option value="accordion">Accordion (FAQ)</option>
                                                                    </select>
                                                                </div>
                                                                <div className="flex-1">
                                                                    <label className="text-xs font-medium text-gray-500 block mb-1">Layout</label>
                                                                    <select
                                                                        value={section.layout || 'default'}
                                                                        onChange={(e) => handleUpdateSection(section.id, { layout: e.target.value as 'default' | 'split' })}
                                                                        className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 bg-white outline-none focus:border-nobel-gold"
                                                                    >
                                                                        <option value="default">Standard</option>
                                                                        <option value="split">Split View</option>
                                                                    </select>
                                                                </div>
                                                                <div className="flex-1">
                                                                    <label className="text-xs font-medium text-gray-500 block mb-1">Margin</label>
                                                                    <select
                                                                        value={section.paddingX || 'medium'}
                                                                        onChange={(e) => handleUpdateSection(section.id, { paddingX: e.target.value as 'small' | 'medium' | 'large' })}
                                                                        className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 bg-white outline-none focus:border-nobel-gold"
                                                                    >
                                                                        <option value="medium">Normal</option>
                                                                        <option value="large">Wide</option>
                                                                        <option value="small">Compact</option>
                                                                    </select>
                                                                </div>
                                                            </div>

                                                            <input
                                                                type="text"
                                                                value={section.title}
                                                                onChange={(e) => handleUpdateSection(section.id, { title: e.target.value })}
                                                                placeholder="Section Title"
                                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-nobel-gold outline-none"
                                                            />

                                                            {section.type === 'accordion' ? (
                                                                <div className="space-y-3 border-t border-gray-100 pt-3">
                                                                    <label className="text-xs font-bold text-gray-400 uppercase block">Accordion Items</label>
                                                                    {section.items?.map((item, idx) => (
                                                                        <div key={item.id} className="bg-gray-50 p-2 rounded border border-gray-200 relative group">
                                                                            <button
                                                                                onClick={() => {
                                                                                    const newItems = section.items?.filter(i => i.id !== item.id);
                                                                                    handleUpdateSection(section.id, { items: newItems });
                                                                                }}
                                                                                className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            >
                                                                                <Trash2 className="w-3 h-3" />
                                                                            </button>
                                                                            <input
                                                                                type="text"
                                                                                value={item.question}
                                                                                onChange={(e) => {
                                                                                    const newItems = section.items?.map(i => i.id === item.id ? { ...i, question: e.target.value } : i);
                                                                                    handleUpdateSection(section.id, { items: newItems });
                                                                                }}
                                                                                placeholder="Question"
                                                                                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded mb-2 focus:border-nobel-gold outline-none"
                                                                            />
                                                                            <textarea
                                                                                value={item.answer}
                                                                                onChange={(e) => {
                                                                                    const newItems = section.items?.map(i => i.id === item.id ? { ...i, answer: e.target.value } : i);
                                                                                    handleUpdateSection(section.id, { items: newItems });
                                                                                }}
                                                                                placeholder="Answer"
                                                                                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:border-nobel-gold outline-none min-h-[60px]"
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                    <button
                                                                        onClick={() => {
                                                                            const newItem = { id: Date.now().toString(), question: 'New Question', answer: 'New Answer' };
                                                                            handleUpdateSection(section.id, { items: [...(section.items || []), newItem] });
                                                                        }}
                                                                        className="w-full py-2 text-xs border border-dashed border-gray-300 rounded text-gray-500 hover:border-nobel-gold hover:text-nobel-gold transition-colors"
                                                                    >
                                                                        + Add Item
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <textarea
                                                                    value={section.content}
                                                                    onChange={(e) => handleUpdateSection(section.id, { content: e.target.value })}
                                                                    placeholder="Content..."
                                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-nobel-gold outline-none min-h-[100px]"
                                                                />
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <h4 className="text-sm font-medium text-gray-800 line-clamp-1">{section.title || '(Untitled)'}</h4>
                                                    )}
                                                </div>
                                            ))}

                                            {config.contentSections.length === 0 && (
                                                <div className="text-center py-4 text-gray-400 text-xs italic">
                                                    No additional sections. Click Add to create one.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'leads' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm pb-2 border-b border-gray-100">
                                            <Users className="w-4 h-4 text-nobel-gold" />
                                            <h3>Waitlist Signups</h3>
                                        </div>

                                        <div className="overflow-hidden border border-gray-200 rounded-lg bg-white">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                                        <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 bg-white">
                                                    {leads.map((lead) => (
                                                        <tr key={lead.id}>
                                                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{lead.name}</td>
                                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{lead.email}</td>
                                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-right">{lead.date}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-lg">
                                            <p><strong>Note:</strong> This is currently showing demo data. Real signups will appear here once the page is published.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Preview Area */}
                <div className={`flex-1 overflow-hidden relative flex flex-col bg-gray-100/50 transition-all duration-300 ${isPreviewMode ? 'w-full' : ''}`}>
                    <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
                        <div className={`transition-all duration-300 bg-white relative overflow-hidden ${viewMode === 'mobile'
                            ? 'h-[850px] w-[400px] rounded-[3rem] ring-8 ring-gray-900 shadow-2xl' // Mobile Style: Taller, wider, with frame
                            : 'w-full h-full rounded-none ring-0 shadow-none border-none' // Desktop Style: Full width, no frame
                            }`}>

                            {/* Mobile Notch for Editor container */}
                            {viewMode === 'mobile' && (
                                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-6 bg-gray-900 rounded-b-xl z-20 pointer-events-none"></div>
                            )}

                            <Preview config={config} isMobile={viewMode === 'mobile'} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Image Picker Modal */}
            {isImagePickerOpen && (
                <ImagePicker
                    onSelect={(url) => {
                        if (imagePickerTarget === 'hero') {
                            updateHero({ mediaUrl: url });
                        }
                        setIsImagePickerOpen(false);
                        setImagePickerTarget(null);
                    }}
                    onClose={() => {
                        setIsImagePickerOpen(false);
                        setImagePickerTarget(null);
                    }}
                    initialSearchTerm={config.hero.title || 'startup'}
                />
            )}

            {/* Custom Delete Confirmation Modal */}
            {sectionToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2 font-serif">Delete Section?</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Are you sure you want to delete this content section? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSectionToDelete(null)}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDeleteSection}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-md"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};