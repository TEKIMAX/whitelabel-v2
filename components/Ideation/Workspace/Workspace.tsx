import React, { useState, useRef, useEffect } from 'react';
import { CanvasItem, ToolType, Point, WorkspaceState, DeviceType } from '../../../types';
import { DEFAULT_ITEM_DIMENSIONS, DEFAULT_NOTE_COLOR, DEFAULT_SHAPE_COLOR, INITIAL_ZOOM, MAX_ZOOM, MIN_ZOOM } from '../../../constants';
import CanvasItemComponent from './CanvasItem';
import Toolbar from './Toolbar';
import PropertiesPanel from './PropertiesPanel';
import { toast } from 'sonner';
import { generateCanvasActions } from '../../../services/geminiService';
import { useUpdateIdeationWorkspace } from "../../../hooks/useUpdate";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from '../../../convex/_generated/dataModel';
import { ZoomIn, ZoomOut, Loader2, X, Sparkles, Upload, Link as LinkIcon, Image as ImageIcon, Search, ArrowLeft, LayoutGrid, MousePointer2, FileText, Smartphone, Monitor, Instagram, Layout, Group, Ungroup, Lock, Unlock, RotateCcw, RotateCw } from 'lucide-react';
import { usePresence } from '../../../hooks/usePresence';
import { FileSelector } from '../FileSelector';
import { toPng } from 'html-to-image';
import { Download } from 'lucide-react';

const USER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD'];
const getRandomColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
};

const CollaboratorCursor = ({ x, y, name, color }: { x: number, y: number, name: string, color: string }) => (
    <div
        className="absolute pointer-events-none z-50 transition-all duration-100 ease-linear"
        style={{ left: x, top: y }}
    >
        <MousePointer2
            className="w-4 h-4"
            style={{ color: color, fill: color }}
        />
        <div
            className="ml-4 px-2 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap shadow-sm"
            style={{ backgroundColor: color }}
        >
            {name}
        </div>
    </div>
);

// Helper component for loading skeletons
const StockImageTile: React.FC<{ url: string; onSelect: () => void }> = ({ url, onSelect }) => {
    const [loaded, setLoaded] = useState(false);

    return (
        <button
            className="aspect-square relative rounded-lg overflow-hidden group hover:ring-2 hover:ring-nobel-gold focus:outline-none bg-gray-50"
            onClick={onSelect}
        >
            {!loaded && (
                <div className="absolute inset-0 bg-gray-100 animate-pulse" />
            )}
            <img
                src={url}
                alt="Stock"
                className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-110 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setLoaded(true)}
            />
        </button>
    );
};

interface Props {
    onBack: () => void;
    title: string;
    workspace: WorkspaceState;
}

const Workspace: React.FC<Props> = ({ onBack, title, workspace }) => {
    // State
    const [items, setItems] = useState<CanvasItem[]>(workspace.items || []);
    const [activeTool, setActiveTool] = useState<ToolType>('select');
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [zoom, setZoom] = useState(INITIAL_ZOOM);
    const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
    const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    const [isFrameModalOpen, setIsFrameModalOpen] = useState(false);
    const [pendingFrameConfig, setPendingFrameConfig] = useState<{ width: number; height: number; deviceType: DeviceType } | null>(null);

    // Mutations
    const updateWorkspace = useUpdateIdeationWorkspace();

    // Auto-Save Logic
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Skip initial load save or if items haven't changed meaningfully (could add deep comparison but simple debounce is fine for now)
        setSaveStatus('unsaved');

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            setSaveStatus('saving');
            try {
                await updateWorkspace({
                    id: workspace.id as Id<"ideation_workspaces">,
                    items: JSON.stringify(items),
                });
                setSaveStatus('saved');
            } catch (error) {
                setSaveStatus('unsaved');
            }
        }, 1000); // 1s debounce

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [items, updateWorkspace, workspace.id]);

    // Modals
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);


    // Image Modal State
    const [activeImageTab, setActiveImageTab] = useState<'upload' | 'url' | 'search' | 'files'>('upload');
    const [imageUrlInput, setImageUrlInput] = useState('');
    const [stockQuery, setStockQuery] = useState('abstract'); // Default term
    const [stockImages, setStockImages] = useState<string[]>([]);
    const [isSearchingStock, setIsSearchingStock] = useState(false);
    const [stockPage, setStockPage] = useState(1);

    // Font Picker State (Lifted from PropertiesPanel)
    const [isFontPickerOpen, setIsFontPickerOpen] = useState(false);

    // Canvas Lock State
    const [isCanvasLocked, setIsCanvasLocked] = useState(false);

    // History State (Undo/Redo)
    const [past, setPast] = useState<CanvasItem[][]>([]);
    const [future, setFuture] = useState<CanvasItem[][]>([]);

    // Load History from LocalStorage
    useEffect(() => {
        const workspaceId = workspace.id;
        if (workspaceId) {
            const savedPast = localStorage.getItem(`pillar_history_past_${workspaceId}`);
            const savedFuture = localStorage.getItem(`pillar_history_future_${workspaceId}`);
            if (savedPast) setPast(JSON.parse(savedPast));
            if (savedFuture) setFuture(JSON.parse(savedFuture));
        }
    }, [workspace.id]);

    // Save History to LocalStorage
    useEffect(() => {
        const workspaceId = workspace.id;
        if (workspaceId) {
            localStorage.setItem(`pillar_history_past_${workspaceId}`, JSON.stringify(past));
            localStorage.setItem(`pillar_history_future_${workspaceId}`, JSON.stringify(future));
        }
    }, [past, future, workspace.id]);

    const saveHistory = () => {
        setPast(prev => {
            const newPast = [...prev, items];
            // Optional: Limit history size to 50
            if (newPast.length > 50) return newPast.slice(newPast.length - 50);
            return newPast;
        });
        setFuture([]);
    };

    const undo = () => {
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);
        setFuture(prev => [items, ...prev]);
        setItems(previous);
        setPast(newPast);
    };

    const redo = () => {
        if (future.length === 0) return;
        const next = future[0];
        const newFuture = future.slice(1);
        setPast(prev => [...prev, items]);
        setItems(next);
        setFuture(newFuture);
    };

    // Keyboard Shortcuts (Undo/Redo)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            }
            // Ctrl+Y for Redo (Windows style)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [past, future, items]);

    // Auto-search when tab opens
    useEffect(() => {
        if (activeImageTab === 'search' && stockImages.length === 0) {
            handleStockSearch(true);
        }
    }, [activeImageTab]);

    // Interaction State
    const canvasRef = useRef<HTMLDivElement>(null);
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const historySnapshotRef = useRef<CanvasItem[]>([]);
    const exportRef = useRef<HTMLDivElement>(null);

    // Export State
    const [exportItems, setExportItems] = useState<CanvasItem[] | null>(null);

    // Presence
    // Mock User Identity for this session
    const [userId] = useState(() => "user_" + Math.floor(Math.random() * 10000));
    const [userName] = useState(() => "User " + userId.slice(-4));
    const userColor = useRef(getRandomColor(userId)).current;

    const { presentUsers, broadcastImmediately } = usePresence(`workspace:${workspace.id}`, userId, {
        name: userName,
        color: userColor,
        cursor: null
    });

    // Throttle cursor updates
    const lastBroadcast = useRef(0);
    const handleCursorMove = (e: React.MouseEvent) => {
        if (!canvasRef.current) return;

        // Calculate position relative to CANVAS (so it stays correct during pan/zoom for others)
        const rect = canvasRef.current.getBoundingClientRect();
        // But wait, the canvasRef IS the zoomed container? 
        // No, usually we want cursor in "World Coordinates".
        // My screenToCanvas helper does exactly that.

        const canvasPos = screenToCanvas(e.clientX, e.clientY);

        const now = Date.now();
        if (now - lastBroadcast.current > 50) { // 50ms throttle (20fps)
            broadcastImmediately({
                cursor: canvasPos,
                name: userName,
                color: userColor
            });
            lastBroadcast.current = now;
        }
    };

    // Refs for event listener access
    const zoomRef = useRef(zoom);
    const panRef = useRef(pan);
    useEffect(() => { zoomRef.current = zoom; }, [zoom]);
    useEffect(() => { panRef.current = pan; }, [pan]);

    // Refs for event listener access
    const interactionRef = useRef<{
        type: 'move' | 'resize' | 'pan' | null;
        itemIds: string[]; // Array of items being moved/interacted
        startPos: Point; // Screen coordinates at start
        itemsStartPos: Record<string, Point>; // Map of ID -> Start Position
        itemStartSize: { width: number; height: number }; // Only for resizing single item
        resizeHandle: string | null;
    }>({
        type: null,
        itemIds: [],
        startPos: { x: 0, y: 0 },
        itemsStartPos: {},
        itemStartSize: { width: 0, height: 0 },
        resizeHandle: null,
    });

    // Helpers
    const screenToCanvas = (sx: number, sy: number) => {
        return {
            x: (sx - pan.x) / zoom,
            y: (sy - pan.y) / zoom,
        };
    };

    // Actions
    const addItem = (type: CanvasItem['type'], x: number, y: number, content: string = '', extraStyle = {}) => {
        saveHistory();
        let dimensions = DEFAULT_ITEM_DIMENSIONS[type];
        let extraProps = {};

        if (type === 'frame') {
            if (pendingFrameConfig) {
                dimensions = { width: pendingFrameConfig.width, height: pendingFrameConfig.height };
                extraProps = { deviceType: pendingFrameConfig.deviceType };
                // Reset config after use
                setPendingFrameConfig(null);
            } else {
                extraProps = { deviceType: 'phone' };
            }
        }

        const newItem: CanvasItem = {
            id: crypto.randomUUID(),
            type,
            x,
            y,
            width: dimensions.width,
            height: dimensions.height,
            content,
            rotation: 0,
            zIndex: type === 'frame' ? 0 : items.length + 1, // Frames start at back usually
            style: {
                backgroundColor: type === 'note' ? DEFAULT_NOTE_COLOR : (type === 'shape' ? DEFAULT_SHAPE_COLOR : 'transparent'),
                color: '#1a1a1a',
                fontSize: 16,
                fontFamily: 'sans',
                ...extraProps,
                ...extraStyle,
            },
        };
        setItems((prev) => [...prev, newItem]);
        setSelectedItemIds([newItem.id]);
        setActiveTool('select');
    };

    const updateItem = (id: string, updates: Partial<CanvasItem>) => {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    };

    const updateItemWithHistory = (id: string, updates: Partial<CanvasItem>) => {
        saveHistory();
        updateItem(id, updates);
    };

    const updateItemStyle = (id: string, style: Partial<CanvasItem['style']>) => {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, style: { ...item.style, ...style } } : item)));
    };

    const updateItemStyleWithHistory = (id: string, style: Partial<CanvasItem['style']>) => {
        saveHistory();
        updateItemStyle(id, style);
    };

    const deleteItem = (id?: string) => {
        saveHistory();
        if (id) {
            setItems((prev) => prev.filter((item) => item.id !== id));
            setSelectedItemIds((prev) => prev.filter(sid => sid !== id));
        } else {
            setItems((prev) => prev.filter((item) => !selectedItemIds.includes(item.id)));
            setSelectedItemIds([]);
        }
    };

    const duplicateItem = (id: string) => {
        // Duplicate specific item or all selected?
        // If ID passed matches selection, duplicate all selected.
        const idsToDuplicate = selectedItemIds.includes(id) ? selectedItemIds : [id];

        idsToDuplicate.forEach(originalId => {
            const item = items.find(i => i.id === originalId);
            if (item) {
                addItem(item.type, item.x + 20, item.y + 20, item.content, item.style);
            }
        });
    };

    // Grouping
    const handleGroup = () => {
        if (selectedItemIds.length < 2) return;
        const newGroupId = crypto.randomUUID();
        setItems(prev => prev.map(item => selectedItemIds.includes(item.id) ? { ...item, groupId: newGroupId } : item));
        // Ensure they stay selected? Yes.
    };

    const handleUngroup = () => {
        setItems(prev => prev.map(item => selectedItemIds.includes(item.id) ? { ...item, groupId: undefined } : item));
    };

    const changeZIndex = (id: string, direction: 'front' | 'back') => {
        setItems(prev => {
            const newItems = [...prev];
            const idx = newItems.findIndex(i => i.id === id);
            if (idx === -1) return prev;

            const item = newItems[idx];
            newItems.splice(idx, 1);

            if (direction === 'front') {
                newItems.push(item);
            } else {
                newItems.unshift(item);
            }
            return newItems.map((itm, index) => ({ ...itm, zIndex: index + 1 }));
        })
    }

    // Event Handlers
    const handlePointerDown = (e: React.PointerEvent) => {
        // If locked or font picker open, disable interactions
        if (isCanvasLocked || isFontPickerOpen) return;

        const { clientX, clientY } = e;

        // Middle mouse or Hand tool -> Pan
        if (activeTool === 'hand' || e.button === 1) {
            interactionRef.current = { ...interactionRef.current, type: 'pan', startPos: { x: clientX, y: clientY } };
            setIsDraggingCanvas(true);
            return;
        }

        // Tools that create items on click
        if (['note', 'text', 'shape', 'line', 'frame'].includes(activeTool)) {
            const pos = screenToCanvas(clientX, clientY);
            const width = DEFAULT_ITEM_DIMENSIONS[activeTool as keyof typeof DEFAULT_ITEM_DIMENSIONS].width;
            const height = DEFAULT_ITEM_DIMENSIONS[activeTool as keyof typeof DEFAULT_ITEM_DIMENSIONS].height;
            addItem(activeTool as any, pos.x - width / 2, pos.y - height / 2);
            return;
        }

        // Clicking on background deselects
        setSelectedItemIds([]);

        // If we click background with select tool, we can also pan
        interactionRef.current = { ...interactionRef.current, type: 'pan', startPos: { x: clientX, y: clientY } };
        setIsDraggingCanvas(true);
    };

    const handleItemPointerDown = (e: React.PointerEvent, type: 'move' | 'resize', handle: string = '', itemId: string) => {
        if (activeTool === 'hand') return;

        // Snapshot history before interaction starts
        historySnapshotRef.current = items;

        let newSelection = [...selectedItemIds];
        const clickedItem = items.find(i => i.id === itemId);

        if (e.shiftKey) {
            if (newSelection.includes(itemId)) {
                newSelection = newSelection.filter(id => id !== itemId);
            } else {
                newSelection.push(itemId);
            }
        } else {
            // If clicking an unselected item without shift
            if (!newSelection.includes(itemId)) {
                // If item is part of a group, select the whole group
                if (clickedItem?.groupId) {
                    const groupIds = items.filter(i => i.groupId === clickedItem.groupId).map(i => i.id);
                    newSelection = groupIds;
                } else {
                    newSelection = [itemId];
                }
            }
            // If clicking an ALREADY selected item (for drag), keep selection!
        }

        setSelectedItemIds(newSelection);

        // Prepare for interaction (Move/Resize)
        // If moving, we move ALL selected items.
        // If resizing, we currently restrict to SINGLE item resize for simplicity

        const itemsToMove = newSelection;
        const itemsStartPos: Record<string, Point> = {};

        itemsToMove.forEach(id => {
            const itm = items.find(i => i.id === id);
            if (itm) itemsStartPos[id] = { x: itm.x, y: itm.y };
        });

        // Current item for resize logic
        const currentItem = items.find(i => i.id === itemId);
        if (!currentItem) return;

        interactionRef.current = {
            type,
            itemIds: itemsToMove,
            startPos: { x: e.clientX, y: e.clientY },
            itemsStartPos, // Store all start positions
            itemStartSize: { width: currentItem.width, height: currentItem.height },
            resizeHandle: handle || null,
        };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        const { clientX, clientY } = e;
        const { type, startPos, itemsStartPos, itemStartSize, resizeHandle } = interactionRef.current;

        // Pan
        if (type === 'pan') {
            const dx = clientX - startPos.x;
            const dy = clientY - startPos.y;
            setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
            interactionRef.current.startPos = { x: clientX, y: clientY };
            return;
        }

        // Move Item(s)
        if (interactionRef.current.itemIds.length > 0 && type === 'move') {
            const dx = (clientX - startPos.x) / zoom;
            const dy = (clientY - startPos.y) / zoom;

            // Move ALL selected items
            // We need to batch update? `setItems` once.
            setItems(prev => prev.map(item => {
                if (interactionRef.current.itemIds.includes(item.id)) {
                    const start = interactionRef.current.itemsStartPos[item.id];
                    if (start) return { ...item, x: start.x + dx, y: start.y + dy };
                }
                return item;
            }));
        }

        // Resize Item (Single)
        if (interactionRef.current.itemIds.length === 1 && type === 'resize') {
            const itemId = interactionRef.current.itemIds[0];
            const itemStartPos = interactionRef.current.itemsStartPos[itemId];

            // Calculate the delta movement from the START of the drag to NOW
            const dx = (clientX - startPos.x) / zoom;
            const dy = (clientY - startPos.y) / zoom;

            let newWidth = itemStartSize.width;
            let newHeight = itemStartSize.height;
            let newX = itemStartPos.x;
            let newY = itemStartPos.y;

            // e = East (Right), w = West (Left), s = South (Bottom), n = North (Top)
            // CanvasItem sends compass directions: 'se', 'sw', 'ne', 'nw'

            // Horizontal
            if (resizeHandle?.includes('e')) {
                newWidth = itemStartSize.width + dx;
            } else if (resizeHandle?.includes('w')) {
                newWidth = itemStartSize.width - dx;
                newX = itemStartPos.x + dx;
            }

            // Vertical
            if (resizeHandle?.includes('s')) {
                newHeight = itemStartSize.height + dy;
            } else if (resizeHandle?.includes('n')) {
                newHeight = itemStartSize.height - dy;
                newY = itemStartPos.y + dy;
            }

            // Constrain
            if (newWidth < 20) {
                if (resizeHandle?.includes('w')) newX = itemStartPos.x + itemStartSize.width - 20;
                newWidth = 20;
            }
            if (newHeight < 20) {
                if (resizeHandle?.includes('n')) newY = itemStartPos.y + itemStartSize.height - 20;
                newHeight = 20;
            }

            updateItem(itemId, { width: newWidth, height: newHeight, x: newX, y: newY });
        }
    };

    const handlePointerUp = () => {
        if (['move', 'resize'].includes(interactionRef.current.type || '')) {
            // If items actually changed (simple ref comparison won't work primarily if logic mutates, but strict equality of array might fail if updated properly)
            // Ideally we assume if type was move/resize, we want a history point OR check if it actually moved.
            // Let's just save for now to ensure we catch it.
            // But we need to verify we *did* save the snapshot? Yes, in handleItemPointerDown.

            // Check if items changed
            if (JSON.stringify(historySnapshotRef.current) !== JSON.stringify(items)) {
                setPast(prev => [...prev, historySnapshotRef.current]);
                setFuture([]);
            }
        }

        interactionRef.current = {
            type: null,
            itemIds: [],
            startPos: { x: 0, y: 0 },
            itemsStartPos: {},
            itemStartSize: { width: 0, height: 0 },
            resizeHandle: null,
        };
        setIsDraggingCanvas(false);
    };

    // Image Handling
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                const pos = screenToCanvas(window.innerWidth / 2, window.innerHeight / 2);
                addItem('image', pos.x, pos.y, event.target.result as string);
                setIsImageModalOpen(false);
            }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleUrlImageAdd = () => {
        if (imageUrlInput.trim()) {
            const pos = screenToCanvas(window.innerWidth / 2, window.innerHeight / 2);
            addItem('image', pos.x, pos.y, imageUrlInput.trim());
            setImageUrlInput('');
            setIsImageModalOpen(false);
        }
    };

    const handleStockSearch = async (reset = false) => {
        if (!stockQuery.trim()) return;
        setIsSearchingStock(true);

        let page = reset ? 1 : stockPage + 1;
        if (reset) {
            setStockImages([]);
            setStockPage(1);
        }

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // Simulate Pixabay search using loremflickr tags
        const results = Array.from({ length: 15 }).map((_, i) =>
            `https://loremflickr.com/400/300/${encodeURIComponent(stockQuery.trim())}?lock=${i + Date.now() + (page * 100)}`
        );

        setStockImages(prev => reset ? results : [...prev, ...results]);
        setStockPage(page);
        setIsSearchingStock(false);
    };

    const handleStockImageSelect = (url: string) => {
        const pos = screenToCanvas(window.innerWidth / 2, window.innerHeight / 2);
        addItem('image', pos.x, pos.y, url);
        // setIsImageModalOpen(false); // Keep open if they want to add more? User flow suggests maybe closing is better. Sticking to closing for now.
        setIsImageModalOpen(false);
    };

    // AI Generation
    const handleAIGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);

        // 1. Prepare Context (Simplify items to save tokens)
        const contextItems = items.slice(0, 50).map(item => ({
            id: item.id,
            type: item.type,
            content: item.content,
            x: Math.round(item.x),
            y: Math.round(item.y),
            color: item.style.backgroundColor
        }));
        const contextString = JSON.stringify(contextItems);

        // 2. Call AI
        const { actions, thought_process } = await generateCanvasActions(aiPrompt, contextString);

        if (!actions || actions.length === 0) {
            toast.error(thought_process?.startsWith("Error") ? thought_process : "AI didn't suggest any changes.");
            setIsGenerating(false);
            return;
        }

        // 3. Execute Actions
        actions.forEach(action => {
            if (action.action === 'create') {
                // Determine position: use provided or default to center with offset
                let x = action.position?.x;
                let y = action.position?.y;

                if (x === undefined || y === undefined) {
                    const center = screenToCanvas(window.innerWidth / 2, window.innerHeight / 2);
                    x = center.x + (Math.random() - 0.5) * 200;
                    y = center.y + (Math.random() - 0.5) * 200;
                }

                // Determine style
                const extraStyle: any = {};
                if (action.visuals?.color) extraStyle.backgroundColor = action.visuals.color;

                // Map item types if needed (e.g. 'text' -> 'note' if not strictly separate)
                // Assuming 'note', 'shape', 'text' are valid types in addItem
                if (action.itemType) {
                    addItem(action.itemType as any, x, y, action.content || '', extraStyle);
                }

            } else if (action.action === 'update' && action.targetId) {
                const target = items.find(i => i.id === action.targetId);
                if (target) {
                    const updates: any = {};
                    const styleUpdates: any = {};

                    if (action.content) updates.content = action.content;
                    if (action.position) {
                        if (action.position.x !== undefined) updates.x = action.position.x;
                        if (action.position.y !== undefined) updates.y = action.position.y;
                    }
                    if (action.visuals?.color) styleUpdates.backgroundColor = action.visuals.color;

                    if (Object.keys(updates).length > 0) updateItemWithHistory(action.targetId, updates);
                    if (Object.keys(styleUpdates).length > 0) updateItemStyleWithHistory(action.targetId, styleUpdates);
                }

            } else if (action.action === 'delete' && action.targetId) {
                deleteItem(action.targetId);
            }
        });

        setIsGenerating(false);
        setIsAIModalOpen(false);
        setAiPrompt('');
    };


    // Export Logic
    const [exportSize, setExportSize] = useState({ width: 0, height: 0 });

    const handleExport = () => {
        const targets = items.filter(i => selectedItemIds.includes(i.id));
        if (targets.length === 0) return;

        // Calculate Bounding Box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        targets.forEach(item => {
            if (item.x < minX) minX = item.x;
            if (item.y < minY) minY = item.y;
            if (item.x + item.width > maxX) maxX = item.x + item.width;
            if (item.y + item.height > maxY) maxY = item.y + item.height;
        });

        // Add padding
        const padding = 40;
        const width = maxX - minX + (padding * 2);
        const height = maxY - minY + (padding * 2);

        // Create export-ready items (shifted)
        const shiftedItems = targets.map(item => ({
            ...item,
            x: item.x - minX + padding,
            y: item.y - minY + padding
        }));

        setExportSize({ width, height });
        setExportItems(shiftedItems);
    };

    useEffect(() => {
        if (exportItems && exportRef.current) {
            // Wait for render cycle - simpler with timeout
            const timer = setTimeout(async () => {
                try {
                    const dataUrl = await toPng(exportRef.current!, { cacheBust: true, pixelRatio: 2 });
                    const link = document.createElement('a');
                    link.download = `pillaros-export-${Date.now()}.png`;
                    link.href = dataUrl;
                    link.click();
                } catch (err) {
                } finally {
                    setExportItems(null); // Reset
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [exportItems]);

    // Native Wheel Listener for non-passive behavior
    useEffect(() => {
        const container = canvasContainerRef.current;
        if (!container) return;

        const onWheel = (e: WheelEvent) => {
            // Prevent zoom/pan if locked or font picker is open
            if (isCanvasLocked || isFontPickerOpen) return;

            e.preventDefault();

            if (e.ctrlKey || e.metaKey) {
                // Zoom logic
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                setZoom(z => Math.min(Math.max(z + delta, MIN_ZOOM), MAX_ZOOM));
            } else {
                // Pan logic
                setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
            }
        };

        container.addEventListener('wheel', onWheel, { passive: false });
        // NOTE: Cleanup needs to be careful if we have stale isCanvasLocked closure. 
        // Adding locks to dependancy array would cause listener re-bind which is fine.
        return () => container.removeEventListener('wheel', onWheel);
    }, [isCanvasLocked, isFontPickerOpen]);

    // Keyboard Shortcuts (Delete/Backspace/Group)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Delete
            if (selectedItemIds.length > 0 && (e.key === 'Backspace' || e.key === 'Delete')) {
                if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return;
                deleteItem(); // Delete all selected items
            }

            // Group (Ctrl+G)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
                e.preventDefault();
                // Check if shift is held -> Ungroup? Or just toggle?
                // Standard is Ctrl+G = Group, Ctrl+Shift+G = Ungroup.
                if (e.shiftKey) {
                    handleUngroup();
                } else {
                    handleGroup();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedItemIds, handleGroup, handleUngroup, deleteItem]);


    return (
        <div
            ref={canvasContainerRef}
            className={`w-screen h-screen bg-nobel-cream relative overflow-hidden box-border canvas-pattern transition-cursor duration-100 ${activeTool === 'hand' || isDraggingCanvas ? 'cursor-grabbing' : 'cursor-default'}`}
            style={{
                backgroundSize: '24px 24px'
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            {/* --- Fixed UI Elements (Overlay) --- */}

            {/* Back Button */}
            <div className="fixed top-6 left-6 z-[100]" onPointerDown={(e) => e.stopPropagation()}>
                <button
                    onClick={onBack}
                    className="flex items-center gap-3 pl-3 pr-6 py-2.5 bg-white/90 backdrop-blur-md shadow-lg rounded-full border border-nobel-gold/20 text-nobel-dark hover:bg-gray-50 transition-all group"
                    title="Back to Dashboard"
                >
                    <div className="p-1.5 rounded-full group-hover:bg-nobel-gold group-hover:text-white transition-colors text-nobel-dark/50 bg-[#f3f4f6]">
                        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                    </div>
                    <span className="text-lg font-serif font-bold text-nobel-dark">
                        {title}
                    </span>
                </button>
            </div>

            {/* Save Status Indicator & Lock Control */}
            <div className="fixed bottom-6 left-6 z-[100] flex items-center gap-4">
                <div className={`px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md shadow-sm border transition-all duration-300 pointer-events-none
                    ${saveStatus === 'saved' ? 'bg-white/80 border-green-200 text-green-700' :
                        saveStatus === 'saving' ? 'bg-white/80 border-nobel-gold/30 text-nobel-gold' :
                            'bg-white/80 border-yellow-200 text-yellow-700'}`}>
                    {saveStatus === 'saved' && 'Saved'}
                    {saveStatus === 'saving' && 'Saving...'}
                    {saveStatus === 'unsaved' && 'Unsaved Changes'}
                </div>

                <button
                    onClick={() => setIsCanvasLocked(!isCanvasLocked)}
                    className={`w-10 h-10 rounded-full shadow-lg border flex items-center justify-center transition-all duration-300 ${isCanvasLocked || isFontPickerOpen
                        ? 'bg-nobel-gold border-nobel-gold text-white'
                        : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'
                        }`}
                    title={isCanvasLocked ? "Unlock Canvas" : "Lock Canvas"}
                >
                    {isCanvasLocked || isFontPickerOpen ? <Lock size={16} /> : <Unlock size={16} />}
                </button>
            </div>

            {/* Toolbar */}
            <div onPointerDown={(e) => e.stopPropagation()}>
                <Toolbar
                    activeTool={activeTool}
                    setActiveTool={setActiveTool}
                    onImageClick={() => setIsImageModalOpen(true)}
                    onAIModalOpen={() => setIsAIModalOpen(true)}
                    onFrameClick={() => setIsFrameModalOpen(true)}
                />
            </div>

            {/* Undo / Redo Controls */}
            <div className="fixed top-6 right-6 flex gap-2 z-[100]" onPointerDown={(e) => e.stopPropagation()}>
                <button
                    onClick={undo}
                    disabled={past.length === 0}
                    className="p-3 bg-white rounded-xl shadow-md border border-gray-200 text-gray-700 hover:text-nobel-gold hover:border-nobel-gold/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    title="Undo (Ctrl+Z)"
                >
                    <RotateCcw size={18} />
                </button>
                <button
                    onClick={redo}
                    disabled={future.length === 0}
                    className="p-3 bg-white rounded-xl shadow-md border border-gray-200 text-gray-700 hover:text-nobel-gold hover:border-nobel-gold/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    title="Redo (Ctrl+Y)"
                >
                    <RotateCw size={18} />
                </button>
            </div>

            {/* Properties Panel (Single Selection) */}
            <div onPointerDown={(e) => e.stopPropagation()}>
                <PropertiesPanel
                    selectedItem={selectedItemIds.length === 1 ? items.find(i => i.id === selectedItemIds[0]) || null : null}
                    updateItemStyle={updateItemStyleWithHistory}
                    updateItem={updateItemWithHistory}
                    deleteItem={deleteItem}
                    duplicateItem={duplicateItem}
                    changeZIndex={changeZIndex}
                    selectedItemIds={selectedItemIds} // Pass selectedItemIds for multi-selection actions
                    isFontPickerOpen={isFontPickerOpen}
                    setIsFontPickerOpen={setIsFontPickerOpen}
                />
            </div>

            {/* Grouping Controls (Multi Selection) */}
            {selectedItemIds.length > 1 && (
                <div
                    className="fixed top-1/2 left-6 -translate-y-1/2 bg-nobel-dark/90 backdrop-blur-md shadow-xl rounded-full border border-white/10 p-2 flex flex-col gap-2 z-[90] animate-in slide-in-from-left-4 fade-in duration-200"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={handleGroup}
                        className="p-3 rounded-full hover:bg-white/10 text-white transition-all flex items-center justify-center gap-2 group relative"
                        title="Group (Ctrl+G)"
                    >
                        <Group size={20} />
                        {/* Tooltip */}
                        <span className="absolute left-full top-1/2 ml-3 -translate-y-1/2 bg-nobel-dark text-white text-xs font-medium py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                            Group
                        </span>
                    </button>
                    <button
                        onClick={handleUngroup}
                        className="p-3 rounded-full hover:bg-white/10 text-white transition-all flex items-center justify-center gap-2 group relative"
                        title="Ungroup (Ctrl+Shift+G)"
                    >
                        <Ungroup size={20} className="opacity-70" />
                        <span className="absolute left-full top-1/2 ml-3 -translate-y-1/2 bg-nobel-dark text-white text-xs font-medium py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                            Ungroup
                        </span>
                    </button>
                    <div className="h-px w-full bg-white/10 my-1"></div>
                    <button
                        onClick={handleExport}
                        className="p-3 rounded-full hover:bg-white/10 text-white transition-all flex items-center justify-center gap-2 group relative"
                        title="Export Selection"
                    >
                        <Download size={20} />
                        <span className="absolute left-full top-1/2 ml-3 -translate-y-1/2 bg-nobel-dark text-white text-xs font-medium py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                            Export
                        </span>
                    </button>
                </div>
            )}

            {/* Hidden Export Container */}
            {exportItems && (
                <div
                    ref={exportRef}
                    style={{
                        position: 'fixed',
                        top: '-9999px',
                        left: '-9999px',
                        width: exportSize.width,
                        height: exportSize.height,
                        zIndex: -1000,
                        opacity: 0, // Use opacity instead of visibility
                        display: 'block',
                        backgroundColor: 'transparent',
                        pointerEvents: 'none'
                    }}
                >
                    {exportItems.map(item => (
                        <CanvasItemComponent
                            key={item.id}
                            item={item}
                            isSelected={false}
                            onMouseDown={() => { }}
                            updateItemContent={() => { }}
                            scale={1} // Export at 1x scale
                        />
                    ))}
                </div>
            )}

            {/* Zoom Controls */}
            <div className="fixed bottom-6 right-6 flex gap-2 z-[100]" onPointerDown={(e) => e.stopPropagation()}>
                <button
                    onClick={() => setZoom(z => Math.max(z - 0.1, MIN_ZOOM))}
                    className="w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-nobel-gold hover:border-nobel-gold transition-colors"
                >
                    <ZoomOut size={18} />
                </button>
                <div className="bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-nobel-gold/20 flex items-center justify-center px-4 font-mono text-xs h-10">
                    {Math.round(zoom * 100)}%
                </div>
                <button
                    onClick={() => setZoom(z => Math.min(z + 0.1, MAX_ZOOM))}
                    className="w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-nobel-gold hover:border-nobel-gold transition-colors"
                >
                    <ZoomIn size={18} />
                </button>
            </div>

            {/* --- Canvas Content (Transformed) --- */}
            <div
                ref={canvasRef}
                className="w-full h-full absolute top-0 left-0"
                style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: '0 0',
                    width: '100%',
                    height: '100%'
                }}
            >
                {items.map(item => (
                    <CanvasItemComponent
                        key={item.id}
                        item={item}
                        isSelected={selectedItemIds.includes(item.id)}
                        onMouseDown={(e, type, handle) => handleItemPointerDown(e, type, handle, item.id)}
                        updateItemContent={(id, content) => updateItem(id, { content })}
                        scale={zoom}
                    />
                ))}
            </div>

            {/* Empty State */}
            {items.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-10">
                    <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center text-center max-w-md shadow-sm">
                        <div className="w-16 h-16 bg-nobel-gold/10 rounded-full flex items-center justify-center mb-4 text-nobel-gold">
                            <Sparkles size={32} />
                        </div>
                        <h3 className="text-xl font-serif font-bold text-nobel-dark mb-2">Start your Ideation</h3>
                        <p className="text-gray-500 mb-6">
                            Select a tool like <span className="font-semibold text-nobel-gold">Sticky Note</span> or <span className="font-semibold text-nobel-gold">Shape</span> from the toolbar, then <span className="font-bold text-gray-700">click anywhere</span> on the canvas to place it.
                        </p>
                    </div>
                </div>
            )}

            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
            />

            {/* Frame Selection Modal */}
            {isFrameModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8 relative">
                        <button
                            onClick={() => setIsFrameModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose a Frame</h2>
                            <p className="text-gray-500">Select a preset frame size for your design.</p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Phone', type: 'phone', width: 375, height: 812, icon: Smartphone },
                                { label: 'Tablet', type: 'tablet', width: 768, height: 1024, icon: Smartphone /* Rotated? No icon avail */ },
                                { label: 'Desktop', type: 'desktop', width: 1440, height: 900, icon: Monitor },
                                { label: 'A4 Paper', type: 'a4', width: 595, height: 842, icon: FileText },
                                { label: 'Social Square', type: 'social', width: 1080, height: 1080, icon: Instagram },
                                { label: 'Social Cover', type: 'social', width: 1200, height: 628, icon: ImageIcon },
                                { label: 'Generic Rect', type: 'custom', width: 800, height: 600, icon: Layout },
                            ].map((preset) => (
                                <button
                                    key={preset.label}
                                    onClick={() => {
                                        setPendingFrameConfig({ width: preset.width, height: preset.height, deviceType: preset.type as DeviceType });
                                        setActiveTool('frame');
                                        setIsFrameModalOpen(false);
                                    }}
                                    className="flex flex-col items-center justify-center p-6 border-2 border-gray-100 rounded-xl hover:border-nobel-gold hover:bg-nobel-gold/5 transition-all group gap-3"
                                >
                                    <div className="p-3 bg-gray-50 rounded-full group-hover:bg-white group-hover:shadow-sm transition-all text-gray-500 group-hover:text-nobel-gold">
                                        <preset.icon size={24} />
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold text-gray-900 text-sm group-hover:text-nobel-dark">{preset.label}</div>
                                        <div className="text-[10px] text-gray-400 font-mono mt-1">{preset.width} x {preset.height}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* AI Modal */}
            {isAIModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in-up" onPointerDown={(e) => e.stopPropagation()}>
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-nobel-gold relative">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-serif font-bold text-nobel-dark flex items-center gap-2">
                                <Sparkles className="text-nobel-gold" />
                                Magic Maker
                            </h2>
                            <button onClick={() => setIsAIModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>

                        <textarea
                            className="w-full h-32 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-nobel-gold/50 focus:border-nobel-gold outline-none resize-none mb-4 font-sans text-sm"
                            placeholder="Describe your brainstorming topic (e.g., 'Eco-friendly housing features')..."
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                        />

                        <button
                            onClick={handleAIGenerate}
                            disabled={isGenerating || !aiPrompt.trim()}
                            className="w-full bg-nobel-gold text-white font-medium py-3 rounded-xl hover:bg-[#B3904D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isGenerating ? <><Loader2 size={18} className="animate-spin" /> Generating...</> : 'Generate'}
                        </button>
                    </div>
                </div>
            )}

            {/* Image Picker Modal */}
            {isImageModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in-up" onPointerDown={(e) => e.stopPropagation()}>
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-nobel-gold relative max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-serif font-bold text-nobel-dark flex items-center gap-2">
                                <ImageIcon className="text-nobel-gold" />
                                Add Image
                            </h2>
                            <button onClick={() => setIsImageModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 mb-6 border-b border-gray-100 pb-2">
                            <button
                                className={`pb-2 px-4 text-sm font-medium transition-colors relative ${activeImageTab === 'upload' ? 'text-nobel-dark' : 'text-gray-400 hover:text-gray-600'}`}
                                onClick={() => setActiveImageTab('upload')}
                            >
                                Upload
                                {activeImageTab === 'upload' && <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-nobel-gold rounded-full"></span>}
                            </button>
                            <button
                                className={`pb-2 px-4 text-sm font-medium transition-colors relative ${activeImageTab === 'url' ? 'text-nobel-dark' : 'text-gray-400 hover:text-gray-600'}`}
                                onClick={() => setActiveImageTab('url')}
                            >
                                By URL
                                {activeImageTab === 'url' && <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-nobel-gold rounded-full"></span>}
                            </button>
                            <button
                                className={`pb-2 px-4 text-sm font-medium transition-colors relative ${activeImageTab === 'search' ? 'text-nobel-dark' : 'text-gray-400 hover:text-gray-600'}`}
                                onClick={() => setActiveImageTab('search')}
                            >
                                Pixabay
                                {activeImageTab === 'search' && <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-nobel-gold rounded-full"></span>}
                            </button>
                            <button
                                className={`pb-2 px-4 text-sm font-medium transition-colors relative ${activeImageTab === 'files' ? 'text-nobel-dark' : 'text-gray-400 hover:text-gray-600'}`}
                                onClick={() => setActiveImageTab('files')}
                            >
                                Project Files
                                {activeImageTab === 'files' && <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-nobel-gold rounded-full"></span>}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-[300px]">
                            {/* Upload Tab */}
                            {activeImageTab === 'upload' && (
                                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl hover:border-nobel-gold hover:bg-nobel-cream/50 transition-all gap-4 p-8 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-white group-hover:shadow-md transition-all">
                                        <Upload size={32} className="text-gray-400 group-hover:text-nobel-gold transition-colors" />
                                    </div>
                                    <div className="text-center">
                                        <span className="text-sm font-medium text-gray-700 block">Click to upload image</span>
                                        <span className="text-xs text-gray-400">SVG, PNG, JPG or GIF (max. 5MB)</span>
                                    </div>
                                </div>
                            )}

                            {/* URL Tab */}
                            {activeImageTab === 'url' && (
                                <div className="flex flex-col gap-4 py-8">
                                    <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-nobel-gold/50 focus-within:border-nobel-gold transition-all">
                                        <LinkIcon size={20} className="text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Paste image URL here..."
                                            className="w-full text-sm outline-none bg-transparent"
                                            value={imageUrlInput}
                                            onChange={(e) => setImageUrlInput(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        onClick={handleUrlImageAdd}
                                        disabled={!imageUrlInput.trim()}
                                        className="w-full bg-nobel-gold text-white py-3 rounded-xl font-medium hover:bg-[#B3904D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Add Image
                                    </button>
                                    <p className="text-xs text-gray-400 text-center mt-4">
                                        Works with any direct image link from the web.
                                    </p>
                                </div>
                            )}

                            {/* Project Files Tab */}
                            {activeImageTab === 'files' && (
                                <div className="h-full">
                                    <FileSelector
                                        projectId={workspace.projectId || ''}
                                        allowedTypes={['image/']}
                                        onSelect={(url, storageId) => {
                                            const finalUrl = url || `https://${process.env.NEXT_PUBLIC_CONVEX_URL?.replace('.convex.cloud', '')}.convex.cloud/api/storage/${storageId}`;
                                            const pos = screenToCanvas(window.innerWidth / 2, window.innerHeight / 2);
                                            addItem('image', pos.x, pos.y, finalUrl);
                                            setIsImageModalOpen(false);
                                        }}
                                    />
                                </div>
                            )}

                            {/* Search Tab (Pixabay simulation) */}
                            {activeImageTab === 'search' && (
                                <div className="flex flex-col h-full">
                                    <div className="flex gap-2 mb-4">
                                        <div className="flex-1 flex items-center gap-2 p-2.5 border border-gray-200 rounded-lg focus-within:border-nobel-gold bg-gray-50 focus-within:bg-white transition-colors">
                                            <Search size={18} className="text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search Pixabay..."
                                                className="w-full text-sm bg-transparent outline-none"
                                                value={stockQuery}
                                                onChange={(e) => setStockQuery(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleStockSearch(true)}
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleStockSearch(true)}
                                            className="bg-nobel-dark text-white px-4 rounded-lg text-sm font-medium hover:bg-black transition-colors"
                                        >
                                            Search
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto min-h-[300px] pr-1 custom-scrollbar">
                                        {stockImages.length > 0 ? (
                                            <>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {stockImages.map((url, i) => (
                                                        <StockImageTile
                                                            key={`${url}-${i}`}
                                                            url={url}
                                                            onSelect={() => handleStockImageSelect(url)}
                                                        />
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={() => handleStockSearch(false)}
                                                    className="w-full py-3 mt-4 text-sm text-nobel-dark font-medium hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                                                    disabled={isSearchingStock}
                                                >
                                                    {isSearchingStock ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Load More'}
                                                </button>
                                            </>
                                        ) : isSearchingStock ? (
                                            <div className="grid grid-cols-3 gap-2">
                                                {Array.from({ length: 9 }).map((_, i) => (
                                                    <div key={i} className="aspect-square bg-gray-100 rounded-lg animate-pulse" />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2 opacity-50">
                                                <LayoutGrid size={48} />
                                                <span className="text-sm">Enter a term to search</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-gray-400 text-center mt-2 pt-2 border-t border-gray-100">
                                        Images provided by Stock Service
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};

export default Workspace;
