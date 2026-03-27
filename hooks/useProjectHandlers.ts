import { useState, useCallback } from 'react';
import { CanvasSection, StartupData, ViewState, DeckVersion, DeckTheme, CanvasVersion, Slide, RevenueModelVersion } from '../types';
import { useMutation, useAction, useConvexAuth } from 'convex/react';
import { api } from '../convex/_generated/api';
import { toast } from 'sonner';
import { sanitizeError } from '../lib/sanitizeError';
import { Plus, Trash2 } from 'lucide-react';
import React from 'react';
import { useAuth } from '../contexts/CustomAuthProvider';

interface UseProjectHandlersProps {
    currentProjectId: string | null;
    currentProject: StartupData | undefined;
    projects: StartupData[];
    setProjects: React.Dispatch<React.SetStateAction<StartupData[]>>;
    setCurrentProjectId: React.Dispatch<React.SetStateAction<string | null>>;
    setViewState: React.Dispatch<React.SetStateAction<ViewState>>;
    setIsCreatingNew: React.Dispatch<React.SetStateAction<boolean>>;
    setShowAuthWarning: React.Dispatch<React.SetStateAction<boolean>>;
    setShowCannotDeleteLastVersionModal: React.Dispatch<React.SetStateAction<boolean>>;
    user: any;
}

export function useProjectHandlers({
    currentProjectId,
    currentProject,
    projects,
    setProjects,
    setCurrentProjectId,
    setViewState,
    setIsCreatingNew,
    setShowAuthWarning,
    setShowCannotDeleteLastVersionModal,
    user
}: UseProjectHandlersProps) {
    const { isAuthenticated } = useConvexAuth();
    const { getAccessToken } = useAuth();

    // Mutations
    const createProject = useAction(api.project_actions.create);
    const sendInviteAction = useAction(api.invites.sendInvite);
    const updateProjectMutation = useMutation(api.projects.update);
    const deleteProjectAction = useAction(api.project_actions.deleteProject);
    const updateCanvasSection = useMutation(api.canvas.updateSection);
    const switchCanvas = useMutation(api.canvas.switchCanvas);
    const createCanvas = useMutation(api.canvas.createCanvas);
    const deleteCanvas = useMutation(api.canvas.deleteCanvas);
    const saveDeck = useMutation(api.decks.saveDeck);
    const deleteDeckVersion = useMutation(api.decks.deleteVersion);

    // Update current project helper
    const updateCurrentProject = useCallback((updater: (project: StartupData) => StartupData) => {
        if (!currentProjectId) return;
        setProjects(prev => prev.map(p => p.id === currentProjectId ? updater(p) : p));
    }, [currentProjectId, setProjects]);

    // Onboarding
    const handleOnboardingComplete = useCallback(async (name: string, hypothesis: string, foundingDate?: number, _logo?: string, inviteEmails?: string[]) => {
        if (!name || !name.trim()) {
            setViewState('ONBOARDING');
            return;
        }

        const localId = Date.now().toString();

        // If Convex auth is good, proceed directly
        // If user exists but Convex hasn't synced, force a token refresh first
        if (isAuthenticated || user) {
            // Force token refresh if Convex auth is stale
            if (!isAuthenticated && user) {
                try {
                    const token = await getAccessToken();
                    if (!token) {
                        toast.error("Your session has expired. Please sign in again.");
                        setShowAuthWarning(true);
                        return;
                    }
                    // Give Convex a moment to pick up the refreshed token
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch {
                    toast.error("Could not refresh your session. Please sign in again.");
                    setShowAuthWarning(true);
                    return;
                }
            }

            toast.promise(
                createProject({ name, hypothesis, localId, foundingDate }),
                {
                    loading: 'Creating your project & organization...',
                    success: (projectId) => {
                        setCurrentProjectId(projectId);
                        setViewState('STARTUP_OVERVIEW');

                        // Send invite emails if provided
                        if (inviteEmails && inviteEmails.length > 0) {
                            (async () => {
                                try {
                                    const userOrgId = user?.orgIds?.[user.orgIds.length - 1] || 'personal';

                                    for (const email of inviteEmails) {
                                        try {
                                            await sendInviteAction({
                                                email,
                                                orgId: userOrgId,
                                                projectId: projectId as any,
                                                role: 'Employee',
                                            });
                                            toast.success(`Invitation sent to ${email}`);
                                        } catch (inviteErr: any) {
                                            toast.error(`Failed to invite ${email}: ${sanitizeError(inviteErr)}`);
                                        }
                                    }
                                } catch (err) {
                                }
                            })();
                        }

                        return `Project "${name}" created successfully!`;
                    },
                    error: (err) => {
                        return `Failed to create project: ${sanitizeError(err)}`;
                    }
                }
            );
        } else {
            toast.error("Authentication still connecting. Please wait a moment and try again.");
            setShowAuthWarning(true);
        }
    }, [isAuthenticated, createProject, sendInviteAction, setCurrentProjectId, setViewState, setShowAuthWarning, projects, user, getAccessToken]);

    // Canvas handlers
    const handleCanvasUpdate = useCallback((section: CanvasSection, content: string) => {
        updateCurrentProject(project => ({
            ...project,
            lastModified: Date.now(),
            canvas: { ...project.canvas, [section]: content }
        }));

        if (isAuthenticated && currentProjectId) {
            updateCanvasSection({ projectId: currentProjectId, section, content })
                .catch(() => {});
        }
    }, [isAuthenticated, currentProjectId, updateCurrentProject, updateCanvasSection]);

    const handleLoadCanvasVersion = useCallback((version: CanvasVersion) => {
        updateCurrentProject(project => ({
            ...project,
            lastModified: Date.now(),
            canvas: { ...version.data },
            currentCanvasId: version.id
        }));

        if (isAuthenticated && currentProjectId) {
            switchCanvas({ projectId: currentProjectId, canvasId: version.id as any })
                .catch(() => {});
        }
    }, [isAuthenticated, currentProjectId, updateCurrentProject, switchCanvas]);

    const handleSaveCanvasVersion = useCallback(async (name: string) => {
        const newId = Date.now().toString();
        updateCurrentProject(project => {
            const updatedVersions = project.canvasVersions.map(v =>
                v.id === project.currentCanvasId
                    ? { ...v, data: { ...project.canvas } }
                    : v
            );

            const newVersion: CanvasVersion = {
                id: newId,
                name: name,
                timestamp: Date.now(),
                data: {} as any
            };
            return {
                ...project,
                canvasVersions: [newVersion, ...updatedVersions],
                currentCanvasId: newId,
                canvas: {} as any
            };
        });

        if (isAuthenticated && currentProjectId) {
            return createCanvas({ projectId: currentProjectId, name }).then((id) => {
                updateCurrentProject(p => ({
                    ...p,
                    currentCanvasId: id,
                    canvasVersions: p.canvasVersions.map(v => v.id === newId ? { ...v, id } : v)
                }));
                toast.success("Version created successfully", { icon: React.createElement(Plus, { className: "w-4 h-4 text-black" }) });
                return id;
            }).catch(e => {
                throw e;
            });
        }
    }, [isAuthenticated, currentProjectId, updateCurrentProject, createCanvas]);

    const handleDeleteCanvasVersion = useCallback((versionId: string) => {
        if (!currentProject) return;

        if (currentProject.canvasVersions.length <= 1) {
            setShowCannotDeleteLastVersionModal(true);
            return;
        }

        const isDeletingCurrent = versionId === currentProject.currentCanvasId;
        let nextVersionId = currentProject.currentCanvasId;

        if (isDeletingCurrent) {
            const other = currentProject.canvasVersions.find(v => v.id !== versionId);
            if (other) nextVersionId = other.id;
        }

        updateCurrentProject(project => {
            const nextVersion = project.canvasVersions.find(v => v.id === nextVersionId);
            return {
                ...project,
                currentCanvasId: nextVersionId,
                canvas: (isDeletingCurrent && nextVersion) ? { ...nextVersion.data } : project.canvas,
                canvasVersions: project.canvasVersions.filter(v => v.id !== versionId)
            };
        });

        if (isAuthenticated && currentProjectId) {
            if (isDeletingCurrent && nextVersionId) {
                switchCanvas({ projectId: currentProjectId, canvasId: nextVersionId as any })
                    .then(() => deleteCanvas({ canvasId: versionId as any }))
                    .catch(() => {});
            } else {
                deleteCanvas({ canvasId: versionId as any })
                    .then(() => toast.success("Version deleted successfully", { icon: React.createElement(Trash2, { className: "w-4 h-4 text-black" }) }))
                    .catch(() => {});
            }
        }
    }, [currentProject, isAuthenticated, currentProjectId, updateCurrentProject, switchCanvas, deleteCanvas, setShowCannotDeleteLastVersionModal]);

    // Deck handlers
    const handleDeckSaveVersion = useCallback((name: string, slides: any[], theme?: DeckTheme, versionId?: string) => {
        const saveTimestamp = Date.now();

        updateCurrentProject(project => {
            if (versionId) {
                const updatedVersions = project.deckVersions.map(v =>
                    v.id === versionId
                        ? { ...v, name, slides: JSON.parse(JSON.stringify(slides)), theme: theme ? JSON.parse(JSON.stringify(theme)) : undefined, timestamp: saveTimestamp }
                        : v
                );
                return { ...project, deckVersions: updatedVersions };
            } else {
                const newVersion: DeckVersion = {
                    id: `temp-${saveTimestamp}`,
                    name: name,
                    timestamp: saveTimestamp,
                    slides: JSON.parse(JSON.stringify(slides)),
                    theme: theme ? JSON.parse(JSON.stringify(theme)) : undefined
                };
                return { ...project, deckVersions: [newVersion, ...project.deckVersions] };
            }
        });

        if (isAuthenticated && currentProjectId) {
            const formattedSlides = slides.map((s, idx) => ({
                id: s.id,
                title: s.title,
                content: s.content,
                notes: s.notes,
                imageUrl: s.imageUrl,
                imagePrompt: s.imagePrompt,
                items: s.items ? JSON.stringify(s.items) : undefined,
                order: idx
            }));

            const isTempId = versionId?.startsWith('temp-');
            const convexVersionId = isTempId ? undefined : versionId;

            return saveDeck({
                projectId: currentProjectId as any,
                versionId: convexVersionId as any,
                name: name,
                slides: formattedSlides,
                theme: theme ? JSON.stringify(theme) : undefined,
                createdBy: user?.firstName ? `${user.firstName} ${user.lastName}` : user?.email,
                createdByPicture: user?.profilePictureUrl
            }).then((id) => {
                updateCurrentProject(p => ({
                    ...p,
                    deckVersions: p.deckVersions.map(v =>
                        (v.timestamp === saveTimestamp) ? { ...v, id } : v
                    )
                }));
                return id;
            }).catch(e => {
                throw e;
            });
        }
        return Promise.resolve(undefined);
    }, [isAuthenticated, currentProjectId, updateCurrentProject, saveDeck, user]);

    const handleDeleteDeckVersion = useCallback((versionId: string) => {
        updateCurrentProject(project => ({
            ...project,
            deckVersions: project.deckVersions.filter(v => v.id !== versionId)
        }));

        if (isAuthenticated) {
            toast.promise(
                deleteDeckVersion({ versionId: versionId as any }),
                {
                    loading: 'Deleting version...',
                    success: 'Version deleted successfully',
                    error: 'Failed to delete version'
                }
            );
        }
    }, [isAuthenticated, updateCurrentProject, deleteDeckVersion]);

    // Revenue Model handlers
    const handleSaveRevenueModelVersion = useCallback(async (name: string) => {
        if (!currentProject) return;
        const version: RevenueModelVersion = {
            id: Date.now().toString(),
            name,
            timestamp: Date.now(),
            data: currentProject.revenueModel
        };

        const updatedVersions = [...(currentProject.revenueModelVersions || []), version];
        updateCurrentProject(p => ({ ...p, revenueModelVersions: updatedVersions, currentRevenueModelId: version.id }));

        if (isAuthenticated) {
            await updateProjectMutation({
                id: currentProject.id as any,
                updates: {
                    revenueModelVersions: JSON.stringify(updatedVersions),
                    currentRevenueModelId: version.id
                }
            });
        }
    }, [currentProject, isAuthenticated, updateCurrentProject, updateProjectMutation]);

    const handleLoadRevenueModelVersion = useCallback(async (version: RevenueModelVersion) => {
        if (!currentProject) return;
        updateCurrentProject(p => ({ ...p, revenueModel: version.data, currentRevenueModelId: version.id }));

        if (isAuthenticated) {
            await updateProjectMutation({
                id: currentProject.id as any,
                updates: { currentRevenueModelId: version.id }
            });
        }
    }, [currentProject, isAuthenticated, updateCurrentProject, updateProjectMutation]);

    const handleDeleteRevenueModelVersion = useCallback(async (versionId: string) => {
        if (!currentProject) return;
        const updatedVersions = (currentProject.revenueModelVersions || []).filter(v => v.id !== versionId);
        updateCurrentProject(project => ({ ...project, revenueModelVersions: updatedVersions }));

        if (isAuthenticated) {
            await updateProjectMutation({
                id: currentProject.id as any,
                updates: { revenueModelVersions: JSON.stringify(updatedVersions) }
            });
        }
    }, [currentProject, isAuthenticated, updateCurrentProject, updateProjectMutation]);

    // Slide handler
    const handleAddSlideToDeck = useCallback((newSlide: Slide) => {
        updateCurrentProject(project => {
            let versions = [...project.deckVersions];
            if (versions.length === 0) {
                versions = [{ id: Date.now().toString(), name: "Initial Draft", timestamp: Date.now(), slides: [] }];
            }

            const topVersion = { ...versions[0] };
            let slides = [...topVersion.slides];

            const existingIndexById = slides.findIndex(s => s.id === newSlide.id);
            const existingIndexByTitle = slides.findIndex(s => s.title.toLowerCase() === newSlide.title.toLowerCase());

            if (existingIndexById !== -1) {
                slides[existingIndexById] = { ...newSlide, id: slides[existingIndexById].id };
            } else if (existingIndexByTitle !== -1) {
                slides[existingIndexByTitle] = { ...newSlide, id: slides[existingIndexByTitle].id };
            } else {
                slides.push(newSlide);
            }

            topVersion.slides = slides;
            topVersion.timestamp = Date.now();
            versions[0] = topVersion;
            return { ...project, deckVersions: versions };
        });
    }, [updateCurrentProject]);

    // Navigation handlers
    const handleCanvasFinish = useCallback(() => setViewState('DECK'), [setViewState]);
    const handleRestart = useCallback(() => setViewState('CANVAS'), [setViewState]);

    const handleSwitchProject = useCallback((projectId: string) => {
        setCurrentProjectId(projectId);
        setIsCreatingNew(false);
        setViewState('STARTUP_OVERVIEW'); // Navigate to the Startup Overview
    }, [setCurrentProjectId, setIsCreatingNew, setViewState]);

    const handleNewProject = useCallback(() => {
        setCurrentProjectId(null);
        setIsCreatingNew(true);
        setViewState('ONBOARDING');
    }, [setCurrentProjectId, setIsCreatingNew, setViewState]);

    const handleDeleteProject = useCallback(async (projectId: string) => {
        setProjects(prev => prev.filter(p => p.id !== projectId));

        if (isAuthenticated) {
            toast.promise(
                deleteProjectAction({ projectId: projectId as any }),
                {
                    loading: 'Deleting project...',
                    success: 'Project deleted successfully',
                    error: 'Failed to delete project'
                }
            );
        } else {
            toast.success("Project deleted locally");
        }

        if (currentProjectId === projectId) {
            setCurrentProjectId(null);
            setIsCreatingNew(true);
            setViewState('ONBOARDING');
        }
    }, [isAuthenticated, currentProjectId, setProjects, deleteProjectAction, setCurrentProjectId, setIsCreatingNew, setViewState]);

    const handleNavigate = useCallback((view: ViewState) => {
        setViewState(view);
        setIsCreatingNew(false);
    }, [setViewState, setIsCreatingNew]);

    const handleOpenProjectSettings = useCallback((projectId: string) => {
        setCurrentProjectId(projectId);
        setViewState('SETTINGS');
    }, [setCurrentProjectId, setViewState]);

    return {
        // Canvas
        handleCanvasUpdate,
        handleLoadCanvasVersion,
        handleSaveCanvasVersion,
        handleDeleteCanvasVersion,
        handleCanvasFinish,
        handleRestart,
        // Deck
        handleDeckSaveVersion,
        handleDeleteDeckVersion,
        handleAddSlideToDeck,
        // Revenue Model
        handleSaveRevenueModelVersion,
        handleLoadRevenueModelVersion,
        handleDeleteRevenueModelVersion,
        // Project
        handleOnboardingComplete,
        handleSwitchProject,
        handleNewProject,
        handleDeleteProject,
        handleNavigate,
        handleOpenProjectSettings,
        updateCurrentProject,
        // Mutations for direct access
        updateProjectMutation
    };
}
