import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, Wrench, Eye, BrainCircuit, Mic } from 'lucide-react';

// ─── Capability detection ───────────────────────────────────────────────────
// Derived purely from model ID patterns — the Stripe LLM Gateway's /v1/models
// response only returns { id, object, owned_by } with no capability metadata,
// so we infer from the well-known naming conventions of each provider.

type Capability = 'tools' | 'vision' | 'reasoning' | 'audio';

function getModelCapabilities(modelId: string): Capability[] {
    const id = modelId.toLowerCase();
    const caps: Capability[] = [];

    // ── Tools (function/tool calling) ──
    if (
        id.startsWith('anthropic/') ||
        id.startsWith('google/gemini-2') ||
        id.startsWith('google/gemini-3') ||
        id.match(/openai\/(gpt-4|gpt-4\.1|gpt-4o|o1|o3|o4|gpt-5)/) ||
        id.startsWith('mistralai/') ||
        id.startsWith('qwen/') ||
        id.startsWith('perplexity/')
    ) caps.push('tools');

    // ── Vision (image input) ──
    if (
        id.startsWith('anthropic/claude-3') ||
        id.startsWith('anthropic/claude-sonnet') ||
        id.startsWith('anthropic/claude-opus') ||
        id.startsWith('anthropic/claude-haiku') ||
        id.startsWith('google/gemini') ||
        id.includes('gpt-4o') ||
        id.includes('gpt-4.1') ||
        id.includes('gpt-4-turbo') ||
        id.includes('gpt-4-vision') ||
        id.includes('gpt-5')
    ) caps.push('vision');

    // ── Reasoning / Extended thinking ──
    if (
        id.includes('thinking') ||
        id.includes('gemini-2.5') ||
        id.includes('gemini-3') ||
        id.match(/openai\/(o1|o3|o4)/) ||
        id.includes('claude-3-7') ||
        id.includes('claude-sonnet-4') ||
        id.includes('claude-opus-4') ||
        id.includes('gpt-5')
    ) caps.push('reasoning');

    // ── Audio (audio input / TTS) ──
    if (
        id.includes('audio') ||
        id.includes('whisper') ||
        id.includes('tts')
    ) caps.push('audio');

    return caps;
}

const CAP_META: Record<Capability, { icon: React.ReactNode; label: string; desc: string; className: string }> = {
    tools:     { icon: <Wrench size={9} />,       label: 'Tools',     desc: 'Supports function / tool calling',          className: 'bg-blue-500/20 text-blue-400' },
    vision:    { icon: <Eye size={9} />,           label: 'Vision',    desc: 'Understands images & screenshots',          className: 'bg-emerald-500/20 text-emerald-400' },
    reasoning: { icon: <BrainCircuit size={9} />,  label: 'Reasoning', desc: 'Extended thinking / chain-of-thought',      className: 'bg-amber-500/20 text-amber-400' },
    audio:     { icon: <Mic size={9} />,           label: 'Audio',     desc: 'Accepts audio input or generates speech',   className: 'bg-purple-500/20 text-purple-400' },
};

interface ModelSelectorProps {
  availableModels: any[];
  activeModelId: string | null;
  onModelChange: (modelId: string | null) => void;
  customAgents: any[];
  activeAgentId: string | null;
  onAgentChange: (agentId: string | null) => void;
}

// Helper to render provider logos natively from the whitelabel public directory
const renderProviderLogo = (providerStr: string) => {
    const src = `/logos/providers/${providerStr.toLowerCase()}.png`;
    return (
        <div className="w-4 h-4 rounded-sm flex items-center justify-center bg-white/5 shrink-0 overflow-hidden">
            <img 
                src={src} 
                alt={`${providerStr} logo`} 
                className="w-full h-full object-contain"
                onError={(e) => {
                    // Fallback to simple dot if the logo PNG doesn't exist
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<div class="w-1.5 h-1.5 rounded-full bg-white/40"></div>';
                }}
            />
        </div>
    );
};

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  availableModels,
  activeModelId,
  onModelChange,
  customAgents,
  activeAgentId,
  onAgentChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [capTooltip, setCapTooltip] = useState<{ cap: Capability; x: number; y: number } | null>(null);

  const showTooltip = useCallback((e: React.MouseEvent, cap: Capability) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setCapTooltip({ cap, x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  const hideTooltip = useCallback(() => setCapTooltip(null), []);
  const menuRef = useRef<HTMLDivElement>(null);

  // Derive providers properly from availableModels
  const providers = useMemo(() => {
    const list = new Set<string>();
    availableModels.forEach(m => {
        const id = m.modelId as string;
        if (id.includes('/')) {
            list.add(id.split('/')[0].toLowerCase());
        }
    });
    return Array.from(list);
  }, [availableModels]);

  const activeDisplay = useMemo(() => {
    if (activeAgentId) {
      const agent = customAgents.find(a => a._id === activeAgentId);
      return agent ? `Agent: ${agent.name}` : 'Unknown Agent';
    }
    if (activeModelId && availableModels.length > 0) {
      const model = availableModels.find(m => m.modelId === activeModelId);
      if (model) {
        // Find provider to map logo
        const parts = activeModelId.split('/');
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
    }
    return 'Select Model';
  }, [activeAgentId, activeModelId, availableModels, customAgents]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter models
  const groupedModels = useMemo(() => {
    const groups: Record<string, any[]> = {};
    availableModels.forEach(m => {
        if (!m.modelId.toLowerCase().includes(search.toLowerCase())) return;

        const parts = (m.modelId as string).split('/');
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
  }, [availableModels, search]);

  const filteredAgents = customAgents.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative z-50" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-stone-900 border border-stone-800 hover:bg-black transition-colors text-white font-medium shadow-sm"
      >
        <span className="truncate max-w-[180px]">{activeDisplay}</span>
        <ChevronDown size={14} className={`text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-72 bg-[#0A0A0A] border border-[#222] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] py-1 font-sans animate-fade-in-up">
          {/* Search Box */}
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


            {Object.entries(groupedModels).map(([providerName, models]) => (
                <div key={providerName} className="relative pb-1">
                    <div className="sticky top-0 z-10 px-3 py-1.5 text-[10px] text-gray-500 font-medium bg-[#0A0A0A]/95 backdrop-blur-sm shadow-[0_4px_10px_-4px_rgba(0,0,0,0.5)] mb-1 uppercase tracking-wider">{providerName} Models</div>
                    <div className="px-1 relative z-0">
                        {models.map(model => {
                            const caps = getModelCapabilities(model.id);
                            const isActive = !activeAgentId && activeModelId === model.id;
                            return (
                                <button
                                    key={model.id}
                                    onClick={() => {
                                        onAgentChange(null);
                                        onModelChange(model.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${isActive ? 'bg-[#222] text-white' : 'text-gray-300 hover:bg-[#1A1A1A]'}`}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="text-gray-400 shrink-0">
                                            {renderProviderLogo(model.provider)}
                                        </div>
                                        <span className="truncate">{model.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {caps.map(cap => (
                                            <span
                                                key={cap}
                                                onMouseEnter={e => showTooltip(e, cap)}
                                                onMouseLeave={hideTooltip}
                                                className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium leading-none cursor-default ${CAP_META[cap].className}`}
                                            >
                                                {CAP_META[cap].icon}
                                            </span>
                                        ))}
                                        {isActive && <Check size={12} className="text-white ml-0.5" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            {filteredAgents.length > 0 && (
                 <div className="relative pb-1">
                     <div className="sticky top-0 z-10 px-3 py-1.5 text-[10px] text-gray-500 font-medium bg-[#0A0A0A]/95 backdrop-blur-sm shadow-[0_4px_10px_-4px_rgba(0,0,0,0.5)] mb-1 uppercase tracking-wider">Custom Agents</div>
                     <div className="px-1 relative z-0">
                         {filteredAgents.map(agent => (
                             <button
                                 key={agent._id}
                                 onClick={() => {
                                     onModelChange(null);
                                     onAgentChange(agent._id);
                                     setIsOpen(false);
                                 }}
                                 className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors ${activeAgentId === agent._id ? 'bg-[#222] text-white' : 'text-gray-300 hover:bg-[#1A1A1A]'}`}
                             >
                                 <div className="flex items-center gap-2 truncate">
                                     <div className="w-4 h-4 rounded-md bg-indigo-500/20 flex items-center justify-center shrink-0">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                                     </div>
                                     <span className="truncate">{agent.name}</span>
                                 </div>
                                 {activeAgentId === agent._id && <Check size={14} className="text-white shrink-0" />}
                             </button>
                         ))}
                     </div>
                 </div>
            )}


          </div>
        </div>
      )}

      {/* Portal tooltip — rendered at document.body to escape overflow:hidden/auto ancestors */}
      {capTooltip && createPortal(
        <div
          className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-full"
          style={{ left: capTooltip.x, top: capTooltip.y - 6 }}
        >
          <div className="rounded-md bg-[#1A1A1A] border border-[#444] px-2.5 py-1.5 text-[10px] text-gray-200 shadow-xl text-center leading-snug whitespace-nowrap">
            <span className="font-semibold block text-white">{CAP_META[capTooltip.cap].label}</span>
            {CAP_META[capTooltip.cap].desc}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#444]" />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
