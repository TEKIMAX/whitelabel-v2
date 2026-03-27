
import React, { useState } from 'react';
import { CanvasSection, StartupData, CanvasVersion, AISettings, RolePermissions } from '../types';
import { suggestCanvasSection } from '../services/geminiService';
import { ArrowRight, ArrowLeft, Sparkles, Loader2, Save, History, Clock, ChevronDown, Plus, Check, Trash2, Presentation, Pencil, GraduationCap, LayoutGrid, Home } from 'lucide-react';
import TabNavigation from './TabNavigation';
import ProjectSelector from './ProjectSelector';
import { Logo } from './Logo';
import AttributionBadge from './AttributionBadge';
import { ModelSelect } from './ModelSelector';
import { useActiveModel } from '../hooks/useActiveModel';

const BADGE_MARKDOWN = '![AI Assisted](https://img.shields.io/badge/AI-Assisted-purple)';
const HUMAN_BADGE_MARKDOWN = '![Human Edited](https://img.shields.io/badge/Human-Edited-orange)';

interface CanvasStackProps {
  data: StartupData;
  allProjects: StartupData[];
  onUpdate: (section: CanvasSection, content: string) => void;
  onSaveVersion: (name: string) => void;
  onLoadVersion: (version: CanvasVersion) => void;
  onDeleteVersion: (versionId: string) => void;
  onFinish: () => void;
  onSwitchProject: (id: string) => void;
  onNewProject: () => void;
  onNavigate: (view: any) => void;
  currentView: any;
  settings: AISettings;
  allowedPages?: string[];
  permissions?: RolePermissions;
}

const timeAgo = (date: number) => {
  const seconds = Math.floor((Date.now() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return "Just now";
};

import DotPatternBackground from './DotPatternBackground';

const CanvasStack: React.FC<CanvasStackProps> = ({
  data,
  allProjects,
  onUpdate,
  onSaveVersion,
  onLoadVersion,
  onDeleteVersion,
  onFinish,
  onSwitchProject,
  onNewProject,
  onNavigate,
  currentView,
  settings,
  allowedPages,
  permissions
}) => {
  const [activeSection, setActiveSection] = useState<CanvasSection>(CanvasSection.PROBLEM);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingSection, setGeneratingSection] = useState<CanvasSection | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showNewVersionDialog, setShowNewVersionDialog] = useState(false);
  const [showDeleteVersionDialog, setShowDeleteVersionDialog] = useState(false);
  const [newVersionName, setNewVersionName] = useState("");
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);

  // Default to false if undefined for safety, though Founder is fixed in App.tsx
  const canCreateVersion = permissions?.canvas?.create ?? false;
  const canUpdateCanvas = permissions?.canvas?.update ?? false;

  const { activeModel, capabilities } = useActiveModel();
  const modifiedSettings = { ...settings, modelName: activeModel || settings.modelName };

  React.useEffect(() => {
  }, [data.canvasVersions, data.currentCanvasId]);

  /* ... inside CanvasStack ... */
  /* ... inside CanvasStack ... */

  const handleGenerate = async (section: CanvasSection): Promise<string> => {
    setGeneratingSection(section);
    setIsGenerating(true);
    try {
      const suggestion = await suggestCanvasSection(section, data, modifiedSettings);
      return suggestion;
    } catch (e) {
      return "";
    } finally {
      setIsGenerating(false);
      setGeneratingSection(null);
    }
  };

  /* ... skipping to GridCellProps ... */
  /* NOTE: multistep replacement is safer here */

  const handleCreateVersion = async () => {
    if (newVersionName.trim()) {
      setIsCreatingVersion(true);
      try {
        await onSaveVersion(newVersionName.trim());
        setNewVersionName("");
        setShowNewVersionDialog(false);
        setShowVersions(false);
      } catch (error) {
      } finally {
        setIsCreatingVersion(false);
      }
    }
  };

  const handleSaveClick = () => {
    const timestamp = new Date();
    const formattedDate = timestamp.toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'
    });
    onSaveVersion(formattedDate);
  };

  const getSectionHelper = (section: CanvasSection) => {
    switch (section) {
      case CanvasSection.PROBLEM: return "List your top 1-3 problems.";
      case CanvasSection.CUSTOMER_SEGMENTS: return "Who are your target customers?";
      case CanvasSection.UNIQUE_VALUE_PROPOSITION: return "Single, clear, compelling message.";
      case CanvasSection.SOLUTION: return "Outline a possible solution for each problem.";
      case CanvasSection.UNFAIR_ADVANTAGE: return "Something that can't be easily copied.";
      case CanvasSection.CHANNELS: return "Path to customers.";
      case CanvasSection.KEY_METRICS: return "Key numbers that tell you how your business is doing.";
      case CanvasSection.COST_STRUCTURE: return "Acquisition costs, distribution costs, people, etc.";
      case CanvasSection.REVENUE_STREAMS: return "Revenue model, LTV, revenue, gross margin.";
      default: return "";
    }
  };

  return (
    <div className="h-screen flex bg-nobel-cream relative overflow-hidden">
      <DotPatternBackground className="fixed" color="#a8a29e" />

      {/* Left Sidebar - Vertical Image with Logo and Title */}
      <div className="w-[20%] h-full relative overflow-hidden bg-stone-900 border-r border-stone-200 shadow-2xl z-20">
        <img
          src="/images/canvasModel.png"
          className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105"
          alt="Business Model Canvas"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/40 via-transparent to-stone-900/80" />
        
        {/* Logo */}
        <div className="absolute top-8 left-8 z-30">
          <Logo imageClassName="h-8 w-auto brightness-0 invert" />
        </div>
        
        {/* Title and Description */}
        <div className="absolute inset-x-0 bottom-0 p-8 space-y-4 bg-gradient-to-t from-stone-900 via-stone-900/60 to-transparent pt-24">
          <div className="space-y-3">
            <span className="text-nobel-gold font-medium tracking-wider uppercase text-xs block">Strategy</span>
            <h2 className="text-white text-2xl font-serif font-bold leading-tight">
              Business Model Canvas
            </h2>
            <div className="h-1 w-10 bg-nobel-gold/50 rounded-full" />
            <p className="text-stone-300 text-sm leading-relaxed">
              Define your business model on a single page.
            </p>
          </div>
        </div>
      </div>

      {/* Right Content Area */}
      <div className="w-[80%] h-full flex flex-col relative z-10">
        {/* Header */}
        <header className="px-10 py-4 flex items-center justify-between relative z-30 bg-white/80 backdrop-blur-sm border-b border-stone-200">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('CANVAS_LANDING')}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider bg-stone-900 border border-stone-900 rounded-full transition-colors text-white hover:bg-stone-800"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <TabNavigation
              currentView={currentView}
              onNavigate={onNavigate}
              allowedPages={allowedPages}
              projectFeatures={{
                canvasEnabled: data.canvasEnabled,
                marketResearchEnabled: data.marketResearchEnabled
              }}
              mode="light"
            />
          </div>

          <div className="flex items-center gap-3">
            <ModelSelect className="w-48" />
            <div className="w-px h-6 bg-stone-300 mx-2"></div>
            <button
              onClick={() => setShowDeleteVersionDialog(true)}
              className="p-2 bg-red-50 border border-red-200 text-red-500 rounded-full transition-colors hover:bg-red-100 hover:border-red-300"
              title="Clear Canvas"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow p-8 md:p-12 relative z-10 overflow-auto">
        <div className="max-w-[1400px] mx-auto bg-white border border-stone-200 shadow-sm rounded-lg flex flex-col md:h-[900px] overflow-y-auto scrollbar-hide">
          <div className="grid grid-cols-1 md:grid-cols-10 md:grid-rows-2 gap-px bg-stone-200 border-b border-stone-200 flex-grow min-h-0">
            <div className="md:col-span-2 md:row-span-2 bg-white">
              <GridCell
                key={`${CanvasSection.PROBLEM}-${data.currentCanvasId}`}
                section={CanvasSection.PROBLEM}
                className="h-full"
                tall
                data={data}
                onUpdate={onUpdate}
                handleGenerate={handleGenerate}
                generatingSection={generatingSection}
                getSectionHelper={getSectionHelper}
                readOnly={!canUpdateCanvas}
              />
            </div>
            <div className="md:col-span-2 md:row-span-2 grid grid-rows-2 gap-px bg-stone-200">
              <GridCell
                key={`${CanvasSection.SOLUTION}-${data.currentCanvasId}`}
                section={CanvasSection.SOLUTION}
                className="h-full"
                data={data}
                onUpdate={onUpdate}
                handleGenerate={handleGenerate}
                generatingSection={generatingSection}
                getSectionHelper={getSectionHelper}
                readOnly={!canUpdateCanvas}
              />
              <GridCell
                key={`${CanvasSection.KEY_METRICS}-${data.currentCanvasId}`}
                section={CanvasSection.KEY_METRICS}
                className="h-full"
                data={data}
                onUpdate={onUpdate}
                handleGenerate={handleGenerate}
                generatingSection={generatingSection}
                getSectionHelper={getSectionHelper}
                readOnly={!canUpdateCanvas}
              />
            </div>
            <div className="md:col-span-2 md:row-span-2 bg-white">
              <GridCell
                key={`${CanvasSection.UNIQUE_VALUE_PROPOSITION}-${data.currentCanvasId}`}
                section={CanvasSection.UNIQUE_VALUE_PROPOSITION}
                className="h-full"
                tall
                data={data}
                onUpdate={onUpdate}
                handleGenerate={handleGenerate}
                generatingSection={generatingSection}
                getSectionHelper={getSectionHelper}
                readOnly={!canUpdateCanvas}
              />
            </div>
            <div className="md:col-span-2 md:row-span-2 grid grid-rows-2 gap-px bg-stone-200">
              <GridCell
                key={`${CanvasSection.UNFAIR_ADVANTAGE}-${data.currentCanvasId}`}
                section={CanvasSection.UNFAIR_ADVANTAGE}
                className="h-full"
                data={data}
                onUpdate={onUpdate}
                handleGenerate={handleGenerate}
                generatingSection={generatingSection}
                getSectionHelper={getSectionHelper}
                readOnly={!canUpdateCanvas}
              />
              <GridCell
                key={`${CanvasSection.CHANNELS}-${data.currentCanvasId}`}
                section={CanvasSection.CHANNELS}
                className="h-full"
                data={data}
                onUpdate={onUpdate}
                handleGenerate={handleGenerate}
                generatingSection={generatingSection}
                getSectionHelper={getSectionHelper}
                readOnly={!canUpdateCanvas}
              />
            </div>
            <div className="md:col-span-2 md:row-span-2 bg-white">
              <GridCell
                key={`${CanvasSection.CUSTOMER_SEGMENTS}-${data.currentCanvasId}`}
                section={CanvasSection.CUSTOMER_SEGMENTS}
                className="h-full"
                tall
                data={data}
                onUpdate={onUpdate}
                handleGenerate={handleGenerate}
                generatingSection={generatingSection}
                getSectionHelper={getSectionHelper}
                readOnly={!canUpdateCanvas}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-stone-200">
            <GridCell
              key={`${CanvasSection.COST_STRUCTURE}-${data.currentCanvasId}`}
              section={CanvasSection.COST_STRUCTURE}
              className="h-48"
              data={data}
              onUpdate={onUpdate}
              handleGenerate={handleGenerate}
              generatingSection={generatingSection}
              getSectionHelper={getSectionHelper}
              readOnly={!canUpdateCanvas}
            />
            <GridCell
              key={`${CanvasSection.REVENUE_STREAMS}-${data.currentCanvasId}`}
              section={CanvasSection.REVENUE_STREAMS}
              className="h-48"
              data={data}
              onUpdate={onUpdate}
              handleGenerate={handleGenerate}
              generatingSection={generatingSection}
              getSectionHelper={getSectionHelper}
              readOnly={!canUpdateCanvas}
            />
          </div>
        </div>
        </main>
        </div>

        {/* New Version Dialog */}
      {
        showNewVersionDialog && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6">
                <h3 className="font-serif text-xl text-stone-900 mb-4">New Version</h3>
                <input
                  type="text"
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                  placeholder="Version Name"
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold mb-6"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateVersion()}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowNewVersionDialog(false)}
                    className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-lg font-bold uppercase tracking-wider text-xs hover:bg-stone-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateVersion}
                    disabled={isCreatingVersion || !newVersionName.trim()}
                    className="flex-1 py-3 bg-stone-900 text-white rounded-lg font-bold uppercase tracking-wider text-xs hover:bg-nobel-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isCreatingVersion ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Delete Version Dialog */}
      {
        showDeleteVersionDialog && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl text-stone-900 mb-2">Delete Version?</h3>
                <p className="text-stone-500 text-sm mb-6">
                  Are you sure you want to delete this version? This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteVersionDialog(false)}
                    className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-lg font-bold uppercase tracking-wider text-xs hover:bg-stone-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (data.currentCanvasId) {
                        onDeleteVersion(data.currentCanvasId);
                      }
                      setShowDeleteVersionDialog(false);
                    }}
                    className="flex-1 py-3 bg-red-500 text-white rounded-lg font-bold uppercase tracking-wider text-xs hover:bg-red-600 transition-colors"
                  >
                    Delete Version
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

import ReactMarkdown from 'react-markdown';
import MiniEditor from './editor/MiniEditor';
import SectionEditDialog from './SectionEditDialog';

interface GridCellProps {
  section: CanvasSection;
  className?: string;
  tall?: boolean;
  data: StartupData;
  onUpdate: (section: CanvasSection, content: string) => void;
  handleGenerate: (section: CanvasSection) => Promise<string>;
  generatingSection: CanvasSection | null;
  getSectionHelper: (section: CanvasSection) => string;
  readOnly?: boolean;
}

const GridCell: React.FC<GridCellProps> = ({
  section,
  className,
  tall = false,
  data,
  onUpdate,
  handleGenerate,
  generatingSection,
  getSectionHelper,
  readOnly = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(data.canvas[section] || '');

  // Detect Badges
  const isAiAssisted = localContent.includes(BADGE_MARKDOWN);
  const isHumanEdited = localContent.includes(HUMAN_BADGE_MARKDOWN);
  const isBottomSection = section === CanvasSection.COST_STRUCTURE || section === CanvasSection.REVENUE_STREAMS;

  // Sync local content when data changes externally (e.g. version switch)
  React.useEffect(() => {
    setLocalContent(data.canvas[section] || '');
  }, [data.canvas[section]]);


  const handleSave = (newContent: string) => {
    onUpdate(section, newContent);
    setIsEditing(false);
  };

  return (
    <div className={`${className} relative group h-full`}>
      {/* Layout Anchor ^ sets size. Inner Card v handles UI */}
      <div className={`
        flex flex-col p-6 bg-white transition-all duration-300 w-full h-full overflow-hidden
        ${!readOnly ? 'hover:bg-[#F9F8F4]' : ''}
      `}>
        <div className="flex justify-between items-start mb-4 shrink-0">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-stone-400 group-hover:text-nobel-gold transition-colors font-sans truncate">{section}</h3>

            {/* Badges */}
            {isAiAssisted && (
              <AttributionBadge type="AI Assisted" />
            )}
            {isHumanEdited && (
              <AttributionBadge type="Human Edited" />
            )}
          </div>

          {!readOnly && (
            <div className="flex gap-2 items-center shrink-0">
              <div className={`flex gap-1 items-center transition-opacity opacity-0 group-hover:opacity-100`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className={`p-1.5 rounded-full border shadow-sm transition-all hover:shadow flex items-center justify-center bg-white border-stone-200 text-stone-400 hover:text-stone-900 hover:border-stone-300`}
                  title="Edit Section"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div
          className={`flex-1 flex flex-col min-h-0 relative overflow-hidden`}
        >
          <div className={`flex-1 ${isBottomSection ? 'overflow-hidden max-h-[160px]' : 'overflow-y-auto'}`}>
            <MiniEditor
              content={localContent}
              onUpdate={() => { }} // No-op for read-only
              placeholder={getSectionHelper(section)}
              disabled={true} // Always disabled in grid view
              isAiAssisted={isAiAssisted}
              className="border-none bg-transparent h-full"
            />
          </div>

          {isBottomSection && localContent.length > 50 && (
            <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end justify-center pb-2 z-10">
              <button
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                className="text-[10px] font-bold text-nobel-gold hover:text-stone-900 transition-colors uppercase tracking-widest bg-white px-3 py-1 rounded-full shadow-md border border-stone-100 mb-1"
              >
                Read More
              </button>
            </div>
          )}

          {!localContent && !readOnly && (
            <div className="absolute inset-x-0 top-0 text-stone-300 italic text-sm pointer-events-none p-0">
              {getSectionHelper(section)}
            </div>
          )}
        </div>
      </div>

      <SectionEditDialog
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        section={section}
        initialContent={localContent}
        onSave={handleSave}
        handleGenerate={handleGenerate}
        getSectionHelper={getSectionHelper}
        isGenerating={generatingSection === section}
      />
    </div>
  )
};

export default CanvasStack;
