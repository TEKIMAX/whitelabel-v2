
import React from 'react';
import { PageType } from '../../../types';

interface SidebarProps {
  activePage: PageType;
  onPageChange: (page: PageType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onPageChange }) => {
  const pages = Object.values(PageType);

  return (
    <div className="w-64 bg-nobel-dark h-full flex flex-col p-6 text-white border-r border-nobel-gold/20">
      <div className="mb-10 flex items-center gap-3">
        <div className="w-8 h-8 bg-nobel-gold rounded-full flex items-center justify-center">
          <span className="font-serif font-bold text-nobel-dark">N</span>
        </div>
        <h1 className="font-serif text-xl tracking-tight">NOBEL SUITE</h1>
      </div>
      
      <nav className="flex-1 space-y-1">
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 ${
              activePage === page 
                ? 'bg-nobel-gold text-nobel-dark font-semibold' 
                : 'hover:bg-white/10 text-gray-400'
            }`}
          >
            <span className="text-sm">{page}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/10">
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium">Gemini 3 Pro Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
