import { useState, useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from "../convex/_generated/api";
import { StartupData, Slide, DeckTheme, CanvasItem, ToolType, Point } from '../types';

export const DEFAULT_THEME: DeckTheme = {
    backgroundColor: '#ffffff',
    textColor: '#1a1a1a',
    accentColor: '#C5A059',
    fontFamily: 'serif'
};

export const createDefaultSlides = (projectName: string): Slide[] => [
    {
        id: '1',
        title: 'Title Slide',
        content: '',
        items: [
            { id: '1-1', type: 'text', x: 100, y: 150, width: 800, height: 100, content: projectName || 'PROJECT NAME', rotation: 0, zIndex: 1, style: { fontSize: 80, color: '#1a1a1a', fontFamily: 'serif', backgroundColor: 'transparent', textAlign: 'center', fontWeight: 'bold' } },
            { id: '1-2', type: 'text', x: 100, y: 300, width: 800, height: 60, content: 'Revolutionizing our industry with a bold new vision.', rotation: 0, zIndex: 2, style: { fontSize: 32, color: '#666', fontFamily: 'serif', backgroundColor: 'transparent', textAlign: 'center' } }
        ],
        notes: 'Introduce your company and the big idea.'
    },
    {
        id: '2',
        title: 'The Problem',
        content: '',
        items: [
            { id: '2-1', type: 'text', x: 100, y: 80, width: 800, height: 100, content: 'The Problem Worth Solving', rotation: 0, zIndex: 1, style: { fontSize: 48, color: '#1a1a1a', fontFamily: 'serif', backgroundColor: 'transparent', fontWeight: 'bold' } },
            { id: '2-2', type: 'note', x: 100, y: 220, width: 400, height: 250, content: 'Pain Point #1: Current solutions are fragmented and inefficient.\n\nPain Point #2: 80% of founders struggle with this specific friction.', rotation: 0, zIndex: 2, style: { fontSize: 24, color: '#1a1a1a', fontFamily: 'sans', backgroundColor: '#C5A05940' } }
        ],
        notes: 'Define the pain clearly and quantify it if possible.'
    },
    {
        id: '3',
        title: 'The Solution',
        content: '',
        items: [
            { id: '3-1', type: 'text', x: 100, y: 80, width: 800, height: 100, content: 'Our Unique Solution', rotation: 0, zIndex: 1, style: { fontSize: 48, color: '#1a1a1a', fontFamily: 'serif', backgroundColor: 'transparent', fontWeight: 'bold' } },
            { id: '3-2', type: 'text', x: 100, y: 220, width: 800, height: 120, content: 'We offer an All-in-One OS for founders that automates business planning, market research, and deck building.', rotation: 0, zIndex: 2, style: { fontSize: 36, color: '#1a1a1a', fontFamily: 'serif', backgroundColor: 'transparent' } }
        ],
        notes: 'How your product makes the problem disappear.'
    },
    {
        id: '4',
        title: 'Market Opportunity',
        content: '',
        items: [
            { id: '4-1', type: 'text', x: 100, y: 80, width: 800, height: 80, content: 'Market Potential', rotation: 0, zIndex: 1, style: { fontSize: 48, color: '#1a1a1a', fontFamily: 'serif', backgroundColor: 'transparent', fontWeight: 'bold' } },
            { id: '4-2', type: 'shape', x: 100, y: 200, width: 300, height: 300, content: '', rotation: 0, zIndex: 2, style: { backgroundColor: '#1a1a1a', shapeType: 'circle', color: '#000', fontSize: 16, fontFamily: 'sans' } },
            { id: '4-3', type: 'text', x: 125, y: 310, width: 250, height: 80, content: '$15B TAM', rotation: 0, zIndex: 3, style: { fontSize: 28, color: '#fff', textAlign: 'center', backgroundColor: 'transparent', fontFamily: 'sans', fontWeight: 'bold' } }
        ],
        notes: 'Identify TAM, SAM, and SOM.'
    },
    {
        id: '5',
        title: 'Product Demo',
        content: '',
        items: [
            { id: '5-1', type: 'text', x: 100, y: 80, width: 800, height: 80, content: 'Magic at Your Fingertips', rotation: 0, zIndex: 1, style: { fontSize: 48, color: '#1a1a1a', fontFamily: 'serif', backgroundColor: 'transparent', fontWeight: 'bold' } }
        ],
        notes: 'Add screenshots or a GIF of your core features.'
    },
    {
        id: '6',
        title: 'Business Model',
        content: '',
        items: [
            { id: '6-1', type: 'text', x: 100, y: 80, width: 800, height: 80, content: 'Revenue Mechanics', rotation: 0, zIndex: 1, style: { fontSize: 48, color: '#1a1a1a', fontFamily: 'serif', backgroundColor: 'transparent', fontWeight: 'bold' } },
            { id: '6-2', type: 'text', x: 100, y: 220, width: 800, height: 80, content: '1. SaaS Subscription: Monthly recurring revenue.\n2. Service Fees: Project-based monetization.', rotation: 0, zIndex: 2, style: { fontSize: 28, color: '#444', fontFamily: 'sans', backgroundColor: 'transparent' } }
        ],
        notes: 'Explain your pricing and monetization strategy.'
    },
    {
        id: '7',
        title: 'Competition',
        content: '',
        items: [
            { id: '7-1', type: 'text', x: 100, y: 80, width: 800, height: 80, content: 'Why We Win', rotation: 0, zIndex: 1, style: { fontSize: 48, color: '#1a1a1a', fontFamily: 'serif', backgroundColor: 'transparent', fontWeight: 'bold' } },
            { id: '7-2', type: 'line', x: 100, y: 300, width: 800, height: 2, content: '', rotation: 0, zIndex: 2, style: { color: '#000', backgroundColor: 'transparent', fontSize: 16, fontFamily: 'sans' } },
            { id: '7-3', type: 'line', x: 500, y: 150, width: 2, height: 350, content: '', rotation: 0, zIndex: 3, style: { color: '#000', backgroundColor: 'transparent', fontSize: 16, fontFamily: 'sans' } },
            { id: '7-4', type: 'text', x: 520, y: 160, width: 200, height: 40, content: 'US (Advanced AI)', rotation: 0, zIndex: 4, style: { fontSize: 18, color: '#C5A059', fontWeight: 'bold', fontFamily: 'sans', backgroundColor: 'transparent' } }
        ],
        notes: 'Map your unique value propositions against incumbents.'
    },
    { id: '8', title: 'The Team', content: '', items: [{ id: '8-1', type: 'text', x: 100, y: 80, width: 800, height: 80, content: 'The People Behind the Vision', rotation: 0, zIndex: 1, style: { fontSize: 48, color: '#1a1a1a', fontFamily: 'serif', backgroundColor: 'transparent', fontWeight: 'bold' } }], notes: 'Why are you the right people?' },
    { id: '9', title: 'Traction', content: '', items: [{ id: '9-1', type: 'text', x: 100, y: 80, width: 800, height: 80, content: 'Milestones & Momentum', rotation: 0, zIndex: 1, style: { fontSize: 48, color: '#1a1a1a', fontFamily: 'serif', backgroundColor: 'transparent', fontWeight: 'bold' } }], notes: 'Users, revenue, or major partners.' },
    { id: '10', title: 'The Ask', content: '', items: [{ id: '10-1', type: 'text', x: 100, y: 80, width: 800, height: 80, content: 'Fueling Our Growth', rotation: 0, zIndex: 1, style: { fontSize: 48, color: '#1a1a1a', fontFamily: 'serif', backgroundColor: 'transparent', fontWeight: 'bold' } }, { id: '10-2', type: 'text', x: 100, y: 220, width: 800, height: 80, content: 'We are raising $2M to scale our engineering and marketing efforts.', rotation: 0, zIndex: 2, style: { fontSize: 32, color: '#444', fontFamily: 'sans', backgroundColor: 'transparent' } }], notes: 'Be explicit about what you need.' },
    { id: '11', title: 'Impact', content: '', items: [{ id: '11-1', type: 'text', x: 100, y: 80, width: 800, height: 80, content: 'The Global Vision', rotation: 0, zIndex: 1, style: { fontSize: 48, color: '#1a1a1a', fontFamily: 'serif', backgroundColor: 'transparent', fontWeight: 'bold' } }], notes: 'What does the world look like when you succeed?' },
    { id: '12', title: 'Thank You', content: '', items: [{ id: '12-1', type: 'text', x: 100, y: 150, width: 800, height: 100, content: 'JOIN US', rotation: 0, zIndex: 1, style: { fontSize: 80, color: '#1a1a1a', fontFamily: 'serif', backgroundColor: 'transparent', textAlign: 'center', fontWeight: 'bold' } }, { id: '12-2', type: 'text', x: 100, y: 300, width: 800, height: 60, content: 'contact@foudnerstack.ai', rotation: 0, zIndex: 2, style: { fontSize: 24, color: '#666', fontFamily: 'serif', backgroundColor: 'transparent', textAlign: 'center' } }], notes: 'Include call to action.' },
];

export const useDeckBuilderLogic = (
    data: StartupData,
    onSaveDeckVersion: (name: string, slides: Slide[], theme?: DeckTheme, versionId?: string) => Promise<string | any>
) => {
    const bgColorInputRef = useRef<HTMLInputElement>(null);
    const textColorInputRef = useRef<HTMLInputElement>(null);
    const [slides, setSlides] = useState<Slide[]>([]);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [isPresenting, setIsPresenting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [activeTool, setActiveTool] = useState<ToolType>('select');
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [sidebarTab, setSidebarTab] = useState<'style' | 'elements'>('elements');
    const [bulkStyleMode, setBulkStyleMode] = useState(false);
    const [isHome, setIsHome] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
    const [saveAsNewVersion, setSaveAsNewVersion] = useState(false);
    const [deckName, setDeckName] = useState(data?.name || 'Untitled Deck');
    const [windowSize, setWindowSize] = useState({ width: (typeof window !== 'undefined' ? window.innerWidth : 1920), height: (typeof window !== 'undefined' ? window.innerHeight : 1080) });
    const [theme, setTheme] = useState<DeckTheme>(DEFAULT_THEME);

    const canvasRef = useRef<HTMLDivElement>(null);
    const interactionRef = useRef<{
        type: 'move' | 'resize' | null;
        startPos: Point;
        itemStartPos: Point;
        itemStartSize: { width: number; height: number };
        resizeHandle: string | null;
    }>({
        type: null,
        startPos: { x: 0, y: 0 },
        itemStartPos: { x: 0, y: 0 },
        itemStartSize: { width: 0, height: 0 },
        resizeHandle: null,
    });

    const slidesRef = useRef(slides);
    const themeRef = useRef(theme);
    const currentVersionIdRef = useRef(currentVersionId);
    const isHomeRef = useRef(isHome);
    const deckNameRef = useRef(deckName);

    // Sync refs
    useEffect(() => { slidesRef.current = slides; }, [slides]);
    useEffect(() => { themeRef.current = theme; }, [theme]);
    useEffect(() => { currentVersionIdRef.current = currentVersionId; }, [currentVersionId]);
    useEffect(() => { isHomeRef.current = isHome; }, [isHome]);
    useEffect(() => { deckNameRef.current = deckName; }, [deckName]);

    // Data fetching
    const versions = useQuery(api.decks.listVersions, { projectId: data.id as any }) || [];

    // Resize listener
    useEffect(() => {
        const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Load initial data
    useEffect(() => {
        if (!data.id) return;
        if (slides.length > 0) return;

        if (data.deckVersions && data.deckVersions.length > 0) {
            const initialVersion = data.deckVersions[0];
            const parsedSlides = initialVersion.slides.map(s => ({
                ...s,
                items: typeof s.items === 'string' ? JSON.parse(s.items) : (s.items || [])
            }));
            setSlides(parsedSlides);
            if (initialVersion.theme) setTheme(initialVersion.theme);
            setCurrentVersionId(initialVersion.id);
            if (initialVersion.name) setDeckName(initialVersion.name);
        } else if (versions && versions.length > 0) {
            const v = versions[0];
            const parsedSlides = JSON.parse(v.slidesData).map((s: any) => ({
                ...s,
                items: typeof s.items === 'string' ? JSON.parse(s.items) : (s.items || [])
            }));
            setSlides(parsedSlides);
            if (v.theme) setTheme(JSON.parse(v.theme));
            setCurrentVersionId(v._id);
            if (v.name) setDeckName(v.name);
        } else if (versions !== undefined) {
            setSlides(createDefaultSlides(data.name));
            setCurrentVersionId(null);
        }
    }, [data.id, versions?.length]);

    const activeSlide: Slide = slides[activeSlideIndex] || { id: 'temp', title: 'Slide', content: '', items: [], notes: '' };
    const itemsArray = Array.isArray(activeSlide.items) ? activeSlide.items : [];
    const selectedItem = itemsArray.find(i => i.id === selectedItemId) || null;

    // Actions
    const updateSlide = (updates: Partial<Slide>) => {
        const newSlides = [...slides];
        if (activeSlideIndex >= 0 && activeSlideIndex < newSlides.length) {
            newSlides[activeSlideIndex] = { ...newSlides[activeSlideIndex], ...updates };
            setSlides(newSlides);
        }
    };

    const updateItem = (id: string, updates: Partial<CanvasItem>) => {
        const newItems = activeSlide.items?.map(item => item.id === id ? { ...item, ...updates } : item) || [];
        updateSlide({ items: newItems });
    };

    const updateItemStyle = (id: string, style: Partial<CanvasItem['style']>) => {
        if (bulkStyleMode) {
            const newItems = itemsArray.map(item => ({
                ...item,
                style: { ...item.style, ...style }
            }));
            updateSlide({ items: newItems });
        } else {
            const item = itemsArray.find(i => i.id === id);
            if (item) {
                updateItem(id, { style: { ...item.style, ...style } });
            }
        }
    };

    const updateItemTransform = (id: string, updates: Partial<CanvasItem>) => {
        if (bulkStyleMode) {
            const newItems = itemsArray.map(item => ({
                ...item,
                ...updates
            }));
            updateSlide({ items: newItems });
        } else {
            updateItem(id, updates);
        }
    };

    const bringToFront = (id: string) => {
        const maxZ = Math.max(...itemsArray.map(i => i.zIndex || 0), 0);
        updateItem(id, { zIndex: maxZ + 1 });
    };

    const sendToBack = (id: string) => {
        const minZ = Math.min(...itemsArray.map(i => i.zIndex || 0), 0);
        updateItem(id, { zIndex: minZ - 1 });
    };

    const addItem = (type: CanvasItem['type'], extra?: any) => {
        const newItem: CanvasItem = {
            id: Date.now().toString(),
            type,
            x: 100,
            y: 100,
            width: type === 'line' ? 200 : type === 'note' ? 200 : type === 'shape' ? 150 : 300,
            height: type === 'line' ? 4 : type === 'note' ? 200 : type === 'shape' ? 150 : 100,
            content: type === 'text' ? 'New Text' : type === 'note' ? 'New Note' : '',
            rotation: 0,
            zIndex: (activeSlide.items?.length || 0) + 1,
            style: {
                fontSize: type === 'text' ? 24 : 16,
                color: theme.textColor,
                fontFamily: theme.fontFamily,
                backgroundColor: type === 'note' ? '#C5A05940' : 'transparent',
                textAlign: 'center',
                ...extra
            }
        };
        updateSlide({ items: [...(activeSlide.items || []), newItem] });
        setSelectedItemId(newItem.id);
        setActiveTool('select');
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (activeTool !== 'select') {
            if (activeTool === 'text') addItem('text');
            if (activeTool === 'note') addItem('note');
            if (activeTool as string === 'square') addItem('shape', { shapeType: 'square', backgroundColor: theme.accentColor + '40', fontFamily: 'sans' });
            if (activeTool as string === 'circle') addItem('shape', { shapeType: 'circle', backgroundColor: theme.accentColor + '40', fontFamily: 'sans' });
            if (activeTool === 'line') addItem('line', { color: theme.textColor, fontFamily: 'sans', backgroundColor: 'transparent' });
            return;
        }
        if (e.target === canvasRef.current) {
            setSelectedItemId(null);
        }
    };

    const handleItemPointerDown = (e: React.PointerEvent, type: 'move' | 'resize', handle: string | null, itemId: string) => {
        e.stopPropagation();
        setSelectedItemId(itemId);
        const item = activeSlide.items?.find(i => i.id === itemId);
        if (!item) return;

        interactionRef.current = {
            type,
            startPos: { x: e.clientX, y: e.clientY },
            itemStartPos: { x: item.x, y: item.y },
            itemStartSize: { width: item.width, height: item.height },
            resizeHandle: handle
        };

        const handlePointerMove = (moveEvent: PointerEvent) => {
            const { type, startPos, itemStartPos, itemStartSize, resizeHandle } = interactionRef.current;
            if (!type) return;

            const dx = moveEvent.clientX - startPos.x;
            const dy = moveEvent.clientY - startPos.y;

            if (type === 'move') {
                updateItem(itemId, { x: itemStartPos.x + dx, y: itemStartPos.y + dy });
            } else if (type === 'resize' && resizeHandle) {
                let updates: any = {};
                if (resizeHandle.includes('e')) updates.width = Math.max(20, itemStartSize.width + dx);
                if (resizeHandle.includes('s')) updates.height = Math.max(20, itemStartSize.height + dy);
                if (resizeHandle.includes('w')) {
                    updates.width = Math.max(20, itemStartSize.width - dx);
                    updates.x = itemStartPos.x + dx;
                }
                if (resizeHandle.includes('n')) {
                    updates.height = Math.max(20, itemStartSize.height - dy);
                    updates.y = itemStartPos.y + dy;
                }

                // Enforce Aspect Ratio for circles
                if (item?.type === 'shape' && item?.style?.shapeType === 'circle') {
                    if (updates.width && updates.height) {
                        const size = Math.max(updates.width, updates.height);
                        updates.width = size;
                        updates.height = size;
                    } else if (updates.width) {
                        updates.height = updates.width;
                    } else if (updates.height) {
                        updates.width = updates.height;
                    }
                }
                updateItem(itemId, updates);
            }
        };

        const handlePointerUp = () => {
            interactionRef.current.type = null;
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    const handleMediaSelect = (url: string) => {
        const newItem: CanvasItem = {
            id: Date.now().toString(),
            type: 'image',
            x: 100,
            y: 100,
            width: 400,
            height: 300,
            content: url,
            rotation: 0,
            zIndex: (activeSlide.items?.length || 0) + 1,
            style: {
                backgroundColor: 'transparent',
                color: '#000',
                fontSize: 16,
                fontFamily: 'sans'
            }
        };
        updateSlide({ items: [...(activeSlide.items || []), newItem] });
        setShowMediaPicker(false);
    };

    // Auto-save interval
    useEffect(() => {
        const interval = setInterval(async () => {
            // Only auto-save if we are not in Home view and have slides
            if (!isHomeRef.current && slidesRef.current.length > 0) {
                // Use deckNameRef for current name
                const resultId = await onSaveDeckVersion(
                    deckNameRef.current || "Auto-save",
                    slidesRef.current,
                    themeRef.current,
                    currentVersionIdRef.current || undefined
                );
                if (resultId && typeof resultId === 'string' && !currentVersionIdRef.current) {
                    setCurrentVersionId(resultId);
                }
            }
        }, 60 * 1000);
        return () => clearInterval(interval);
    }, [onSaveDeckVersion]);

    // Keydown handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isPresenting) {
                if (e.key === 'ArrowRight' || e.key === ' ') {
                    setActiveSlideIndex(prev => Math.min(slides.length - 1, prev + 1));
                } else if (e.key === 'ArrowLeft') {
                    setActiveSlideIndex(prev => Math.max(0, prev - 1));
                } else if (e.key === 'Escape') {
                    setIsPresenting(false);
                }
            } else if (selectedItemId && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
                if (e.key === 'Backspace' || e.key === 'Delete') {
                    // Access slides from state or ref? Better to use itemsArray from current state if captured in closure, 
                    // but here we are in an effect dependent on [isPresenting, slides.length, selectedItemId, itemsArray, updateSlide]
                    // So we can access `itemsArray` directly if it's in scope, but wait, itemsArray is derived from activeSlide.
                    // The effect dependency list needs to be correct.
                    // Re-deriving itemsArray inside effect or trusting the closure dependency.
                    // To be safe, let's use the functional update pattern or just rely on the fact that this effect re-runs when `selectedItemId` changes.
                    // But `itemsArray` changes on every edit.

                    // Actually, let's look at original code:
                    // const newItems = itemsArray.filter(i => i.id !== selectedItemId);
                    // updateSlide({ items: newItems });
                    // setSelectedItemId(null);

                    // We need to re-derive itemsArray here to be safe or ensure dependencies are exhaustive.
                    // `itemsArray` is a constant in the render scope, so if we add it to dependency array it works.
                    // It is added in original code.

                    const currentSlide = slides[activeSlideIndex];
                    if (currentSlide && currentSlide.items) {
                        const currentItems = Array.isArray(currentSlide.items) ? currentSlide.items : [];
                        const newItems = currentItems.filter(i => i.id !== selectedItemId);
                        // We need to call updateSlide. But updateSlide uses `slides` state.
                        // So either updateSlide needs to use functional state update internally (it does now: `const newSlides = [...slides]`) 
                        // BUT `slides` captured in `updateSlide` might be stale if `updateSlide` isn't recreated.
                        // In the component `updateSlide` is a const function, recreated on every render.
                        // So it should be fine as long as effect depends on it.

                        const newSlides = [...slides];
                        if (activeSlideIndex >= 0 && activeSlideIndex < newSlides.length) {
                            newSlides[activeSlideIndex] = { ...newSlides[activeSlideIndex], items: newItems };
                            setSlides(newSlides);
                        }
                        setSelectedItemId(null);
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPresenting, slides, activeSlideIndex, selectedItemId]);


    return {
        // State
        slides, setSlides,
        activeSlideIndex, setActiveSlideIndex,
        isPresenting, setIsPresenting,
        isGenerating, setIsGenerating,
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
    };
};
