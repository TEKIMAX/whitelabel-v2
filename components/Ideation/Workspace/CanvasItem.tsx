import React, { useRef, useEffect } from 'react';
import { CanvasItem as ICanvasItem, ToolType } from '../../../types';
import { NOBEL_COLORS } from '../../../constants';
import { GripHorizontal } from 'lucide-react';


interface Props {
    item: ICanvasItem;
    isSelected: boolean;
    onMouseDown: (e: React.PointerEvent, type: 'move' | 'resize', handle?: string) => void;
    updateItemContent: (id: string, content: string) => void;
    scale: number;
}

const CanvasItem: React.FC<Props> = ({ item, isSelected, onMouseDown, updateItemContent, scale }) => {
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const [isEditing, setIsEditing] = React.useState(false);

    // Reset editing when selection is lost
    useEffect(() => {
        if (!isSelected) {
            setIsEditing(false);
        }
    }, [isSelected]);

    // Auto-focus when entering edit mode
    useEffect(() => {
        if (isEditing && textAreaRef.current) {
            textAreaRef.current.focus();
            // Move cursor to end
            textAreaRef.current.setSelectionRange(textAreaRef.current.value.length, textAreaRef.current.value.length);
        }
    }, [isEditing]);

    // Auto-resize text areas
    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = "auto";
            textAreaRef.current.style.height = textAreaRef.current.scrollHeight + "px";
        }
    }, [item.content, item.width, isEditing]);

    const handlePointerDown = (e: React.PointerEvent) => {
        e.stopPropagation();
        onMouseDown(e, 'move');
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
    };

    const handleResizeStart = (e: React.PointerEvent, handle: string) => {
        e.stopPropagation();
        onMouseDown(e, 'resize', handle);
    };

    const getFontFamily = (font: string) => {
        switch (font) {
            case 'serif': return '"Playfair Display", serif';
            case 'mono': return '"JetBrains Mono", monospace';
            case 'cursive': return '"Dancing Script", cursive';
            case 'slab': return '"Roboto Slab", serif';
            case 'roboto': return '"Roboto", sans-serif';
            case 'oswald': return '"Oswald", sans-serif';
            case 'merriweather': return '"Merriweather", serif';
            case 'lora': return '"Lora", serif';
            case 'opensans': return '"Open Sans", sans-serif';
            case 'montserrat': return '"Montserrat", sans-serif';
            case 'poppins': return '"Poppins", sans-serif';
            case 'raleway': return '"Raleway", sans-serif';
            case 'ubuntu': return '"Ubuntu", sans-serif';
            case 'arvo': return '"Arvo", serif';
            case 'pacifico': return '"Pacifico", cursive';
            case 'permanentmarker': return '"Permanent Marker", cursive';
            case 'sans': default: return '"Inter", sans-serif';
        }
    }

    const commonStyles: React.CSSProperties = {
        position: 'absolute',
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        transform: `rotate(${item.rotation}deg)`,
        zIndex: item.zIndex,
        backgroundColor: item.style.backgroundColor,
        border: isSelected ? `2px solid ${NOBEL_COLORS.gold}` : (item.style.borderWidth ? `${item.style.borderWidth}px solid ${item.style.borderColor || 'transparent'}` : 'none'),
        boxShadow: isSelected
            ? `0 0 0 2px rgba(197, 160, 89, 0.3), ${item.style.boxShadow || '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}`
            : (item.style.boxShadow || '0 4px 6px -1px rgba(0, 0, 0, 0.1)'),
        cursor: 'grab',
        fontWeight: item.style.fontWeight as any || 'normal',
        fontStyle: item.style.fontStyle as any || 'normal',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
    };

    const renderContent = () => {
        switch (item.type) {
            case 'note':
                return (
                    <div
                        className="w-full h-full overflow-hidden"
                        onDoubleClick={handleDoubleClick}
                    >
                        {isEditing ? (
                            <textarea
                                ref={textAreaRef}
                                className="w-full h-full bg-transparent resize-none outline-none p-4 leading-relaxed"
                                style={{
                                    fontFamily: getFontFamily(item.style.fontFamily),
                                    fontSize: `${item.style.fontSize}px`,
                                    color: item.style.color,
                                    fontWeight: item.style.fontWeight as any || 'normal',
                                    fontStyle: item.style.fontStyle as any || 'normal',
                                    textAlign: item.style.textAlign || 'center',
                                    overflow: 'hidden'
                                }}
                                value={item.content}
                                onChange={(e) => updateItemContent(item.id, e.target.value)}
                                onBlur={handleBlur}
                                onPointerDown={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <div
                                className="w-full h-full p-4 leading-relaxed whitespace-pre-wrap break-words pointer-events-none flex flex-col"
                                style={{
                                    fontFamily: getFontFamily(item.style.fontFamily),
                                    fontSize: `${item.style.fontSize}px`,
                                    color: item.style.color,
                                    fontWeight: item.style.fontWeight as any || 'normal',
                                    fontStyle: item.style.fontStyle as any || 'normal',
                                    textAlign: item.style.textAlign || 'center',
                                    justifyContent: item.style.justifyContent || 'center',
                                }}
                            >
                                {item.content || <span className="text-black/20 italic">Double-click to edit</span>}
                            </div>
                        )}
                    </div>
                );
            case 'text':
                return (
                    <div
                        className="w-full h-full overflow-hidden"
                        onDoubleClick={handleDoubleClick}
                    >
                        {isEditing ? (
                            <textarea
                                ref={textAreaRef}
                                className="w-full h-full bg-transparent resize-none outline-none p-1 leading-tight"
                                style={{
                                    fontFamily: getFontFamily(item.style.fontFamily),
                                    fontSize: `${item.style.fontSize}px`,
                                    color: item.style.color,
                                    fontWeight: item.style.fontWeight as any || 'normal',
                                    fontStyle: item.style.fontStyle as any || 'normal',
                                    textAlign: item.style.textAlign || 'center',
                                    overflow: 'hidden'
                                }}
                                value={item.content}
                                onChange={(e) => updateItemContent(item.id, e.target.value)}
                                onBlur={handleBlur}
                                onPointerDown={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <div
                                className="w-full h-full p-1 leading-tight whitespace-pre-wrap break-words pointer-events-none flex flex-col"
                                style={{
                                    fontFamily: getFontFamily(item.style.fontFamily),
                                    fontSize: `${item.style.fontSize}px`,
                                    color: item.style.color,
                                    fontWeight: item.style.fontWeight as any || 'normal',
                                    fontStyle: item.style.fontStyle as any || 'normal',
                                    textAlign: item.style.textAlign || 'center',
                                    justifyContent: item.style.justifyContent || 'center',
                                }}
                            >
                                {item.content || <span className="opacity-50">Text</span>}
                            </div>
                        )}
                    </div>
                );
            case 'image':
                return (
                    <div className="w-full h-full overflow-hidden">
                        <img
                            src={item.content}
                            alt="canvas item"
                            className="w-full h-full object-cover pointer-events-none"
                            draggable={false}
                        />
                    </div>
                );
            case 'shape':
                return (
                    <div className="w-full h-full overflow-hidden pointer-events-none" style={{
                        borderRadius: item.style.shapeType === 'circle' ? '50%' : '0'
                    }}>
                    </div>
                )
            case 'line':
                const strokeWidth = item.style.borderWidth || 4;
                const lineType = item.style.lineType || 'straight';
                const strokeStyle = item.style.borderStyle || 'solid';

                let dashArray = 'none';
                if (strokeStyle === 'dashed') dashArray = `${strokeWidth * 3},${strokeWidth * 2}`;
                if (strokeStyle === 'dotted') dashArray = `${strokeWidth},${strokeWidth}`;

                // Safe dimensions
                const w = Math.max(0, item.width);
                const h = Math.max(0, item.height);

                let pathData = '';
                if (lineType === 'straight') {
                    pathData = `M 0,${h / 2} L ${w},${h / 2}`;
                } else {
                    // Simple Quadratic Curve (Arch)
                    // From bottom-left to top-right? Or just arch? 
                    // Let's do a simple arch from left-center to right-center, control point at top-center (0)
                    // If h is small, it's flat. If h is large, it arches.
                    // Start: 0, h/2. Control: w/2, -h/2 (arching up out of box?) or inside?
                    // To keep it inside: Start 0,h -> Control w/2, 0 -> End w, h. (Arch)
                    // Or Start 0, h/2 -> Control w/2, 0 -> End w, h/2 (Arch hitting top)
                    pathData = `M 0,${h / 2} Q ${w / 2},${-h / 4} ${w},${h / 2}`;
                    // Using -h/4 makes it curve up slightly outside if h is small, or inside if h represents bounding box.
                    // Actually, let's keep it simple: Start/End at 50% vertical. Control point at 0 (top).
                    pathData = `M 0,${h / 2} Q ${w / 2},0 ${w},${h / 2}`;
                }

                return (
                    <div className="w-full h-full pointer-events-none flex items-center justify-center">
                        <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                            <path
                                d={pathData}
                                stroke={item.style.color || '#000'}
                                strokeWidth={strokeWidth}
                                fill="none"
                                strokeDasharray={dashArray}
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>
                );
            case 'frame':
                const isPhone = item.style.deviceType === 'phone';
                const isTablet = item.style.deviceType === 'tablet';
                const isDesktop = item.style.deviceType === 'desktop';

                return (
                    <div
                        className="w-full h-full pointer-events-none relative bg-white overflow-hidden"
                        style={{ borderRadius: 'inherit' }}
                    >
                        {/* Notch / Camera / UI Bar mockups */}
                        {isPhone && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-black rounded-b-xl z-20"></div>
                        )}
                        {isDesktop && (
                            <div className="absolute top-0 left-0 right-0 h-6 bg-gray-100 border-b border-gray-200 flex items-center px-2 gap-1.5 z-20">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                            </div>
                        )}
                        {/* Grid inside frame for design help */}
                        <div className="w-full h-full opacity-10"
                            style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px', marginTop: isDesktop ? '24px' : '0' }}>
                        </div>

                        <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-gray-300 uppercase tracking-widest font-mono">
                            {item.style.deviceType}
                        </div>
                    </div>
                )
            default:
                return null;
        }
    };

    // Specific styles overrides based on type
    if (item.type === 'text') {
        commonStyles.backgroundColor = 'transparent';
        // When selected, allow the default border (solid gold) to apply
        // When not selected, hide the border
        if (!isSelected) {
            commonStyles.border = 'none';
            commonStyles.boxShadow = 'none';
        }
        // If selected, commonStyles default logic applies: border: 2px solid gold.
    } else if (item.type === 'shape' && item.style.shapeType === 'circle') {
        commonStyles.borderRadius = '50%';
    } else if (item.type === 'frame') {
        commonStyles.backgroundColor = 'white';

        // Device-specific styling
        if (['phone', 'tablet', 'desktop'].includes(item.style.deviceType || '')) {
            commonStyles.border = `8px solid ${NOBEL_COLORS.dark}`;
            commonStyles.borderRadius = (item.style.deviceType === 'phone' || item.style.deviceType === 'tablet') ? '32px' : '8px';
            commonStyles.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
        } else {
            // Generic Frames (A4, Social, Custom)
            commonStyles.border = 'none'; // User requested no border
            commonStyles.borderRadius = '0px';
            commonStyles.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'; // Subtle shadow for visibility
        }

        commonStyles.zIndex = item.zIndex;
    }

    return (
        <div
            style={commonStyles}
            onPointerDown={handlePointerDown}
            className="group"
        >
            {/* Drag Handle (Visible on Hover) */}
            <div
                className="absolute -top-6 left-1/2 -translate-x-1/2 p-1 bg-white border border-gray-200 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-grab hover:bg-gray-50 z-[60]"
                onPointerDown={(e) => {
                    e.stopPropagation();
                    onMouseDown(e, 'move');
                }}
            >
                <GripHorizontal size={14} className="text-gray-400" />
            </div>

            {renderContent()}

            {/* Resize Handles (Only show when selected) */}
            {isSelected && (
                <>
                    {/* SE Handle */}
                    <div
                        className="absolute -bottom-3 -right-3 w-5 h-5 bg-white border-2 border-nobel-gold rounded-full cursor-nwse-resize z-50 flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                        onPointerDown={(e) => handleResizeStart(e, 'se')}
                    >
                        <div className="w-1.5 h-1.5 bg-nobel-gold rounded-full" />
                    </div>

                    {/* SW Handle */}
                    <div
                        className="absolute -bottom-3 -left-3 w-5 h-5 bg-white border-2 border-nobel-gold rounded-full cursor-nesw-resize z-50 flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                        onPointerDown={(e) => handleResizeStart(e, 'sw')}
                    >
                        <div className="w-1.5 h-1.5 bg-nobel-gold rounded-full" />
                    </div>

                    {/* NE Handle */}
                    <div
                        className="absolute -top-3 -right-3 w-5 h-5 bg-white border-2 border-nobel-gold rounded-full cursor-nesw-resize z-50 flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                        onPointerDown={(e) => handleResizeStart(e, 'ne')}
                    >
                        <div className="w-1.5 h-1.5 bg-nobel-gold rounded-full" />
                    </div>

                    {/* NW Handle */}
                    <div
                        className="absolute -top-3 -left-3 w-5 h-5 bg-white border-2 border-nobel-gold rounded-full cursor-nwse-resize z-50 flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                        onPointerDown={(e) => handleResizeStart(e, 'nw')}
                    >
                        <div className="w-1.5 h-1.5 bg-nobel-gold rounded-full" />
                    </div>
                </>
            )}
        </div>
    );
};

export default CanvasItem;