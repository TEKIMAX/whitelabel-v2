import React, { useState } from 'react';
import { LandingPageDashboard } from './LandingPageDashboard';
import { Editor } from './Editor';
import { LandingPageConfig, DEFAULT_CONFIG } from '../../types';
import { StartupData, ViewState } from '../../types';

// Define the Meta interface locally or import if shared (defined in Dashboard for now, let's export it)
// Ideally, move to types.ts, but for now I'll duplicate or import if I can export from Dashboard.
// I'll redefine it here to be safe and avoid circular deps if I mess up.

export interface LandingPageMeta {
    id: string;
    name: string;
    description: string;
    thumbnailUrl?: string; // e.g. from Pixabay
    createdAt: number;
    config: LandingPageConfig;
}

interface WebsiteBuilderProps {
    allProjects: StartupData[];
    currentProject?: StartupData;
    onSwitchProject: (id: string) => void;
    onNavigate: (view: ViewState) => void;
}

export const WebsiteBuilder: React.FC<WebsiteBuilderProps> = ({
    allProjects,
    currentProject,
    onSwitchProject,
    onNavigate
}) => {
    const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
    const [activePageId, setActivePageId] = useState<string | null>(null);
    const [pages, setPages] = useState<LandingPageMeta[]>(() => {
        try {
            const saved = localStorage.getItem('founderstack_landing_pages');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    React.useEffect(() => {
        localStorage.setItem('founderstack_landing_pages', JSON.stringify(pages));
    }, [pages]);

    const handleCreatePage = (newPage: LandingPageMeta) => {
        setPages((prev) => [newPage, ...prev]);
        setActivePageId(newPage.id);
        setView('editor');
    };

    const handleEditPage = (id: string) => {
        setActivePageId(id);
        setView('editor');
    };

    const handleDeletePage = (id: string) => {
        if (confirm("Are you sure you want to delete this page?")) {
            setPages((prev) => prev.filter((p) => p.id !== id));
            if (activePageId === id) {
                setActivePageId(null);
                setView('dashboard');
            }
        }
    };

    const handleUpdatePageConfig = (newConfig: LandingPageConfig) => {
        if (!activePageId) return;
        setPages((prev) =>
            prev.map((p) => (p.id === activePageId ? { ...p, config: newConfig } : p))
        );
    };

    // Get active page
    const activePage = pages.find((p) => p.id === activePageId);

    if (view === 'editor' && activePage) {
        return (
            <Editor
                config={activePage.config}
                onUpdate={handleUpdatePageConfig}
                onBack={() => setView('dashboard')}
                pageName={activePage.name}
            />
        );
    }

    return (
        <LandingPageDashboard
            pages={pages}
            onCreatePage={handleCreatePage}
            onEditPage={handleEditPage}
            onDeletePage={handleDeletePage}
            allProjects={allProjects}
            currentProject={currentProject}
            onSwitchProject={onSwitchProject}
            onNavigate={onNavigate}
        />
    );
};
