import React, { useState } from 'react';
import { StartupData, AISettings, ViewState } from '../types';
import { ArrowLeft, Globe, DollarSign, Lock, Users, User, ShieldCheck, Plug, LayoutGrid, Paintbrush } from 'lucide-react';
import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";

import ProjectSelector from './ProjectSelector';
import TabNavigation from './TabNavigation';

interface SettingsProps {
    settings: AISettings;
    currentProject?: StartupData;
    onSave: (newSettings: AISettings) => void;
    onBack: () => void;
    onLogout: () => void;
    currentUserRole?: string;
    // New props for ProjectSelector and Navigation
    allProjects: StartupData[];
    onSwitchProject: (id: string) => void;
    onNewProject: () => void;
    onNavigate: (view: ViewState) => void;
    allowedPages?: string[];
    initialTab?: SettingsTab;
}

// Settings Page - Billing and Webhooks

type SettingsTab = 'profile' | 'users' | 'domains' | 'organizations' | 'security' | 'integrations' | 'billing' | 'branding';

import { WorkOSUserManagement } from './WorkOSUserManagement';
import { WorkOSUserProfile } from './WorkOSUserProfile';
import { WorkOSUserSessions } from './WorkOSUserSessions';
import { WorkOSUserSecurity } from './WorkOSUserSecurity';
import { WorkOSPipes } from './WorkOSPipes';
import { WorkOSDomainVerification } from './WorkOSDomainVerification';
import { WorkOSOrganizationSwitcher } from './WorkOSOrganizationSwitcher';
import { WorkOSBilling } from './WorkOSBilling';
import { BrandingSettings } from './BrandingSettings';
import { APIIntegrationsManager } from './settings/APIIntegrationsManager';

const Settings: React.FC<SettingsProps> = ({ settings, currentProject, onSave, onBack, onLogout, currentUserRole, allProjects, onSwitchProject, onNewProject, onNavigate, allowedPages, initialTab = 'profile' }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

    const usageHistory = useQuery(api.usage.getUsage);

    // WorkOS Actions
    const generatePortalLink = useAction(api.project_actions.generatePortalLink);

    const handleOpenPortal = async (intent: 'sso' | 'dsync' | 'audit_logs') => {
        if (!currentProject?.orgId) {
            alert("No organization linked to this project.");
            return;
        }
        try {
            const url = await generatePortalLink({ orgId: currentProject.orgId, intent });
            if (url) window.open(url, '_blank');
        } catch (e) {
            alert("Failed to open Admin Portal. Ensure WorkOS is configured.");
        }
    };




    return (
        <div className="flex bg-[#F9F8F4] min-h-screen font-sans text-stone-900">
            {/* Left Panel - Branding & Info (Desktop) */}
            <div className="hidden lg:flex flex-col w-80 relative overflow-hidden text-white p-8 border-r border-stone-200">
                {/* Full-Bleed Background Image */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/images/us_founder_afam_female.png"
                        alt=""
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-stone-900/60" />
                </div>

                <div className="flex flex-col h-full relative z-10">
                    <button
                        onClick={onBack}
                        className="flex items-center justify-center gap-2 text-white/70 hover:text-white transition-all mb-10 text-[10px] font-bold uppercase tracking-widest bg-white/10 hover:bg-white/20 px-6 py-2.5 rounded-full border border-white/10 hover:border-white/20 shadow-sm w-fit"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
                    </button>

                    <div className="mb-10">
                        <h1 className="font-serif text-4xl font-black text-white mb-3 tracking-tight leading-none">Settings</h1>
                        <p className="text-white/80 text-[13px] leading-relaxed font-medium">
                            Configure your platform experience, manage team permissions, and synchronize external data sources with your Adaptive workspace.
                        </p>
                    </div>

                    <div className="mt-auto pt-8 border-t border-white/10">
                        <div className="flex items-center gap-3 mb-8 p-3 hover:bg-white/10 rounded-2xl transition-colors cursor-pointer group">
                            <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center text-white font-bold group-hover:border-nobel-gold group-hover:text-nobel-gold transition-all">
                                {currentUserRole?.[0] || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-xs uppercase tracking-wider text-white truncate">{currentUserRole || 'User'}</div>
                                <div className="text-[10px] text-white/60 font-medium uppercase tracking-widest">Global Account</div>
                            </div>
                        </div>

                        <button
                            onClick={onLogout}
                            className="w-full flex items-center justify-center gap-2 px-4 py-4 text-[10px] font-bold text-red-300 hover:text-red-100 hover:bg-red-500/20 rounded-xl transition-all uppercase tracking-widest border border-white/10 hover:border-red-500/30 shadow-sm hover:shadow-md"
                        >
                            Sign Out Account
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Panel - Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden bg-white">
                {/* Mobile Header */}
                <div className="lg:hidden p-4 border-b border-stone-200 flex items-center justify-between bg-white">
                    <button onClick={onBack} className="p-2 -ml-2 text-stone-500">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="font-serif font-bold text-lg">Settings</span>
                    <div className="w-8" />
                </div>

                {/* Horizontal Pill Navigation */}
                <div className="px-8 pt-8 pb-4 border-b border-stone-100 bg-white sticky top-0 z-10 w-full overflow-x-auto">
                    <div className="max-w-4xl mx-auto flex items-center gap-2 min-w-max">


                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === 'profile' ? 'bg-stone-900 text-white shadow-md' : 'bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-900'}`}
                        >
                            <User className="w-4 h-4" /> Profile
                        </button>

                        {/* 
                        <button
                            onClick={() => setActiveTab('domains')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === 'domains' ? 'bg-stone-900 text-white shadow-md' : 'bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-900'}`}
                        >
                            <Globe className="w-4 h-4" /> Domains
                        </button>
                        <button
                            onClick={() => setActiveTab('organizations')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === 'organizations' ? 'bg-stone-900 text-white shadow-md' : 'bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-900'}`}
                        >
                            <LayoutGrid className="w-4 h-4" /> Organizations
                        </button> 
                        */}
                        <button
                            onClick={() => setActiveTab('security')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === 'security' ? 'bg-stone-900 text-white shadow-md' : 'bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-900'}`}
                        >
                            <ShieldCheck className="w-4 h-4" /> Security
                        </button>
                        <button
                            onClick={() => setActiveTab('integrations')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === 'integrations' ? 'bg-stone-900 text-white shadow-md' : 'bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-900'}`}
                        >
                            <Plug className="w-4 h-4" /> Integrations
                        </button>
                        <button
                            onClick={() => setActiveTab('branding')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === 'branding' ? 'bg-stone-900 text-white shadow-md' : 'bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-900'}`}
                        >
                            <Paintbrush className="w-4 h-4" /> Branding
                        </button>

                    </div>
                </div>

                {/* Main Content Area */}
                <div
                    className="flex-1 overflow-y-auto p-8 bg-nobel-cream canvas-pattern"
                    style={{ backgroundSize: '24px 24px' }}
                >
                    <div className="max-w-4xl mx-auto pb-20"> {/* Constrained width for readability */}





                        {/* PROFILE TAB */}
                        {activeTab === 'profile' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                                <WorkOSUserProfile />
                            </div>
                        )}

                        {/* SECURITY TAB */}
                        {activeTab === 'security' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
                                <WorkOSUserSecurity />
                                <WorkOSUserSessions />
                            </div>
                        )}

                        {/* INTEGRATIONS TAB */}
                        {activeTab === 'integrations' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                                {currentProject?.orgId && <APIIntegrationsManager orgId={currentProject.orgId} />}
                            </div>
                        )}

                        {/* BRANDING TAB */}
                        {activeTab === 'branding' && currentProject?.orgId && (
                            <BrandingSettings orgId={currentProject.orgId} />
                        )}





                        {/* DOMAINS TAB */}
                        {/* {activeTab === 'domains' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                                <WorkOSDomainVerification orgId={currentProject?.orgId || ''} />
                            </div>
                        )} */}

                        {/* ORGANIZATIONS TAB */}
                        {/* {activeTab === 'organizations' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                                <WorkOSOrganizationSwitcher />
                            </div>
                        )} */}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
