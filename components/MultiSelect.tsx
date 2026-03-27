import React, { useState, useRef, useEffect } from 'react';
import { Check, X, ChevronDown } from 'lucide-react';

interface Option {
    label: string;
    value: string;
}

interface MultiSelectProps {
    options: Option[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    label?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ options, selectedValues, onChange, placeholder = "Select...", label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (value: string) => {
        if (selectedValues.includes(value)) {
            onChange(selectedValues.filter(v => v !== value));
        } else {
            onChange([...selectedValues, value]);
        }
    };

    const removeValue = (e: React.MouseEvent, value: string) => {
        e.stopPropagation();
        onChange(selectedValues.filter(v => v !== value));
    };

    return (
        <div className="relative" ref={containerRef}>
            {label && <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">{label}</label>}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full min-h-[42px] px-3 py-2 bg-white border border-stone-200 rounded-lg cursor-pointer flex items-center justify-between hover:border-stone-300 transition-colors"
            >
                <div className="flex flex-wrap gap-1.5">
                    {selectedValues.length === 0 && (
                        <span className="text-stone-400 text-sm">{placeholder}</span>
                    )}
                    {selectedValues.map(val => {
                        const option = options.find(o => o.value === val);
                        return (
                            <span key={val} className="bg-stone-100 text-stone-700 text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1">
                                {option?.label || val}
                                <button onClick={(e) => removeValue(e, val)} className="hover:text-red-500">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        );
                    })}
                </div>
                <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-stone-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    {options.map(option => {
                        const isSelected = selectedValues.includes(option.value);
                        return (
                            <button
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-stone-50 transition-colors flex items-center justify-between ${isSelected ? 'bg-stone-50 text-stone-900 font-medium' : 'text-stone-600'}`}
                            >
                                <span>{option.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-nobel-gold" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MultiSelect;
