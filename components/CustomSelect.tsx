
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface CustomSelectProps {
    value: string | number;
    onChange: (val: any) => void;
    options: { label: string; value: string | number; color?: string }[];
    className?: string;
    placeholder?: string;
    align?: 'left' | 'right';
    variant?: 'light' | 'dark';
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options, className = "", placeholder = "Select...", align = 'left', variant = 'light' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Recalculate position when opening
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + 4,
                left: align === 'right' ? rect.right : rect.left,
                width: rect.width
            });
        }
    }, [isOpen, align]);

    const selectedOption = options.find(o => o.value === value);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 py-2.5 outline-none transition-colors shadow-inner font-bold text-sm ${variant === 'dark' ? 'bg-stone-900 border-2 border-[#D4AF37] rounded-lg text-white hover:bg-stone-800' : 'bg-white border border-stone-200 rounded-full font-medium text-stone-700 hover:bg-stone-50 focus:border-nobel-gold'}`}
            >
                <span className={`truncate ${!selectedOption && !value ? (variant === 'dark' ? 'text-stone-500' : 'text-stone-400') : (variant === 'dark' ? 'text-white' : 'text-stone-900')}`}>
                    {selectedOption ? (
                        selectedOption.color ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${selectedOption.color}`}>
                                {selectedOption.label}
                            </span>
                        ) : selectedOption.label
                    ) : (value || placeholder)}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${variant === 'dark' ? 'text-stone-400' : 'text-stone-400'}`} />
            </button>

            {isOpen && (
                <div
                    className={`fixed min-w-[200px] border shadow-xl z-[9999] max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 ${variant === 'dark' ? 'bg-stone-900 border-stone-800 rounded-lg' : 'bg-white border-stone-200 rounded-lg'}`}
                    style={{
                        position: 'fixed',
                        top: dropdownPos.top,
                        left: align === 'right' ? undefined : dropdownPos.left,
                        right: align === 'right' ? (window.innerWidth - dropdownPos.left) : undefined,
                        width: Math.max(dropdownPos.width, 200),
                    }}
                >
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between gap-4 
                                ${variant === 'dark' ?
                                    `hover:bg-stone-800 ${opt.value === value ? 'bg-stone-800' : ''}` :
                                    `hover:bg-stone-50 ${opt.value === value ? 'bg-stone-50' : ''}`
                                }`}
                        >
                            {opt.color ? (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${opt.color}`}>
                                    {opt.label}
                                </span>
                            ) : (
                                <span className={`truncate ${opt.value === value ? 'font-bold text-nobel-gold' : (variant === 'dark' ? 'text-stone-300' : 'text-stone-600')}`}>{opt.label}</span>
                            )}
                            {opt.value === value && <Check className="w-3.5 h-3.5 flex-shrink-0 text-nobel-gold" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
