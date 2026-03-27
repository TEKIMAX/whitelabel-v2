
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from "../convex/_generated/api";
import { StartupData, Role, DEFAULT_ROLES } from '../types';
import { useAcceptInvitation, useRevokeInvitation, useLeaveOrganization } from '../hooks/useActions';
import { useUpdateProject } from '../hooks/useUpdate';
import { toast } from 'sonner';
import { sanitizeError } from '../lib/sanitizeError';

export const HYPOTHESIS_TEMPLATE = "We help [Target Audience] solve [Problem] by [Solution] with [Secret Sauce].";

export const useOnboardingLogic = (
    projects: StartupData[],
    onComplete: (name: string, hypothesis: string, foundingDate?: number, logo?: string, inviteEmails?: string[]) => void,
    onSwitchProject: (id: string) => void,
    onDeleteProject?: (id: string) => void,
    user?: any,
    initialMode?: 'dashboard' | 'create',
    isLoading?: boolean
) => {
    // Mode Logic
    // Any user in the tenant org (orgIds.length > 0) can create ventures.
    // Also allow founders/admins and active/trialing subscribers.
    // Any user in the tenant org (orgIds.length > 0) can create ventures.
    // Also allow by explicit role or subscription status.
    const canCreate = (user?.orgIds?.length ?? 0) > 0
        || user?.isFounder === true
        || user?.role === 'Founder'
        || user?.role === 'Admin'
        || user?.role === 'Member'
        || user?.role === 'USER'
        || user?.subscriptionStatus === 'trialing'
        || user?.subscriptionStatus === 'active';

    const [mode, setMode] = useState<'dashboard' | 'create'>(() => {
        if (initialMode) return initialMode;
        // Always default to dashboard — venture creation is handled by the provisioning portal
        return 'dashboard';
    });

    // No auto-switch to 'create' mode — ventures are created from the Customer Portal

    // Create Venture Form State
    const [name, setName] = useState('');
    const [hypothesis, setHypothesis] = useState(HYPOTHESIS_TEMPLATE);
    const [foundingYear, setFoundingYear] = useState<string>(new Date().getFullYear().toString());
    const [createLogo, setCreateLogo] = useState('');
    const [createLogoPreview, setCreateLogoPreview] = useState('');

    // Invite Modal
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [activeProjectIdForInvite, setActiveProjectIdForInvite] = useState<string | null>(null);
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [newMemberRole, setNewMemberRole] = useState<Role>('Employee');
    const [processingInvite, setProcessingInvite] = useState<string | null>(null);

    // Delete/Leave Modals
    const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
    const [projectToLeave, setProjectToLeave] = useState<string | null>(null);
    const [isLeaving, setIsLeaving] = useState(false);

    // Edit Sheet
    const [editingProject, setEditingProject] = useState<StartupData | null>(null);
    const [editName, setEditName] = useState('');
    const [editHypothesis, setEditHypothesis] = useState('');
    const [editFoundingYear, setEditFoundingYear] = useState('');
    const [editLogo, setEditLogo] = useState('');
    const [editLogoPreview, setEditLogoPreview] = useState('');

    // UI States
    const [activeLogoPicker, setActiveLogoPicker] = useState<'create' | 'edit' | null>(null);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [showReferralModal, setShowReferralModal] = useState(false);

    // Mutations & Actions
    const acceptInvitation = useAcceptInvitation();
    const revokeInvitation = useRevokeInvitation();
    const updateProjectMutation = useUpdateProject();
    const leaveProjectAction = useLeaveOrganization();
    const sendInviteAction = useAction(api.invites.sendInvite);

    // Handlers
    const handleLeaveProject = async () => {
        if (!projectToLeave) return;
        setIsLeaving(true);
        try {
            await leaveProjectAction({ orgId: projectToLeave });
            // If we reach here, the action succeeded (it throws on error)
            toast.success('Left organization successfully');
            setProjectToLeave(null);
        } catch (error) {
            toast.error('An error occurred while leaving the organization');
        } finally {
            setIsLeaving(false);
        }
    };

    const handleCreateSubmit = () => {
        if (!name.trim()) {
            toast.error("Venture name is required");
            return;
        }
        const year = parseInt(foundingYear);
        if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
            toast.error("Please enter a valid founding year");
            return;
        }

        onComplete(name, hypothesis, year, createLogo);
    };

    const startEditing = (project: StartupData) => {
        setEditingProject(project);
        setEditName(project.name);
        setEditHypothesis(project.hypothesis || '');
        setEditFoundingYear(project.foundingDate ? project.foundingDate.toString() : '');
        setEditLogo((project as any).logo || '');
        setEditLogoPreview((project as any).logo || '');
    };

    const saveEditing = async () => {
        if (!editingProject) return;
        try {
            await updateProjectMutation({
                id: editingProject.id as any,
                updates: {
                    name: editName,
                    hypothesis: editHypothesis,
                    logo: editLogo
                }
            });
            toast.success("Project updated successfully");
            setEditingProject(null);
        } catch (e) {
            toast.error("Failed to update project");
        }
    };

    const handleLogoSelect = (url: string) => {
        if (activeLogoPicker === 'create') {
            setCreateLogo(url);
            setCreateLogoPreview(url);
        } else if (activeLogoPicker === 'edit') {
            setEditLogo(url);
            setEditLogoPreview(url);
        }
        setActiveLogoPicker(null);
    };

    // Stripe Logic (simplified from component)
    const handleManageBilling = async () => {
        try {
            const response = await fetch('/api/create-portal-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error("Failed to load billing portal");
            }
        } catch (error) {
            toast.error("Error loading billing portal");
        }
    };

    // Send Invite via WorkOS
    const handleSendInvite = async (selectedPages: string[]) => {
        if (!activeProjectIdForInvite || !newMemberEmail) return;
        const selectedProject = projects.find(p => p.id === activeProjectIdForInvite);
        if (!selectedProject) {
            toast.error('Please select a valid project');
            return;
        }
        setProcessingInvite(activeProjectIdForInvite);
        try {
            await sendInviteAction({
                email: newMemberEmail,
                orgId: (selectedProject as any).orgId || 'personal',
                projectId: activeProjectIdForInvite as any,
                name: newMemberName || undefined,
                role: newMemberRole || 'Employee',
                allowedPages: selectedPages.length > 0 ? selectedPages : undefined,
            });
            toast.success(`Invitation sent to ${newMemberEmail}`);
            setShowInviteModal(false);
            setNewMemberName('');
            setNewMemberEmail('');
            setNewMemberRole('Employee');
            setActiveProjectIdForInvite(null);
        } catch (error: any) {
            if (error.message?.includes('SEAT_LIMIT_EXCEEDED')) {
                toast.error('Seat limit reached. Please upgrade your plan to invite more members.');
            } else {
                toast.error(sanitizeError(error));
            }
        } finally {
            setProcessingInvite(null);
        }
    };

    return {
        // State
        mode, setMode, canCreate,
        name, setName,
        hypothesis, setHypothesis,
        foundingYear, setFoundingYear,
        createLogo, setCreateLogo,
        createLogoPreview, setCreateLogoPreview,

        showInviteModal, setShowInviteModal,
        activeProjectIdForInvite, setActiveProjectIdForInvite,
        newMemberName, setNewMemberName,
        newMemberEmail, setNewMemberEmail,
        newMemberRole, setNewMemberRole,
        processingInvite, setProcessingInvite,

        projectToDelete, setProjectToDelete,
        projectToLeave, setProjectToLeave,
        isLeaving,

        editingProject, setEditingProject,
        editName, setEditName,
        editHypothesis, setEditHypothesis,
        editFoundingYear, setEditFoundingYear,
        editLogo, setEditLogo,
        editLogoPreview, setEditLogoPreview,

        activeLogoPicker, setActiveLogoPicker,
        showProfileDropdown, setShowProfileDropdown,
        showReferralModal, setShowReferralModal,

        // Actions
        handleLeaveProject,
        handleCreateSubmit,
        startEditing,
        saveEditing,
        handleLogoSelect,
        handleManageBilling,

        acceptInvitation,
        revokeInvitation,
        handleSendInvite
    };
};
