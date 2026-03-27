import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { generateBusinessPlanContent } from '../../services/geminiService';
import { CanvasData } from './types';
import SearchAndReplace from './SearchAndReplace';
import { ConfirmationDialog } from './ConfirmationDialog';
import { toast } from 'sonner';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Printer,
  Table as TableIcon,
  ChevronDown,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  Search,
  RotateCcw
} from 'lucide-react';
import { INITIAL_CONTENT } from './constants';

interface ToolbarProps {
  editor: Editor | null;
  canvasData?: CanvasData;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick,
  isActive = false,
  disabled = false,
  children,
  title
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`
      p-2 rounded transition-colors duration-200 flex items-center justify-center
      ${isActive
        ? 'bg-nobel-gold text-white shadow-sm'
        : 'text-nobel-dark hover:bg-nobel-cream hover:text-nobel-gold'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `}
  >
    {children}
  </button>
);

const Toolbar: React.FC<ToolbarProps> = ({ editor, canvasData }) => {
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const tableMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tableMenuRef.current && !tableMenuRef.current.contains(event.target as Node)) {
        setShowTableMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        // Rely on close button
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!editor) {
    return null;
  }

  const handleTableAction = (action: () => void) => {
    action();
    setShowTableMenu(false);
  };

  const uploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          editor.chain().focus().setImage({ src: event.target.result as string }).run();
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    e.target.value = '';
  }

  const handleAiAutofill = async () => {
    if (!canvasData) {
      toast.error("Please fill out the Business Model Canvas first.");
      return;
    }
    if (!(import.meta as any).env?.VITE_GEMINI_API_KEY) {
      toast.error("AI is not configured for this deployment.");
      return;
    }

    setIsAiLoading(true);

    try {
      const { selection, doc } = editor.state;
      const { from } = selection;

      // 1. Determine Context (Section Title)
      let currentSectionTitle = "Business Plan Section";
      editor.state.doc.nodesBetween(0, from, (node) => {
        if (node.type.name === 'heading') {
          currentSectionTitle = node.textContent;
        }
      });

      // 2. Check for Placeholder instruction at or near cursor
      // We look for text that matches {{ ... }} in the current block
      let specificInstruction = "";
      let targetPos = from;
      let targetEnd = from;
      let replaceTarget = false;

      const node = editor.state.doc.nodeAt(from) || editor.state.doc.nodeAt(from - 1);
      if (node && node.text) {
        const match = node.text.match(/\{\{(.*?)\}\}/);
        if (match) {
          specificInstruction = match[1];
          // Calculate exact position to replace
          // Note: This is simplified. Robust implementation requires scanning node relative pos
          replaceTarget = true;

          // If the whole node is just the instruction, replace the node.
          if (node.text.trim() === match[0]) {
            // We will just replace the selection if user clicked it, or the node
            // For now, let's assume the user clicked INTO the placeholder or selected it.
            // The simplest robust way is to replace the current selection if it's empty, or the node if found.
          }
        }
      }

      // If we didn't find a specific instruction at cursor, check if the current paragraph IS the instruction
      // The `ai-instruction` class is on the <p>.
      // Let's use the node text content directly if it looks like an instruction
      if (!specificInstruction) {
        const parent = editor.state.selection.$from.parent;
        if (parent && parent.textContent.match(/^\{\{.*\}\}$/)) {
          specificInstruction = parent.textContent.replace(/\{\{|\}\}/g, '');
          replaceTarget = true;
          // Select the whole parent node to replace it
          const parentPos = editor.state.selection.$from.before();
          editor.commands.setTextSelection({ from: parentPos, to: parentPos + parent.nodeSize });
        }
      }

      // 3. Prepare Canvas Context
      let relevantContext = "";
      const allCanvas = canvasData.map(s => `[${s.title}]: ${s.content}`).join('\n');

      if (specificInstruction) {
        relevantContext = allCanvas;
      } else {
        const lowerTitle = currentSectionTitle.toLowerCase();
        if (lowerTitle.includes("market") || lowerTitle.includes("customer")) {
          relevantContext = canvasData.filter(s => ['customer-segments', 'channels', 'customer-relationships'].includes(s.id)).map(s => `[${s.title}]: ${s.content}`).join('\n');
        } else if (lowerTitle.includes("financial") || lowerTitle.includes("price") || lowerTitle.includes("revenue")) {
          relevantContext = canvasData.filter(s => ['revenue-streams', 'cost-structure'].includes(s.id)).map(s => `[${s.title}]: ${s.content}`).join('\n');
        } else if (lowerTitle.includes("product") || lowerTitle.includes("service") || lowerTitle.includes("operation")) {
          relevantContext = canvasData.filter(s => ['value-propositions', 'key-activities', 'key-resources'].includes(s.id)).map(s => `[${s.title}]: ${s.content}`).join('\n');
        } else {
          relevantContext = allCanvas;
        }
      }

      const generatedText = await generateBusinessPlanContent(currentSectionTitle, relevantContext, specificInstruction);

      if (generatedText) {
        const contentToInsert = `
              <div class="my-4 p-5 bg-purple-50 border-l-4 border-purple-400 rounded-r shadow-sm ai-generated-block">
                <div class="text-gray-800 italic prose prose-sm max-w-none prose-table:my-2 prose-td:px-2 prose-th:px-2 prose-td:py-1 prose-th:py-1">
                    ${generatedText}
                </div>
              </div>
              <p></p>
            `;

        // If we found a target placeholder, we replace the selection (which we set to the parent node earlier)
        // or just insert if no target.
        if (replaceTarget) {
          editor.chain().focus().insertContent(contentToInsert).run();
        } else {
          editor.chain().focus().insertContent(contentToInsert).run();
        }
      }

    } catch (error) {
      toast.error("Failed to generate content. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleResetConfirm = () => {
    editor.commands.setContent(INITIAL_CONTENT);
    setIsResetDialogOpen(false);
  };

  return (
    <>
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-nobel-gold/20 px-4 py-2 flex flex-wrap items-center gap-1 shadow-sm no-print">
        <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <Heading3 size={18} />
          </ToolbarButton>
        </div>

        <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold"
          >
            <Bold size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic"
          >
            <Italic size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Quote"
          >
            <Quote size={18} />
          </ToolbarButton>
        </div>

        <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Ordered List"
          >
            <ListOrdered size={18} />
          </ToolbarButton>
        </div>

        {/* Table Menu */}
        <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2 relative" ref={tableMenuRef}>
          <button
            onClick={() => setShowTableMenu(!showTableMenu)}
            className={`
              p-2 rounded transition-colors duration-200 flex items-center gap-1
              ${editor.isActive('table')
                ? 'bg-nobel-gold text-white shadow-sm'
                : 'text-nobel-dark hover:bg-nobel-cream hover:text-nobel-gold'
              }
            `}
            title="Table Operations"
          >
            <TableIcon size={18} />
            <ChevronDown size={12} />
          </button>

          {showTableMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 w-48 py-1 z-30">
              <button
                onClick={() => handleTableAction(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}
                className="w-full text-left px-4 py-2 text-sm hover:bg-nobel-cream text-nobel-dark"
              >
                Insert Table
              </button>
              <div className="h-px bg-gray-100 my-1" />
              <button
                onClick={() => handleTableAction(() => editor.chain().focus().addColumnBefore().run())}
                disabled={!editor.can().addColumnBefore()}
                className="w-full text-left px-4 py-2 text-sm hover:bg-nobel-cream text-nobel-dark disabled:opacity-50"
              >
                Add Column Before
              </button>
              <button
                onClick={() => handleTableAction(() => editor.chain().focus().addColumnAfter().run())}
                disabled={!editor.can().addColumnAfter()}
                className="w-full text-left px-4 py-2 text-sm hover:bg-nobel-cream text-nobel-dark disabled:opacity-50"
              >
                Add Column After
              </button>
              <button
                onClick={() => handleTableAction(() => editor.chain().focus().deleteColumn().run())}
                disabled={!editor.can().deleteColumn()}
                className="w-full text-left px-4 py-2 text-sm hover:bg-nobel-cream text-red-600 disabled:opacity-50"
              >
                Delete Column
              </button>
              <div className="h-px bg-gray-100 my-1" />
              <button
                onClick={() => handleTableAction(() => editor.chain().focus().addRowBefore().run())}
                disabled={!editor.can().addRowBefore()}
                className="w-full text-left px-4 py-2 text-sm hover:bg-nobel-cream text-nobel-dark disabled:opacity-50"
              >
                Add Row Before
              </button>
              <button
                onClick={() => handleTableAction(() => editor.chain().focus().addRowAfter().run())}
                disabled={!editor.can().addRowAfter()}
                className="w-full text-left px-4 py-2 text-sm hover:bg-nobel-cream text-nobel-dark disabled:opacity-50"
              >
                Add Row After
              </button>
              <button
                onClick={() => handleTableAction(() => editor.chain().focus().deleteRow().run())}
                disabled={!editor.can().deleteRow()}
                className="w-full text-left px-4 py-2 text-sm hover:bg-nobel-cream text-red-600 disabled:opacity-50"
              >
                Delete Row
              </button>
              <div className="h-px bg-gray-100 my-1" />
              <button
                onClick={() => handleTableAction(() => editor.chain().focus().mergeCells().run())}
                disabled={!editor.can().mergeCells()}
                className="w-full text-left px-4 py-2 text-sm hover:bg-nobel-cream text-nobel-dark disabled:opacity-50"
              >
                Merge Cells
              </button>
              <button
                onClick={() => handleTableAction(() => editor.chain().focus().splitCell().run())}
                disabled={!editor.can().splitCell()}
                className="w-full text-left px-4 py-2 text-sm hover:bg-nobel-cream text-nobel-dark disabled:opacity-50"
              >
                Split Cell
              </button>
              <div className="h-px bg-gray-100 my-1" />
              <button
                onClick={() => handleTableAction(() => editor.chain().focus().deleteTable().run())}
                disabled={!editor.can().deleteTable()}
                className="w-full text-left px-4 py-2 text-sm hover:bg-nobel-cream text-red-600 disabled:opacity-50"
              >
                Delete Table
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2">
          <label className="cursor-pointer p-2 rounded text-nobel-dark hover:bg-nobel-cream hover:text-nobel-gold transition-colors duration-200 flex items-center justify-center" title="Insert Image">
            <input type="file" className="hidden" accept="image/*" onChange={uploadImage} />
            <ImageIcon size={18} />
          </label>
        </div>

        {false && (
          <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2">
            <button
              onClick={handleAiAutofill}
              disabled={isAiLoading}
              className={`
              p-2 rounded transition-colors duration-200 flex items-center gap-1
              text-purple-600 hover:bg-purple-50 hover:text-purple-700
              ${isAiLoading ? 'cursor-wait bg-purple-50' : ''}
            `}
              title="Auto-fill with AI (select an AI instruction placeholder like {{...}})"
            >
              {isAiLoading ? (
                <Loader2 size={18} className="animate-spin text-purple-600" />
              ) : (
                <Sparkles size={18} />
              )}
              <span className="text-xs font-bold hidden md:inline">
                {isAiLoading ? 'Thinking...' : 'AI Fill'}
              </span>
            </button>
          </div>
        )}

        {/* Note: Variable Button Removed */}

        {/* Search Button */}
        <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2 relative" ref={searchRef}>
          <ToolbarButton
            onClick={() => setShowSearch(!showSearch)}
            isActive={showSearch}
            title="Find & Replace"
          >
            <Search size={18} />
          </ToolbarButton>
          {showSearch && <SearchAndReplace editor={editor} onClose={() => setShowSearch(false)} />}
        </div>

        <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo size={18} />
          </ToolbarButton>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Reset Template Button */}
          <button
            onClick={() => setIsResetDialogOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 hover:text-red-600 transition-colors font-sans text-sm"
            title="Reset Template (Safe Mode)"
          >
            <RotateCcw size={16} />
          </button>

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2 bg-nobel-dark text-white rounded hover:bg-black transition-colors font-sans text-sm"
            title="Print Plan"
          >
            <Printer size={16} />
          </button>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleResetConfirm}
        title="Reset Template?"
        description="Are you sure you want to reset the plan template? This will remove all AI-generated content and custom edits."
        confirmLabel="Reset Template"
        isDangerous={true}
      />
    </>
  );
};

export default Toolbar;
