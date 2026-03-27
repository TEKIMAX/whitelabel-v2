
import React, { useState } from 'react';
import { BookOpen, CheckCircle2, ChevronRight, ChevronLeft, Menu } from 'lucide-react';
import { SECTIONS } from './constants';

interface SidebarProps {
  activeSection: string | null;
  onNavigate: (sectionTitle: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onNavigate }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`
        bg-nobel-cream border-r border-nobel-gold/20 flex flex-col h-full overflow-visible no-print transition-all duration-300 ease-in-out relative
        ${isCollapsed ? 'w-16 md:w-20' : 'w-full md:w-80'}
      `}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-4 right-[-12px] z-20 w-6 h-6 bg-white border border-nobel-gold/20 rounded-full flex items-center justify-center shadow-md text-nobel-gold hover:text-nobel-dark hover:scale-110 transition-all hidden md:flex"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className={`p-6 border-b border-nobel-gold/10 bg-white/50 ${isCollapsed ? 'px-2 flex justify-center' : ''}`}>
        <div className="flex items-center gap-3 text-nobel-dark mb-2">
          <div className="p-2 bg-nobel-gold/10 rounded-lg shrink-0">
            <BookOpen className="text-nobel-gold" size={24} />
          </div>
          {!isCollapsed && <h1 className="font-serif text-xl font-bold whitespace-nowrap">Plan Builder</h1>}
        </div>
      </div>

      <nav className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2 py-4' : 'p-4'} space-y-1`}>
        {!isCollapsed && (
          <p className="px-3 py-2 text-xs font-bold text-nobel-gold tracking-wider uppercase mb-2">
            Table of Contents
          </p>
        )}

        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => onNavigate(section.title)}
            title={isCollapsed ? section.title : undefined}
            className={`
              w-full text-left flex items-start group rounded-lg transition-all duration-200
              ${isCollapsed ? 'justify-center px-0 py-3' : 'px-3 py-3'}
              ${activeSection === section.title
                ? 'bg-white shadow-sm border border-nobel-gold/20 text-nobel-dark'
                : 'hover:bg-white/60 text-nobel-dim hover:text-nobel-dark'
              }
            `}
          >
            <div className={`transition-colors shrink-0 ${activeSection === section.title ? 'text-nobel-gold' : 'text-gray-300 group-hover:text-nobel-gold/50'} ${!isCollapsed ? 'mt-1 mr-3' : ''}`}>
              {activeSection === section.title ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
            </div>

            {!isCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <span className={`block font-serif text-sm truncate ${activeSection === section.title ? 'font-semibold' : 'font-medium'}`}>
                    {section.title}
                  </span>
                </div>
                {activeSection === section.title && (
                  <ChevronRight size={14} className="text-nobel-gold mt-1 ml-2 shrink-0" />
                )}
              </>
            )}
          </button>
        ))}
      </nav>

      {!isCollapsed && (
        <div className="p-4 bg-nobel-gold/5 text-xs text-nobel-dim border-t border-nobel-gold/10 whitespace-normal">
          <p className="mb-2 font-serif italic text-nobel-dark">"A goal without a plan is just a wish."</p>

          <div className="mt-4 pt-4 border-t border-nobel-gold/10 text-center">
            <span className="inline-block bg-white px-2 py-1 rounded text-nobel-gold border border-nobel-gold/20">
              Inspired by SBA business template
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
