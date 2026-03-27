import React, { useState, useRef, useEffect } from 'react';
import { CanvasItem, DeviceType } from '../../../types';
// Imports: Remove RotateCcw, RotateCw
import { Trash2, Copy, BringToFront, SendToBack, Smartphone, Monitor, Tablet, ChevronDown, Plus, Palette, Type, AlignLeft, AlignCenter, AlignRight, ArrowUpToLine, ArrowDownToLine, GripHorizontal, Bold, Italic, X, Check } from 'lucide-react';
import { NOBEL_COLORS, DEVICE_DIMENSIONS } from '../../../constants';

interface Props {
    selectedItem: CanvasItem | null;
    updateItemStyle: (id: string, style: Partial<CanvasItem['style']>) => void;
    updateItem: (id: string, updates: Partial<CanvasItem>) => void;
    deleteItem: (id: string) => void;
    duplicateItem: (id: string) => void;
    changeZIndex: (id: string, direction: 'front' | 'back') => void;
    selectedItemIds?: string[];
    isFontPickerOpen: boolean;
    setIsFontPickerOpen: (isOpen: boolean) => void;
}
const PRESET_BG_COLORS = [
    { value: '#ffffff', label: 'White' },
    { value: '#ffecd2', label: 'Soft Orange' },
    { value: '#fcb69f', label: 'Soft Red' },
    { value: '#a1c4fd', label: 'Soft Blue' },
    { value: '#c2e9fb', label: 'Light Cyan' },
    { value: '#d4fc79', label: 'Lime' },
    { value: '#96e6a1', label: 'Mint' },
    { value: '#84fab0', label: 'Aqua' },
    { value: 'transparent', label: 'Transparent' }
];

const PRESET_TEXT_COLORS = [
    { value: '#000000', label: 'Black' },
    { value: '#ffffff', label: 'White' },
    { value: NOBEL_COLORS.dark, label: 'Nobel Dark' },
    { value: NOBEL_COLORS.gold, label: 'Nobel Gold' },
    { value: '#EF4444', label: 'Red' },
    { value: '#3B82F6', label: 'Blue' },
    { value: '#10B981', label: 'Green' },
];

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

const Tooltip = ({ text }: { text: string }) => (
    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-nobel-dark text-white text-[10px] font-medium py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 delay-75 shadow-lg select-none">
        {text}
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-nobel-dark"></span>
    </span>
);
const PropertiesPanel: React.FC<Props> = ({ selectedItem, updateItemStyle, updateItem, deleteItem, duplicateItem, changeZIndex, selectedItemIds, isFontPickerOpen, setIsFontPickerOpen }) => {
    const colorInputRef = useRef<HTMLInputElement>(null);
    const textColorInputRef = useRef<HTMLInputElement>(null);
    const lineColorInputRef = useRef<HTMLInputElement>(null);

    // Font Modal State
    const [tempFont, setTempFont] = useState(FONTS[0]);
    const [previewText, setPreviewText] = useState("");

    if (!selectedItem) return null;

    const currentFont = FONTS.find(f => f.value === selectedItem.style.fontFamily) || FONTS.find(f => selectedItem.style.fontFamily?.includes(f.label)) || FONTS[0];

    const renderColorPicker = (label: string, currentColor: string | undefined, updateParam: string, presets: { value: string; label: string }[], inputRef: React.RefObject<HTMLInputElement>) => {
        // Check if current color is custom (not in presets)
        const isCustom = currentColor && !presets.some(p => p.value === currentColor);

        return (
            <div className="mb-6">
                <label className="text-[10px] font-bold text-gray-400 mb-3 block uppercase tracking-widest flex items-center gap-1.5">
                    <Palette size={12} className="text-nobel-gold" /> {label}
                </label>
                <div className="flex flex-wrap gap-2.5">
                    {/* Presets */}
                    {presets.map((colorObj) => (
                        <button
                            key={colorObj.value}
                            onClick={() => updateItemStyle(selectedItem.id, { [updateParam]: colorObj.value })}
                            className={`group relative w-7 h-7 rounded-full border border-gray-200 transition-all hover:scale-110 shadow-sm ${currentColor === colorObj.value ? 'ring-2 ring-nobel-gold ring-offset-2 scale-110' : 'hover:shadow-md'}`}
                            style={{
                                backgroundColor: colorObj.value,
                                backgroundImage: colorObj.value === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                                backgroundSize: '8px 8px',
                                backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                            }}
                        >
                            <Tooltip text={colorObj.label} />
                        </button>
                    ))}

                    {/* Custom Color Input Wrapper */}
                    <div className="relative group">
                        <button
                            className={`w-7 h-7 rounded-full border border-gray-200 transition-all hover:scale-110 shadow-sm flex items-center justify-center overflow-hidden
                                ${isCustom ? 'ring-2 ring-nobel-gold ring-offset-2 scale-110' : 'hover:shadow-md'}
                                bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500`}
                            onClick={() => inputRef.current?.click()}
                        >
                            {isCustom ? (
                                <div className="w-full h-full" style={{ backgroundColor: currentColor }}></div>
                            ) : (
                                <Plus size={14} className="text-white drop-shadow-md" />
                            )}
                            <Tooltip text="Custom Color" />
                        </button>
                        <input
                            ref={inputRef}
                            type="color"
                            className="absolute opacity-0 pointer-events-none w-0 h-0"
                            value={isCustom ? currentColor : '#000000'}
                            onChange={(e) => updateItemStyle(selectedItem.id, { [updateParam]: e.target.value })}
                        />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Font Picker Modal */}
            {isFontPickerOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] animate-in fade-in" onPointerDown={(e) => e.stopPropagation()}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[60vh] flex overflow-hidden border border-nobel-gold/30">
                        {/* Sidebar: Font List */}
                        <div className="w-80 border-r border-gray-800 flex flex-col bg-[#1a1a1a]">
                            {/* Header Image */}
                            <div className="h-32 w-full relative group overflow-hidden shrink-0 border-b border-white/10">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                                <img
                                    src="/images/ManTypingbyWindow.png"
                                    alt="Typography"
                                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                                    draggable={false}
                                />
                                <div className="absolute bottom-3 left-4 z-20">
                                    <h3 className="font-bold text-xl text-white font-serif tracking-tight drop-shadow-md">Typography</h3>
                                    <p className="text-white/60 text-[10px] uppercase tracking-widest font-medium">Select Typeface</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar-dark p-3 space-y-1">
                                {FONTS.map(font => (
                                    <button
                                        key={font.value}
                                        onClick={() => setTempFont(font)}
                                        className={`w-full text-left px-4 py-3 rounded-xl transition-all flex flex-col gap-0.5 border group relative overflow-hidden
                                            ${tempFont.value === font.value
                                                ? 'bg-nobel-gold border-nobel-gold shadow-md text-white'
                                                : 'border-transparent hover:bg-white/5 hover:border-white/10 text-gray-400 hover:text-gray-200'}`}
                                    >
                                        <span className={`text-sm font-medium transition-colors ${tempFont.value === font.value ? 'text-white' : ''}`} style={{ fontFamily: font.fontFamily }}>
                                            {font.label}
                                        </span>
                                        <div className="flex justify-between items-center w-full">
                                            <span className={`text-[10px] uppercase tracking-wider ${tempFont.value === font.value ? 'text-white/80' : 'text-gray-600 group-hover:text-gray-500'}`}>{font.category}</span>
                                            {tempFont.value === font.value && <Check size={14} className="text-white animate-in fade-in zoom-in" />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Main: Preview */}
                        <div className="flex-1 flex flex-col bg-white relative">
                            {/* Close Button */}
                            <button
                                onClick={() => setIsFontPickerOpen(false)}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all z-10"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Preview Input Bar */}
                                <div className="px-12 pt-12 pb-6 border-b border-gray-100 bg-white/50 backdrop-blur-sm z-10">
                                    <input
                                        type="text"
                                        placeholder="Type something to preview..."
                                        className="w-full text-3xl font-light text-gray-900 placeholder:text-gray-300 outline-none bg-transparent border-b border-transparent focus:border-nobel-gold/30 transition-all pb-2"
                                        style={{ fontFamily: tempFont.fontFamily }}
                                        autoFocus
                                        value={previewText}
                                        onChange={(e) => setPreviewText(e.target.value)}
                                    />
                                </div>

                                <div className="flex-1 p-12 overflow-y-auto custom-scrollbar flex flex-col items-center">
                                    <div className="w-full max-w-2xl space-y-12 animate-in slide-in-from-bottom-4 duration-500" style={{ fontFamily: tempFont.fontFamily }}>

                                        {/* Large Hero Preview */}
                                        <div className="text-center space-y-6 pb-12 border-b border-gray-100 relative">
                                            {/* Watermark */}
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[200px] text-gray-50 opacity-50 font-black pointer-events-none select-none -z-10">
                                                Aa
                                            </div>

                                            <h1 className="text-7xl md:text-8xl font-black text-gray-900 leading-none tracking-tight break-words">
                                                {previewText || "Aa"}
                                            </h1>
                                            <p className="text-2xl text-gray-500 font-light">
                                                {tempFont.label}
                                            </p>
                                        </div>

                                        {/* Standard Headings */}
                                        <div className="space-y-8">
                                            <div className="group">
                                                <span className="text-[10px] text-gray-300 font-sans block mb-2 uppercase tracking-widest group-hover:text-nobel-gold transition-colors">Headline Large</span>
                                                <h2 className="text-5xl font-bold text-gray-900 leading-tight">
                                                    {previewText || "Visual design is the crystallization of clarity."}
                                                </h2>
                                            </div>

                                            <div className="group">
                                                <span className="text-[10px] text-gray-300 font-sans block mb-2 uppercase tracking-widest group-hover:text-nobel-gold transition-colors">Headline Small</span>
                                                <h3 className="text-3xl font-semibold text-gray-800 leading-snug">
                                                    {previewText || "Good design is obvious. Great design is transparent."}
                                                </h3>
                                            </div>
                                        </div>

                                        {/* Body Text Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                                                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="w-2 h-2 rounded-full bg-nobel-gold"></div>
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-sans block mb-3 uppercase tracking-widest flex items-center gap-2">
                                                    Preview Regular
                                                </span>
                                                <p className="text-base text-gray-700 leading-relaxed">
                                                    {previewText || "ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789 (!@#$%^&*)"}
                                                </p>
                                            </div>
                                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 group hover:shadow-md transition-shadow">
                                                <span className="text-[10px] text-gray-400 font-sans block mb-3 uppercase tracking-widest flex items-center gap-2">
                                                    Preview Italic
                                                </span>
                                                <p className="text-base text-gray-700 leading-relaxed italic">
                                                    {previewText || "The quick brown fox jumps over the lazy dog. Sphinx of black quartz, judge my vow."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-6 border-t border-gray-100 bg-gray-50/80 backdrop-blur-sm flex justify-between items-center">
                                <div className="text-xs text-gray-400 font-medium">
                                    Previewing <span className="text-gray-900 font-bold">{tempFont.label}</span>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setIsFontPickerOpen(false)}
                                        className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            updateItemStyle(selectedItem.id, { fontFamily: tempFont.value });
                                            setIsFontPickerOpen(false);
                                        }}
                                        className="px-8 py-2.5 rounded-xl bg-nobel-dark text-white font-medium hover:bg-black transition-all shadow-lg shadow-nobel-dark/20 text-sm flex items-center gap-2 active:scale-95"
                                    >
                                        <Check size={16} />
                                        Apply Font
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div
                className="fixed top-24 right-6 w-80 bg-white/80 backdrop-blur-2xl shadow-2xl rounded-2xl border border-white/50 p-6 z-[90] animate-in slide-in-from-right-8 duration-300"
                onPointerDown={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-6 border-b border-gray-100/50 pb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-nobel-gold"></div>
                        <h3 className="font-serif font-bold text-nobel-dark text-lg tracking-tight">Properties</h3>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest bg-gray-50/80 px-2.5 py-1 rounded-full border border-gray-100">
                        {selectedItem.type}
                    </span>
                </div>

                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">

                    {/* Frame Controls */}
                    {selectedItem.type === 'frame' && (
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 mb-3 block uppercase tracking-widest">Device Preset</label>
                            <div className="flex gap-2 bg-gray-100/50 p-1.5 rounded-xl border border-gray-100">
                                {(['phone', 'tablet', 'desktop'] as DeviceType[]).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => {
                                            const dim = DEVICE_DIMENSIONS[type];
                                            updateItem(selectedItem.id, {
                                                width: dim.width,
                                                height: dim.height,
                                                style: { ...selectedItem.style, deviceType: type }
                                            });
                                        }}
                                        className={`group relative flex-1 flex flex-col items-center justify-center py-2.5 rounded-lg transition-all duration-200 gap-1
                                            ${selectedItem.style.deviceType === type ? 'bg-white shadow-sm text-nobel-gold font-medium ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}`}
                                    >
                                        {type === 'phone' && <Smartphone size={18} strokeWidth={selectedItem.style.deviceType === type ? 2.5 : 2} />}
                                        {type === 'tablet' && <Tablet size={18} strokeWidth={selectedItem.style.deviceType === type ? 2.5 : 2} />}
                                        {type === 'desktop' && <Monitor size={18} strokeWidth={selectedItem.style.deviceType === type ? 2.5 : 2} />}
                                        <span className="text-[10px] uppercase">{type}</span>
                                        <Tooltip text={`Select ${type} size`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Typography Controls */}
                    {(selectedItem.type === 'note' || selectedItem.type === 'text') && (
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 mb-3 block uppercase tracking-widest flex items-center gap-1.5">
                                <Type size={12} className="text-nobel-gold" /> Typography
                            </label>

                            {/* Font Selector Button */}
                            <button
                                onClick={() => {
                                    setTempFont(currentFont);
                                    setIsFontPickerOpen(true);
                                }}
                                className="w-full flex justify-between items-center p-3 bg-white border border-gray-200 hover:border-nobel-gold/50 hover:shadow-sm transition-all duration-300 rounded-xl text-sm text-nobel-dark font-medium group mb-3"
                            >
                                <span className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded bg-gray-50 flex items-center justify-center text-xs text-gray-400 font-serif">Aa</span>
                                    <span style={{ fontFamily: currentFont.fontFamily }}>{currentFont.label}</span>
                                </span>
                                <ChevronDown size={16} className="text-gray-400 group-hover:text-gray-600" />
                            </button>

                            {/* Font Size & Weight/Style */}
                            <div className="space-y-3">
                                {/* Size Slider */}
                                <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                                    <span className="text-[10px] font-bold text-gray-400 px-1">SIZE</span>
                                    <input
                                        type="range"
                                        min="12"
                                        max="160"
                                        value={selectedItem.style.fontSize}
                                        onChange={(e) => updateItemStyle(selectedItem.id, { fontSize: Number(e.target.value) })}
                                        className="flex-1 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-nobel-gold hover:accent-[#B3904D] transition-all"
                                    />
                                    <span className="text-xs font-mono font-medium text-nobel-dark w-8 text-right bg-gray-50 py-0.5 rounded border border-gray-100">
                                        {selectedItem.style.fontSize}
                                    </span>
                                </div>

                                {/* Bold / Italic Toggles */}
                                <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-100 gap-1 w-full">
                                    {/* Font Weight Selector */}
                                    <div className="relative flex-1 group">
                                        <select
                                            value={selectedItem.style.fontWeight || '400'}
                                            onChange={(e) => updateItemStyle(selectedItem.id, { fontWeight: e.target.value })}
                                            className="w-full h-full appearance-none bg-white pl-3 pr-8 py-2 rounded-xl border border-gray-100 text-xs font-medium text-nobel-dark focus:outline-none focus:border-nobel-gold/50 cursor-pointer shadow-sm hover:border-gray-200"
                                        >
                                            <option value="100">Thin (100)</option>
                                            <option value="200">Extra Light (200)</option>
                                            <option value="300">Light (300)</option>
                                            <option value="400">Regular (400)</option>
                                            <option value="500">Medium (500)</option>
                                            <option value="600">Semi-Bold (600)</option>
                                            <option value="700">Bold (700)</option>
                                            <option value="800">Extra Bold (800)</option>
                                            <option value="900">Black (900)</option>
                                        </select>
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-gray-600">
                                            <ChevronDown size={14} />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => updateItemStyle(selectedItem.id, { fontStyle: selectedItem.style.fontStyle === 'italic' ? 'normal' : 'italic' })}
                                        className={`p-2 rounded-lg transition-all ${selectedItem.style.fontStyle === 'italic' ? 'bg-white shadow text-nobel-dark' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        <Italic size={16} />
                                        <Tooltip text="Italic" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Alignment Controls */}
                    {(selectedItem.type === 'note' || selectedItem.type === 'text') && (
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 mb-3 block uppercase tracking-widest flex items-center gap-1.5">
                                <AlignLeft size={12} className="text-nobel-gold" /> Alignment
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {/* Horizontal */}
                                <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-100">
                                    {[
                                        { value: 'left', icon: AlignLeft, label: 'Left' },
                                        { value: 'center', icon: AlignCenter, label: 'Center' },
                                        { value: 'right', icon: AlignRight, label: 'Right' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => updateItemStyle(selectedItem.id, { textAlign: opt.value as any })}
                                            className={`group relative flex-1 p-1.5 rounded-lg flex items-center justify-center transition-all
                                                ${(selectedItem.style.textAlign || 'center') === opt.value ? 'bg-white shadow-sm text-nobel-gold ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            <opt.icon size={16} />
                                            <Tooltip text={`Align ${opt.label}`} />
                                        </button>
                                    ))}
                                </div>

                                {/* Vertical */}
                                <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-100">
                                    {[
                                        { value: 'flex-start', icon: ArrowUpToLine, label: 'Top' },
                                        { value: 'center', icon: GripHorizontal, label: 'Middle' },
                                        { value: 'flex-end', icon: ArrowDownToLine, label: 'Bottom' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => updateItemStyle(selectedItem.id, { justifyContent: opt.value as any })}
                                            className={`group relative flex-1 p-1.5 rounded-lg flex items-center justify-center transition-all
                                                ${(selectedItem.style.justifyContent || 'center') === opt.value ? 'bg-white shadow-sm text-nobel-gold ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            <opt.icon size={16} />
                                            <Tooltip text={`Align ${opt.label}`} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Line Properties */}
                    {selectedItem.type === 'line' && (
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 mb-3 block uppercase tracking-widest flex items-center gap-1.5">
                                <Palette size={12} className="text-nobel-gold" /> Line Style
                            </label>

                            {/* Width Slider */}
                            <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-100 shadow-sm mb-3">
                                <span className="text-[10px] font-bold text-gray-400 px-1">WIDTH</span>
                                <input
                                    type="range"
                                    min="1"
                                    max="20"
                                    value={selectedItem.style.borderWidth || 4}
                                    onChange={(e) => updateItemStyle(selectedItem.id, { borderWidth: Number(e.target.value) })}
                                    className="flex-1 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-nobel-gold hover:accent-[#B3904D] transition-all"
                                />
                                <span className="text-xs font-mono font-medium text-nobel-dark w-8 text-right bg-gray-50 py-0.5 rounded border border-gray-100">
                                    {selectedItem.style.borderWidth || 4}
                                </span>
                            </div>

                            {/* Line Style & Type */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {/* Stroke Style */}
                                <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-100">
                                    {[
                                        { value: 'solid', label: 'Solid', icon: (props: any) => <div className="w-4 h-0.5 bg-current" /> },
                                        { value: 'dashed', label: 'Dashed', icon: (props: any) => <div className="w-4 h-0.5 border-b-2 border-dashed border-current" /> },
                                        { value: 'dotted', label: 'Dotted', icon: (props: any) => <div className="w-4 h-0.5 border-b-2 border-dotted border-current" /> },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => updateItemStyle(selectedItem.id, { borderStyle: opt.value as any })}
                                            className={`group relative flex-1 p-1.5 rounded-lg flex items-center justify-center transition-all
                                                ${(selectedItem.style.borderStyle || 'solid') === opt.value ? 'bg-white shadow-sm text-nobel-gold ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            <opt.icon />
                                            <Tooltip text={opt.label} />
                                        </button>
                                    ))}
                                </div>

                                {/* Line Type (Straight/Curved) */}
                                <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-100">
                                    {[
                                        { value: 'straight', label: 'Straight', icon: (props: any) => <div className="w-4 h-0.5 bg-current transform -rotate-12" /> },
                                        { value: 'curved', label: 'Curved', icon: (props: any) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12 C 8 4, 16 20, 22 12" /></svg> },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => updateItemStyle(selectedItem.id, { lineType: opt.value as any })}
                                            className={`group relative flex-1 p-1.5 rounded-lg flex items-center justify-center transition-all
                                                ${(selectedItem.style.lineType || 'straight') === opt.value ? 'bg-white shadow-sm text-nobel-gold ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            <opt.icon />
                                            <Tooltip text={opt.label} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Line Color */}
                            {renderColorPicker(
                                'Line Color',
                                selectedItem.style.color,
                                'color',
                                PRESET_TEXT_COLORS,
                                lineColorInputRef
                            )}
                        </div>
                    )}

                    {selectedItem.type !== 'image' && renderColorPicker(
                        'Background',
                        selectedItem.style.backgroundColor,
                        'backgroundColor',
                        PRESET_BG_COLORS,
                        colorInputRef
                    )}

                    {/* Text Color */}
                    {(selectedItem.type === 'note' || selectedItem.type === 'text') && renderColorPicker(
                        'Text Color',
                        selectedItem.style.color,
                        'color',
                        PRESET_TEXT_COLORS,
                        textColorInputRef
                    )}

                    {/* Shadow Controls */}
                    {selectedItem.type !== 'image' && (
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 mb-3 block uppercase tracking-widest">Elevation / Shadow</label>
                            <div className="flex gap-1 bg-gray-100/50 p-1 rounded-xl border border-gray-100">
                                {[
                                    { label: 'None', value: 'none' },
                                    { label: 'Soft', value: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' },
                                    { label: 'Hard', value: '4px 4px 0px 0px rgba(0,0,0,1)' }, // Modern rough shadow
                                    { label: 'Float', value: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' },
                                ].map((shadow, i) => {
                                    const isSelected = selectedItem.style.boxShadow === shadow.value || (!selectedItem.style.boxShadow && shadow.value === 'none');
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => updateItemStyle(selectedItem.id, { boxShadow: shadow.value })}
                                            className={`group relative flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase
                                                ${isSelected ? 'bg-white shadow text-nobel-dark ring-1 ring-black/5 scale-105' : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}`}
                                        >
                                            {shadow.label}
                                            <Tooltip text={`Shadow: ${shadow.label}`} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Actions Grid */}
                    <div className="grid grid-cols-4 gap-2 pt-4 border-t border-gray-100/50">
                        {[
                            { icon: BringToFront, label: 'Bring to Front', action: () => changeZIndex(selectedItem.id, 'front'), color: 'text-gray-600' },
                            { icon: SendToBack, label: 'Send to Back', action: () => changeZIndex(selectedItem.id, 'back'), color: 'text-gray-600' },
                            { icon: Copy, label: 'Duplicate', action: () => duplicateItem(selectedItem.id), color: 'text-gray-600' },
                            { icon: Trash2, label: 'Delete', action: () => deleteItem(selectedItem.id), color: 'text-red-500 hover:bg-red-50 hover:text-red-600' }
                        ].map((btn, i) => (
                            <button
                                key={i}
                                onClick={btn.action}
                                className={`group relative p-3 rounded-xl flex items-center justify-center transition-all bg-gray-50 hover:bg-white hover:shadow-md border border-gray-100/50 hover:border-gray-200 ${btn.color}`}
                            >
                                <btn.icon size={18} strokeWidth={2} />
                                <Tooltip text={btn.label} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default PropertiesPanel;