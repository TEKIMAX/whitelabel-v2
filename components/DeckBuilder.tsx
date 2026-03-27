import React from 'react';
import { Slide, DeckTheme, CanvasItem } from '../types';
import { Loader2, ChevronLeft, ChevronRight, Check, Upload, Save, History, ChevronDown, ChevronUp, Plus, Trash2, X, Play, Monitor, Minimize2, Maximize2, Sparkles, Presentation, Bold, Italic, List, Table, Eye, Edit, Heading1, Heading2, Quote, Link as LinkIcon, Minus, Palette, Type, Image as ImageIcon, MousePointer2, StickyNote, Square, AlignLeft, AlignCenter, AlignRight, LayoutGrid, Search, RotateCw, Sliders, Pencil } from 'lucide-react';
import TabNavigation from './TabNavigation';
import ProjectSelector from './ProjectSelector';
import { Logo } from './Logo';
import { UnifiedMediaPicker } from './UnifiedMediaPicker';
import SlideCanvasItem from './SlideCanvasItem';
import DeckHome from './DeckHome';
import { useDeckBuilderLogic, DEFAULT_THEME, createDefaultSlides } from '../hooks/useDeckBuilderLogic';
import { StartupData, AISettings } from '../types';

interface DeckBuilderProps {
    data: StartupData;
    allProjects: StartupData[];
    onBackToCanvas: () => void;
    onSaveDeckVersion: (name: string, slides: Slide[], theme?: DeckTheme, versionId?: string) => Promise<string | any>;
    onDeleteVersion: (versionId: string) => void;
    onSwitchProject: (id: string) => void;
    onNewProject: () => void;
    onNavigate: (view: any) => void;
    currentView: any;
    settings: AISettings;
    allowedPages?: string[];
}

const FONTS = [
    { value: 'sans', label: 'Inter', category: 'Sans Serif', fontFamily: '"Inter", sans-serif' },
    { value: 'montserrat', label: 'Montserrat', category: 'Sans Serif', fontFamily: '"Montserrat", sans-serif' },
    { value: 'poppins', label: 'Poppins', category: 'Sans Serif', fontFamily: '"Poppins", sans-serif' },
    { value: 'raleway', label: 'Raleway', category: 'Sans Serif', fontFamily: '"Raleway", sans-serif' },
    { value: 'opensans', label: 'Open Sans', category: 'Sans Serif', fontFamily: '"Open Sans", sans-serif' },
    { value: 'roboto', label: 'Roboto', category: 'Sans Serif', fontFamily: '"Roboto", sans-serif' },
    { value: 'ubuntu', label: 'Ubuntu', category: 'Sans Serif', fontFamily: '"Ubuntu", sans-serif' },
    { value: 'oswald', label: 'Oswald', category: 'Sans Serif', fontFamily: '"Oswald", sans-serif' },
    { value: 'serif', label: 'Playfair Display', category: 'Serif', fontFamily: '"Playfair Display", serif' },
    { value: 'merriweather', label: 'Merriweather', category: 'Serif', fontFamily: '"Merriweather", serif' },
    { value: 'lora', label: 'Lora', category: 'Serif', fontFamily: '"Lora", serif' },
    { value: 'arvo', label: 'Arvo', category: 'Serif', fontFamily: '"Arvo", serif' },
    { value: 'slab', label: 'Roboto Slab', category: 'Serif', fontFamily: '"Roboto Slab", serif' },
    { value: 'mono', label: 'JetBrains Mono', category: 'Monospace', fontFamily: '"JetBrains Mono", monospace' },
    { value: 'cursive', label: 'Dancing Script', category: 'Handwriting', fontFamily: '"Dancing Script", cursive' },
    { value: 'pacifico', label: 'Pacifico', category: 'Handwriting', fontFamily: '"Pacifico", cursive' },
    { value: 'permanentmarker', label: 'Permanent Marker', category: 'Handwriting', fontFamily: '"Permanent Marker", cursive' },
];

const PRESET_COLORS = [
    { value: '#1a1a1a', label: 'Dark' },
    { value: '#ffffff', label: 'White' },
    { value: '#C5A059', label: 'Gold' },
    { value: '#EF4444', label: 'Red' },
    { value: '#3B82F6', label: 'Blue' },
    { value: '#10B981', label: 'Green' },
    { value: '#ffecd2', label: 'Peach' },
    { value: '#fcb69f', label: 'Salmon' },
    { value: '#a1c4fd', label: 'Sky' },
];

const DeckBuilder: React.FC<DeckBuilderProps> = ({
    data,
    allProjects,
    onNavigate,
    onSaveDeckVersion,
    onDeleteVersion,
    onSwitchProject,
    onNewProject,
    currentView,
    settings,
    allowedPages
}) => {
    const {
        // State
        slides, setSlides,
        activeSlideIndex, setActiveSlideIndex,
        isPresenting, setIsPresenting,
        viewMode, setViewMode,
        showMediaPicker, setShowMediaPicker,
        activeTool, setActiveTool,
        selectedItemId, setSelectedItemId,
        sidebarTab, setSidebarTab,
        bulkStyleMode, setBulkStyleMode,
        isHome, setIsHome,
        searchQuery, setSearchQuery,
        currentVersionId, setCurrentVersionId,
        saveAsNewVersion, setSaveAsNewVersion,
        deckName, setDeckName,
        windowSize,
        theme, setTheme,
        versions,

        // Refs
        bgColorInputRef,
        textColorInputRef,
        canvasRef,

        // Computed
        activeSlide,
        itemsArray,
        selectedItem,

        // Actions
        updateSlide,
        updateItem,
        updateItemStyle,
        updateItemTransform,
        bringToFront,
        sendToBack,
        addItem,
        handlePointerDown,
        handleItemPointerDown,
        handleMediaSelect,
    } = useDeckBuilderLogic(data, onSaveDeckVersion);


    if (isHome) {
        return (
            <div className="min-h-screen flex flex-col text-stone-900 bg-[#F9F8F4] font-sans">
                <header className="px-6 py-3 bg-white/80 backdrop-blur-sm border-b border-stone-200 flex items-center justify-between sticky top-0 z-40 shrink-0">
                    <div className="flex items-center gap-4">
                        <Logo imageClassName="h-8 w-auto" />
                        <div className="h-6 w-px bg-stone-200" />
                        <TabNavigation currentView={currentView} onNavigate={onNavigate} allowedPages={allowedPages} projectFeatures={{ canvasEnabled: data.canvasEnabled, marketResearchEnabled: data.marketResearchEnabled }} />
                    </div>
                </header>
                <DeckHome
                    versions={versions}
                    projectName={data.name}
                    onNewDeck={() => {
                        setSlides(createDefaultSlides(data.name));
                        setTheme(DEFAULT_THEME);
                        setCurrentVersionId(null);
                        setDeckName(data.name);
                        setSaveAsNewVersion(true);
                        setIsHome(false);
                    }}
                    onSelectVersion={(v) => {
                        const parsedSlides = JSON.parse(v.slidesData).map((s: any) => ({
                            ...s,
                            items: typeof s.items === 'string' ? JSON.parse(s.items) : (s.items || [])
                        }));
                        setSlides(parsedSlides);
                        if (v.theme) setTheme(JSON.parse(v.theme));
                        setCurrentVersionId(v._id);
                        setDeckName(v.name);
                        setSaveAsNewVersion(false);
                        setIsHome(false);
                    }}
                    onDeleteVersion={onDeleteVersion}
                />
            </div>
        );
    }

    if (isPresenting) {
        return (
            <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-0 select-none overflow-hidden">
                <div
                    className="relative shadow-2xl overflow-hidden bg-white shrink-0"
                    style={{
                        backgroundColor: theme.backgroundColor,
                        width: '1920px',
                        height: '1080px',
                        transform: `scale(${Math.min(windowSize.width / 1920, windowSize.height / 1080) * 0.9})`,
                        transformOrigin: 'center center'
                    }}
                >
                    {(activeSlide.items || []).map((item) => (
                        <SlideCanvasItem
                            key={item.id}
                            item={item}
                            isSelected={false}
                            onMouseDown={() => { }}
                            updateItemContent={() => { }}
                            scale={1}
                            accentColor={theme.accentColor}
                        />
                    ))}
                </div>

                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 px-6 py-3 bg-stone-900/80 backdrop-blur-md rounded-full border border-white/10 text-white shadow-2xl transition-opacity opacity-0 hover:opacity-100 group">
                    <button
                        onClick={() => setActiveSlideIndex(prev => Math.max(0, prev - 1))}
                        disabled={activeSlideIndex === 0}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-20"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div className="text-xs font-bold tracking-widest min-w-[80px] text-center">
                        SLIDE {activeSlideIndex + 1} / {slides.length}
                    </div>
                    <button
                        onClick={() => setActiveSlideIndex(prev => Math.min(slides.length - 1, prev + 1))}
                        disabled={activeSlideIndex === slides.length - 1}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-20"
                    >
                        <ChevronRight size={24} />
                    </button>
                    <div className="w-px h-6 bg-white/10 mx-2" />
                    <button
                        onClick={() => setIsPresenting(false)}
                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
                    <div
                        className="h-full bg-nobel-gold transition-all duration-300"
                        style={{ width: `${((activeSlideIndex + 1) / slides.length) * 100}%` }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col text-slate-900 bg-[#F1F5F9] font-sans overflow-hidden">
            {/* Editor Header */}
            <header className="px-6 py-3 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between sticky top-0 z-40 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsHome(true)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 mr-2"><ChevronLeft size={20} /></button>
                    <div className="flex flex-col relative group/title">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={deckName}
                                onChange={(e) => setDeckName(e.target.value)}
                                className="text-lg font-serif font-bold leading-tight bg-transparent border-none outline-none focus:ring-0 p-0 w-64 hover:bg-slate-50/50 rounded transition-colors"
                                placeholder="Deck Name"
                            />
                            <Pencil size={12} className="text-slate-300 group-hover/title:text-slate-600 transition-colors" />
                        </div>
                        <p className="text-[9px] text-slate-400 uppercase tracking-[0.1em] font-black mt-0.5">{data.name} • Version Editor</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-100/80 rounded-full border border-slate-200">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Save as new</span>
                        <button
                            onClick={() => setSaveAsNewVersion(!saveAsNewVersion)}
                            className={`w-9 h-5 rounded-full relative transition-all duration-300 ${saveAsNewVersion ? 'bg-slate-900' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${saveAsNewVersion ? 'left-5' : 'left-1'}`} />
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={async () => {
                                const targetId = saveAsNewVersion ? undefined : (currentVersionId || undefined);
                                const resultId = await onSaveDeckVersion(
                                    deckName || activeSlide.title || "Manual Save",
                                    slides,
                                    theme,
                                    targetId
                                );
                                if (resultId && typeof resultId === 'string') {
                                    setCurrentVersionId(resultId);
                                }
                                if (saveAsNewVersion) setSaveAsNewVersion(false);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-all text-sm font-bold shadow-lg"
                        >
                            <Save size={16} /> {saveAsNewVersion ? 'SAVE AS NEW' : 'UPDATE VERSION'}
                        </button>
                        <button onClick={() => setIsPresenting(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-600 rounded-full hover:bg-stone-50 transition-all text-sm font-bold shadow-sm">
                            <Play size={16} /> PRESENT
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <aside className="w-80 border-r border-stone-200 bg-[#F8FAFC] flex flex-col shrink-0 z-20 shadow-xl overflow-hidden">
                    <div className="flex border-b border-slate-200 bg-white/50 backdrop-blur-md">
                        <button onClick={() => setSidebarTab('elements')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${sidebarTab === 'elements' ? 'text-slate-900 bg-slate-100/50 shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}>Elements</button>
                        <button onClick={() => setSidebarTab('style')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${sidebarTab === 'style' ? 'text-slate-900 bg-slate-100/50 shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}>Style</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                        {sidebarTab === 'elements' ? (
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => addItem('text')} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-800 hover:shadow-lg transition-all group shadow-sm active:scale-95">
                                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 transition-colors">
                                        <Type className="w-5 h-5 text-slate-400 group-hover:text-white" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Text</span>
                                </button>
                                <button onClick={() => addItem('note')} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-800 hover:shadow-lg transition-all group shadow-sm active:scale-95">
                                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 transition-colors">
                                        <StickyNote className="w-5 h-5 text-slate-400 group-hover:text-white" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Note</span>
                                </button>
                                <button onClick={() => setShowMediaPicker(true)} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-800 hover:shadow-lg transition-all group shadow-sm active:scale-95">
                                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 transition-colors">
                                        <ImageIcon className="w-5 h-5 text-slate-400 group-hover:text-white" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Media</span>
                                </button>
                                <div className="col-span-2 h-px bg-slate-200/50 my-2" />
                                <button onClick={() => addItem('shape', { shapeType: 'circle', backgroundColor: theme.accentColor + '40', borderWidth: 2, borderColor: theme.accentColor })} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-800 hover:shadow-lg transition-all group shadow-sm active:scale-95">
                                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 transition-colors">
                                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 group-hover:border-white transition-colors" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Circle</span>
                                </button>
                                <button onClick={() => addItem('shape', { shapeType: 'rect', backgroundColor: theme.accentColor + '40', borderWidth: 2, borderColor: theme.accentColor })} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-800 hover:shadow-lg transition-all group shadow-sm active:scale-95">
                                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 transition-colors">
                                        <Square className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Square</span>
                                </button>
                                <button onClick={() => addItem('shape', { shapeType: 'triangle', backgroundColor: theme.accentColor + '40', borderWidth: 2, borderColor: theme.accentColor })} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-800 hover:shadow-lg transition-all group shadow-sm active:scale-95">
                                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 transition-colors">
                                        <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[16px] border-b-slate-300 group-hover:border-b-white transition-colors" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Triangle</span>
                                </button>
                                <button onClick={() => addItem('line', { color: theme.accentColor, borderStyle: 'solid' })} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-800 hover:shadow-lg transition-all group shadow-sm active:scale-95">
                                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 transition-colors">
                                        <Minus className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Line</span>
                                </button>
                                <button onClick={() => addItem('line', { color: theme.accentColor, borderStyle: 'dotted' })} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-800 hover:shadow-lg transition-all group shadow-sm active:scale-95">
                                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 transition-colors">
                                        <div className="w-5 h-0 border-b-2 border-dotted border-slate-400 group-hover:border-white mt-1 transition-colors" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Dotted</span>
                                </button>
                                <button onClick={() => addItem('line', { color: theme.accentColor, borderStyle: 'dashed' })} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-800 hover:shadow-lg transition-all group shadow-sm active:scale-95">
                                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 transition-colors">
                                        <div className="w-5 h-0 border-b-2 border-dashed border-slate-400 group-hover:border-white mt-1 transition-colors" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Dashed</span>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Typography</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => setTheme({ ...theme, fontFamily: 'serif' })} className={`p-3 rounded-xl border-2 text-sm font-serif transition-all ${theme.fontFamily === 'serif' ? 'border-slate-800 bg-slate-800 text-white shadow-lg' : 'border-slate-200 text-slate-400 hover:border-slate-300 bg-white'}`}>Serif</button>
                                        <button onClick={() => setTheme({ ...theme, fontFamily: 'sans' })} className={`p-3 rounded-xl border-2 text-sm font-sans transition-all ${theme.fontFamily === 'sans' ? 'border-slate-800 bg-slate-800 text-white shadow-lg' : 'border-slate-200 text-slate-400 hover:border-slate-300 bg-white'}`}>Sans</button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Colors</p>
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-sm transition-all hover:border-slate-300">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-900 uppercase tracking-wide">Accent</span>
                                            <span className="text-[9px] text-slate-400 font-bold">Primary Brand Color</span>
                                        </div>
                                        <input type="color" value={theme.accentColor} onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })} className="w-10 h-10 rounded-lg border-2 border-slate-100 cursor-pointer overflow-hidden p-0" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                <div className="flex-1 bg-stone-100 relative overflow-hidden flex flex-col">
                    {/* Canvas Editor Area */}
                    <div className="flex-1 relative flex flex-col items-center justify-center p-12">
                        {/* Floating Selection Toolbar */}
                        {selectedItem && (
                            <div className="mb-6 flex items-center gap-1 p-1 bg-white border border-stone-200 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-4 z-50">
                                {/* Bulk Update Toggle */}
                                <button
                                    onClick={() => setBulkStyleMode(!bulkStyleMode)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-[9px] font-black uppercase tracking-widest border ${bulkStyleMode ? 'bg-nobel-gold border-nobel-gold text-white shadow-inner' : 'bg-stone-50 border-stone-200 text-stone-400'}`}
                                >
                                    <LayoutGrid size={12} /> {bulkStyleMode ? 'GLOBAL EDIT' : 'SINGLE EDIT'}
                                </button>

                                <div className="w-px h-4 bg-stone-100 mx-1" />

                                {/* Contextual Font Tools */}
                                {(selectedItem.type === 'text' || selectedItem.type === 'note') && (
                                    <>
                                        <div className="relative group/font">
                                            <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-stone-50 rounded-full transition-colors border border-transparent hover:border-stone-100">
                                                <Type size={14} className="text-stone-400" />
                                                <span className="text-xs font-medium w-24 text-left truncate" style={{ fontFamily: selectedItem.style.fontFamily }}>
                                                    {FONTS.find(f => f.value === selectedItem.style.fontFamily)?.label || 'Inter'}
                                                </span>
                                                <ChevronDown size={14} className="text-stone-400" />
                                            </button>
                                            <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-stone-200 rounded-2xl shadow-2xl opacity-0 invisible group-hover/font:opacity-100 group-hover/font:visible transition-all z-50 max-h-80 overflow-y-auto p-2 scrollbar-none">
                                                {FONTS.map(font => (
                                                    <button
                                                        key={font.value}
                                                        onClick={() => updateItemStyle(selectedItem.id, { fontFamily: font.value })}
                                                        className="w-full text-left px-3 py-2 hover:bg-stone-50 rounded-xl transition-colors text-xs font-medium"
                                                        style={{ fontFamily: font.fontFamily }}
                                                    >
                                                        {font.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="w-px h-4 bg-stone-100 mx-1" />
                                        <button
                                            onClick={() => updateItemStyle(selectedItem.id, { fontWeight: selectedItem.style.fontWeight === 'bold' ? 'normal' : 'bold' })}
                                            className={`p-2 rounded-full transition-colors ${selectedItem.style.fontWeight === 'bold' ? 'bg-stone-900 text-white' : 'hover:bg-stone-100 text-stone-600'}`}
                                        >
                                            <Bold size={16} />
                                        </button>
                                        <button
                                            onClick={() => updateItemStyle(selectedItem.id, { fontStyle: selectedItem.style.fontStyle === 'italic' ? 'normal' : 'italic' })}
                                            className={`p-2 rounded-full transition-colors ${selectedItem.style.fontStyle === 'italic' ? 'bg-stone-900 text-white' : 'hover:bg-stone-100 text-stone-600'}`}
                                        >
                                            <Italic size={16} />
                                        </button>
                                        <div className="w-px h-4 bg-stone-100 mx-1" />
                                        <button
                                            onClick={() => updateItemStyle(selectedItem.id, { textAlign: 'left' })}
                                            className={`p-2 rounded-full transition-colors ${selectedItem.style.textAlign === 'left' ? 'bg-stone-100 text-stone-900' : 'hover:bg-stone-100 text-stone-600'}`}
                                        >
                                            <AlignLeft size={16} />
                                        </button>
                                        <button
                                            onClick={() => updateItemStyle(selectedItem.id, { textAlign: 'center' })}
                                            className={`p-2 rounded-full transition-colors ${(!selectedItem.style.textAlign || selectedItem.style.textAlign === 'center') ? 'bg-stone-100 text-stone-900' : 'hover:bg-stone-100 text-stone-600'}`}
                                        >
                                            <AlignCenter size={16} />
                                        </button>
                                        <button
                                            onClick={() => updateItemStyle(selectedItem.id, { textAlign: 'right' })}
                                            className={`p-2 rounded-full transition-colors ${selectedItem.style.textAlign === 'right' ? 'bg-stone-100 text-stone-900' : 'hover:bg-stone-100 text-stone-600'}`}
                                        >
                                            <AlignRight size={16} />
                                        </button>
                                        <div className="w-px h-4 bg-stone-100 mx-1" />
                                    </>
                                )}

                                {/* Contextual Colors */}
                                <div className="flex items-center gap-1.5 px-1">
                                    {(selectedItem.type === 'text' || selectedItem.type === 'note') && (
                                        <div className="flex items-center gap-1">
                                            <Type size={14} className="text-stone-300 mr-1" />
                                            {PRESET_COLORS.slice(0, 4).map(color => (
                                                <button
                                                    key={color.value}
                                                    onClick={() => updateItemStyle(selectedItem.id, { color: color.value })}
                                                    className={`w-5 h-5 rounded-full border border-white shadow-sm hover:scale-110 transition-transform ${selectedItem.style.color === color.value ? 'ring-1 ring-stone-900 ring-offset-1' : ''}`}
                                                    style={{ backgroundColor: color.value }}
                                                />
                                            ))}
                                            <button
                                                onClick={() => textColorInputRef.current?.click()}
                                                className="w-5 h-5 rounded-full border border-dashed border-stone-300 flex items-center justify-center hover:bg-stone-50 transition-colors"
                                            >
                                                <Plus size={10} className="text-stone-400" />
                                                <input ref={textColorInputRef} type="color" className="sr-only" onChange={(e) => updateItemStyle(selectedItem.id, { color: e.target.value })} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Background Color for Shapes/Notes */}
                                    {(selectedItem.type === 'shape' || selectedItem.type === 'note' || selectedItem.type === 'line') && (
                                        <>
                                            {selectedItem.type === 'note' && <div className="w-px h-4 bg-stone-100 mx-1" />}
                                            <div className="flex items-center gap-1">
                                                <Palette size={14} className="text-stone-300 mr-1" />
                                                {PRESET_COLORS.slice(0, 4).map(color => (
                                                    <button
                                                        key={color.value}
                                                        onClick={() => updateItemStyle(selectedItem.id, { [selectedItem.type === 'line' ? 'color' : 'backgroundColor']: color.value })}
                                                        className={`w-5 h-5 rounded-md border border-white shadow-sm hover:scale-110 transition-transform ${(selectedItem.style.backgroundColor === color.value || (selectedItem.type === 'line' && selectedItem.style.color === color.value)) ? 'ring-1 ring-stone-900 ring-offset-1' : ''}`}
                                                        style={{ backgroundColor: color.value }}
                                                    />
                                                ))}
                                                <button
                                                    onClick={() => bgColorInputRef.current?.click()}
                                                    className="w-5 h-5 rounded-md border border-dashed border-stone-300 flex items-center justify-center hover:bg-stone-50 transition-colors"
                                                >
                                                    <Plus size={10} className="text-stone-400" />
                                                    <input ref={bgColorInputRef} type="color" className="sr-only" onChange={(e) => updateItemStyle(selectedItem.id, { [selectedItem.type === 'line' ? 'color' : 'backgroundColor']: e.target.value })} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="w-px h-4 bg-stone-100 mx-1" />

                                {/* Layering Controls */}
                                <div className="flex items-center gap-1">
                                    <button onClick={() => bringToFront(selectedItem.id)} className="p-2 hover:bg-stone-100 text-stone-600 rounded-full transition-colors" title="Bring to Front"><ChevronUp size={16} /></button>
                                    <button onClick={() => sendToBack(selectedItem.id)} className="p-2 hover:bg-stone-100 text-stone-600 rounded-full transition-colors" title="Send to Back"><ChevronDown size={16} /></button>
                                </div>

                                <div className="w-px h-4 bg-stone-100 mx-1" />

                                {/* Transform Controls */}
                                <div className="relative group/transform">
                                    <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-stone-50 rounded-full transition-colors border border-transparent hover:border-stone-100">
                                        <Sliders size={14} className="text-stone-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Transform</span>
                                        <ChevronDown size={14} className="text-stone-400" />
                                    </button>
                                    <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-stone-200 rounded-2xl shadow-2xl opacity-0 invisible group-hover/transform:opacity-100 group-hover/transform:visible transition-all z-50 p-4 space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Rotation</span><span className="text-xs font-medium text-stone-900">{selectedItem.rotation}°</span></div>
                                            <input type="range" min="-180" max="180" value={selectedItem.rotation} onChange={(e) => updateItemTransform(selectedItem.id, { rotation: parseInt(e.target.value) })} className="w-full accent-nobel-gold h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer" />
                                        </div>
                                        {selectedItem.type !== 'line' && (
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Rounding</span><span className="text-xs font-medium text-stone-900">{selectedItem.style.borderRadius || 0}px</span></div>
                                                <input type="range" min="0" max="100" value={selectedItem.style.borderRadius || 0} onChange={(e) => updateItemStyle(selectedItem.id, { borderRadius: parseInt(e.target.value) })} className="w-full accent-nobel-gold h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="w-px h-4 bg-stone-100 mx-1" />

                                <button
                                    onClick={() => {
                                        const newItems = activeSlide.items?.filter(i => i.id !== selectedItemId) || [];
                                        updateSlide({ items: newItems });
                                        setSelectedItemId(null);
                                    }}
                                    className="p-2 hover:bg-red-50 text-red-400 rounded-full transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}
                        <div
                            ref={canvasRef}
                            className="w-full max-w-5xl aspect-video shadow-2xl relative overflow-hidden bg-white"
                            style={{ backgroundColor: theme.backgroundColor }}
                            onPointerDown={handlePointerDown}
                        >
                            {(activeSlide.items || []).map((item) => (
                                <SlideCanvasItem
                                    key={item.id}
                                    item={item}
                                    isSelected={selectedItemId === item.id}
                                    onMouseDown={(e, type, handle) => handleItemPointerDown(e, type, handle, item.id)}
                                    updateItemContent={(id, content) => updateItem(id, { content })}
                                    scale={1}
                                    accentColor={theme.accentColor}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Bottom Slide Navbar */}
                    <div className="h-40 border-t border-stone-200 bg-white/50 backdrop-blur-md flex items-center gap-4 px-6 overflow-x-auto scrollbar-hide shrink-0 z-30">
                        {slides.map((s, idx) => (
                            <button
                                key={s.id}
                                onClick={() => setActiveSlideIndex(idx)}
                                className={`group flex flex-col gap-2 shrink-0 transition-all ${activeSlideIndex === idx ? 'scale-105' : 'opacity-60 hover:opacity-100'}`}
                            >
                                <div className={`w-40 aspect-video rounded-xl border-2 bg-white relative overflow-hidden transition-all ${activeSlideIndex === idx ? 'border-nobel-gold ring-4 ring-nobel-gold/10 shadow-lg' : 'border-stone-200 shadow-sm'}`}>
                                    {/* Mini Preview of Slide Content */}
                                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: theme.backgroundColor }}>
                                        <div className="relative w-full h-full transform scale-[0.156] origin-top-left" style={{ width: '1024px', height: '576px' }}>
                                            {(s.items || []).map((item: CanvasItem) => (
                                                <SlideCanvasItem
                                                    key={item.id}
                                                    item={item}
                                                    isSelected={false}
                                                    onMouseDown={() => { }}
                                                    updateItemContent={() => { }}
                                                    scale={1}
                                                    accentColor={theme.accentColor}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="absolute top-2 left-2 bg-stone-900 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-md">{idx + 1}</div>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-center truncate w-40 text-stone-500 group-hover:text-stone-900 transition-colors">{s.title}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </main>

            {showMediaPicker && (
                <UnifiedMediaPicker
                    onSelect={handleMediaSelect}
                    onClose={() => setShowMediaPicker(false)}
                    projectId={data.id}
                    initialSearchTerm={activeSlide?.title}
                />
            )}
        </div>
    );
};

export default DeckBuilder;
