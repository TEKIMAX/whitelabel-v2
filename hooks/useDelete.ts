import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export const useDeleteGoal = () => useMutation(api.goals.deleteGoal);
export const useDeleteKeyResult = () => useMutation(api.goals.deleteKeyResult);
export const useDeleteRevenueStream = () => useMutation(api.revenue.deleteRevenueStream);
export const useDeleteCost = () => useMutation(api.revenue.deleteCost);
export const useDeleteDocument = () => useMutation(api.documents.deleteDocument);
export const useDeleteFile = () => useMutation(api.files.deleteFile);
export const useDeleteFolder = () => useMutation(api.files.deleteFolder);

export const useDeleteBlogCategory = () => useMutation(api.blog.deleteCategory);
export const useDeleteFeature = () => useMutation(api.engineering.deleteFeature);
export const useDeleteInitiative = () => useMutation(api.initiatives.deleteInitiative);
export const useDeleteDivision = () => useMutation(api.initiatives.deleteDivision);

export const useDeleteArchitectureNode = () => useMutation(api.engineering.deleteArchitectureNode);

export const useBulkDeleteCompetitors = () => useMutation(api.manual_competitors.bulkDeleteCompetitors);
export const useDeleteIdeationWorkspace = () => useMutation(api.ideation.remove);
export const useDeleteTeamMember = () => useMutation(api.team.deleteMember);
export const useDeleteRole = () => useMutation(api.roles.deleteRole);
export const useDeleteLegalDocument = () => useMutation(api.legal.deleteDocument);
export const useDeleteChat = () => useMutation(api.aiChat.deleteChat);
