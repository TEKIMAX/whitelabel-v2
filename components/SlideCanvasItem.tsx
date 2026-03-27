import React, { useRef, useEffect } from 'react';
import { CanvasItem as ICanvasItem } from '../types';

const NOBEL_COLORS = {
    gold: '#C5A059',
    dark: '#1a1a1a',
};

interface Props {
    item: ICanvasItem;
    isSelected: boolean;
    onMouseDown: (e: React.PointerEvent, type: 'move' | 'resize', handle?: string) => void;
    updateItemContent: (id: string, content: string) => void;
    scale: number;
    accentColor: string;
}

const SlideCanvasItem: React.FC<Props> = ({ item, isSelected, onMouseDown, updateItemContent, scale, accentColor }) => {
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const [isEditing, setIsEditing] = React.useState(false);

    useEffect(() => {
        if (!isSelected) {
            setIsEditing(false);
        }
    }, [isSelected]);

    useEffect(() => {
        if (isEditing && textAreaRef.current) {
            textAreaRef.current.focus();
            textAreaRef.current.setSelectionRange(textAreaRef.current.value.length, textAreaRef.current.value.length);
        }
    }, [isEditing]);

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
            case 'montserrat': return '"Montserrat", sans-serif';
            case 'poppins': return '"Poppins", sans-serif';
            case 'raleway': return '"Raleway", sans-serif';
            case 'sans': default: return '"Inter", sans-serif';
        }
    }

    const commonStyles: React.CSSProperties = {
        position: 'absolute',
        left: item.x * scale,
        top: item.y * scale,
        width: item.width * scale,
        height: item.height * scale,
        transform: `rotate(${item.rotation}deg)`,
        zIndex: item.zIndex,
        backgroundColor: item.style.backgroundColor,
        border: (isSelected && scale >= 1) ? `2px solid ${accentColor || NOBEL_COLORS.gold}` : (item.style.borderWidth ? `${item.style.borderWidth * scale}px ${item.style.borderStyle || 'solid'} ${item.style.borderColor || 'transparent'}` : 'none'),
        boxShadow: (isSelected && scale >= 1)
            ? `0 0 0 2px rgba(197, 160, 89, 0.3), ${item.style.boxShadow || 'none'}`
            : (item.style.boxShadow || 'none'),
        cursor: (isSelected && scale >= 1) ? 'grab' : 'default',
        fontWeight: item.style.fontWeight as any || 'normal',
        fontStyle: item.style.fontStyle as any || 'normal',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
        pointerEvents: scale < 1 ? 'none' : 'auto',
    };

    const renderContent = () => {
        const fontSize = (item.style.fontSize || 16) * scale;

        switch (item.type) {
            case 'note':
                return (
                    <div className="w-full h-full overflow-hidden" onDoubleClick={scale >= 1 ? handleDoubleClick : undefined}>
                        {isEditing && scale >= 1 ? (
                            <textarea
                                ref={textAreaRef}
                                className="w-full h-full bg-transparent resize-none outline-none p-4 leading-relaxed"
                                style={{
                                    fontFamily: getFontFamily(item.style.fontFamily),
                                    fontSize: `${fontSize}px`,
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
                                    fontSize: `${fontSize}px`,
                                    color: item.style.color,
                                    fontWeight: item.style.fontWeight as any || 'normal',
                                    fontStyle: item.style.fontStyle as any || 'normal',
                                    textAlign: item.style.textAlign || 'center',
                                    justifyContent: item.style.justifyContent || 'center',
                                }}
                            >
                                {item.content || <span>{item.content}</span>}
                            </div>
                        )}
                    </div>
                );
            case 'text':
                return (
                    <div className="w-full h-full overflow-hidden" onDoubleClick={scale >= 1 ? handleDoubleClick : undefined}>
                        {isEditing && scale >= 1 ? (
                            <textarea
                                ref={textAreaRef}
                                className="w-full h-full bg-transparent resize-none outline-none p-1 leading-tight"
                                style={{
                                    fontFamily: getFontFamily(item.style.fontFamily),
                                    fontSize: `${fontSize}px`,
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
                                    fontSize: `${fontSize}px`,
                                    color: item.style.color,
                                    fontWeight: item.style.fontWeight as any || 'normal',
                                    fontStyle: item.style.fontStyle as any || 'normal',
                                    textAlign: item.style.textAlign || 'center',
                                    justifyContent: item.style.justifyContent || 'center',
                                }}
                            >
                                {item.content || <span>{item.content}</span>}
                            </div>
                        )}
                    </div>
                );
            case 'image':
                return (
                    <div className="w-full h-full overflow-hidden">
                        <img src={item.content} alt="slide item" className="w-full h-full object-cover pointer-events-none rounded-sm" draggable={false} />
                    </div>
                );
            case 'shape':
                if (item.style.shapeType === 'triangle') {
                    return (
                        <div className="w-full h-full pointer-events-none" style={{
                            backgroundColor: item.style.backgroundColor,
                            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                            border: item.style.borderWidth ? `${item.style.borderWidth * scale}px solid ${item.style.borderColor}` : 'none'
                        }}></div>
                    );
                }
                const isCircle = item.style.shapeType === 'circle';
                const borderRadius = isCircle ? '50%' : `${(item.style.borderRadius || 0) * scale}px`;
                return (
                    <div
                        className="w-full h-full overflow-hidden pointer-events-none"
                        style={{
                            borderRadius,
                            backgroundColor: item.style.backgroundColor,
                            border: item.style.borderWidth ? `${item.style.borderWidth * scale}px ${item.style.borderStyle || 'solid'} ${item.style.borderColor || item.style.color}` : 'none'
                        }}
                    ></div>
                );
            case 'line':
                const strokeWidth = (item.style.borderWidth || 4) * scale;
                const isVertical = item.width < item.height;
                const pathData = isVertical
                    ? `M ${(item.width * scale) / 2},0 L ${(item.width * scale) / 2},${item.height * scale}`
                    : `M 0,${(item.height * scale) / 2} L ${item.width * scale},${(item.height * scale) / 2}`;
                return (
                    <div className="w-full h-full pointer-events-none flex items-center justify-center">
                        <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                            <path
                                d={pathData}
                                stroke={item.style.color || '#000'}
                                strokeWidth={strokeWidth}
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={item.style.borderStyle === 'dotted' ? `1 ${strokeWidth * 2}` : (item.style.borderStyle === 'dashed' ? `${strokeWidth * 3} ${strokeWidth * 2}` : 'none')}
                            />
                        </svg>
                    </div>
                );
            default: return null;
        }
    };

    if (item.type === 'text') {
        commonStyles.backgroundColor = 'transparent';
        if (!isSelected || scale < 1) {
            commonStyles.border = 'none';
            commonStyles.boxShadow = 'none';
        }
    } else if (item.type === 'shape' && item.style.shapeType === 'circle') {
        commonStyles.borderRadius = '50%';
    } else if (item.style.borderRadius) {
        commonStyles.borderRadius = `${item.style.borderRadius * scale}px`;
    }

    return (
        <div style={commonStyles} onPointerDown={scale >= 1 ? handlePointerDown : undefined} className="group">
            {renderContent()}
            {isSelected && scale >= 1 && (
                <>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border border-stone-400 rounded-full cursor-nwse-resize z-50 shadow-sm" onPointerDown={(e) => handleResizeStart(e, 'se')} />
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border border-stone-400 rounded-full cursor-nesw-resize z-50 shadow-sm" onPointerDown={(e) => handleResizeStart(e, 'sw')} />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border border-stone-400 rounded-full cursor-nesw-resize z-50 shadow-sm" onPointerDown={(e) => handleResizeStart(e, 'ne')} />
                    <div className="absolute -top-1 -left-1 w-3 h-3 bg-white border border-stone-400 rounded-full cursor-nwse-resize z-50 shadow-sm" onPointerDown={(e) => handleResizeStart(e, 'nw')} />
                </>
            )}
        </div>
    );
};

export default SlideCanvasItem;
