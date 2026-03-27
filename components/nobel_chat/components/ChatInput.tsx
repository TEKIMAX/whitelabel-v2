
import React, { useState, useRef, useEffect } from 'react';
import { PageType } from '../../../types';

interface ChatInputProps {
  onSend: (message: string, files?: File[]) => void;
  isLoading: boolean;
  activePage: PageType;
  onPageChange: (page: PageType) => void;
  thinkingMode: string;
  onThinkingModeChange: (mode: string) => void;
  customAgents?: any[];
  activeAgentId?: string | null;
  onAgentChange?: (agentId: string | null) => void;
  availableModels?: any[];
  activeModelId?: string | null;
  onModelChange?: (modelId: string | null) => void;
  modelCapabilities?: string[];
}

const THINKING_OPTIONS = [
  { value: 'low', label: 'Low', desc: 'Quick response' },
  { value: 'medium', label: 'Medium', desc: 'Balanced' },
  { value: 'high', label: 'High', desc: 'Deep analysis' },
];

const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  isLoading,
  activePage,
  onPageChange,
  thinkingMode,
  onThinkingModeChange,
  customAgents = [],
  activeAgentId = null,
  onAgentChange,
  availableModels = [],
  activeModelId = null,
  onModelChange,
  modelCapabilities = []
}) => {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDisclaimerExpanded, setIsDisclaimerExpanded] = useState(false);
  const [isThinkMenuOpen, setIsThinkMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const thinkMenuRef = useRef<HTMLDivElement>(null);

  // Derive display model name
  const currentModelDisplay = React.useMemo(() => {
    if (activeAgentId) {
      const agent = customAgents.find(a => a._id === activeAgentId);
      return agent ? `Agent: ${agent.name}` : 'Unknown Agent';
    }
    if (activeModelId && availableModels.length > 0) {
      const model = availableModels.find(m => m.modelId === activeModelId);
      if (model) {
        return model.modelId.split('/').pop() || model.modelId;
      }
    }
    return 'Select Model';
  }, [activeAgentId, activeModelId, availableModels, customAgents]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (thinkMenuRef.current && !thinkMenuRef.current.contains(event.target as Node)) {
        setIsThinkMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((text.trim() || files.length > 0) && !isLoading) {
      onSend(text, files);
      setText('');
      setFiles([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const currentThinkOption = THINKING_OPTIONS.find(o => o.value === thinkingMode) || THINKING_OPTIONS[3];

  return (
    <div className="max-w-3xl mx-auto w-full px-4 pb-6 space-y-4">
      <div className="relative flex flex-col bg-white rounded-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-nobel-gold/10 focus-within:border-nobel-gold/40 transition-all">

        {/* Top bar for files and context tags */}
        {(files.length > 0 || activePage) && (
          <div className="flex flex-wrap items-center gap-2 p-4 pb-0">
            {/* {activePage && (
              <div className="flex items-center gap-2 bg-nobel-dark text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-nobel-dark shadow-sm">
                <span className="opacity-60">Context:</span>
                <span>{activePage}</span>
              </div>
            )} */}
            {files.map((file, i) => (
              <div key={i} className="flex items-center gap-2 bg-nobel-cream px-3 py-1 rounded-full text-[10px] font-bold text-nobel-dark border border-nobel-gold/20">
                <span className="truncate max-w-[120px]">{file.name}</span>
                <button onClick={() => setFiles(f => f.filter((_, idx) => idx !== i))} className="text-nobel-gold hover:text-red-500 transition-colors">×</button>
              </div>
            ))}
          </div>
        )}

        {/* Model Capability Warning */}
        {activeModelId && !activeAgentId && modelCapabilities && !modelCapabilities.includes('tools') && (
          <div className="flex items-start gap-2 px-4 pt-3 pb-1 text-amber-600">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-[10px] sm:text-xs font-medium leading-tight">
              <strong>Tool Calling Unavailable:</strong> The selected model ({currentModelDisplay}) does not support autonomous tools. It cannot fetch live data or manipulate files.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end px-4 py-3 gap-2">
          {/* Model Selection Moved to Top Nav */}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 mb-1 text-gray-400 hover:text-nobel-gold transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
          </button>

          {/* Thinking Mode Dropdown */}
          <div className="relative" ref={thinkMenuRef}>
            <button
              type="button"
              onClick={() => setIsThinkMenuOpen(!isThinkMenuOpen)}
              title={`Thinking: ${currentThinkOption.label}`}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 mb-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border ${thinkingMode !== 'off'
                ? 'bg-stone-900 text-white border-stone-800 shadow-sm'
                : 'bg-stone-100 text-stone-400 border-stone-200 hover:bg-stone-200'
                }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a8 8 0 0 0-8 8c0 3.5 2 5.5 3.5 7.5.7.9 1 1.7 1 2.5h7c0-.8.3-1.6 1-2.5C18 15.5 20 13.5 20 10a8 8 0 0 0-8-8z" />
                <path d="M9 22h6" />
                <path d="M10 18h4" />
              </svg>
              {currentThinkOption.label}
              <svg className={`w-2.5 h-2.5 transition-transform ${isThinkMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
            </button>

            {isThinkMenuOpen && (
              <div className="absolute bottom-full left-0 mb-3 w-44 bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 z-50 animate-fade-in-up">
                <div className="px-3 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">
                  Reasoning Level
                </div>
                {THINKING_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onThinkingModeChange(option.value);
                      setIsThinkMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2.5 ${thinkingMode === option.value
                      ? 'bg-stone-100 text-stone-900 font-semibold'
                      : 'text-stone-500 hover:bg-stone-50'
                      }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${thinkingMode === option.value ? 'bg-stone-900' : 'bg-stone-200'
                      }`} />
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-[9px] text-stone-400 font-normal">{option.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={currentModelDisplay ? `Instruct ${currentModelDisplay}...` : `Instruct Adaptive Engine...`}
            rows={1}
            className="flex-1 bg-transparent py-4 outline-none text-sm text-gray-700 placeholder-gray-400 resize-none max-h-32"
          />

          <button
            type="submit"
            disabled={(!text.trim() && files.length === 0) || isLoading}
            className={`p-3 mb-1 rounded-2xl transition-all ${(text.trim() || files.length > 0) && !isLoading
              ? 'bg-nobel-dark text-white shadow-xl scale-100'
              : 'bg-gray-100 text-gray-300 scale-95 opacity-50'
              }`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            )}
          </button>
        </form>
      </div>

      <div className="relative px-8 text-center group">
        <p
          className={`text-[10px] text-stone-400 leading-tight transition-all duration-300 ${!isDisclaimerExpanded ? 'line-clamp-2' : ''}`}
          onClick={() => setIsDisclaimerExpanded(!isDisclaimerExpanded)}
        >
          The Services include experimental technology and may sometimes provide inaccurate or offensive content that doesn't represent Adaptive Startup's views. Use discretion before relying on, publishing, or otherwise using content provided by the Services. Don't rely on the Services for medical, mental health, legal, financial, or other professional advice. Any content regarding those topics is provided for informational purposes only and is not a substitute for advice from a qualified professional. Content does not constitute medical treatment or diagnosis.
        </p>

        {!isDisclaimerExpanded && (
          <button
            type="button"
            onClick={() => setIsDisclaimerExpanded(true)}
            className="mt-1 text-[9px] bg-stone-100 hover:bg-stone-200 text-stone-500 px-2 py-0.5 rounded-full transition-colors font-medium inline-block"
          >
            Read More
          </button>
        )}
        {isDisclaimerExpanded && (
          <button
            type="button"
            onClick={() => setIsDisclaimerExpanded(false)}
            className="mt-1 text-[9px] text-stone-300 hover:text-stone-500 transition-colors inline-block"
          >
            Show Less
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatInput;
