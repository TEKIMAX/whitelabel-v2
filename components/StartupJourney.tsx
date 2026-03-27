'use client';

import React, { useState } from 'react';
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { StartupData, Milestone, RolePermissions } from '../types';
import { Layout, Save, PenTool } from 'lucide-react';
import TabNavigation from './TabNavigation';
import { Logo } from './Logo';
import { SaveToFilesDialog } from './nobel_chat/SaveToFilesDialog';
import { StoryPanel } from './startup-journey/StoryPanel';
import { TimelinePanel } from './startup-journey/TimelinePanel';
import { AddMilestoneModal } from './startup-journey/AddMilestoneModal';
import { ModelSelect } from './ModelSelector';

interface StartupJourneyProps {
    data: StartupData;
    onNavigate: (view: any) => void;
    currentView: any;
    allowedPages?: string[];
    permissions?: RolePermissions;
    onUpdateProject?: (updater: (project: StartupData) => StartupData) => void;
}

const StartupJourney: React.FC<StartupJourneyProps> = ({
    data,
    onNavigate,
    currentView,
    allowedPages,
    onUpdateProject,
}) => {
    const updateProject = useMutation(api.projects.update);
    const createDoc = useMutation(api.documents.createDocument);

    const [isEditing, setIsEditing] = useState(false);
    const [editMilestone, setEditMilestone] = useState<Milestone | null>(null);
    const [expandedYear, setExpandedYear] = useState<number | null>(null);
    const [storyMode, setStoryMode] = useState(false); // Legacy toggle, maybe useful for mobile later

    const [isStoryCollapsed, setIsStoryCollapsed] = useState(true);

    // Save Dialog State
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

    // -- Handlers --

    const handleOpenAdd = () => {
        setEditMilestone(null);
        setIsEditing(true);
    };

    const handleOpenEdit = (milestone: Milestone) => {
        setEditMilestone(milestone);
        setIsEditing(true);
    };

    const handleSaveMilestone = async (milestoneData: Milestone) => {
        try {
            let updatedMilestones = [...(data.milestones || [])];

            if (editMilestone) {
                // Update existing
                updatedMilestones = updatedMilestones.map(m => m.id === milestoneData.id ? milestoneData : m);
                toast.success("Milestone updated");
            } else {
                // Add new
                updatedMilestones.push(milestoneData);
                toast.success("Milestone logged");
                // Auto-expand the year of the new milestone
                const year = new Date(milestoneData.date).getFullYear();
                setExpandedYear(year);
            }

            if (onUpdateProject) {
                onUpdateProject((prev) => ({ ...prev, milestones: updatedMilestones }));
            } else {
                await updateProject({
                    id: data.id as any,
                    updates: {
                        milestones: updatedMilestones
                    }
                });
            }
        } catch (error) {
            toast.error("Failed to save milestone");
        }
    };

    const handleSaveToDocs = async (folderId: string | null, name: string) => {
        try {
            await createDoc({
                projectId: data.id as any,
                title: name,
                content: data.journeyStoryContent || '',
                type: 'Strategy', // Or 'General'
                folderId: (folderId || undefined) as any
            });

            // Also add it to our journey story versions so the dropdown works seamlessly
            const vCount = data.journeyStoryVersions?.length || 0;
            const newVersion = {
                id: Date.now().toString(),
                content: data.journeyStoryContent || '',
                createdAt: Date.now(),
                name: name // Use the document name they typed in the dialog
            };
            const updatedVersions = [...(data.journeyStoryVersions || []), newVersion];

            if (onUpdateProject) {
                // Update local fast
                onUpdateProject(prev => ({ ...prev, journeyStoryVersions: updatedVersions }));
            } else {
                await updateProject({
                    id: data.id as any,
                    updates: {
                        journeyStoryVersions: updatedVersions
                    }
                });
            }

            toast.success("Story saved to documents");
            setIsSaveDialogOpen(false);
        } catch (error) {
            toast.error("Failed to save document");
        }
    };

    return (
        <div className="h-screen flex flex-col bg-stone-50">
            {/* Header */}
            <header className="px-8 py-4 bg-white border-b border-stone-200 flex items-center justify-between z-50 shadow-sm relative">
                <div className="flex items-center gap-6">
                    <Logo imageClassName="h-8 w-auto" />
                    <div className="w-px h-6 bg-stone-200" />
                    <TabNavigation
                        currentView={currentView}
                        onNavigate={onNavigate}
                        allowedPages={allowedPages}
                        projectFeatures={{
                            canvasEnabled: data.canvasEnabled,
                            marketResearchEnabled: data.marketResearchEnabled
                        }}
                    />
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-lg">
                        {/* Toggle logic was: Story Editor vs Timeline Switch. 
                             Since we show both side-by-side on desktop, this might be vestigial or for mobile. 
                             For now, I'll keep the button visually but it doesn't do much on desktop layout.
                          */}
                        <button
                            onClick={() => setStoryMode(!storyMode)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider text-stone-500 hover:text-stone-900 transition-colors"
                        >
                            {storyMode ? <Layout className="w-3 h-3" /> : <PenTool className="w-3 h-3" />}
                            {storyMode ? 'View Timeline' : 'Story Mode'}
                        </button>
                    </div>

                    <ModelSelect className="w-48 hidden lg:block" />
                    <button
                        onClick={() => setIsSaveDialogOpen(true)}
                        className="p-2 text-stone-400 hover:text-nobel-gold hover:bg-stone-50 rounded-full transition-colors border border-transparent hover:border-stone-100"
                        title="Save Story as Document"
                    >
                        <Save className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Main Content: Split View */}
            <main className="flex-grow flex overflow-hidden">
                <StoryPanel
                    data={data}
                    updateProject={updateProject}
                    onUpdateProject={onUpdateProject}
                    isCollapsed={isStoryCollapsed}
                    onToggleCollapse={() => setIsStoryCollapsed(!isStoryCollapsed)}
                    onSaveToCloud={() => setIsSaveDialogOpen(true)}
                />

                <TimelinePanel
                    data={data}
                    expandedYear={expandedYear}
                    setExpandedYear={setExpandedYear}
                    onEditMilestone={handleOpenEdit}
                    onAddMilestone={handleOpenAdd}
                />
            </main>

            {/* Modals */}
            <AddMilestoneModal
                isOpen={isEditing}
                onClose={() => setIsEditing(false)}
                onSave={handleSaveMilestone}
                initialData={editMilestone}
                projectFiles={{ files: [], folders: [] }} // TODO: Add file querying if needed, or pass from parent
                legalDocs={[]} // TODO: Fetch legal docs if needed
            />

            <SaveToFilesDialog
                isOpen={isSaveDialogOpen}
                onClose={() => setIsSaveDialogOpen(false)}
                projectId={data.id}
                onSave={handleSaveToDocs}
                title="Save Story to Documents"
            />
        </div>
    );
};

export default StartupJourney;