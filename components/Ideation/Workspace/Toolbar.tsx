import React from 'react';
import { ToolType } from '../../../types';
import {
  MousePointer2,
  Hand,
  StickyNote,
  Type,
  Square,
  Image as ImageIcon,
  Sparkles,
  Smartphone,
  Minus
} from 'lucide-react';

interface Props {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  onImageClick: () => void;
  onAIModalOpen: () => void;
  onFrameClick: () => void;
}

const Toolbar: React.FC<Props> = ({ activeTool, setActiveTool, onImageClick, onAIModalOpen, onFrameClick }) => {

  const tools: { id: ToolType; icon: React.ReactNode; label: string; action?: () => void }[] = [
    { id: 'select', icon: <MousePointer2 size={20} />, label: 'Select' },
    { id: 'hand', icon: <Hand size={20} />, label: 'Pan' },
    { id: 'note', icon: <StickyNote size={20} />, label: 'Sticky Note' },
    { id: 'text', icon: <Type size={20} />, label: 'Text' },
    { id: 'line', icon: <Minus size={20} />, label: 'Line' },
    { id: 'shape', icon: <Square size={20} />, label: 'Shape' },
    { id: 'image', icon: <ImageIcon size={20} />, label: 'Image', action: onImageClick },
    // { id: 'ai', icon: <Sparkles size={20} className="text-nobel-gold" />, label: 'Magic', action: onAIModalOpen },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-md shadow-2xl rounded-2xl border border-nobel-gold/20 p-2 flex gap-2 z-50">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => {
            if (tool.action) {
              tool.action();
              if (tool.id !== 'ai') setActiveTool(tool.id);
            } else {
              setActiveTool(tool.id);
            }
          }}
          className={`
            relative group p-3 rounded-xl transition-all duration-200
            ${activeTool === tool.id
              ? 'bg-nobel-dark text-nobel-gold shadow-lg transform -translate-y-1'
              : 'text-gray-500 hover:bg-gray-100 hover:text-nobel-dark'
            }
          `}
          aria-label={tool.label}
        >
          {tool.icon}
          {/* Tooltip */}
          <span className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-nobel-dark text-white text-xs font-medium py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
            {tool.label}
            {/* Tiny arrow for tooltip */}
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-nobel-dark"></span>
          </span>
        </button>
      ))}
    </div>
  );
};

export default Toolbar;
