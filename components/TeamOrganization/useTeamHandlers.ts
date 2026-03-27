import { useState, useCallback } from 'react';
import { useMutation, useAction, useConvexAuth } from 'convex/react';
import { api } from "../../convex/_generated/api";
import { Id } from '../../convex/_generated/dataModel';
import { useCreateTeamMember, useCreateRole, useCreateLegalDocument, useGenerateUploadUrl } from '../../hooks/useCreate';
import { useUpdateBusinessStructure, useUpdateOrganizationDetails, useUpdateTeamMember, useUpdateRole } from '../../hooks/useUpdate';
import { useDeleteTeamMember, useDeleteRole, useDeleteLegalDocument } from '../../hooks/useDelete';
import { toast } from 'sonner';
import { TeamMember, OrganizationDetails, RolePermissions } from '../../types';

interface UseTeamHandlersProps {
    projectId: string;
    orgId?: string;
    teamMembers: TeamMember[];
    onUpdateProject: (updater: (project: any) => any) => void;
    onNavigate: (view: any) => void;
}

export function useTeamHandlers({
    projectId,
    orgId,
    teamMembers,
    onUpdateProject,
    onNavigate
}: UseTeamHandlersProps) {
    const { isAuthenticated } = useConvexAuth();

    // Mutations
    const updateBusinessStructure = useUpdateBusinessStructure();
    const updateOrganizationDetails = useUpdateOrganizationDetails();
    const addMemberMutation = useCreateTeamMember();
    const updateMemberMutation = useUpdateTeamMember();
    const deleteMemberMutation = useDeleteTeamMember();
    const sendInviteAction = useAction(api.invites.sendInvite);
    const resendInviteAction = useAction(api.invites.resendInvite);
    const deleteTeamMemberAction = useAction(api.invites.deleteTeamMember);
    const createRoleMutation = useCreateRole();
    const updateRoleMutation = useUpdateRole();
    const deleteRoleMutation = useDeleteRole();
    const syncMembersAction = useAction(api.workos.syncOrganizationMembers);
    const addSeatsAction = useAction(api.stripeActions.addSeats);
    const generateUploadUrlMutation = useGenerateUploadUrl();
    const createLegalDocumentMutation = useCreateLegalDocument();
    const deleteLegalDocumentMutation = useDeleteLegalDocument();

    // State
    const [isSyncing, setIsSyncing] = useState(false);
    const [isResending, setIsResending] = useState<string | null>(null);
    const [isInviting, setIsInviting] = useState(false);
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);

    // Structure handlers
    const handleStructureChange = useCallback((structure: string, setShowSheet?: (show: boolean) => void) => {
        onUpdateProject(p => ({ ...p, businessStructure: structure }));
        updateBusinessStructure({ projectId: projectId as any, structure });
        if (setShowSheet) setShowSheet(true);
    }, [projectId, onUpdateProject, updateBusinessStructure]);

    const saveOrgDetails = useCallback((newDetails: OrganizationDetails) => {
        onUpdateProject(p => ({ ...p, organizationDetails: newDetails }));
        updateOrganizationDetails({ projectId: projectId as any, details: JSON.stringify(newDetails) });
    }, [projectId, onUpdateProject, updateOrganizationDetails]);

    // Member handlers
    const handleSaveMember = useCallback(async (
        memberData: {
            name: string;
            email: string;
            role: string;
            education: string;
            schools: string;
            accepted: boolean;
        },
        editingMemberId: string | null
    ) => {
        if (!memberData.name || !memberData.email) return;

        if (editingMemberId) {
            onUpdateProject(p => ({
                ...p,
                teamMembers: p.teamMembers.map((m: TeamMember) =>
                    m.id === editingMemberId ? {
                        ...m,
                        name: memberData.name,
                        email: memberData.email,
                        role: memberData.role as any,
                        education: memberData.education,
                        schools: memberData.schools,
                        acceptedRole: memberData.accepted
                    } : m
                )
            }));

            const member = teamMembers.find(m => m.id === editingMemberId);
            if (member && member.id.length > 20) {
                await updateMemberMutation({
                    id: member.id as any,
                    updates: {
                        name: memberData.name,
                        email: memberData.email,
                        role: memberData.role,
                        education: memberData.education,
                        schools: memberData.schools,
                        acceptedRole: memberData.accepted
                    }
                });
            }
        } else {
            const tempId = Date.now().toString();
            const newMember: TeamMember = {
                id: tempId,
                name: memberData.name,
                email: memberData.email,
                role: memberData.role as any,
                education: memberData.education,
                schools: memberData.schools,
                acceptedRole: memberData.accepted
            };

            onUpdateProject(p => ({ ...p, teamMembers: [...p.teamMembers, newMember] }));

            try {
                const id = await addMemberMutation({
                    projectId: projectId as any,
                    name: memberData.name,
                    email: memberData.email,
                    role: memberData.role,
                    education: memberData.education,
                    schools: memberData.schools,
                    acceptedRole: memberData.accepted
                });
                onUpdateProject(p => ({
                    ...p,
                    teamMembers: p.teamMembers.map((m: TeamMember) =>
                        m.id === tempId ? { ...m, id } : m
                    )
                }));
            } catch (e) {
            }
        }
    }, [projectId, teamMembers, onUpdateProject, addMemberMutation, updateMemberMutation]);

    const handleDeleteMember = useCallback(async (memberId: string) => {
        onUpdateProject(p => ({
            ...p,
            teamMembers: p.teamMembers.filter((m: TeamMember) => m.id !== memberId)
        }));

        try {
            if (memberId.length > 20) {
                await deleteTeamMemberAction({ memberId: memberId as any });
            }
            toast.success("Team member removed");
        } catch (error) {
            toast.error("Failed to remove member");
        }
    }, [onUpdateProject, deleteTeamMemberAction]);

    const handleResendInvite = useCallback(async (member: any) => {
        if (!member.workosInvitationId) {
            toast.error("Cannot resend: No invitation ID found");
            return;
        }
        setIsResending(member.id);
        try {
            await resendInviteAction({ inviteId: member.workosInvitationId, memberId: member.id });
            toast.success("Invitation resent successfully");
        } catch (error) {
            toast.error("Failed to resend invitation");
        } finally {
            setIsResending(null);
        }
    }, [resendInviteAction]);

    const handleSendInvite = useCallback(async (
        inviteData: { email: string; name: string; role: string },
        callbacks: { onSuccess: () => void; onSeatLimitExceeded: () => void }
    ) => {
        if (!inviteData.email) return;
        setIsInviting(true);
        try {
            await sendInviteAction({
                email: inviteData.email,
                orgId: orgId || "personal",
                projectId: projectId as any,
                name: inviteData.name,
                role: inviteData.role
            });
            toast.success("Invitation sent successfully");
            callbacks.onSuccess();
        } catch (error: any) {
            if (error.message?.includes("SEAT_LIMIT_EXCEEDED")) {
                callbacks.onSeatLimitExceeded();
                return;
            }
            toast.error("Failed to send invitation: " + (error.message || "Unknown error"));
        } finally {
            setIsInviting(false);
        }
    }, [projectId, orgId, sendInviteAction]);

    // Role handlers
    const handleAddRole = useCallback(async (name: string, onSuccess?: (name: string) => void) => {
        if (!name.trim()) return;
        try {
            await createRoleMutation({
                projectId,
                name,
                allowedPages: ['Team'],
                isSystem: false,
            });
            toast.success("Role created successfully");
            if (onSuccess) onSuccess(name);
        } catch (error) {
            toast.error("Failed to create role");
        }
    }, [projectId, createRoleMutation]);

    const handleRenameRole = useCallback(async (roleId: string, newName: string) => {
        if (!roleId || !newName.trim()) return;
        try {
            await updateRoleMutation({ id: roleId as any, name: newName });
            toast.success("Role renamed successfully");
            return true;
        } catch (error) {
            toast.error("Failed to rename role");
            return false;
        }
    }, [updateRoleMutation]);

    const handleDeleteRole = useCallback(async (roleId: string) => {
        if (!roleId) return false;
        try {
            await deleteRoleMutation({ id: roleId as any });
            toast.success("Role deleted successfully");
            return true;
        } catch (error) {
            toast.error("Failed to delete role");
            return false;
        }
    }, [deleteRoleMutation]);

    const handleSavePermissions = useCallback(async (roleId: string, permissions: RolePermissions) => {
        if (!roleId) return;
        try {
            await updateRoleMutation({ id: roleId as any, permissions });
            toast.success("Permissions updated successfully");
        } catch (error) {
            toast.error("Failed to update permissions");
        }
    }, [updateRoleMutation]);

    // Sync handler
    const handleSyncMembers = useCallback(async () => {
        if (!orgId) return;
        setIsSyncing(true);
        try {
            await syncMembersAction({ orgId, projectId: projectId as any });
            toast.success("Team status synced");
        } catch (e) {
            toast.error("Failed to sync status");
        } finally {
            setIsSyncing(false);
        }
    }, [projectId, orgId, syncMembersAction]);

    // Seats handler
    const handleAddSeats = useCallback(async (seatsToAdd: number, isTrialing: boolean, onComplete?: () => void) => {
        if (isTrialing) {
            onNavigate('SUBSCRIPTION');
            if (onComplete) onComplete();
            return;
        }
        try {
            await addSeatsAction({ seatsToAdd });
            toast.success(`Successfully added ${seatsToAdd} seat(s)`);
            if (onComplete) onComplete();
        } catch (error) {
            toast.error("Failed to add seats. Please check your billing info.");
        }
    }, [addSeatsAction, onNavigate]);

    // Document handlers
    const handleLinkFile = useCallback(async (
        selectedMemberId: string,
        storageId: string,
        file: { name?: string; type?: string }
    ) => {
        if (!selectedMemberId) return false;
        setIsUploadingDoc(true);
        try {
            await createLegalDocumentMutation({
                projectId,
                type: file.type || 'Linked File',
                recipientId: selectedMemberId,
                name: file.name || "Linked File",
                attachmentUrl: storageId,
                content: "Linked from Project Files",
                status: "Linked"
            });
            toast.success("File linked successfully");
            return true;
        } catch (error) {
            toast.error("Failed to link file");
            return false;
        } finally {
            setIsUploadingDoc(false);
        }
    }, [projectId, createLegalDocumentMutation]);

    const handleDeleteDoc = useCallback(async (docId: string) => {
        try {
            await deleteLegalDocumentMutation({ id: docId as any });
            toast.success('Document deleted');
            return true;
        } catch (error) {
            toast.error('Failed to delete document');
            return false;
        }
    }, [deleteLegalDocumentMutation]);

    return {
        // State
        isSyncing,
        isResending,
        isInviting,
        isUploadingDoc,
        // Org handlers
        handleStructureChange,
        saveOrgDetails,
        // Member handlers
        handleSaveMember,
        handleDeleteMember,
        handleResendInvite,
        handleSendInvite,
        // Role handlers
        handleAddRole,
        handleRenameRole,
        handleDeleteRole,
        handleSavePermissions,
        // Other handlers
        handleSyncMembers,
        handleAddSeats,
        handleLinkFile,
        handleDeleteDoc,
        // Exposed mutations for direct use
        generateUploadUrl: generateUploadUrlMutation,
        createLegalDocument: createLegalDocumentMutation,
        updateMember: updateMemberMutation
    };
}
