
import React from 'react';
import { Pencil, Rocket, Check, Plus, Trash2, X, LogOut, Loader2, Users, UserMinus, SettingsIcon, ArrowRight, UserPlus, User, ArrowLeft, ChevronRight, ChevronDown, ChevronUp, Mail, Database, Sprout } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { StartupData, CanvasSection, Role, DEFAULT_ROLES, PageAccess } from '../types';
import CustomSelect from './CustomSelect';
import MultiSelect from './MultiSelect';
import { Logo } from './Logo';
import { UnifiedMediaPicker } from './UnifiedMediaPicker';
import { CreateVentureForm } from './CreateVentureForm';
import ReferralModal from './ReferralModal';
import { useOnboardingLogic } from '../hooks/useOnboardingLogic';
import { sanitizeError } from '../lib/sanitizeError';
import { useUser } from '../contexts/UserContext';

interface OnboardingProps {
    onComplete: (name: string, hypothesis: string, foundingDate?: number, logo?: string, inviteEmails?: string[]) => void;
    projects: StartupData[];
    onSwitchProject: (id: string) => void;
    onDeleteProject?: (id: string) => void;
    onOpenSettings: () => void;
    onOpenProjectSettings?: (id: string) => void;
    onUpdateProject?: (updater: (project: StartupData) => StartupData) => void;
    user?: any;
    initialMode?: 'dashboard' | 'create';
    onLogout?: () => void;
    onRequestSubscription?: () => void;
    isLoading?: boolean;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, projects, onSwitchProject, onDeleteProject, onOpenSettings, onOpenProjectSettings, onUpdateProject, user, initialMode, onLogout, onRequestSubscription, isLoading }) => {

    const {
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
        handleLogoSelect,
        handleManageBilling,

        acceptInvitation,
        revokeInvitation,
        saveEditing,
        handleSendInvite
    } = useOnboardingLogic(projects, onComplete, onSwitchProject, onDeleteProject, user, initialMode, isLoading);

    // ─── Org Switcher ───
    const { currentOrgId, switchOrg } = useUser();
    const convexUser = useQuery(api.users.getUser);
    
    // Fall back to Convex user record if the WorkOS JWT lacks org claims (fixes initial white screen bug)
    const allOrgIds = convexUser?.orgIds || (user as any)?.orgIds || [];
    
    const allOrgWorkspaces = useQuery(
        api.ventureWorkspaces.listByOrgIds,
        allOrgIds.length > 0 ? { orgIds: allOrgIds } : "skip"
    );
    const hasLinkedWorkspace = (allOrgWorkspaces?.length ?? 0) > 0;
    // User is in the tenant org if they have at least one orgId in their Convex record
    const isInOrg = allOrgIds.length > 0;

    // Build org options: { orgId, name }
    const orgOptions = React.useMemo(() => {
        if (!allOrgWorkspaces || allOrgIds.length === 0) return [];
        return allOrgIds.map((orgId: string) => {
            const ws = allOrgWorkspaces.find((w: any) => w.parentOrgId === orgId);
            return { orgId, name: ws?.name || orgId.slice(0, 12) };
        }).filter((o: any) => allOrgWorkspaces.some((w: any) => w.parentOrgId === o.orgId));
    }, [allOrgIds, allOrgWorkspaces]);

    const activeOrg = orgOptions.find((o: any) => o.orgId === currentOrgId) || orgOptions[0];
    const resolvedOrgName = activeOrg?.name || (user as any)?.organizationName || null;

    // Org dropdown open state
    const [orgDropdownOpen, setOrgDropdownOpen] = React.useState(false);
    const orgDropdownRef = React.useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    React.useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (orgDropdownRef.current && !orgDropdownRef.current.contains(e.target as Node)) {
                setOrgDropdownOpen(false);
            }
        };
        if (orgDropdownOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [orgDropdownOpen]);

    // Request Access dialog state
    const [showRequestAccess, setShowRequestAccess] = React.useState(false);
    const [requestMessage, setRequestMessage] = React.useState('');
    const [sendingRequest, setSendingRequest] = React.useState(false);

    // Helpers
    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const timeAgo = (date: number) => {
        const seconds = Math.floor((Date.now() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return "Just now";
    };

    // Seed Data
    const seedExample = useMutation(api.seed.seedProject.seedExampleProject);
    const deleteSeed = useMutation(api.seed.seedProject.deleteSeedData);
    const isSeedActive = useQuery(api.seed.seedProject.isSeedActive);
    const [seedPanelOpen, setSeedPanelOpen] = React.useState(false);
    const [seedLogs, setSeedLogs] = React.useState<string[]>([]);
    const [isSeeding, setIsSeeding] = React.useState(false);
    const [isDeletingSeed, setIsDeletingSeed] = React.useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

    const handleSeed = async () => {
        setIsSeeding(true);
        setSeedPanelOpen(true);
        setSeedLogs(['🚀 Starting seed...']);
        try {
            const orgId = user?.orgIds?.[0] || 'default';
            const userId = user?.tokenIdentifier || '';
            setSeedLogs(prev => [...prev, '📦 Creating project & canvas...']);
            setSeedLogs(prev => [...prev, '🎯 Adding OKRs & key results...']);
            setSeedLogs(prev => [...prev, '👥 Adding team members...']);
            setSeedLogs(prev => [...prev, '📋 Adding features (priority matrix)...']);
            setSeedLogs(prev => [...prev, '💰 Adding revenue streams & costs...']);
            setSeedLogs(prev => [...prev, '🗣️ Adding customer interviews...']);
            setSeedLogs(prev => [...prev, '📅 Adding scheduled meetings...']);
            const result = await seedExample({ orgId, userId });
            setSeedLogs(prev => [...prev, `✅ Seed complete! Created "${result.name}"`]);
            toast.success('Example venture loaded!');
        } catch (error: any) {
            setSeedLogs(prev => [...prev, `❌ ${sanitizeError(error)}`]);
            toast.error('Failed to seed data');
        } finally {
            setIsSeeding(false);
        }
    };

    const handleDeleteSeed = async () => {
        setShowDeleteConfirm(false);
        setIsDeletingSeed(true);
        setSeedPanelOpen(true);
        setSeedLogs(['🗑️ Deleting seed data...']);
        try {
            const deleted = await deleteSeed();
            const entries = Object.entries(deleted as Record<string, number>);
            for (const [table, count] of entries) {
                setSeedLogs(prev => [...prev, `  🧹 ${table}: ${count} records removed`]);
            }
            setSeedLogs(prev => [...prev, '✅ Seed data fully removed!']);
            toast.success('Seed data deleted');
        } catch (error: any) {
            setSeedLogs(prev => [...prev, `❌ ${sanitizeError(error)}`]);
            toast.error('Failed to delete seed data');
        } finally {
            setIsDeletingSeed(false);
        }
    };

    // Derived states for UI
    const [selectedPages, setSelectedPages] = React.useState<string[]>([]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9F8F4] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                <Loader2 className="w-8 h-8 animate-spin text-stone-300 mb-4" />
                <p className="font-serif italic text-stone-400">Loading your ventures...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#F9F8F4] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] text-nobel-dark selection:bg-nobel-gold selection:text-white">

            {/* Header - Hidden in Create Mode */}
            {mode !== 'create' && (
                <header className="px-6 py-6 flex justify-between items-center bg-[#F9F8F4]/90 backdrop-blur-md sticky top-0 z-30 transition-all duration-300 border-b border-stone-200/50">
                    {/* Left: Logo + Invite */}
                    <div className="flex items-center gap-4">
                        <div className="cursor-pointer" onClick={() => setMode('dashboard')}>
                            <Logo className="flex items-center gap-3" imageClassName="h-16 w-auto rounded-lg" textClassName="font-serif font-bold text-lg tracking-wide text-stone-900" />
                        </div>


                    </div>

                    {/* Right: User Profile */}
                    <div className="flex items-center gap-4 text-sm font-medium tracking-wide text-stone-600">
                        {user && (
                            <div className="relative">
                                <div
                                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                    <div className="text-right hidden sm:block">
                                        <div className="text-xs font-bold text-stone-900 flex items-center justify-end gap-1">
                                            {user.name}
                                            {(user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing') && (
                                                <span className="bg-nobel-gold text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold tracking-wider">PRO</span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-stone-400 uppercase tracking-wider">{(user.role?.toLowerCase() === "user" || !user.role) ? "Founder" : user.role}</div>
                                    </div>
                                    {user.pictureUrl ? (
                                        <img src={user.pictureUrl} alt={user.name} className="w-8 h-8 rounded-full border border-white shadow-sm object-cover" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-500 border border-white shadow-sm">
                                            {getInitials(user.name || "User")}
                                        </div>
                                    )}
                                </div>

                                {/* Dropdown Menu */}
                                {showProfileDropdown && (
                                    <div className="absolute top-12 right-0 bg-white rounded-xl shadow-xl border border-stone-100 py-2 w-48 z-50 animate-in fade-in zoom-in-95 duration-200">
                                        <button
                                            onClick={() => {
                                                onOpenSettings();
                                                setShowProfileDropdown(false);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2 transition-colors"
                                        >
                                            <SettingsIcon className="w-4 h-4" /> Settings
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (onLogout) onLogout();
                                                setShowProfileDropdown(false);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                        >
                                            <LogOut className="w-4 h-4" /> Logout
                                        </button>
                                    </div>
                                )}

                                {/* Backdrop to close */}
                                {showProfileDropdown && (
                                    <div
                                        className="fixed inset-0 z-40 bg-transparent"
                                        onClick={() => setShowProfileDropdown(false)}
                                    ></div>
                                )}
                            </div>
                        )}
                    </div>
                </header>
            )}

            <div className="flex-grow flex flex-col items-center p-6 pb-20">

                {/* DASHBOARD VIEW — ventures are created from the Customer Portal */}
                {mode === 'dashboard' && (
                    <>
                        {/* DASHBOARD VIEW */}
                        <div className="w-full max-w-7xl mt-12 animate-fade-in-up">
                            <div className="text-center mb-16">
                                <div className="inline-block mb-3 text-xs font-bold tracking-[0.2em] text-stone-500 uppercase">PORTFOLIO</div>
                                <h1 className="font-serif text-4xl md:text-5xl mb-6 text-stone-900">Your Startups</h1>
                                <div className="w-16 h-1 bg-nobel-gold mx-auto opacity-60"></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">



                                {/* Existing Projects - AuthorCard Style */}
                                {[...projects].sort((a, b) => b.lastModified - a.lastModified).map((project, i) => {
                                    if (project.isPending) {
                                        return (
                                            <div
                                                key={project.id}
                                                className="flex flex-col relative group p-8 bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-lg transition-all duration-300 h-72 cursor-default hover:border-nobel-gold/50"
                                                style={{ animationDelay: (i * 0.1) + 's' }}
                                            >
                                                <div className="absolute top-4 right-4 animate-pulse">
                                                    <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-1 rounded-full border border-yellow-200">
                                                        EXTERNAL INVITE
                                                    </span>
                                                </div>

                                                <div className="flex-grow flex flex-col items-center text-center justify-center">
                                                    <h3 className="font-serif text-2xl text-stone-900 mb-3 line-clamp-2" title={project.invitationData?.orgName}>
                                                        {project.invitationData?.orgName || "New Organization"}
                                                    </h3>
                                                    <div className="w-8 h-0.5 bg-nobel-gold mb-4 opacity-40 group-hover:opacity-100 transition-opacity"></div>
                                                    <p className="text-xs text-stone-500 font-bold uppercase tracking-widest mb-2 leading-relaxed">
                                                        You found a new invite!
                                                    </p>
                                                    <p className="text-xs text-stone-400 italic mb-6">
                                                        Invited by {project.invitationData?.inviterName || "a team member"}
                                                    </p>

                                                    <div className="flex gap-3">
                                                        <button
                                                            disabled={processingInvite === project.invitationData?.id}
                                                            onClick={async () => {
                                                                if (project.invitationData?.id) {
                                                                    setProcessingInvite(project.invitationData.id);
                                                                    try {
                                                                        await acceptInvitation({ invitationId: project.invitationData.id });
                                                                    } catch (e) {
                                                                        alert("Failed to accept: " + e);
                                                                        setProcessingInvite(null);
                                                                    }
                                                                } else if (project.invitationData?.acceptUrl) {
                                                                    alert("This invitation is too old to be accepted here. Please ask the admin to delete it and send you a NEW invitation.");
                                                                } else {
                                                                    alert("Invalid invitation data. Please request a new invitation.");
                                                                }
                                                            }}
                                                            className={`px-6 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-green-600 transition-colors shadow-lg ${processingInvite === project.invitationData?.id ? 'opacity-50 cursor-wait' : ''} `}
                                                        >
                                                            {processingInvite === project.invitationData?.id ? 'Processing...' : 'Approve'}
                                                        </button>
                                                        <button
                                                            disabled={processingInvite === project.invitationData?.id}
                                                            onClick={async () => {
                                                                if (project.invitationData?.id) {
                                                                    try {
                                                                        if (confirm("Are you sure you want to decline this invitation?")) {
                                                                            setProcessingInvite(project.invitationData.id);
                                                                            await revokeInvitation({ invitationId: project.invitationData.id });
                                                                        }
                                                                    } catch (e) {
                                                                        alert("Failed to decline: " + e);
                                                                        setProcessingInvite(null);
                                                                    }
                                                                } else {
                                                                    alert("To deny, please ignore the invite or contact support.");
                                                                }
                                                            }}
                                                            className={`px-6 py-2 bg-stone-100 text-stone-500 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-50 hover:text-red-600 transition-colors ${processingInvite === project.invitationData?.id ? 'opacity-50 cursor-wait' : ''} `}
                                                        >
                                                            Deny
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div
                                            key={project.id}
                                            onClick={() => onSwitchProject(project.id)}
                                            className="flex flex-col relative group p-8 bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-lg transition-all duration-300 h-72 cursor-pointer hover:border-nobel-gold/50"
                                            style={{ animationDelay: (i * 0.1) + 's' }}
                                        >
                                            {/* Role Badge */}
                                            <div className="absolute top-4 left-4 z-20">
                                                {(() => {
                                                    const myRole = project.teamMembers?.find((m: any) => m.email === user?.email)?.role || 'Member';
                                                    const isOwner = ['Founder', 'Admin', 'admin'].includes(myRole);
                                                    const displayRole = isOwner ? 'Admin' : 'Member';
                                                    return (
                                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border tracking-wider uppercase ${isOwner
                                                            ? 'bg-stone-900 text-white border-stone-900'
                                                            : 'bg-white text-stone-500 border-stone-200'
                                                            }`}>
                                                            {displayRole}
                                                        </span>
                                                    );
                                                })()}
                                            </div>

                                            {/* Settings / Delete Actions (Founder/Admin only) */}
                                            {(() => {
                                                const myRole = project.teamMembers?.find((m: any) => m.email === user?.email)?.role || 'Member';
                                                const canManage = ['Founder', 'Admin', 'admin'].includes(myRole);

                                                if (canManage) {
                                                    return (
                                                        <div className="absolute top-4 right-4 flex gap-1 transition-opacity z-20">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (onOpenProjectSettings) onOpenProjectSettings(project.id);
                                                                }}
                                                                className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors"
                                                                title="Project Settings"
                                                            >
                                                                <SettingsIcon className="w-4 h-4" />
                                                            </button>
                                                            {['Founder', 'Admin', 'admin'].includes(myRole) && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setProjectToDelete(project.id);
                                                                    }}
                                                                    className="p-2 text-stone-500 hover:text-red-500 hover:bg-stone-100 rounded-full transition-colors"
                                                                    title="Delete Project"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                } else {
                                                    // Member - Leave button
                                                    return (
                                                        <div className="absolute top-4 right-4 flex gap-1 transition-opacity z-20">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setProjectToLeave(project.id);
                                                                }}
                                                                className="p-2 text-stone-300 hover:text-red-500 hover:bg-stone-50 rounded-full transition-colors"
                                                                title="Leave Project"
                                                            >
                                                                <UserMinus className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    );
                                                }
                                            })()
                                            }

                                            <div className="flex-grow flex flex-col items-center text-center">
                                                <div className="flex items-center gap-4 mb-6">
                                                    {(project as any).logo && (
                                                        <div className="w-16 h-16 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center p-2 flex-shrink-0 shadow-sm">
                                                            <img src={(project as any).logo} alt="Logo" className="w-full h-full object-contain" />
                                                        </div>
                                                    )}
                                                    <h3 className="font-serif text-2xl text-stone-900 line-clamp-2 text-left">{project.name}</h3>
                                                </div>
                                                <div className="w-8 h-0.5 bg-nobel-gold mb-4 opacity-40 group-hover:opacity-100 transition-opacity"></div>
                                                <p className="text-xs text-stone-500 font-bold uppercase tracking-widest mb-6 leading-relaxed line-clamp-3">
                                                    {project.hypothesis || "No hypothesis defined"}
                                                </p>

                                                {/* Team Avatars */}
                                                <div className="flex -space-x-2 mb-4">
                                                    {(project.teamMembers || []).slice(0, 4).map((m, idx) => (
                                                        <div key={idx} className="w-6 h-6 rounded-full bg-stone-100 border border-white flex items-center justify-center text-[8px] font-bold text-stone-600 overflow-hidden" title={`${m.name} (${m.role})`}>
                                                            {m.pictureUrl ? (
                                                                <img src={m.pictureUrl} alt={m.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                getInitials(m.name)
                                                            )}
                                                        </div>
                                                    ))}
                                                    {(project.teamMembers?.length || 0) > 4 && (
                                                        <div className="w-6 h-6 rounded-full bg-stone-200 border border-white flex items-center justify-center text-[8px] font-bold text-stone-500">
                                                            +{project.teamMembers.length - 4}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {
                                                (user?.role === 'Founder' || user?.role === 'Admin') && (
                                                    <div className="absolute bottom-4 right-4">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingProject(project);
                                                                setEditName(project.name);
                                                                setEditHypothesis(project.hypothesis || '');
                                                                setEditFoundingYear(project.foundingDate ? new Date(project.foundingDate).getFullYear().toString() : new Date(project.createdAt).getFullYear().toString());
                                                                setEditLogo((project as any).logoStorageId || (project as any).logo || '');
                                                                setEditLogoPreview((project as any).logo || '');
                                                            }}
                                                            className="bg-stone-900 text-white p-2 rounded-full transition-all hover:bg-nobel-gold"
                                                            title="Edit Startup"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )
                                            }
                                        </div>
                                    );
                                })}

                                {/* Create New Venture Card — only show when ventures already exist */}
                                {canCreate && projects.length > 0 && (
                                    <button
                                        onClick={() => setMode('create')}
                                        className="flex flex-col items-center justify-center relative group p-8 bg-white/50 rounded-xl border-2 border-dashed border-stone-200 hover:border-nobel-gold/60 hover:bg-white transition-all duration-300 h-72 cursor-pointer"
                                    >
                                        <div className="w-14 h-14 rounded-full bg-stone-100 group-hover:bg-nobel-gold/10 flex items-center justify-center mb-4 transition-colors duration-300">
                                            <Plus className="w-6 h-6 text-stone-400 group-hover:text-nobel-gold transition-colors duration-300" />
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-stone-400 group-hover:text-stone-600 transition-colors">
                                            Create Venture
                                        </span>
                                    </button>
                                )}
                            </div>

                            {projects.length === 0 && mode === 'dashboard' && (
                                <div className="flex flex-col items-center justify-center py-16 px-8 animate-fade-in-up">
                                    {/* Hero Image with White Border - Tilted */}
                                    <div className="relative mb-8">
                                        <div className="w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden border-4 border-white shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-300">
                                            <img
                                                src="/images/Team.png"
                                                alt="Join a team"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-nobel-gold/10 rounded-full blur-2xl"></div>
                                        <div className="absolute -top-4 -left-4 w-16 h-16 bg-stone-200/50 rounded-full blur-xl"></div>
                                    </div>

                                    {/* Text */}
                                    <div className="text-center max-w-lg">
                                        <div className="inline-block mb-4 px-3 py-1 border border-nobel-gold text-nobel-gold text-xs tracking-[0.2em] uppercase font-bold rounded-full">
                                            Venture Portfolio
                                        </div>
                                        <h2 className="font-serif text-3xl md:text-4xl text-stone-900 mb-4">
                                            Your Adventure <span className="italic text-stone-500">Awaits</span>
                                        </h2>
                                        <p className="text-stone-500 text-lg leading-relaxed mb-8">
                                            {!isInOrg
                                                ? "You're not part of a workspace yet. Request access from your admin to get started."
                                                : canCreate
                                                    ? "Launch your first venture to get started."
                                                    : "You don't have any ventures yet. Once an admin creates a workspace and invites you, your ventures will appear here."
                                            }
                                        </p>
                                        {/* Not in any org → Request Access */}
                                        {!isInOrg && (
                                            <button
                                                onClick={() => setShowRequestAccess(true)}
                                                className="inline-flex items-center gap-2 px-8 py-4 bg-stone-900 text-white rounded-full font-bold uppercase tracking-wider text-xs hover:bg-nobel-gold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform duration-200"
                                            >
                                                <Mail className="w-4 h-4" /> Request Access
                                            </button>
                                        )}
                                        {/* In org, can create → Create Venture button */}
                                        {isInOrg && canCreate && (
                                            <button
                                                onClick={() => setMode('create')}
                                                className="inline-flex items-center gap-2 px-8 py-4 bg-stone-900 text-white rounded-full font-bold uppercase tracking-wider text-xs hover:bg-nobel-gold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform duration-200"
                                            >
                                                <Plus className="w-4 h-4" /> Create Venture
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* CREATE VENTURE MODE */}
                {mode === 'create' && (
                    <CreateVentureForm
                        onComplete={(n: string, h: string, fd: number, ie?: string[]) =>
                            onComplete(n, h, fd, undefined, ie)
                        }
                        onBack={() => setMode('dashboard')}
                        user={user}
                        projects={projects}
                    />
                )}

                {/* Invite Modal */}
                {showInviteModal && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
                            <div className="bg-stone-50 px-6 py-4 border-b border-stone-100 flex justify-between items-center rounded-t-xl">
                                <div className="flex items-center gap-2">
                                    <UserPlus className="w-5 h-5 text-nobel-gold" />
                                    <h3 className="font-serif text-xl text-stone-900">Invite Team</h3>
                                </div>
                                <button onClick={() => setShowInviteModal(false)} className="text-stone-400 hover:text-stone-900"><X className="w-5 h-5" /></button>
                            </div>

                            <div className="p-6 space-y-4">
                                {projects.length === 0 ? (
                                    <div className="text-center py-6 text-stone-500">
                                        <p className="mb-4">Create a project first to invite members.</p>
                                        <button onClick={() => { setShowInviteModal(false); setMode('create'); }} className="text-nobel-gold font-bold underline">Create Project</button>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Select Project</label>
                                            <CustomSelect
                                                value={activeProjectIdForInvite || ''}
                                                onChange={setActiveProjectIdForInvite}
                                                options={projects.map(p => ({ label: p.name, value: p.id }))}
                                                placeholder="Choose a project..."
                                            />
                                        </div>

                                        {activeProjectIdForInvite && (
                                            <>
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Name</label>
                                                    <input
                                                        type="text"
                                                        value={newMemberName}
                                                        onChange={(e) => setNewMemberName(e.target.value)}
                                                        className="w-full p-2 border border-stone-200 rounded font-sans text-sm"
                                                        placeholder="John Doe"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Email</label>
                                                    <input
                                                        type="email"
                                                        value={newMemberEmail}
                                                        onChange={(e) => setNewMemberEmail(e.target.value)}
                                                        className="w-full p-2 border border-stone-200 rounded font-sans text-sm"
                                                        placeholder="john@example.com"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Role</label>
                                                    <CustomSelect
                                                        value={newMemberRole}
                                                        onChange={(val) => {
                                                            setNewMemberRole(val);
                                                            // Auto-populate pages based on role default
                                                            const roleDef = DEFAULT_ROLES.find(r => r.name === val);
                                                            if (roleDef) {
                                                                setSelectedPages(roleDef.allowedPages);
                                                            }
                                                        }}
                                                        options={DEFAULT_ROLES.map(r => ({ label: r.name, value: r.name }))}
                                                    />
                                                </div>

                                                <div>
                                                    <MultiSelect
                                                        label="Page Access"
                                                        options={Object.values(PageAccess).map(p => ({ label: p, value: p }))}
                                                        selectedValues={selectedPages}
                                                        onChange={setSelectedPages}
                                                        placeholder="Select pages..."
                                                    />
                                                </div>

                                                <div className="bg-stone-50 p-3 rounded text-xs text-stone-500 italic mt-2">
                                                    Tip: Investors invited here can be assigned to SAFE agreements in the Cap Table view.
                                                </div>

                                                <button
                                                    onClick={() => handleSendInvite(selectedPages)}
                                                    disabled={!newMemberEmail || !!processingInvite}
                                                    className="w-full py-3 bg-stone-900 text-white rounded-lg font-bold uppercase tracking-wider text-xs hover:bg-nobel-gold transition-colors disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                                                >
                                                    {processingInvite ? (
                                                        <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                                                    ) : (
                                                        <><Mail className="w-4 h-4" /> Send Invite</>
                                                    )}
                                                </button>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {projectToDelete && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 text-center">
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                                    <Trash2 className="w-6 h-6" />
                                </div>
                                <h3 className="font-serif text-xl text-stone-900 mb-2">Delete Project?</h3>
                                <p className="text-stone-500 text-sm mb-6">
                                    Are you sure you want to delete <span className="font-bold text-stone-900">{projects.find(p => p.id === projectToDelete)?.name}</span>? This action cannot be undone.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setProjectToDelete(null)}
                                        className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-lg font-bold uppercase tracking-wider text-xs hover:bg-stone-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (onDeleteProject) onDeleteProject(projectToDelete);
                                            setProjectToDelete(null);
                                        }}
                                        className="flex-1 py-3 bg-red-600 text-white rounded-lg font-bold uppercase tracking-wider text-xs hover:bg-red-700 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Leave Confirmation Modal */}
                {projectToLeave && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 text-center">
                                <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-600">
                                    <UserMinus className="w-6 h-6" />
                                </div>
                                <h3 className="font-serif text-xl text-stone-900 mb-2">Leave Project?</h3>
                                <p className="text-stone-500 text-sm mb-6">
                                    Are you sure you want to leave <span className="font-bold text-stone-900">{projects.find(p => p.id === projectToLeave)?.name}</span>? You will lose access to this project.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setProjectToLeave(null)}
                                        disabled={isLeaving}
                                        className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-lg font-bold uppercase tracking-wider text-xs hover:bg-stone-200 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleLeaveProject}
                                        disabled={isLeaving}
                                        className="flex-1 py-3 bg-stone-900 text-white rounded-lg font-bold uppercase tracking-wider text-xs hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isLeaving ? 'Leaving...' : 'Leave Project'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Startup Sheet */}
                {editingProject && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
                            onClick={() => setEditingProject(null)}
                        ></div>

                        {/* Side Sheet */}
                        <div className="fixed top-0 right-0 h-full w-full max-w-md bg-stone-950 border-l border-stone-800 shadow-2xl z-50 animate-in slide-in-from-right duration-300">
                            <div className="h-full flex flex-col">
                                {/* Header */}
                                <div className="bg-stone-900/50 px-6 py-4 border-b border-stone-800 backdrop-blur flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-nobel-gold rounded-full flex items-center justify-center text-white">
                                            <Pencil className="w-4 h-4" />
                                        </div>
                                        <h3 className="font-serif text-xl text-white">Edit Startup</h3>
                                    </div>
                                    <button
                                        onClick={() => setEditingProject(null)}
                                        className="text-stone-500 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="flex-grow p-6 space-y-6 overflow-y-auto">

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">
                                            Startup Name
                                        </label>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            placeholder="e.g. Acme AI"
                                            className="w-full px-4 py-3 bg-stone-900 border border-stone-800 rounded-lg focus:border-nobel-gold focus:ring-0 outline-none transition-colors text-lg font-serif text-white placeholder-stone-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">
                                            Founded Year
                                        </label>
                                        <input
                                            type="number"
                                            value={editFoundingYear}
                                            onChange={(e) => setEditFoundingYear(e.target.value)}
                                            className="w-full px-4 py-3 bg-stone-900 border border-stone-800 rounded-lg focus:border-nobel-gold focus:ring-0 outline-none transition-colors text-lg font-serif text-white placeholder-stone-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">
                                            Value Proposition
                                        </label>
                                        <textarea
                                            value={editHypothesis}
                                            onChange={(e) => setEditHypothesis(e.target.value)}
                                            placeholder="We help [Target Audience] solve [Problem] by [Solution] with [Secret Sauce]."
                                            className="w-full px-4 py-4 bg-stone-900 border border-stone-800 rounded-lg focus:border-stone-600 focus:ring-0 outline-none transition-all text-base text-stone-300 font-light leading-relaxed h-40 resize-none placeholder-stone-500"
                                        />
                                    </div>

                                    {/* Invite Team Members */}
                                    <div className="border-t border-stone-800 pt-6">
                                        <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-1">
                                            <UserPlus className="w-3 h-3 inline mr-1" />
                                            Invite Team Members
                                        </label>
                                        <p className="text-xs text-stone-400 mb-3">
                                            Send an invite to join this startup.
                                        </p>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Name</label>
                                                <input
                                                    type="text"
                                                    value={newMemberName}
                                                    onChange={(e) => setNewMemberName(e.target.value)}
                                                    placeholder="John Doe"
                                                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg focus:border-nobel-gold outline-none transition-colors text-sm text-white placeholder-stone-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Email</label>
                                                <input
                                                    type="email"
                                                    value={newMemberEmail}
                                                    onChange={(e) => setNewMemberEmail(e.target.value)}
                                                    placeholder="john@example.com"
                                                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg focus:border-nobel-gold outline-none transition-colors text-sm text-white placeholder-stone-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Role</label>
                                                <CustomSelect
                                                    value={newMemberRole}
                                                    onChange={(val) => {
                                                        setNewMemberRole(val);
                                                        const roleDef = DEFAULT_ROLES.find(r => r.name === val);
                                                        if (roleDef) {
                                                            setSelectedPages(roleDef.allowedPages);
                                                        }
                                                    }}
                                                    options={DEFAULT_ROLES.map(r => ({ label: r.name, value: r.name }))}
                                                />
                                            </div>

                                            {/* Page Access Accordion */}
                                            <details className="group">
                                                <summary className="flex items-center justify-between cursor-pointer py-2 px-3 bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors text-[10px] font-bold uppercase tracking-wider text-stone-400 list-none">
                                                    <span>Page Access</span>
                                                    <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
                                                </summary>
                                                <div className="pt-3 space-y-3">
                                                    <MultiSelect
                                                        label=""
                                                        options={Object.values(PageAccess).map(p => ({ label: p, value: p }))}
                                                        selectedValues={selectedPages}
                                                        onChange={setSelectedPages}
                                                        placeholder="Select pages..."
                                                    />
                                                    <div className="bg-stone-900/50 p-3 rounded text-xs text-stone-400 italic">
                                                        Tip: Investors invited here can be assigned to SAFE agreements in the Cap Table view.
                                                    </div>
                                                </div>
                                            </details>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActiveProjectIdForInvite(editingProject.id);
                                                    handleSendInvite(selectedPages);
                                                }}
                                                disabled={!newMemberEmail || !!processingInvite}
                                                className="w-full py-2.5 bg-white text-stone-900 rounded-lg font-bold uppercase tracking-wider text-xs hover:bg-stone-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {processingInvite ? (
                                                    <><Loader2 className="w-3 h-3 animate-spin" /> Sending...</>
                                                ) : (
                                                    <><Mail className="w-3 h-3" /> Send Invite</>
                                                )}
                                            </button>
                                        </div>

                                        {/* Team Members & Invite Status */}
                                        {editingProject.teamMembers && editingProject.teamMembers.length > 0 && (
                                            <div className="mt-4">
                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">Team &amp; Invites</label>
                                                <div className="space-y-1.5">
                                                    {editingProject.teamMembers.map((m: any, idx: number) => {
                                                        const status = m.status || (m.acceptedRole ? 'Active' : 'Pending');
                                                        const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
                                                            Active: { bg: 'bg-emerald-950/30 border-emerald-900/50', text: 'text-emerald-500', dot: 'bg-emerald-500' },
                                                            Pending: { bg: 'bg-amber-950/30 border-amber-900/50', text: 'text-amber-500', dot: 'bg-amber-500' },
                                                            Revoked: { bg: 'bg-red-950/30 border-red-900/50', text: 'text-red-500', dot: 'bg-red-500' },
                                                        };
                                                        const config = statusConfig[status] || statusConfig.Pending;

                                                        return (
                                                            <div key={idx} className="flex items-center gap-2 bg-stone-900 px-3 py-2.5 rounded-lg text-xs border border-stone-800">
                                                                <div className="w-6 h-6 rounded-full bg-stone-800 flex items-center justify-center text-[9px] font-bold text-stone-400 flex-shrink-0 overflow-hidden">
                                                                    {m.pictureUrl ? (
                                                                        <img src={m.pictureUrl} alt={m.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        m.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-white font-medium truncate">{m.name}</div>
                                                                    <div className="text-[10px] text-stone-400 truncate">{m.email}</div>
                                                                </div>
                                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                                    <span className="text-stone-400 text-[10px] uppercase tracking-wider">{m.role}</span>
                                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${config.bg} ${config.text}`}>
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
                                                                        {status}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="px-6 py-4 border-t border-stone-800 bg-stone-900/50 flex gap-3">
                                    <button
                                        onClick={() => setEditingProject(null)}
                                        className="flex-1 py-3 bg-stone-800 text-stone-300 rounded-lg font-bold uppercase tracking-wider text-xs hover:bg-stone-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={saveEditing}
                                        disabled={!editName.trim()}
                                        className="flex-1 py-3 bg-white text-stone-900 rounded-lg font-bold uppercase tracking-wider text-xs hover:bg-stone-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-4 h-4" /> Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Media Picker */}
                {activeLogoPicker && (
                    <UnifiedMediaPicker
                        onSelect={handleLogoSelect}
                        onClose={() => setActiveLogoPicker(null)}
                        initialSearchTerm="abstract background"
                    />
                )}

                {/* Referral Modal - removed
                {showReferralModal && (
                    <ReferralModal
                        onClose={() => setShowReferralModal(false)}
                        user={user}
                    />
                )}
                */}

            </div>
            {/* ─── Bottom-Left Pill: Back to Portfolio / Org Badge ─── */}
            {user && (
                <div className="fixed bottom-6 left-6 z-30 animate-fade-in-up" ref={orgDropdownRef}>
                    {/* Dropdown menu — slides up (only on dashboard) */}
                    {mode === 'dashboard' && orgDropdownOpen && orgOptions.length > 1 && (
                        <div className="absolute bottom-full left-0 mb-2 w-64 bg-white/95 backdrop-blur-xl border border-stone-200/80 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
                            <div className="px-3 py-2 border-b border-stone-100">
                                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-stone-400">Switch Organization</span>
                            </div>
                            <div className="py-1 max-h-48 overflow-y-auto">
                                {orgOptions.map((org: any) => (
                                    <button
                                        key={org.orgId}
                                        onClick={() => {
                                            switchOrg(org.orgId);
                                            setOrgDropdownOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all duration-150 ${
                                            org.orgId === currentOrgId
                                                ? 'bg-stone-100/80 text-stone-900'
                                                : 'hover:bg-stone-50 text-stone-600 hover:text-stone-900'
                                        }`}
                                    >
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold ${
                                            org.orgId === currentOrgId
                                                ? 'bg-gradient-to-br from-nobel-gold to-yellow-600'
                                                : 'bg-gradient-to-br from-stone-600 to-stone-700'
                                        }`}>
                                            {org.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-xs font-medium truncate">{org.name}</span>
                                        {org.orgId === currentOrgId && (
                                            <Check className="w-3.5 h-3.5 text-nobel-gold ml-auto flex-shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Main pill — context aware */}
                    {mode !== 'dashboard' ? (
                        /* Back button when inside create form or venture view */
                        <button
                            onClick={() => setMode('dashboard')}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-md border border-stone-200/60 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer"
                        >
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center flex-shrink-0 group-hover:from-nobel-gold group-hover:to-yellow-600 transition-all duration-300">
                                <ArrowLeft className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="text-xs font-semibold text-stone-700">
                                Back to Portfolio
                            </span>
                        </button>
                    ) : (
                        /* Org badge on dashboard */
                        <button
                            onClick={() => orgOptions.length > 1 ? setOrgDropdownOpen(!orgDropdownOpen) : undefined}
                            className={`flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-md border border-stone-200/60 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group ${
                                orgOptions.length > 1 ? 'cursor-pointer' : 'cursor-default'
                            }`}
                        >
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center flex-shrink-0 group-hover:from-nobel-gold group-hover:to-yellow-600 transition-all duration-300">
                                <Sprout className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-stone-400 leading-none">Organization</span>
                                <span className="text-xs font-semibold text-stone-700 leading-tight truncate max-w-[180px]">
                                    {resolvedOrgName || 'Workspace'}
                                </span>
                            </div>
                            {orgOptions.length > 1 && (
                                orgDropdownOpen
                                    ? <ChevronDown className="w-3.5 h-3.5 text-stone-400 ml-1" />
                                    : <ChevronUp className="w-3.5 h-3.5 text-stone-400 ml-1" />
                            )}
                        </button>
                    )}
                </div>
            )}
            {/* ─── Request Access Dialog ─── */}
            {showRequestAccess && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-stone-900">Request Workspace Access</h3>
                                <button onClick={() => { setShowRequestAccess(false); setRequestMessage(''); }} className="p-1 rounded-full hover:bg-stone-100 transition-colors">
                                    <X className="w-5 h-5 text-stone-400" />
                                </button>
                            </div>
                            <p className="text-sm text-stone-500 mb-4">Send a message to your administrator requesting workspace access.</p>
                            <div className="mb-2">
                                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">From</label>
                                <p className="text-sm text-stone-700">{user?.name || user?.email || 'You'} ({user?.email})</p>
                            </div>
                            <div className="mb-4">
                                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Message</label>
                                <textarea
                                    value={requestMessage}
                                    onChange={(e) => setRequestMessage(e.target.value)}
                                    placeholder="Hi, I'd like to be added to a workspace..."
                                    rows={4}
                                    className="mt-1 w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-nobel-gold/50 focus:border-nobel-gold resize-none"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowRequestAccess(false); setRequestMessage(''); }}
                                    className="flex-1 px-4 py-2.5 border border-stone-200 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={sendingRequest || !requestMessage.trim()}
                                    onClick={async () => {
                                        setSendingRequest(true);
                                        try {
                                            const res = await fetch('/api/auth/request-access', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    name: user?.name || user?.email || 'A user',
                                                    email: user?.email || '',
                                                    message: requestMessage.trim(),
                                                }),
                                            });
                                            if (res.ok) {
                                                toast.success('Request sent! Your admin will be notified.');
                                                setShowRequestAccess(false);
                                                setRequestMessage('');
                                            } else {
                                                const data = await res.json().catch(() => ({}));
                                                toast.error(data.error || 'Failed to send request. Please try again.');
                                            }
                                        } catch {
                                            toast.error('Network error. Please try again.');
                                        } finally {
                                            setSendingRequest(false);
                                        }
                                    }}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-900 text-white rounded-lg text-sm font-bold hover:bg-nobel-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sendingRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                    {sendingRequest ? 'Sending...' : 'Send Request'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* <DebugControlPanel /> */}
        </div >
    );
};

export default Onboarding;