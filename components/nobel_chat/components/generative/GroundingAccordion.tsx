
import React, { useState } from 'react';
import { GroundingSource } from '../../../../types';

interface GroundingAccordionProps {
  sources: GroundingSource[];
  accuracyScore?: number;
}

const GroundingAccordion: React.FC<GroundingAccordionProps> = ({ sources, accuracyScore }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 border border-gray-100 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm transition-all duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-50">
            <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            {sources.length} Verified Sources Found
          </span>
          {accuracyScore !== undefined && (
            <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-nobel-gold/10 border border-nobel-gold/20">
              <span className="text-[10px] font-bold text-nobel-gold">{accuracyScore}% Accuracy</span>
            </div>
          )}
        </div>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div 
        className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="p-4 pt-0 space-y-2">
          {sources.map((source, i) => (
            <a 
              key={i}
              href={source.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-50 hover:border-nobel-gold/30 hover:shadow-sm transition-all group"
            >
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-700 group-hover:text-nobel-dark line-clamp-1">{source.title || 'Untitled Reference'}</span>
                <span className="text-[10px] text-gray-400 truncate max-w-[250px]">{source.uri}</span>
              </div>
              <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-nobel-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GroundingAccordion;
