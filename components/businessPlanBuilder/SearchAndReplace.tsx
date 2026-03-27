import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import { Search, ArrowDown, ArrowUp, X, Replace, ReplaceAll } from 'lucide-react';

interface SearchAndReplaceProps {
  editor: Editor;
  onClose: () => void;
}

const SearchAndReplace: React.FC<SearchAndReplaceProps> = ({ editor, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  // Note: A more robust implementation would use a Tiptap extension for live highlighting.
  // This version focuses on functionality: navigation and replacement.

  const findMatches = () => {
    if (!searchTerm) {
        setMatchCount(0);
        setCurrentMatchIndex(-1);
        return [];
    }
    
    const { doc } = editor.state;
    const matches: { from: number; to: number }[] = [];
    
    // Simple text search iterating descendants
    // Note: This is a simplified search that works well for text within single blocks.
    // It might miss text crossing block boundaries, which is usually desired behavior.
    doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        let match;
        while ((match = regex.exec(node.text)) !== null) {
          matches.push({
            from: pos + match.index,
            to: pos + match.index + match[0].length,
          });
        }
      }
    });

    setMatchCount(matches.length);
    return matches;
  };

  const matches = findMatches();

  const handleNext = () => {
    if (matches.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIndex);
    const match = matches[nextIndex];
    
    editor.commands.setTextSelection({ from: match.from, to: match.to });
    const domNode = editor.view.domAtPos(match.from).node;
    if (domNode instanceof HTMLElement) {
        domNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (domNode.parentElement) {
        domNode.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handlePrevious = () => {
    if (matches.length === 0) return;
    const prevIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIndex);
    const match = matches[prevIndex];
    
    editor.commands.setTextSelection({ from: match.from, to: match.to });
    const domNode = editor.view.domAtPos(match.from).node;
    if (domNode instanceof HTMLElement) {
        domNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (domNode.parentElement) {
        domNode.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleReplace = () => {
    if (currentMatchIndex === -1 || matches.length === 0) {
        handleNext(); // Find one if not selected
        return;
    }
    
    const match = matches[currentMatchIndex];
    
    // Check if selection matches current match to ensure we are replacing what we think
    const { from, to } = editor.state.selection;
    if (from !== match.from || to !== match.to) {
        // Selection drifted, re-select
        handleNext();
        return;
    }

    editor.commands.insertContent(replaceTerm);
    
    // Matches array is now stale, findMatches will run on next render/call
    // But we need to update state immediately to feel responsive?
    // React state update will trigger re-render
    // We stay at current index (which is now the next match essentially)
  };

  const handleReplaceAll = () => {
     if (!searchTerm) return;
     
     // We process in reverse order to preserve positions
     const currentMatches = findMatches(); // Refresh
     if (currentMatches.length === 0) return;

     // Create a transaction
     const tr = editor.state.tr;
     for (let i = currentMatches.length - 1; i >= 0; i--) {
        const match = currentMatches[i];
        tr.insertText(replaceTerm, match.from, match.to);
     }
     editor.view.dispatch(tr);
  };

  return (
    <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-nobel-gold/20 p-4 z-50 animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-nobel-dark">Find & Replace</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-red-500">
          <X size={16} />
        </button>
      </div>
      
      <div className="space-y-3">
        <div className="relative">
             <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentMatchIndex(-1); }}
                placeholder="Find..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded focus:border-nobel-gold focus:outline-none"
                autoFocus
            />
             <div className="absolute right-2 top-2 text-xs text-gray-400">
                {matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : '0'}
             </div>
        </div>

        <div className="flex gap-2">
             <div className="relative flex-1">
                 <input
                    type="text"
                    value={replaceTerm}
                    onChange={(e) => setReplaceTerm(e.target.value)}
                    placeholder="Replace with..."
                    className="w-full pl-3 pr-3 py-2 text-sm border border-gray-200 rounded focus:border-nobel-gold focus:outline-none"
                />
             </div>
        </div>

        <div className="flex gap-2 justify-between pt-2 border-t border-gray-100">
             <div className="flex gap-1">
                 <button onClick={handlePrevious} disabled={matchCount === 0} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-50" title="Previous">
                    <ArrowUp size={16} />
                 </button>
                 <button onClick={handleNext} disabled={matchCount === 0} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-50" title="Next">
                    <ArrowDown size={16} />
                 </button>
             </div>
             
             <div className="flex gap-2">
                 <button onClick={handleReplace} disabled={matchCount === 0} className="flex items-center gap-1 px-3 py-1.5 bg-nobel-cream text-nobel-dark hover:bg-nobel-gold hover:text-white rounded text-xs font-medium transition-colors disabled:opacity-50">
                    Replace
                 </button>
                 <button onClick={handleReplaceAll} disabled={matchCount === 0} className="flex items-center gap-1 px-3 py-1.5 bg-nobel-dark text-white hover:bg-black rounded text-xs font-medium transition-colors disabled:opacity-50">
                    All
                 </button>
             </div>
        </div>
      </div>
    </div>
  );
};

export default SearchAndReplace;
