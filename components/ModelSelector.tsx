'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { useActiveModel } from '../hooks/useActiveModel';

const renderProviderLogo = (providerStr: string) => {
    const src = `/logos/providers/${providerStr.toLowerCase()}.png`;
    return (
        <div className="w-4 h-4 rounded-sm flex items-center justify-center bg-white/5 shrink-0 overflow-hidden">
            <img 
                src={src} 
                alt={`${providerStr} logo`} 
                className="w-full h-full object-contain"
                onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<div class="w-1.5 h-1.5 rounded-full bg-white/40"></div>';
                }}
            />
        </div>
    );
};

export function ModelSelect({ className = '' }: { className?: string }) {
    const { models, activeModel, setActiveModel, hasModels, activeEntry } = useActiveModel();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);

    const activeDisplay = useMemo(() => {
        if (activeEntry) {
            const parts = activeEntry.modelId.split('/');
            const prefix = parts.length > 1 ? parts[0] : '';
            const name = parts.length > 1 ? parts.slice(1).join('/') : parts[0];
            
            return (
                <div className="flex items-center gap-2">
                    <div className="text-white/80">
                        {prefix ? renderProviderLogo(prefix) : renderProviderLogo('default')}
                    </div>
                    <span>{name}</span>
                </div>
            );
        }
        return 'Select Model';
    }, [activeEntry]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const groupedModels = useMemo(() => {
        const groups: Record<string, any[]> = {};
        models.forEach(m => {
            if (!m.modelId.toLowerCase().includes(search.toLowerCase())) return;

            const parts = m.modelId.split('/');
            const providerName = parts.length > 1 ? parts[0] : 'Other Models';
            const displayProvider = providerName.charAt(0).toUpperCase() + providerName.slice(1);
            
            if (!groups[displayProvider]) groups[displayProvider] = [];
            groups[displayProvider].push({
                id: m.modelId,
                name: parts.length > 1 ? parts.slice(1).join('/') : parts[0],
                provider: providerName.toLowerCase()
            });
        });
        return groups;
    }, [models, search]);

    if (!hasModels) return null;

    return (
        <div className={`relative z-50 ${className}`} ref={menuRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-stone-900 border border-stone-800 hover:bg-black transition-colors text-white font-medium shadow-sm"
            >
                <span className="truncate max-w-[180px]">{activeDisplay}</span>
                <ChevronDown size={14} className={`text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute left-0 top-full mt-2 w-72 bg-[#0A0A0A] border border-[#222] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] py-1 font-sans animate-fade-in-up">
                    <div className="px-2 py-2">
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input 
                                type="text" 
                                placeholder="Search models..."
                                className="w-full bg-[#1A1A1A] border border-transparent focus:border-[#333] focus:ring-1 focus:ring-[#555] rounded-md py-1.5 pl-8 pr-3 text-xs text-gray-200 outline-none transition-all placeholder-gray-500"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto hidden-scrollbar pb-2">
                        {Object.entries(groupedModels).map(([providerName, mList]) => (
                            <div key={providerName} className="relative pb-1">
                                <div className="sticky top-0 z-10 px-3 py-1.5 text-[10px] text-gray-500 font-medium bg-[#0A0A0A]/95 backdrop-blur-sm shadow-[0_4px_10px_-4px_rgba(0,0,0,0.5)] mb-1 uppercase tracking-wider">
                                    {providerName} Models
                                </div>
                                <div className="px-1 relative z-0">
                                    {mList.map(model => (
                                        <button
                                            key={model.id}
                                            onClick={() => {
                                                setActiveModel(model.id);
                                                setIsOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors ${activeModel === model.id ? 'bg-[#222] text-white' : 'text-gray-300 hover:bg-[#1A1A1A]'}`}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <div className="text-gray-400 shrink-0">
                                                    {renderProviderLogo(model.provider)}
                                                </div>
                                                <span className="truncate">{model.name}</span>
                                            </div>
                                            {activeModel === model.id && <Check size={14} className="text-white shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
