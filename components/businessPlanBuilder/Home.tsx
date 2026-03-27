import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from "../../convex/_generated/api";
import { useCreateBusinessPlanVersion } from '../../hooks/useCreate';
import Sidebar from './Sidebar';
import Editor from './Editor';
import BusinessModelCanvas from './BusinessModelCanvas';
import PlanHistory from './PlanHistory';
import { INITIAL_CANVAS_DATA } from './constants';
import { CanvasData } from './types';
import { FileText, LayoutGrid, History, Save, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { StartupData, RolePermissions, AISettings } from '../../types';
import TabNavigation from '../TabNavigation';
import ProjectSelector from '../ProjectSelector';
import { toast } from 'sonner';
import { InputDialog } from './InputDialog';

// Helper to sanitize title for searching
const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

type ActiveTab = 'plan' | 'canvas' | 'history';

interface BusinessPlanBuilderProps {
  currentProject?: StartupData;
  allProjects?: StartupData[];
  onSwitchProject?: (id: string) => void;
  onNewProject?: () => void;
  onNavigate?: (view: any) => void;
  currentView?: any;
  allowedPages?: string[];
  settings?: AISettings;
  user?: any;
  onLogout?: () => void;
}

const BusinessPlanBuilder: React.FC<BusinessPlanBuilderProps> = ({
  currentProject,
  allProjects = [],
  onSwitchProject = () => { },
  onNewProject = () => { },
  onNavigate = (p0: string) => { },
  currentView = 'BUSINESS_PLAN_BUILDER',
  allowedPages = [],
  user,
  onLogout
}) => {
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<string | null>('I. Executive Summary');
  const [activeTab, setActiveTab] = useState<ActiveTab>('plan');
  const [canvasData, setCanvasData] = useState<CanvasData>(INITIAL_CANVAS_DATA);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [viewingVersion, setViewingVersion] = useState<any>(null);

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSaveVersionDialogOpen, setIsSaveVersionDialogOpen] = useState(false);

  // Convex Hooks
  const projectId = currentProject?.id as any;
  const skipQuery = !projectId || !user; // Skip if no project OR no user session

  const latestPlan = useQuery(api.businessPlans.getLatest, skipQuery ? "skip" : { projectId });
  const canvasQueryData = useQuery(api.canvas.getCanvas, skipQuery ? "skip" : { projectId });
  const saveDraft = useMutation(api.businessPlans.saveDraft);
  const createVersion = useCreateBusinessPlanVersion();
  const versions = useQuery(api.businessPlans.listVersions, skipQuery ? "skip" : { projectId });

  // Load latest content into editor when ready
  useEffect(() => {
    if (editorInstance && latestPlan && !viewingVersion) {
      const currentJSON = editorInstance.getJSON();
      const isEmpty = currentJSON.content?.length === 1 && !currentJSON.content[0].content;

      if (isEmpty && latestPlan.content) {
        try {
          const content = JSON.parse(latestPlan.content);
          editorInstance.commands.setContent(content);
        } catch (e) { }
      }
    }
  }, [editorInstance, latestPlan, viewingVersion]);

  // Sync canvas data from database query
  useEffect(() => {
    if (canvasQueryData) {
      const newCanvasData = INITIAL_CANVAS_DATA.map(section => {
        let content = "";

        // Direct matches by name/logic
        if (section.title === "Customer Segments" && canvasQueryData["Customer Segments"]) content = canvasQueryData["Customer Segments"];
        else if (section.title === "Value Propositions" && canvasQueryData["Unique Value Proposition"]) content = canvasQueryData["Unique Value Proposition"];
        else if (section.title === "Channels" && canvasQueryData["Channels"]) content = canvasQueryData["Channels"];
        else if (section.title === "Revenue Streams" && canvasQueryData["Revenue Streams"]) content = canvasQueryData["Revenue Streams"];
        else if (section.title === "Cost Structure" && canvasQueryData["Cost Structure"]) content = canvasQueryData["Cost Structure"];

        return {
          ...section,
          content: content || section.content
        };
      });
      setCanvasData(newCanvasData);
    }
  }, [canvasQueryData]);

  // Auto-save logic (Debounced)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleEditorUpdate = useCallback((editor: any) => {
    if (viewingVersion) return;
    if (!projectId) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      const json = editor.getJSON();
      await saveDraft({ projectId, content: JSON.stringify(json) });
    }, 2000);
  }, [projectId, saveDraft, viewingVersion]);

  // Attach update listener to editor instance
  useEffect(() => {
    if (editorInstance) {
      editorInstance.on('update', ({ editor }: any) => handleEditorUpdate(editor));
    }
    return () => {
      if (editorInstance) {
        editorInstance.off('update');
      }
    };
  }, [editorInstance, handleEditorUpdate]);


  const handleCreateVersion = () => {
    if (!projectId) return;
    setIsSaveVersionDialogOpen(true);
  };

  const handleConfirmSaveVersion = async (name: string) => {
    if (!projectId) return;

    try {
      // 1. Force save current state to ensure there is a draft to version
      if (editorInstance) {
        const json = editorInstance.getJSON();
        await saveDraft({ projectId, content: JSON.stringify(json) });
      }

      // 2. Create the version
      await createVersion({ projectId, name });
      toast.success("New version created successfully!");
    } catch (e) {
      toast.error("Failed to create version.");
    }
  };

  const handleSelectVersion = (version: any) => {
    setViewingVersion(version);
    setIsHistoryOpen(false);
    // Load content
    if (editorInstance && version.content) {
      try {
        const content = JSON.parse(version.content);
        editorInstance.commands.setContent(content);
        editorInstance.setEditable(false); // Make read-only?
        // Or maybe user wants to restore it? Use "Restore" button explicitly?
        // For now, let's treat it as viewing.
        toast("Viewing version: " + version.name, {
          description: "Editing is disabled while viewing history.",
          action: {
            label: "Back to Draft",
            onClick: () => {
              setViewingVersion(null);
              // Reload draft
              // Ideally refetch or rely on latestPlan
              // editorInstance.setEditable(true);
            }
          }
        });
      } catch (e) { }
    }
  };

  const handleBackToDraft = () => {
    setViewingVersion(null);
    if (editorInstance) {
      editorInstance.setEditable(true);
      if (latestPlan && latestPlan.content) {
        editorInstance.commands.setContent(JSON.parse(latestPlan.content));
      } else {
        editorInstance.commands.clearContent();
      }
    }
  };


  const handleNavigateSection = useCallback((sectionTitle: string) => {
    // Switch to plan tab if navigating sections
    if (activeTab !== 'plan') {
      setActiveTab('plan');
      // Small timeout to allow editor to render
      setTimeout(() => handleNavigateSection(sectionTitle), 100);
      return;
    }

    setActiveSection(sectionTitle);

    if (editorInstance) {
      // Find the heading in the document that matches the section title
      const json = editorInstance.getJSON();
      let pos = 0;
      let found = false;

      editorInstance.state.doc.descendants((node: any, position: number) => {
        if (found) return false;

        if (node.type.name === 'heading') {
          const textContent = node.textContent;
          const normText = normalize(textContent);
          const normSection = normalize(sectionTitle.replace(/^[IVX]+\.\s/, ''));

          if (normText.includes(normSection) || normSection.includes(normText)) {
            pos = position;
            found = true;
            return false;
          }
        }
      });

      if (found) {
        editorInstance.commands.setTextSelection(pos);
        const domNode = editorInstance.view.domAtPos(pos).node;
        if (domNode && domNode instanceof HTMLElement) {
          domNode.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (domNode && domNode.parentElement) {
          domNode.parentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  }, [editorInstance, activeTab]);

  return (
    <div className="flex flex-col h-screen bg-nobel-cream font-sans overflow-hidden">
      {/* Header - Standard App Header */}
      <header className="px-4 md:px-6 py-4 bg-[#F9F8F4]/90 backdrop-blur-md z-30 flex flex-wrap items-center justify-between border-b border-stone-200 no-print gap-4">
        <div className="flex items-center gap-4 flex-wrap min-w-0">
          <div className="relative shrink-0">
          </div>

          <div className="">
            <TabNavigation
              currentView={currentView}
              onNavigate={onNavigate}
              allowedPages={allowedPages}
              projectFeatures={{
                canvasEnabled: currentProject?.canvasEnabled,
                marketResearchEnabled: currentProject?.marketResearchEnabled
              }}
            />
          </div>
        </div>

        {/* Save Version Button */}
        <div className="flex items-center gap-2 shrink-0">
          {viewingVersion && (
            <button onClick={handleBackToDraft} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
              Exit View Mode
            </button>
          )}
          {activeTab === 'plan' && !isHistoryOpen && !viewingVersion && (
            <>
              <button
                onClick={handleCreateVersion}
                className="flex items-center gap-2 px-4 py-2 bg-nobel-gold/10 text-nobel-dark border border-nobel-gold/20 rounded-full hover:bg-nobel-gold/20 transition-colors text-sm font-medium"
              >
                <Save size={16} />
                <span>Save Version</span>
              </button>
              <button
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-nobel-gold/20 text-nobel-dark rounded-full hover:bg-nobel-gold/5 transition-colors text-sm font-medium"
              >
                <History size={16} />
                <span>Versions</span>
              </button>
            </>
          )}

          {/* User Profile Dropdown */}
          <div className="relative ml-2">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors shadow-sm"
            >
              {user?.pictureUrl ? (
                <img src={user.pictureUrl} alt={user.name || 'User'} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                  <UserIcon size={16} />
                </div>
              )}
              <ChevronDown size={14} className="text-gray-400" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            )}
            {/* Optional backdrop to close */}
            {isUserMenuOpen && (
              <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {!isHistoryOpen && (
          <div className="relative z-10 shadow-lg h-full transition-all">
            <Sidebar activeSection={activeSection} onNavigate={handleNavigateSection} />
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 h-full relative flex flex-col min-w-0 bg-nobel-cream canvas-pattern" style={{ backgroundSize: '16px 16px' }}>
          {isHistoryOpen ? (
            <PlanHistory
              versions={versions || []}
              onSelectVersion={handleSelectVersion}
              onClose={() => setIsHistoryOpen(false)}
            />
          ) : (
            <>
              {/* Header Image */}
              <div className="relative h-48 w-full bg-nobel-dark overflow-hidden shrink-0 no-print">
                <img
                  src="/images/manworking.png"
                  alt="Business Plan Builder"
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-nobel-dark via-nobel-dark/80 to-transparent"></div>
                <div className="relative z-10 px-8 h-full flex flex-col justify-center max-w-5xl mx-auto w-full">
                  <span className="text-nobel-gold font-medium tracking-wider uppercase text-xs mb-2 block">Strategy & Planning</span>
                  <h2 className="text-3xl md:text-4xl font-serif text-white mb-2">Build your vision.</h2>
                  <p className="text-gray-300 text-sm md:text-base max-w-xl">Draft your business plan or model your lean startup canvas.</p>
                </div>
              </div>

              {/* Tabs - Centered Pill Style */}
              <div className="flex justify-center mt-6 mb-4 no-print shrink-0">
                <div className="flex items-center bg-gray-200/50 p-1 rounded-full border border-gray-200/50">
                  <button
                    onClick={() => setActiveTab('plan')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-full font-medium text-sm transition-all ${activeTab === 'plan'
                      ? 'bg-white text-nobel-dark shadow-sm ring-1 ring-black/5'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                      }`}
                  >
                    <FileText size={16} />
                    Business Plan {viewingVersion && <span className="opacity-70 text-xs">(Read-only)</span>}
                  </button>
                  <button
                    onClick={() => setActiveTab('canvas')}
                    disabled={!!viewingVersion}
                    className={`flex items-center gap-2 px-6 py-2 rounded-full font-medium text-sm transition-all ${activeTab === 'canvas'
                      ? 'bg-white text-nobel-dark shadow-sm ring-1 ring-black/5'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 disabled:opacity-50'
                      }`}
                  >
                    <LayoutGrid size={16} />
                    Model Canvas
                  </button>
                </div>
              </div>

              <div className="flex-1 p-4 md:p-8 overflow-hidden relative">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-nobel-gold/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

                <div className="h-full max-w-5xl mx-auto animate-fade-in-up relative z-0">
                  <div className={activeTab === 'plan' ? 'block h-full' : 'hidden'}>
                    <Editor
                      setEditorInstance={setEditorInstance}
                      canvasData={canvasData}
                    />
                  </div>
                  <div className={activeTab === 'canvas' ? 'block h-full overflow-y-auto' : 'hidden'}>
                    <BusinessModelCanvas
                      data={canvasData}
                      onUpdate={() => { }} // Disabled read-only
                      disabled={true}
                      onNavigateToCanvas={() => onNavigate && onNavigate('CANVAS')}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
      <InputDialog
        isOpen={isSaveVersionDialogOpen}
        onClose={() => setIsSaveVersionDialogOpen(false)}
        onConfirm={handleConfirmSaveVersion}
        title="Save New Version"
        description="Create a snapshot of your current business plan content and canvas data."
        placeholder="e.g. Investor Ready v1"
        confirmLabel="Save Version"
      />
    </div>
  );
};

export default BusinessPlanBuilder;
