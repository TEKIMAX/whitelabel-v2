import React from 'react';
import { ViewState, StartupData, AISettings, PageAccess, RolePermissions, CanvasVersion, Slide, DeckTheme, RevenueModelVersion } from '../types';

// Page Components
import CanvasStack from './CanvasStack';
import CanvasLanding from './CanvasLanding';
import DeckBuilder from './DeckBuilder';
import CustomerDev from './CustomerDev';
import AgileRoadmap from './AgileRoadmap';
import RevenueModel from './RevenueModel';
import MarketResearch from './MarketResearch';
import MarketHub from './MarketHub';
import CompetitiveMatrix from './CompetitiveMatrix';
import BottomUpSizing from './BottomUpSizing';
import WhitePaper from './WhitePaper';
import BusinessPlan from './BusinessPlan';
import BusinessPlanBuilder from './businessPlanBuilder/Home';
import { AdaptiveLearningHome } from './AdaptiveLearning/Home';
import GrantAudit from './GrantAudit';
import SafeGenerator from './SafeGenerator';
import VestingGenerator from './VestingGenerator';
import GoalSetting from './GoalSetting';
import TeamOrganization from './TeamOrganization';
import AIDiagnostic from './AIDiagnostic';
import FileOrganization from './FileOrganization';
import { WebsiteBuilder } from './websitePreview/WebsiteBuilder';
// import SubscriptionPage from './SubscriptionPage';
import StartupJourney from './StartupJourney';
import EisenhowerMatrix from './EisenhowerMatrix';
import IdeationHome from './Ideation/Home';
import ChatApp from './nobel_chat/ChatApp';
import { DocsManager } from './documents/DocsManager';
import { HumanAiCooperation } from './HumanAiCooperation';
import { Wiki } from './Wiki';
import StripeConnectDashboard from './StripeConnectDashboard';
import { TokenPricingCalculator } from './TokenPricingCalculator';
import { ExpensesPage } from './ExpensesPage';
import { LearnPage } from './LearnPage';
import { Initiatives } from './Ventures/Initiatives';
import { StartupOverview } from './StartupOverview';
import Calendar from './Calendar';
import { NotificationsCenter } from './Notifications';
import CalculatorChat from './CalculatorChat';
import { AgentDirectory } from './AgentDirectory';

interface PageRouterProps {
    viewState: ViewState;
    currentProject: StartupData | undefined;
    currentProjectId: string | null;
    displayProjects: StartupData[];
    settings: AISettings;
    allowedPages: PageAccess[] | undefined;
    permissions: RolePermissions | undefined;
    currentUserRole: string | undefined;
    user: any;
    isAuthenticated: boolean;
    // Handlers
    handlers: {
        handleCanvasUpdate: (section: any, content: string) => void;
        handleLoadCanvasVersion: (version: CanvasVersion) => void;
        handleSaveCanvasVersion: (name: string) => Promise<string | undefined>;
        handleDeleteCanvasVersion: (versionId: string) => void;
        handleCanvasFinish: () => void;
        handleDeckSaveVersion: (name: string, slides: any[], theme?: DeckTheme, versionId?: string) => Promise<string | undefined>;
        handleDeleteDeckVersion: (versionId: string) => void;
        handleAddSlideToDeck: (slide: Slide) => void;
        handleSaveRevenueModelVersion: (name: string) => Promise<void>;
        handleLoadRevenueModelVersion: (version: RevenueModelVersion) => Promise<void>;
        handleDeleteRevenueModelVersion: (versionId: string) => Promise<void>;
        handleSwitchProject: (projectId: string) => void;
        handleNewProject: () => void;
        handleNavigate: (view: ViewState) => void;
        updateCurrentProject: (updater: (project: StartupData) => StartupData) => void;
        updateProjectMutation: any;
    };
    signOut: () => void;
    setViewState: React.Dispatch<React.SetStateAction<ViewState>>;
}

export const AppPageRouter: React.FC<PageRouterProps> = ({
    viewState,
    currentProject,
    currentProjectId,
    displayProjects,
    settings,
    allowedPages,
    permissions,
    currentUserRole,
    user,
    isAuthenticated,
    handlers,
    signOut,
    setViewState
}) => {
    const {
        handleCanvasUpdate,
        handleLoadCanvasVersion,
        handleSaveCanvasVersion,
        handleDeleteCanvasVersion,
        handleCanvasFinish,
        handleDeckSaveVersion,
        handleDeleteDeckVersion,
        handleAddSlideToDeck,
        handleSaveRevenueModelVersion,
        handleLoadRevenueModelVersion,
        handleDeleteRevenueModelVersion,
        handleSwitchProject,
        handleNewProject,
        handleNavigate,
        updateCurrentProject,
        updateProjectMutation
    } = handlers;

    // Common props for most pages
    const commonProps = {
        allProjects: displayProjects,
        onSwitchProject: handleSwitchProject,
        onNewProject: handleNewProject,
        onNavigate: handleNavigate,
        currentView: viewState,
        settings,
        allowedPages
    };

    switch (viewState) {
        case 'WIKI':
            return (
                <Wiki
                    {...commonProps}
                    currentProjectId={currentProjectId}
                    permissions={permissions}
                    projectFeatures={currentProject ? {
                        canvasEnabled: currentProject.canvasEnabled,
                        marketResearchEnabled: currentProject.marketResearchEnabled
                    } : undefined}
                />
            );

        case 'AGENTS':
            return (
                <AgentDirectory
                    currentProjectId={currentProjectId || undefined}
                    onNavigate={handleNavigate}
                />
            );

        case 'CANVAS':
            return currentProject ? (
                <CanvasStack
                    data={currentProject}
                    {...commonProps}
                    onUpdate={handleCanvasUpdate}
                    onSaveVersion={handleSaveCanvasVersion}
                    onLoadVersion={handleLoadCanvasVersion}
                    onDeleteVersion={handleDeleteCanvasVersion}
                    onFinish={handleCanvasFinish}
                    permissions={permissions}
                />
            ) : null;

        case 'CANVAS_LANDING':
            return currentProject ? (
                <CanvasLanding
                    data={currentProject}
                    onLoadVersion={handleLoadCanvasVersion}
                    onSaveVersion={handleSaveCanvasVersion}
                    onDeleteVersion={handleDeleteCanvasVersion}
                    onOpenCanvas={() => handleNavigate('CANVAS')}
                    onNavigate={handleNavigate}
                    currentView={viewState}
                    allowedPages={allowedPages}
                    permissions={permissions}
                />
            ) : null;

        case 'STARTUP_OVERVIEW':
            return currentProject ? (
                <StartupOverview
                    data={currentProject}
                    onNavigate={handleNavigate}
                    currentView={viewState}
                    allowedPages={allowedPages}
                    permissions={permissions}
                    currentUserRole={currentUserRole}
                    userName={user?.name}
                />
            ) : null;

        case 'CALENDAR':
            return currentProject ? (
                <Calendar
                    data={currentProject}
                    onNavigate={handleNavigate}
                    currentView={viewState}
                    allowedPages={allowedPages}
                />
            ) : null;
        case 'NOTIFICATIONS':
            return currentProject ? (
                <NotificationsCenter
                    data={currentProject}
                    onNavigate={handleNavigate}
                    currentView={viewState}
                    allowedPages={allowedPages}
                />
            ) : null;

        case 'MARKET':
            return currentProject ? (
                <MarketHub
                    data={currentProject}
                    {...commonProps}
                    onUpdateProject={updateCurrentProject}
                    permissions={permissions}
                />
            ) : null;

        case 'MARKET_RESEARCH':
            return currentProject ? (
                <MarketResearch
                    data={currentProject}
                    {...commonProps}
                    onUpdateProject={updateCurrentProject}
                    permissions={permissions}
                />
            ) : null;

        case 'BOTTOM_UP_SIZING':
            return currentProject ? (
                <BottomUpSizing
                    data={currentProject}
                    {...commonProps}
                    onUpdateProject={updateCurrentProject}
                    onUpdateCanvas={handleCanvasUpdate}
                    permissions={permissions}
                />
            ) : null;

        case 'COMPETITIVE_MATRIX':
            return currentProject ? (
                <CompetitiveMatrix
                    data={currentProject}
                    {...commonProps}
                    onUpdateProject={updateCurrentProject}
                    onAddSlideToDeck={handleAddSlideToDeck}
                    permissions={permissions}
                />
            ) : null;

        case 'CUSTOMERS':
            return currentProject ? (
                <CustomerDev
                    data={currentProject}
                    {...commonProps}
                    onUpdateProject={updateCurrentProject}
                    permissions={permissions}
                />
            ) : null;

        case 'ENGINEERING':
            return currentProject ? (
                <AgileRoadmap
                    data={currentProject}
                    {...commonProps}
                    onUpdateProject={updateCurrentProject}
                />
            ) : null;

        case 'GOALS':
            return currentProject ? (
                <GoalSetting
                    data={currentProject}
                    {...commonProps}
                    onUpdateProject={updateCurrentProject}
                />
            ) : null;

        case 'TEAM':
            return currentProject ? (
                <TeamOrganization
                    data={currentProject}
                    {...commonProps}
                    onUpdateProject={updateCurrentProject}
                    currentUserRole={currentUserRole}
                    permissions={permissions}
                />
            ) : null;

        case 'LANDING_PAGE':
            return currentProject ? (
                <WebsiteBuilder
                    allProjects={displayProjects}
                    currentProject={currentProject}
                    onSwitchProject={handleSwitchProject}
                    onNavigate={handleNavigate}
                />
            ) : null;


        case 'JOURNEY':
            return currentProject ? (
                <StartupJourney
                    data={currentProject}
                    {...commonProps}
                    onUpdateProject={(updater: (project: StartupData) => StartupData) => {
                        updateCurrentProject(updater);
                        const role = currentUserRole;
                        const canEdit = role === 'Founder' || role === 'Admin';
                        if (isAuthenticated && currentProject && canEdit) {
                            const updatedProject = updater(currentProject);
                            updateProjectMutation({
                                id: currentProject.id as any,
                                updates: { milestones: updatedProject.milestones }
                            });
                        }
                    }}
                />
            ) : null;

        case 'VESTING':
            return currentProject ? (
                <VestingGenerator
                    data={currentProject}
                    {...commonProps}
                    onUpdateProject={updateCurrentProject}
                />
            ) : null;

        case 'IDEATION':
            return (
                <div className="min-h-screen w-full">
                    <IdeationHome
                        onEnter={() => { }}
                        {...commonProps}
                        currentUserRole={currentUserRole}
                        projectFeatures={currentProject ? {
                            canvasEnabled: currentProject.canvasEnabled,
                            marketResearchEnabled: currentProject.marketResearchEnabled
                        } : undefined}
                        currentProjectId={currentProjectId}
                    />
                </div>
            );

        case 'INITIATIVES':
            return currentProjectId ? (
                <div className="min-h-screen w-full">
                    <Initiatives
                        projectId={currentProjectId}
                        allProjects={displayProjects}
                        onSwitchProject={handleSwitchProject}
                        onNewProject={handleNewProject}
                        onNavigate={handleNavigate}
                        currentView={viewState}
                        allowedPages={allowedPages}
                    />
                </div>
            ) : null;

        case 'EISENHOWER':
            return currentProject ? (
                <EisenhowerMatrix
                    data={currentProject}
                    {...commonProps}
                    onUpdateProject={updateCurrentProject}
                />
            ) : null;

        case 'REVENUE':
            return currentProject ? (
                <RevenueModel
                    data={currentProject}
                    {...commonProps}
                    onUpdateProject={updateCurrentProject}
                    onSaveVersion={handleSaveRevenueModelVersion}
                    onLoadVersion={handleLoadRevenueModelVersion}
                    onDeleteVersion={handleDeleteRevenueModelVersion}
                    onAddSlideToDeck={handleAddSlideToDeck}
                    permissions={permissions}
                />
            ) : null;

        case 'STRIPE_DASHBOARD':
            return currentProject ? (
                <StripeConnectDashboard
                    project={currentProject}
                    allProjects={displayProjects}
                    onSwitchProject={handleSwitchProject}
                    onNewProject={handleNewProject}
                    onNavigate={handleNavigate}
                    currentView={viewState}
                    allowedPages={allowedPages}
                />
            ) : null;

        case 'DECK':
            return currentProject ? (
                <DeckBuilder
                    data={currentProject}
                    {...commonProps}
                    onBackToCanvas={() => handleNavigate('CANVAS')}
                    onSaveDeckVersion={handleDeckSaveVersion}
                    onDeleteVersion={handleDeleteDeckVersion}
                />
            ) : null;

        case 'REPORT':
            return currentProject ? (
                <WhitePaper
                    data={currentProject}
                    {...commonProps}
                    onUpdateProject={updateCurrentProject}
                />
            ) : null;

        case 'BUSINESS_PLAN':
            return currentProject ? (
                <BusinessPlan
                    data={currentProject}
                    {...commonProps}
                    onUpdateProject={updateCurrentProject}
                />
            ) : null;

        case 'BUSINESS_PLAN_BUILDER':
            return (
                <BusinessPlanBuilder
                    currentProject={currentProject}
                    {...commonProps}
                    user={user}
                    onLogout={signOut}
                />
            );

        case 'GRANT':
            return currentProject ? (
                <GrantAudit
                    data={currentProject}
                    {...commonProps}
                    onUpdateProject={updateCurrentProject}
                />
            ) : null;

        case 'SAFE':
            return currentProject ? (
                <SafeGenerator
                    data={currentProject}
                    {...commonProps}
                    onUpdateProject={updateCurrentProject}
                />
            ) : null;

        case 'FILES':
            return currentProject ? (
                <FileOrganization
                    data={currentProject}
                    {...commonProps}
                    onUpdateProject={updateCurrentProject}
                    permissions={permissions}
                />
            ) : null;

        case 'LEGAL':
            return currentProject ? (
                <DocsManager
                    onBack={() => handleNavigate('CANVAS')}
                    allProjects={displayProjects}
                    currentProjectId={currentProject.id}
                    onSwitchProject={handleSwitchProject}
                    onNewProject={handleNewProject}
                    currentView={viewState}
                    onNavigate={handleNavigate}
                    allowedPages={allowedPages}
                    projectFeatures={{
                        canvasEnabled: currentProject.canvasEnabled,
                        marketResearchEnabled: currentProject.marketResearchEnabled
                    }}
                />
            ) : null;

        case 'AI_ASSISTANT':
            return currentProject ? (
                <ChatApp
                    onNavigate={handleNavigate}
                    currentView={viewState}
                    allProjects={displayProjects}
                    currentProjectId={currentProjectId}
                    onSwitchProject={handleSwitchProject}
                    onNewProject={handleNewProject}
                    allowedPages={allowedPages}
                    orgId={currentProject.orgId}
                    userId={user?.id}
                />
            ) : null;

        case 'ADAPTIVE_LEARNING':
            return currentProject ? (
                <div className="flex-1 bg-stone-50 overflow-auto w-full">
                    <AdaptiveLearningHome
                        orgId={currentProject.orgId}
                        userId={user?.id}
                        userName={user?.name || "Founder"}
                        userEmail={user?.email || ""}
                        projectId={currentProject.id}
                        currentView={viewState}
                        onNavigate={handleNavigate}
                        allowedPages={allowedPages}
                        currentUserRole={currentUserRole}
                        projectFeatures={{
                            canvasEnabled: currentProject.canvasEnabled,
                            marketResearchEnabled: currentProject.marketResearchEnabled
                        }}
                    />
                </div>
            ) : null;

        case 'EXPENSES':
            return currentProject ? (
                <ExpensesPage
                    data={currentProject}
                    onUpdateProject={updateCurrentProject}
                    currentView={viewState}
                    onNavigate={handleNavigate}
                    allowedPages={allowedPages}
                    permissions={currentUserRole as any}
                />
            ) : null;

        case 'TOKEN_PRICING':
            return (
                <TokenPricingCalculator
                    currentProject={currentProject}
                    onUpdateProject={updateCurrentProject}
                    currentView={viewState}
                    onNavigate={handleNavigate}
                    allowedPages={allowedPages}
                    permissions={currentUserRole as any}
                />
            );

        case 'HUMAN_AI_COOPERATION':
            return currentProject ? (
                <HumanAiCooperation
                    data={currentProject}
                    {...commonProps}
                    currentUserRole={currentUserRole}
                />
            ) : null;

        case 'LEARN_BMC':
            return currentProject ? (
                <LearnPage
                    data={currentProject}
                    onNavigate={handleNavigate}
                />
            ) : null;

        case 'AI_DIAGNOSTIC':
            return (
                <AIDiagnostic
                    onNavigate={handleNavigate}
                    allProjects={displayProjects}
                    currentProjectId={currentProjectId}
                    onSwitchProject={handleSwitchProject}
                    onNewProject={handleNewProject}
                    currentView={viewState}
                    settings={settings}
                    allowedPages={allowedPages}
                />
            );

        case 'CALCULATOR_AI':
            return currentProject ? (
                <CalculatorChat
                    currentProjectId={currentProjectId}
                    currentProject={currentProject}
                    {...commonProps}
                    orgId={currentProject.orgId}
                    userId={user?.id}
                />
            ) : null;

        case 'ONBOARDING':
            return null;

        case 'SETTINGS':
            return null;

        default:
            return (
                <div className="flex flex-col items-center justify-center min-h-[80vh] bg-nobel-cream text-stone-600 p-6 font-sans">
                    <div className="w-20 h-20 bg-stone-200 rounded-full flex items-center justify-center mb-6 text-stone-500 shadow-inner">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="font-serif text-3xl text-stone-900 mb-3 tracking-tight">Feature Unavailable</h1>
                    <p className="text-stone-500 max-w-md text-center mb-10 leading-relaxed">
                        This section implies a tool or view that isn't fully set up yet or might require an upgraded plan.
                    </p>
                    <button
                        onClick={() => setViewState('ONBOARDING')}
                        className="px-8 py-3.5 bg-stone-900 text-white rounded-full font-bold uppercase tracking-wider text-xs hover:bg-stone-800 transition-all hover:scale-105 active:scale-95 shadow-md flex items-center gap-2 group"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Dashboard
                    </button>
                </div>
            );
    }
};

export default AppPageRouter;
