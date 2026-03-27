import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";

/**
 * Centralized Action Hooks
 * 
 * This file contains all the useAction wrappers for operational actions across the application.
 */

// WorkOS Actions
export const useSyncOrganizationMembers = () => useAction(api.workos.syncOrganizationMembers);
export const useAcceptInvitation = () => useAction(api.workos.acceptInvitation);
export const useRevokeInvitation = () => useAction(api.workos.revokeInvitation);
export const useLeaveOrganization = () => useAction(api.workos.leaveOrganization);

// Invite Actions
export const useSendInvite = () => useAction(api.invites.sendInvite);
export const useRevokeInvite = () => useAction(api.invites.revokeInvite);
export const useResendInvite = () => useAction(api.invites.resendInvite);
export const useRemoveTeamMember = () => useAction(api.invites.deleteTeamMember);

// Stripe Actions
export const useAddSeats = () => useAction(api.stripeActions.addSeats);
export const useCreateProject = () => useAction(api.project_actions.create);
export const useDeleteProject = () => useAction(api.project_actions.deleteProject);
