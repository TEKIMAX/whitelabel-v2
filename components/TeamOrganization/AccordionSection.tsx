import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionSectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    tags?: string[];
}

export const AccordionSection: React.FC<AccordionSectionProps> = ({
    title,
    icon,
    children,
    tags = []
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const hasTags = tags.length > 0;

    return (
        <div className={`rounded-xl border transition-all relative ${isOpen ? 'z-30' : ''} ${hasTags ? 'bg-stone-900 border-stone-900' : 'bg-white border-stone-200'}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 flex items-center justify-between"
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`${hasTags ? 'text-white' : 'text-stone-500'}`}>
                        {icon}
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                        <span className={`text-sm font-bold uppercase tracking-wider truncate ${hasTags ? 'text-white' : 'text-stone-500'}`}>
                            {title}
                        </span>
                        {hasTags && !isOpen && (
                            <div className="flex gap-1 mt-1 overflow-hidden max-w-full">
                                {tags.slice(0, 2).map((tag, i) => (
                                    <span key={i} className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded truncate max-w-[100px]">
                                        {tag}
                                    </span>
                                ))}
                                {tags.length > 2 && (
                                    <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded">
                                        +{tags.length - 2}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${hasTags ? 'text-white' : 'text-stone-400'}`}>
                    <ChevronDown className="w-4 h-4" />
                </div>
            </button>

            {isOpen && (
                <div className={`px-4 pb-4 pt-0 ${hasTags ? 'text-white' : ''}`}>
                    <div className={`p-4 rounded-lg ${hasTags ? 'bg-white/5 border border-white/10' : 'bg-stone-50 border border-stone-100'}`}>
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccordionSection;
