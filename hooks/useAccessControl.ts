import { useMemo } from 'react';
import { PageAccess, RoleDefinition, RolePermissions, DEFAULT_ROLES, ViewState, StartupData, BASIC_PLAN_PAGES } from '../types';
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

interface UseAccessControlProps {
    currentProject: StartupData | undefined;
    user: any; // WorkOS user object
    viewState: ViewState;
    entitlements: any;
    currentProjectId: string | null;
}

interface UseAccessControlReturn {
    isAccessDenied: boolean;
    isFeatureDisabled: boolean;
    currentUserAllowedPages: PageAccess[] | undefined;
    currentUserPermissions: RolePermissions | undefined;
    currentUserRole: string | undefined;
    isLoading: boolean;
}

export function useAccessControl({
    currentProject,
    user,
    viewState,
    entitlements,
    currentProjectId
}: UseAccessControlProps): UseAccessControlReturn {

    // Fetch custom roles if we have a project
    const customRoles = useQuery(api.roles.list, { projectId: currentProjectId || 'local' }) || [];

    const { currentUserAllowedPages, currentUserPermissions, currentUserRole } = useMemo(() => {
        if (!user || !currentProject) {
            return {
                currentUserAllowedPages: undefined,
                currentUserPermissions: undefined,
                currentUserRole: undefined
            };
        }

        const currentUserEmail = user.email;
        const currentMember = currentProject.teamMembers?.find(m => m.email === currentUserEmail);

        // Merge custom roles with default roles
        const customRolesList = customRoles.map(r => ({
            id: r._id,
            name: r.name,
            description: r.description,
            isSystem: r.isSystem,
            allowedPages: r.allowedPages as PageAccess[],
            permissions: r.permissions
        }));

        const effectiveDefaultRoles = DEFAULT_ROLES.filter(dr => !customRolesList.some(cr => cr.name === dr.name));
        const allRoles = [...effectiveDefaultRoles, ...customRolesList];

        let allowedPages: PageAccess[] | undefined = undefined;
        let permissions: RolePermissions | undefined = undefined;
        let userRole: string | undefined = undefined;

        if (currentMember) {
            userRole = currentMember.role;
            if (currentMember.allowedPages && currentMember.allowedPages.length > 0) {
                allowedPages = currentMember.allowedPages;
            }

            const roleDef = allRoles.find(r => r.name === currentMember.role) as RoleDefinition | undefined;
            if (roleDef) {
                if (!allowedPages) allowedPages = roleDef.allowedPages;
                permissions = roleDef.permissions;
            }
        } else {
            // Implicit Owner/Founder Logic
            // If the project loads but user is not in teamMembers, we treat them as founder.

            // Robust Founder Role Lookup (including user's manual fix logic)
            const founderRole = allRoles.find(r => r.name === 'Founder') ||
                DEFAULT_ROLES.find(r => r.name === 'Founder') as RoleDefinition | undefined;

            if (founderRole) {
                allowedPages = founderRole.allowedPages;
                permissions = founderRole.permissions;
                userRole = 'Founder';
            }
        }

        // Entitlements Override
        if (entitlements.tierName === 'Explorer' && allowedPages) {
            const explorerAllowed = [
                PageAccess.CANVAS, PageAccess.AI_ASSISTANT, PageAccess.SETTINGS, PageAccess.IDEATION,
                PageAccess.JOURNEY, PageAccess.TEAM, PageAccess.LEGAL, PageAccess.REVENUE,
                PageAccess.SAFE, PageAccess.ADAPTIVE_LEARNING, PageAccess.HUMAN_AI_COOPERATION,
                PageAccess.NOTIFICATIONS, PageAccess.STARTUP_OVERVIEW, PageAccess.CALENDAR
            ];
            allowedPages = allowedPages.filter(p => p !== undefined && explorerAllowed.includes(p));
        }

        // Basic Plan Restriction
        if (entitlements.plan === 'Basic' && allowedPages) {
            const basicAllowed = BASIC_PLAN_PAGES;
            allowedPages = allowedPages.filter(p => p !== undefined && basicAllowed.includes(p));
        }

        return {
            currentUserAllowedPages: allowedPages,
            currentUserPermissions: permissions,
            currentUserRole: userRole
        };
    }, [currentProject, user, customRoles, entitlements.tierName, entitlements.plan]);

    // Access Control Logic
    const isAccessDenied = useMemo(() => {
        if (!currentProject) return false;

        // DEBUG: Trace checks

        // EXPLICIT BYPASS: Startup Overview and Calendar are core pages
        if (viewState === 'STARTUP_OVERVIEW' || viewState === 'CALENDAR' || viewState === 'ONBOARDING') {
            return false;
        }

        // Common pages not requiring specific checks based on role (unless role is severely restricted)
        if (viewState === 'NOTIFICATIONS' || viewState === 'AI_ASSISTANT') {
            return false;
        }

        // Settings needs specific role
        if (viewState === 'SETTINGS') {
            return currentUserRole !== 'Founder' && currentUserRole !== 'Admin';
        }

        const requiredPermission = PageAccess[viewState as keyof typeof PageAccess];

        if (!requiredPermission) {
            // If the page isn't in PageAccess, we assume it's open or not protected by this RBAC
            return false;
        }

        if (!currentUserAllowedPages) {
            // No allowed pages list => Deny
            return true;
        }

        return !currentUserAllowedPages.includes(requiredPermission);

    }, [viewState, currentProject, currentUserAllowedPages, currentUserRole]);

    const isFeatureDisabled = useMemo(() => {
        if (!currentProject) return false;
        return (
            (viewState === 'CANVAS' && currentProject.canvasEnabled === false) ||
            (viewState === 'MARKET' && currentProject.marketResearchEnabled === false)
        );
    }, [viewState, currentProject]);

    return {
        isAccessDenied,
        isFeatureDisabled,
        currentUserAllowedPages,
        currentUserPermissions,
        currentUserRole,
        isLoading: false
    };
}
