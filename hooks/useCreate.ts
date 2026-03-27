import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

/**
 * Centrailized Create Hooks
 * 
 * This file contains all the useMutation wrappers for "create" operations across the application.
 * Using these hooks instead of direct useMutation calls allows for:
 * 1. Better type safety and centralized maintenance.
 * 2. Easier interception for analytics, logging, or debugging.
 * 3. Consistent patterns across the codebase.
 */

// Goals & OKRs
export const useCreateGoal = () => useMutation(api.goals.addGoal);
export const useUpdateGoal = () => useMutation(api.goals.updateGoal);
export const useCreateKeyResult = () => useMutation(api.goals.addKeyResult);

// Revenue Model
export const useCreateRevenueStream = () => useMutation(api.revenue.addRevenueStream);
export const useCreateCost = () => useMutation(api.revenue.addCost);

// Competitors
export const useCreateManualCompetitor = () => useMutation(api.manual_competitors.addManualCompetitor);

// Documents & Files
export const useCreateDocument = () => useMutation(api.documents.createDocument);
export const useCreateFolder = () => useMutation(api.files.createFolder);
export const useCreateLegalDocument = () => useMutation(api.legal.createDocument); // Note: Might be alias to createDocument if api.legal uses same, but specific api.legal exists in grep
export const useGenerateUploadUrl = () => useMutation(api.files.generateUploadUrl);
export const useSaveFile = () => useMutation(api.files.saveFile);
export const useSaveChatMessage = () => useMutation(api.aiChat.saveMessage);
export const useTrackFeedback = () => useMutation(api.adaptive.trackFeedback);

// Team & Roles/SAFE
export const useCreateTeamMember = () => useMutation(api.team.addMember);
export const useCreateRole = () => useMutation(api.roles.create);
export const useCreateSafeTeamMember = () => useMutation(api.safe.addTeamMember);

// Blog & Wiki
export const useCreateBlogPost = () => useMutation(api.blog.createPost);
export const useCreateBlogCategory = () => useMutation(api.blog.createCategory);

// Engineering & Product
export const useCreateFeature = () => useMutation(api.engineering.addFeature);
export const useCreateCustomerInterview = () => useMutation(api.customers.addInterview);
export const useCreateMilestone = () => useMutation(api.aiChat.addMilestone);

// Initiatives & Divisions
export const useCreateDivision = () => useMutation(api.initiatives.createDivision);
export const useCreateInitiative = () => useMutation(api.initiatives.createInitiative);
export const useCreateInitiativeComment = () => useMutation(api.initiatives.addComment);

// Calendar
export const useCreateEvent = () => useMutation(api.calendar.addEvent);

// Ideation
export const useCreateIdeationWorkspace = () => useMutation(api.ideation.create);

// AI & Chat
export const useCreateChat = () => useMutation(api.aiChat.createChat);

// Business Plan
export const useCreateBusinessPlanVersion = () => useMutation(api.businessPlans.createVersion);

// Referrals
export const useGenerateReferralCode = () => useMutation(api.referrals.generateReferralCode);
