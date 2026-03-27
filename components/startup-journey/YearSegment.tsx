import React from 'react';

interface YearSegmentProps {
    year: number;
    color: string;
    isExpanded: boolean;
    onToggle: () => void;
    children?: React.ReactNode;
}

export const YearSegment: React.FC<YearSegmentProps> = ({
    year,
    color,
    isExpanded,
    onToggle,
    children
}) => {
    return (
        <div className={`relative flex items-center transition-all duration-700 ease-in-out ${isExpanded ? 'min-w-[800px]' : 'min-w-[240px]'} h-16 mr-1`}>
            {/* The Bar */}
            <div
                onClick={onToggle}
                className={`
                    absolute inset-0 flex items-center justify-center cursor-pointer clip-arrow z-10
                    text-white font-bold text-xl font-serif tracking-widest shadow-sm hover:brightness-110 transition-all
                `}
                style={{ backgroundColor: color }}
            >
                {year}
            </div>

            {/* Month Markers (Only if expanded) */}
            {isExpanded && (
                <div className="absolute top-full w-full h-4 flex justify-between px-8 text-[9px] font-bold text-stone-300 uppercase tracking-widest pt-2 pointer-events-none">
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                        <span key={m} className="text-center w-full">{m}</span>
                    ))}
                </div>
            )}

            {children}
        </div>
    );
};
