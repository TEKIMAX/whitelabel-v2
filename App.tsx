import React, { useState, useEffect, useMemo } from 'react';
import { StartupData, ViewState, AISettings, DEFAULT_ROLES, PageAccess, RoleDefinition } from './types';
import Onboarding from './components/Onboarding';
import { Loader2, Shield } from 'lucide-react';
import Settings from './components/Settings';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
// import SubscriptionPage from './components/SubscriptionPage';
import { BlogPage } from './pages/BlogPage';
import { AiTestPage } from './pages/AiTestPage';
import { BlogDetailPage } from './components/BlogDetailPage';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import ReferralRedeem from './components/ReferralRedeem';
import AcceptInvite from './components/AcceptInvite';
import { OnboardingFlow } from './components/OnboardingFlow';
import StripeCallback from './components/StripeCallback';
import StoryFlow from './components/Story/StepView';
import AppPageRouter from './components/AppPageRouter';
// import OpenResponseDemo from './pages/open-response-demo';

import { useAuth } from './contexts/CustomAuthProvider';
import { api } from "./convex/_generated/api";
import { useConvexAuth, useQuery, useMutation, useAction } from "convex/react";
import { Toaster, toast } from "sonner";
import { useEntitlements } from './hooks/useEntitlements';
import { useProjectHandlers } from './hooks/useProjectHandlers';
import { useAccessControl } from './hooks/useAccessControl';
import { RealtimeVoiceSidebar } from './components/RealtimeVoiceSidebar';
import { LiveProvider } from './contexts/LiveContext';
import { useUser } from './contexts/UserContext';
import { ProOverrideButton } from './components/ProOverrideButton';

import { ProUpsellPage } from './components/ProUpsellPage';
import ErrorBoundary from './components/ErrorBoundary';
import { BrandingProvider } from './components/BrandingProvider';


const App: React.FC = () => {
  // --- AUTH STATE ---
  const { user, signIn, signOut, isLoading, authenticateDirectly, switchToOrganization } = useAuth();
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const entitlements = useEntitlements();

  // Use Global User Context
  const { user: convexUser, isLoading: isUserLoading, currentOrgId } = useUser();
  // const convexUser = useQuery(api.users.getUser, isAuthenticated ? {} : "skip");
  const storeUser = useMutation(api.users.store);
  const storyProgress = useQuery(api.story.getStoryProgress, isAuthenticated ? {} : "skip");

  const [hasLoadedUser, setHasLoadedUser] = useState(false);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [showLoadingUI, setShowLoadingUI] = useState(false);

  useEffect(() => {
    if (convexUser !== undefined) {
      setHasLoadedUser(true);
    }
  }, [convexUser]);

  // Safety: Prevent infinite loading if Convex connection hangs
  useEffect(() => {
    if (isAuthenticated && !hasLoadedUser) {
      const timer = setTimeout(() => {
        console.warn('[App] Loading timed out after 2s — forcing through');
        setLoadingTimedOut(true);
        setHasLoadedUser(true);
      }, 2000);
      return () => clearTimeout(timer);
    } else if (user && !isAuthenticated && !hasLoadedUser) {
      // If we have a WorkOS user but Convex isn't authenticated yet, triggering timeout too
      // This handles the case where Convex auth hangs or fails
      const timer = setTimeout(() => {
        console.warn('[App] Auth handshake timed out after 2s — forcing through');
        setLoadingTimedOut(true);
        setHasLoadedUser(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, hasLoadedUser, user]);

  // Grace period: Don't show loading UI immediately — prevents flickering on brief auth transitions
  useEffect(() => {
    if (user && !hasLoadedUser) {
      const timer = setTimeout(() => setShowLoadingUI(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShowLoadingUI(false);
    }
  }, [user, hasLoadedUser]);

  useEffect(() => {
    if (isAuthenticated && user && !isAuthLoading) {
      const isMissingUser = convexUser === null;
      const isMalformedUser = convexUser && (convexUser.onboardingCompleted === undefined || convexUser.onboardingStep === undefined);
      const hasStaleGenericName = convexUser && convexUser.name === "User" && user.firstName;
      // If the user exists but has no orgs, call storeUser so the JWT org_id
      // gets extracted and written to Convex (avoids the workspace selector loop
      // when the org was just provisioned and the webhook hasn't fired yet).
      const hasNoOrgs = convexUser && (convexUser.orgIds?.length ?? 0) === 0;

      if (isMissingUser || isMalformedUser || hasStaleGenericName || hasNoOrgs) {
        storeUser({
          name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email?.split('@')[0] || "User",
          email: user.email || "",
          pictureUrl: user.profilePictureUrl || ""
        }).catch(err => console.error("Failed to restore/repair user:", err));
      }
    }
  }, [isAuthenticated, user, convexUser, isAuthLoading, storeUser]);

  // --- CRYPTO IDENTITY ---
  const registerPublicKey = useMutation(api.users.registerPublicKey);
  useEffect(() => {
    if (isAuthenticated && convexUser && !convexUser.publicKey) {
      import('./services/crypto').then(async (m) => {
        const identity = await m.ensureIdentity();
        registerPublicKey({ publicKey: identity.publicKey })
          .catch(err => console.error("Failed to register public key:", err));
      });
    }
  }, [isAuthenticated, convexUser, registerPublicKey]);

  const [projects, setProjects] = useState<StartupData[]>([]);
  const [settings, setSettings] = useState<AISettings>({
    provider: 'ollama',
    modelName: 'gemini-3-flash-preview',
    apiKey: '',
    googleApiKey: '',
    openaiApiKey: '',
    ollamaApiKey: ''
  });

  const [viewState, setViewState] = useState<ViewState>(() => {
    const saved = localStorage.getItem('fs_view_state');
    if (!saved || saved === 'undefined' || saved === 'null') return 'ONBOARDING';
    return (saved as ViewState);
  });
  const [settingsTab, setSettingsTab] = useState<'profile' | 'users' | 'domains' | 'organizations' | 'security' | 'integrations' | 'billing' | 'branding'>('profile');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => {
    const saved = localStorage.getItem('fs_current_project_id');
    if (!saved || saved === 'undefined' || saved === 'null') return null;
    return saved;
  });
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [showAuthWarning, setShowAuthWarning] = useState(false);
  const [showCannotDeleteLastVersionModal, setShowCannotDeleteLastVersionModal] = useState(false);
  const [isLivePanelOpen, setIsLivePanelOpen] = useState(false);

  // Persistence for AI Settings
  useEffect(() => {
    // Proactive cleanup for bad state
    const currentView = localStorage.getItem('fs_view_state');
    if (currentView === 'undefined' || currentView === 'null') {
      localStorage.removeItem('fs_view_state');
      setViewState('ONBOARDING');
    }

    const saved = localStorage.getItem('fs_ai_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: Fix broken model names
        if (parsed.modelName === 'gemini-1.5-pro-latest') {
          parsed.modelName = 'gemini-1.5-flash';
        }
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to load AI settings:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('fs_ai_settings', JSON.stringify(settings));
  }, [settings]);

  // Persist View State and Project ID
  useEffect(() => {
    if (viewState && (viewState as string) !== 'undefined') {
      localStorage.setItem('fs_view_state', viewState);
    } else {
      setViewState('ONBOARDING');
    }
  }, [viewState]);

  useEffect(() => {
    if (currentProjectId) {
      localStorage.setItem('fs_current_project_id', currentProjectId);
    } else {
      localStorage.removeItem('fs_current_project_id');
    }
  }, [currentProjectId]);

  // Handle session_expired query param — silently re-authenticate instead of showing error
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reason') === 'session_expired') {
      // Strip the query param from the URL
      params.delete('reason');
      const cleanUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      // Silently re-authenticate
      if (!user && !isLoading) {
        signIn();
      }
    }
  }, []);

  // Handle Deep Linking
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/settings') {
      setViewState('SETTINGS');
    } else if (path === '/subscription' || path === '/billing') {
      setViewState('SETTINGS');
      setSettingsTab('billing');
    } else if (path === '/blog') {
      setViewState('WIKI');
    }
  }, [user, isLoading]);

  // Handle Stripe Redirects
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success') || params.get('subscription_success');
    const canceled = params.get('canceled') || params.get('subscription_canceled');

    if (success === 'true' && isAuthenticated && convexUser?.onboardingCompleted) {
      toast.success("Subscription updated successfully!");
      setViewState('ONBOARDING'); // Redirect to dashboard/project list
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (canceled === 'true') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isAuthenticated, convexUser?.onboardingCompleted]);

  // Convex Data
  // NOTE: Org-based filtering disabled — projects use per-venture WorkOS orgIds,
  // not workspace orgIds. Need to add parentOrgId to projects to enable filtering.
  const convexProjectsRaw = useQuery(api.projects.list, isAuthenticated ? {} : "skip");
  const convexProjects = loadingTimedOut && convexProjectsRaw === undefined ? [] : convexProjectsRaw;

  // Track loading state

  const isConvexProject = convexProjects?.some(p => p._id === currentProjectId);
  const remoteProject = useQuery(api.projects.get, (isAuthenticated && isConvexProject) ? { projectId: currentProjectId as any } : "skip");
  const localProject = projects.find(p => p.id === currentProjectId);
  const currentProject = (isConvexProject && remoteProject) ? remoteProject as any : localProject as StartupData | undefined;

  // RBAC
  const customRoles = useQuery(api.roles.list, { projectId: currentProjectId || 'local' }) || [];
  const customRolesList = customRoles.map(r => ({
    id: r._id,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    allowedPages: r.allowedPages as PageAccess[]
  }));
  const effectiveDefaultRoles = DEFAULT_ROLES.filter(dr => !customRolesList.some(cr => cr.name === dr.name));
  const allRoles = [...effectiveDefaultRoles, ...customRolesList];

  // Backfill Slugs
  const backfillSlugs = useMutation(api.projects.backfillProjectSlugs);
  useEffect(() => {
    if (isAuthenticated) {
      backfillSlugs().catch(console.error);
    }
  }, [isAuthenticated, backfillSlugs]);

  // JIT org sync — when user is authenticated but orgIds is still empty,
  // query WorkOS directly rather than waiting for the webhook (~5s gap).
  const syncUserMemberships = useAction(api.workos.syncUserMemberships);
  const [hasSyncedMemberships, setHasSyncedMemberships] = useState(false);
  const [isSyncingMemberships, setIsSyncingMemberships] = useState(false);
  // How many orgs WorkOS reported during the last sync — used to detect the
  // Convex reactive-update race: sync may complete before the DB patch is
  // reflected in the local convexUser snapshot, so we hold "syncing" state
  // until either Convex confirms orgIds > 0 or we time out.
  const [syncedOrgCount, setSyncedOrgCount] = useState(0);
  useEffect(() => {
    if (!isAuthenticated || !convexUser || hasSyncedMemberships) return;
    if ((convexUser.orgIds?.length ?? 0) > 0) {
      // Already has orgs — no sync needed
      setHasSyncedMemberships(true);
      return;
    }
    // Empty orgIds — eagerly sync from WorkOS
    setIsSyncingMemberships(true);
    syncUserMemberships()
      .then((result: any) => {
        const synced = result?.synced ?? 0;
        setSyncedOrgCount(synced);
        if (synced === 0) {
          // No memberships found — nothing to wait for, unblock now
          setHasSyncedMemberships(true);
          setIsSyncingMemberships(false);
        }
        // If synced > 0: keep isSyncingMemberships=true while we wait for
        // Convex reactive update to confirm orgIds is populated (see effect below)
      })
      .catch((err: any) => {
        console.warn('[OrgSync] JIT sync failed:', err);
        setHasSyncedMemberships(true);
        setIsSyncingMemberships(false);
      });
  }, [isAuthenticated, convexUser, hasSyncedMemberships, syncUserMemberships]);

  // After sync finds memberships, wait for Convex to confirm orgIds > 0
  // before declaring sync complete (avoids the race-condition selector flash).
  useEffect(() => {
    if (!isSyncingMemberships || syncedOrgCount === 0) return;
    if ((convexUser?.orgIds?.length ?? 0) > 0) {
      // Convex has updated — safe to unblock
      setHasSyncedMemberships(true);
      setIsSyncingMemberships(false);
      setSyncedOrgCount(0);
      return;
    }
    // Safety timeout: if Convex hasn't updated in 3s, unblock anyway
    const timer = setTimeout(() => {
      console.warn('[OrgSync] Timed out waiting for Convex orgIds update');
      setHasSyncedMemberships(true);
      setIsSyncingMemberships(false);
      setSyncedOrgCount(0);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isSyncingMemberships, syncedOrgCount, convexUser?.orgIds]);

  // Auto-sync page configs from provisioning API on first load
  const syncPages = useAction(api.pageConfigs.syncFromAPI);
  const [hasSyncedPages, setHasSyncedPages] = useState(false);
  useEffect(() => {
    const orgId = convexUser?.orgIds?.[0];
    if (isAuthenticated && orgId && !hasSyncedPages) {
      setHasSyncedPages(true);
      syncPages({ orgId }).then((result: any) => {
        // Silently sync
      }).catch((err: any) => console.warn('[PageSync] Failed:', err));
    }
  }, [isAuthenticated, convexUser?.orgIds, hasSyncedPages, syncPages]);

  // Display Projects
  const displayProjects = React.useMemo(() => {
    if (!convexProjects) return projects;
    return convexProjects.map(p => ({
      id: p._id,
      orgId: p.orgId,
      name: p.name,
      slug: (p as any).slug,
      hypothesis: p.hypothesis,
      createdAt: p._creationTime,
      lastModified: p.updatedAt,
      teamMembers: p.teamMembers.map((m: any) => ({
        id: m._id,
        name: m.name,
        email: m.email,
        role: m.role,
        pictureUrl: m.pictureUrl,
        allowedPages: m.allowedPages,
        status: m.status
      })),
      customerInterviews: Array(p.interviewCount).fill({}),
      canvasVersions: (p.canvasVersions || []).map((v: any) => ({ ...v, data: {} as any })),
      marketVersions: [],
      competitorAnalysis: {} as any,
      dataSources: [],
      goals: [],
      equityContributions: [],
      canvasEnabled: p.canvasEnabled,
      marketResearchEnabled: p.marketResearchEnabled,
      isPending: (p as any).isPending,
      invitationData: (p as any).invitationData
    } as StartupData));
  }, [convexProjects, projects]);

  // Handlers Hook
  const handlers = useProjectHandlers({
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
  });

  // Permissions & Access Control
  const {
    isAccessDenied,
    isFeatureDisabled,
    currentUserAllowedPages,
    currentUserPermissions,
    currentUserRole
  } = useAccessControl({
    currentProject,
    user,
    viewState,
    entitlements,
    currentProjectId
  });

  const handleSaveToFiles = (content: string, type: 'doc' | 'image' | 'video', metadata?: any) => {
    // Legacy integration - primarily handled inside apps now
  };

  // --- RENDER PORTAL ---
  const renderContent = () => {
    // --- PUBLIC ROUTE VARIABLES ---
    const projectBlogMatch = window.location.pathname.match(/^\/p\/([\w-]+)\/blog$/);
    const blogPostMatch = window.location.pathname.match(/^\/blog\/([\w-]+)$/);
    const projectBlogPostMatch = window.location.pathname.match(/^\/p\/([\w-]+)\/blog\/([\w-]+)$/);
    const postSlug = blogPostMatch ? blogPostMatch[1] : (projectBlogPostMatch ? projectBlogPostMatch[2] : null);
    const referralMatch = window.location.pathname.match(/^\/refer\/([A-Za-z0-9]+)$/);

    // --- PUBLIC ROUTE BYPASS ---
    if (window.location.pathname === '/blog') return <BlogPage onLogin={signIn} onNavigateHome={() => window.location.href = '/'} />;
    if (window.location.pathname === '/ai-test') return <AiTestPage />;
    if (projectBlogMatch) return <BlogPage onLogin={signIn} onNavigateHome={() => window.location.href = '/'} projectSlug={projectBlogMatch[1]} />;
    if (postSlug) {
      const accessedProjectSlug = projectBlogPostMatch ? projectBlogPostMatch[1] : undefined;
      return <BlogDetailPage onLogin={signIn} onNavigateHome={() => window.location.href = '/'} onNavigateToBlog={() => window.location.href = accessedProjectSlug ? `/p/${accessedProjectSlug}/blog` : '/blog'} postId={postSlug} projectSlug={accessedProjectSlug} />;
    }
    if (window.location.pathname === '/terms') return <TermsOfService onLogin={signIn} onNavigateHome={() => window.location.href = '/'} />;
    if (window.location.pathname === '/privacy') return <PrivacyPolicy onLogin={signIn} onNavigateHome={() => window.location.href = '/'} />;
    if (referralMatch) return <ReferralRedeem />;
    if (window.location.pathname === '/stripe-callback') return <StripeCallback />;

    // --- AUTH LOADING (prevents login screen flash on refresh) ---
    if (isLoading || isAuthLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-nobel-cream">
          <Loader2 className="w-6 h-6 animate-spin text-stone-300 mb-3" />
          <p className="text-xs text-stone-400 font-serif italic">Resuming session...</p>
        </div>
      );
    }

    // --- INVITATION ACCEPTANCE (authenticated) ---
    if (window.location.pathname === '/accept-invite') {
      return <AcceptInvite onContinue={() => { window.history.replaceState({}, document.title, '/'); window.location.reload(); }} />;
    }

    // --- SESSION EXPIRED OR AUTH MISMATCH ---
    // If WorkOS thinks we have a user, but Convex rejected the credentials (and has stopped loading),
    // the session has fundamentally expired. Silently re-authenticate in the background.
    if (user && !isAuthenticated && !isAuthLoading && hasLoadedUser) {
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          signIn(); // silently triggers PKCE re-auth (stores current URL for return)
        }, 0);
      }
      return null;
    }

    // --- UNAUTHENTICATED ---
    if (!user) {
      // Root domain (adaptivestartup.io) → show landing page
      // Subdomains (*.adaptivestartup.io) → show auth page directly (provisioned accounts)
      const hostname = window.location.hostname;
      const isRootDomain = hostname === 'adaptivestartup.io' || hostname === 'www.adaptivestartup.io' || hostname === 'pillaros.pages.dev';
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

      if (isRootDomain || isLocalhost) {
        return <LandingPage onLogin={signIn} />;
      }

      return <AuthPage onAuthSuccess={authenticateDirectly} onSwitchOrg={(organizationId: string) => switchToOrganization({ organizationId })} />;
    }

    // Always prefer real WorkOS name over potentially stale Convex fallback ("User")
    const workosName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null;
    // Map display role: PRO subscribers → Admin, default "User" role → Founder
    const getDisplayRole = (rawRole?: string, subStatus?: string) => {
      const isPro = subStatus === 'active' || subStatus === 'trialing';
      const isDefaultRole = !rawRole || rawRole.toLowerCase() === 'user';
      if (isPro) return 'Admin';
      if (isDefaultRole) return 'Founder';
      return rawRole;
    };

    const displayUser = convexUser ? {
      ...convexUser,
      name: workosName || convexUser.name || "User",
      pictureUrl: convexUser.pictureUrl || user?.profilePictureUrl,
      role: getDisplayRole(convexUser.role, convexUser.subscriptionStatus),
    } : (user ? {
      name: workosName || user.email?.split('@')[0] || "User",
      pictureUrl: user.profilePictureUrl,
      email: user.email,
      role: 'Founder',
    } : null);

    // --- ONBOARDING FLOW ---
    // Auto-skipped: ventures are now created from the Customer Portal.
    // Users go straight to the dashboard after login.
    const showOnboarding = false; // Disabled — portal handles venture creation

    // Auto-complete onboarding for any user who hasn't completed it yet
    if (convexUser && !convexUser.onboardingCompleted) {
      storeUser({
        name: displayUser?.name || 'User',
        email: user?.email || '',
        pictureUrl: user?.profilePictureUrl || '',
      }).catch(err => console.error('Failed to auto-complete onboarding:', err));
    }

    // --- STORY FLOW ---
    const isPaid = convexUser?.subscriptionStatus === 'active' || convexUser?.subscriptionStatus === 'trialing';
    const isStoryCompleted = storyProgress?.completed;

    if (convexUser && convexUser.onboardingCompleted && isPaid && !isStoryCompleted && false) return <StoryFlow onComplete={() => { }} />;

    // --- LOADING STATES ---
    // If user authenticated but Convex data hasn't loaded yet, show spinner
    // loadingTimedOut is the escape hatch — after 8s, let the app through
    if (user && !loadingTimedOut && (convexUser === undefined || convexProjects === undefined)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-nobel-cream text-stone-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-stone-300" />
          <p className="font-serif italic">Loading your workspace...</p>
          {showLoadingUI && (
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-5 py-2 text-xs uppercase tracking-widest font-bold border border-stone-300 text-stone-500 rounded-full hover:bg-stone-100 hover:text-stone-700 transition-colors"
            >
              Refresh
            </button>
          )}
        </div>
      );
    }

    // JIT org sync in progress — show a friendly message while we query WorkOS
    if (isSyncingMemberships) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-nobel-cream text-stone-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-stone-300" />
          <p className="font-serif italic text-lg">Setting up your workspace...</p>
          <p className="text-sm mt-2 text-stone-400">Syncing your organization access.</p>
          {showLoadingUI && (
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-5 py-2 text-xs uppercase tracking-widest font-bold border border-stone-300 text-stone-500 rounded-full hover:bg-stone-100 hover:text-stone-700 transition-colors"
            >
              Refresh
            </button>
          )}
        </div>
      );
    }

    // Authenticated but no org after sync — show org selection / no-access screen
    if (convexUser && hasSyncedMemberships && (convexUser.orgIds?.length ?? 0) === 0) {
      return (
        <AuthPage
          onAuthSuccess={authenticateDirectly}
          onSwitchOrg={(organizationId: string) => switchToOrganization({ organizationId })}
          isAuthenticatedWithoutOrg={true}
          currentUserEmail={user?.email}
          onLogout={signOut}
        />
      );
    }

    if (isAuthenticated && convexUser === null) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-nobel-cream text-stone-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-stone-300" />
          <p className="font-serif italic text-lg">Restoring Account...</p>
          <p className="text-sm mt-2">Almost there, syncing your workspace.</p>
          {showLoadingUI && (
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-5 py-2 text-xs uppercase tracking-widest font-bold border border-stone-300 text-stone-500 rounded-full hover:bg-stone-100 hover:text-stone-700 transition-colors"
            >
              Refresh
            </button>
          )}
        </div>
      );
    }

    // ACCESS DENIED
    if (isAccessDenied || isFeatureDisabled) {
      if (isFeatureDisabled) {
        return (
          <div className="min-h-screen bg-nobel-cream flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 bg-stone-200 rounded-full flex items-center justify-center mb-4 text-stone-500">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="font-serif text-3xl text-stone-900 mb-2">Feature Disabled</h1>
            <p className="text-stone-500 max-w-md mb-8">
              The {viewState} feature is currently disabled for this project settings.
            </p>
            <button
              onClick={() => setViewState('ONBOARDING')}
              className="px-6 py-3 bg-stone-900 text-white rounded-full font-bold uppercase tracking-wider text-xs hover:bg-stone-800 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        );
      }

      return (
        <ProUpsellPage
          viewState={viewState}
          onUpgrade={() => {
            setSettingsTab('billing');
            setViewState('SETTINGS');
          }}
          onBack={() => setViewState('ONBOARDING')}
        />
      );
    }

    // Removed: empty-projects blocker. Users with no ventures yet see the empty
    // Onboarding dashboard and can create workspaces from the portal.

    // MAIN APP
    return (
      <div className="font-sans text-stone-900 bg-nobel-cream min-h-screen">
        <Toaster position="bottom-right" />

        {viewState === 'SETTINGS' && (
          <Settings
            settings={settings}
            currentProject={currentProject}
            onSave={setSettings}
            onBack={() => setViewState('ONBOARDING')}
            onLogout={signOut}
            currentUserRole={currentUserRole || 'Member'}
            allProjects={displayProjects}
            onSwitchProject={handlers.handleSwitchProject}
            onNewProject={handlers.handleNewProject}
            onNavigate={(view) => {
              if (view === 'SUBSCRIPTION') {
                setSettingsTab('billing');
                setViewState('SETTINGS');
              } else {
                handlers.handleNavigate(view);
              }
            }}
            allowedPages={currentUserAllowedPages}
            initialTab={settingsTab}
          />
        )}

        {viewState === 'ONBOARDING' && (
          <Onboarding
            onComplete={handlers.handleOnboardingComplete}
            onLogout={signOut}
            projects={displayProjects}
            onSwitchProject={handlers.handleSwitchProject}
            onDeleteProject={handlers.handleDeleteProject}
            onOpenSettings={() => setViewState('SETTINGS')}
            onOpenProjectSettings={handlers.handleOpenProjectSettings}
            onUpdateProject={handlers.updateCurrentProject}
            user={displayUser}
            initialMode={isCreatingNew ? 'create' : undefined}
            onRequestSubscription={() => {
              setSettingsTab('billing');
              setViewState('SETTINGS');
            }}
            isLoading={convexProjects === undefined}
          />
        )}

        {/* Main Content & Sidebar Layout */}
        <div className="flex flex-1 overflow-hidden relative">
          <LiveProvider value={{ isLivePanelOpen, setIsLivePanelOpen, toggleLivePanel: () => setIsLivePanelOpen(prev => !prev) }}>
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isLivePanelOpen ? 'mr-[400px]' : ''}`}>
              <ErrorBoundary
                variant="minimal"
                onError={(error) => {
                  toast.error("An unexpected error occurred. We've recovered your session.");
                  console.error("Inner Error Caught:", error);
                }}
              >
                <AppPageRouter
                  viewState={viewState}
                  currentProject={currentProject}
                  currentProjectId={currentProjectId}
                  displayProjects={displayProjects}
                  settings={settings}
                  allowedPages={currentUserAllowedPages}
                  permissions={currentUserPermissions}
                  currentUserRole={currentUserRole}
                  user={displayUser}
                  isAuthenticated={isAuthenticated}
                  handlers={handlers}
                  signOut={signOut}
                  setViewState={setViewState}
                />
              </ErrorBoundary>
            </div>

            <div
              className={`fixed right-0 top-0 h-full w-[400px] shadow-2xl z-40 transform transition-transform duration-300 bg-white border-l border-stone-200 ${isLivePanelOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
              <RealtimeVoiceSidebar
                isOpen={isLivePanelOpen}
                onClose={() => setIsLivePanelOpen(false)}
                userName={displayUser?.name}
              />
            </div>
          </LiveProvider>
        </div>
      </div>
    );
  };

  return (
    <BrandingProvider orgId={viewState === 'ONBOARDING' ? undefined : (currentProject?.orgId || displayProjects?.[0]?.orgId)}>
      {renderContent()}
      {/* <ProOverrideButton /> */}
    </BrandingProvider>
  );
};

export default App;
