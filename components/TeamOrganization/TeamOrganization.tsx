import React, { useState, useEffect } from 'react';
import { StartupData, TeamMember, AISettings, ViewState, OrganizationDetails, DEFAULT_ROLES, RoleDefinition, RolePermissions } from '../../types';
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSyncOrganizationMembers, useSendInvite, useAddSeats, useRevokeInvite, useResendInvite, useRemoveTeamMember } from '../../hooks/useActions';
import { useCreateTeamMember, useCreateRole, useCreateLegalDocument, useGenerateUploadUrl } from '../../hooks/useCreate';
import { useUpdateBusinessStructure, useUpdateOrganizationDetails, useUpdateTeamMember, useUpdateRole } from '../../hooks/useUpdate';
import { useDeleteTeamMember, useDeleteRole, useDeleteLegalDocument } from '../../hooks/useDelete';
import { Plus, Trash2, Building2, User, Check, X, Edit2, FileText, ShieldCheck, Lock, Award, ChevronDown, Mail, RefreshCw, Layout, Settings, Folder, CreditCard, LogOut } from 'lucide-react';
import ProjectSelector from '../ProjectSelector';
import TabNavigation, { TABS } from '../TabNavigation';
import { toast } from "sonner";
import { TeamMemberTable } from '../TeamMemberTable';
import CustomSelect from '../CustomSelect';

import { Logo } from '../Logo';
import { FileSelector } from '../Ideation/FileSelector';

import { MemberDetailSheet } from '../MemberDetailSheet';

interface TeamOrganizationProps {
    data: StartupData;
    allProjects: StartupData[];
    onUpdateProject: (updater: (project: StartupData) => StartupData) => void;
    onSwitchProject: (id: string) => void;
    onNewProject: () => void;
    onNavigate: (view: ViewState) => void;
    currentView: ViewState;
    settings: AISettings;
    allowedPages?: string[];
    currentUserRole?: string;
    permissions?: RolePermissions;
    user?: { name: string; email: string; pictureUrl?: string } | null;
    onLogout?: () => void;
}

const BUSINESS_STRUCTURES = [
    { id: 'Sole Proprietorship', label: 'Sole Proprietorship', description: 'Simplest form, owned by one person.' },
    { id: 'Partnership', label: 'Partnership', description: 'Owned by two or more people.' },
    { id: 'LLC', label: 'LLC', description: 'Limited Liability Company. Protects personal assets.' },
    { id: 'C-Corp', label: 'C-Corp', description: 'Standard for venture-backed startups.' },
    { id: 'S-Corp', label: 'S-Corp', description: 'Pass-through taxation entity.' },
    { id: 'Non-Profit', label: 'Non-Profit', description: 'Organization for public benefit.' },
];

const LEGAL_DOCS_LIST = [
    'Business Registration',
    'EIN Number',
    'Operating Agreement',
    'Bylaws',
    'Stock Purchase Agreements',
    'IP Assignment Agreements'
];

const GOV_CONTRACTING_LIST = [
    'SAM Registration',
    'SBIR Registration',
    'SBA Business Registration'
];

const COMPLIANCE_LIST = [
    'Terms of Service',
    'Privacy Policy',
    'SOC2',
    'HIPAA',
    'GDPR'
];

interface AccordionSectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    tags?: string[];
}

const AccordionSection: React.FC<AccordionSectionProps> = ({ title, icon, children, tags = [] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const hasTags = tags.length > 0;

    return (
        <div className={`rounded-xl border transition-all relative ${isOpen ? 'z-30' : ''} ${hasTags ? 'bg-stone-900 border-stone-800' : 'bg-stone-900/50 border-stone-800'}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 flex items-center justify-between"
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`${hasTags ? 'text-white' : 'text-stone-400'}`}>
                        {icon}
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                        <span className={`text-sm font-bold uppercase tracking-wider truncate ${hasTags ? 'text-white' : 'text-stone-400'}`}>
                            {title}
                        </span>
                        {hasTags && !isOpen && (
                            <div className="flex gap-1 mt-1 overflow-hidden max-w-full">
                                {tags.slice(0, 2).map((tag, i) => (
                                    <span key={i} className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded truncate max-w-[100px]">
                                        {tag}
                                    </span>
                                ))}
                                {tags.length > 2 && (
                                    <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded">
                                        +{tags.length - 2}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${hasTags ? 'text-white' : 'text-stone-400'} `}>
                    <ChevronDown className="w-4 h-4" />
                </div>
            </button>

            {isOpen && (
                <div className={`px-4 pb-4 pt-0 ${hasTags ? 'text-white' : ''} `}>
                    <div className={`p-4 rounded-lg ${hasTags ? 'bg-stone-800/50 border border-stone-700' : 'bg-stone-950/50 border border-stone-800'} `}>
                        {children}
                    </div>
                </div>
            )}


        </div>
    );
};

const TeamOrganization: React.FC<TeamOrganizationProps> = ({
    data,
    allProjects,
    onUpdateProject,
    onSwitchProject,
    onNewProject,
    onNavigate,
    currentView,
    settings,
    allowedPages,

    currentUserRole = 'Member',
    permissions,
    user,
    onLogout
}) => {
    const syncMembers = useSyncOrganizationMembers();
    const [isSyncing, setIsSyncing] = useState(false);

    // Determine effective permissions (default to false if undefined for safety, though Founder is fixed in App.tsx)
    const canCreate = permissions?.global.create ?? false;
    const canEdit = permissions?.global.edit ?? false;
    const canDelete = permissions?.global.delete ?? false;

    // Subscription Status
    const subscription = useQuery(api.usage.getSubscriptionStatus);
    const isYearly = subscription?.interval === 'year';
    // Check if user is on trial or missing stripe customer ID (which implies they need to subscribe properly)
    // We treat 'trialing' without a payment method/customer ID as needing an upgrade for paid actions
    const isTrialing = subscription?.status === 'trialing' || !subscription?.stripeCustomerId;

    // Admin override (redundant if permissions are set correctly, but keeps old logic safe)
    const isFounder = currentUserRole === 'Founder' || currentUserRole === 'Admin';

    // Add User Menu State
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);


    const updateBusinessStructure = useUpdateBusinessStructure();
    const updateOrganizationDetails = useUpdateOrganizationDetails();
    const addMember = useCreateTeamMember();
    const updateMember = useUpdateTeamMember();
    const deleteMember = useDeleteTeamMember();
    const sendInvite = useSendInvite();


    const [isAddingMember, setIsAddingMember] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [inviteRole, setInviteRole] = useState('Member');
    const [isInviting, setIsInviting] = useState(false);
    const [activeSubTab, setActiveSubTab] = useState<'Overview' | 'Team Roles'>('Overview');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
    const [isResending, setIsResending] = useState<string | null>(null);
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    const [showSeatLimitModal, setShowSeatLimitModal] = useState(false);
    const [seatsToAdd, setSeatsToAdd] = useState(1);

    // Actions
    const addSeats = useAddSeats();


    // Previously declared here, moving up to use in top level logic
    // const subscription = useQuery(api.usage.getSubscriptionStatus);

    const seatPrice = isYearly ? 588 : 49;
    const intervalLabel = isYearly ? '/yr' : '/mo';

    // Member Detail Sheet State
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
    const [showMemberSheet, setShowMemberSheet] = useState(false);
    const [showFileSelector, setShowFileSelector] = useState(false);
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<{ name: string; content?: string; attachmentUrl?: string; type?: string } | null>(null);
    const [showDeleteDocDialog, setShowDeleteDocDialog] = useState(false);
    const [docToDelete, setDocToDelete] = useState<{ id: string; name: string } | null>(null);

    // Document Logic
    const generateUploadUrl = useGenerateUploadUrl();
    const createLegalDocument = useCreateLegalDocument();
    const deleteLegalDocument = useDeleteLegalDocument();
    // @ts-ignore
    const { isAuthenticated } = useConvexAuth();
    const memberDocuments = useQuery(api.legal.getDocuments, isAuthenticated ? { projectId: data.id, recipientId: selectedMember?.id } : "skip") || [];

    const confirmDeleteDoc = async () => {
        if (!docToDelete) return;
        try {
            await deleteLegalDocument({ id: docToDelete.id as any });
            toast.success('Document deleted');
            setShowDeleteDocDialog(false);
            setDocToDelete(null);
            // Close preview if the deleted doc was being previewed
            if (previewDoc && (previewDoc as any).id === docToDelete.id) {
                setPreviewDoc(null);
            }
        } catch (error) {
            toast.error('Failed to delete document');
        }
    };

    const handleMemberClick = (member: TeamMember) => {
        setSelectedMember(member);
        setShowMemberSheet(true);
    };

    const handleLinkFile = async (url: string, storageId: string, file: any) => {
        if (!selectedMember) return;
        setIsUploadingDoc(true);
        try {
            await createLegalDocument({
                projectId: data.id,
                type: file.type || 'Linked File', // Use file type (e.g. application/pdf)
                recipientId: selectedMember.id,
                name: file.name || "Linked File", // Use file name
                attachmentUrl: storageId, // Store storageId
                content: "Linked from Project Files",
                status: "Linked"
            });
            toast.success("File linked successfully");
            setShowFileSelector(false);
        } catch (error) {
            toast.error("Failed to link file");
        } finally {
            setIsUploadingDoc(false);
        }
    };


    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedMember) return;

        setIsUploadingDoc(true);
        try {
            // 1. Get Upload URL
            const postUrl = await generateUploadUrl();

            // 2. Upload File
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });
            const { storageId } = await result.json();

            // 3. Create Document Record
            await createLegalDocument({
                projectId: data.id, // Using localId or convex ID depending on implementation. Assuming data.id is localId for now based on previous context, but types suggest mixed usage.
                type: 'Custom Upload',
                recipientId: selectedMember.id,
                name: file.name,
                attachmentUrl: storageId,
                content: "Uploaded via Team Manager",
            });

            toast.success("Document uploaded successfully");
        } catch (error) {
            toast.error("Failed to upload document");
        } finally {
            setIsUploadingDoc(false);
        }
    };

    // Permissions State
    const [selectedRoleId, setSelectedRoleId] = useState<string>("");
    const [rolePermissions, setRolePermissions] = useState<RolePermissions>({
        global: { view: true, create: false, edit: false, delete: false },
        project: { create: false, delete: false },
        canvas: { create: false, update: false }
    });

    // Role Creation State
    const [isAddingRole, setIsAddingRole] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const createRole = useCreateRole();

    const customRoles = useQuery(api.roles.list, { projectId: data.id }) || [];
    const updateRole = useUpdateRole();
    const deleteRole = useDeleteRole();

    // Renaming State
    const [isRenaming, setIsRenaming] = useState(false);
    const [roleRename, setRoleRename] = useState('');

    const handleRenameRole = async () => {
        if (!selectedRoleId || !roleRename.trim()) return;
        try {
            await updateRole({ id: selectedRoleId as any, name: roleRename });
            toast.success("Role renamed successfully");
            setIsRenaming(false);
        } catch (error) {
            toast.error("Failed to rename role");
        }
    };

    const handleDeleteRole = async () => {
        if (!selectedRoleId) return;
        if (!confirm("Are you sure you want to delete this role? This cannot be undone.")) return;
        try {
            await deleteRole({ id: selectedRoleId as any });
            toast.success("Role deleted successfully");
            setSelectedRoleId("");
        } catch (error) {
            toast.error("Failed to delete role");
        }
    };

    useEffect(() => {
        if (selectedRoleId) {
            let role: any = customRoles.find(r => r._id === selectedRoleId);

            if (!role) {
                role = DEFAULT_ROLES.find(r => r.id === selectedRoleId);
            }

            if (role && role.permissions) {
                setRolePermissions(role.permissions);
            } else {
                // Default or reset
                setRolePermissions({
                    global: { view: true, create: false, edit: false, delete: false },
                    project: { create: false, delete: false },
                    canvas: { create: false, update: false }
                });
            }
        }
    }, [selectedRoleId, customRoles]);

    const handleSavePermissions = async () => {
        if (!selectedRoleId) return;
        try {
            // @ts-ignore
            await updateRole({ id: selectedRoleId, permissions: rolePermissions });
            toast.success("Permissions updated successfully");
        } catch (error) {
            toast.error("Failed to update permissions");
        }
    };

    const handleAddRole = async () => {
        if (!newRoleName.trim()) return;
        try {
            await createRole({
                projectId: data.id,
                name: newRoleName,
                allowedPages: ['Team'],
                isSystem: false,
            });
            toast.success("Role created successfully");
            setNewRoleName('');
            setIsAddingRole(false);
            setActiveTab(newRoleName); // Switch to new tab
        } catch (error) {
            toast.error("Failed to create role");
        }
    };

    // Side Sheet State
    const [showStructureSheet, setShowStructureSheet] = useState(false);
    const [showStructureDropdown, setShowStructureDropdown] = useState(false);
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [orgDetails, setOrgDetails] = useState<OrganizationDetails>(() => {
        if (data.organizationDetails) {
            if (typeof data.organizationDetails === 'string') {
                try {
                    return JSON.parse(data.organizationDetails);
                } catch (e) {
                }
            } else {
                return data.organizationDetails;
            }
        }
        // Parse if string or default
        return {
            legalDocs: {},
            govContracting: {},
            cmmcLevel: 'None',
            compliance: {}
        };
    });

    // Sync local state when data changes (e.g. initial load)
    useEffect(() => {
        if (data.organizationDetails) {
            if (typeof data.organizationDetails === 'string') {
                try {
                    setOrgDetails(JSON.parse(data.organizationDetails));
                } catch (e) {
                }
            } else {
                setOrgDetails(data.organizationDetails);
            }
        }
    }, [data.organizationDetails]);

    // Form State
    const [memberName, setMemberName] = useState('');
    const [memberEmail, setMemberEmail] = useState('');
    const [memberRole, setMemberRole] = useState('Founder');
    const [memberEducation, setMemberEducation] = useState('');
    const [memberSchools, setMemberSchools] = useState('');
    const [memberAccepted, setMemberAccepted] = useState(false);

    const [activeTab, setActiveTab] = useState('Team');


    const orgUsers = useQuery(api.users.listByOrg, { orgId: data.orgId }) || [];

    const availableRoles = [...DEFAULT_ROLES, ...customRoles.map(r => ({
        id: r._id,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        allowedPages: r.allowedPages as any
    }))];

    const filteredMembers = (data.teamMembers || []).filter(member => !['Deleted', 'Revoked'].includes((member as any).status)).filter(member => {
        if (activeTab === 'Team') {
            // "Team" tab shows everyone by default in this dynamic view
            // You can refine this to exclude specific external roles if desired, 
            // but for a dynamic system, showing all valid members here is safest.
            return true;
        }
        // Dynamic filter for custom roles (tabs)
        return member.role === activeTab;
    });

    const handleStructureChange = (structure: string) => {
        onUpdateProject(p => ({ ...p, businessStructure: structure }));
        updateBusinessStructure({ projectId: data.id as any, structure });
        setShowStructureSheet(true);
    };

    const saveOrgDetails = (newDetails: OrganizationDetails) => {
        setOrgDetails(newDetails);
        onUpdateProject(p => ({ ...p, organizationDetails: newDetails }));
        updateOrganizationDetails({ projectId: data.id as any, details: JSON.stringify(newDetails) });
    };

    const toggleLegalDoc = (doc: string) => {
        const newDetails = {
            ...orgDetails,
            legalDocs: { ...orgDetails.legalDocs, [doc]: !orgDetails.legalDocs[doc] }
        };
        saveOrgDetails(newDetails);
    };

    const updateGovStatus = (item: string, status: 'Pending' | 'Completed' | 'Not Started') => {
        const newDetails = {
            ...orgDetails,
            govContracting: { ...orgDetails.govContracting, [item]: status }
        };
        saveOrgDetails(newDetails);
    };

    const updateCompliance = (item: string, status: 'Pending' | 'Completed' | 'Not Started') => {
        const newDetails = {
            ...orgDetails,
            compliance: { ...orgDetails.compliance, [item]: status }
        };
        saveOrgDetails(newDetails as any);
    };

    const updateCmmcLevel = (level: string) => {
        const newDetails = { ...orgDetails, cmmcLevel: level };
        saveOrgDetails(newDetails);
    };

    const toggleCompliance = (item: string) => {
        const newDetails = {
            ...orgDetails,
            compliance: { ...orgDetails.compliance, [item]: !orgDetails.compliance[item] }
        };
        saveOrgDetails(newDetails);
    };

    const resetForm = () => {
        setMemberName('');
        setMemberEmail('');
        setMemberRole('Founder');
        setMemberEducation('');
        setMemberSchools('');
        setMemberAccepted(false);
        setIsAddingMember(false);
        setEditingMemberId(null);
    };

    const handleSaveMember = async () => {
        if (!memberName || !memberEmail) return;

        if (editingMemberId) {
            // Update
            onUpdateProject(p => ({
                ...p,
                teamMembers: p.teamMembers.map(m => m.id === editingMemberId ? {
                    ...m,
                    name: memberName,
                    email: memberEmail,
                    role: memberRole as any,
                    education: memberEducation,
                    schools: memberSchools,
                    acceptedRole: memberAccepted
                } : m)
            }));

            // Find the actual ID (if it's a convex ID)
            const member = data.teamMembers.find(m => m.id === editingMemberId);
            if (member && member.id.length > 20) { // Simple check for convex ID
                await updateMember({
                    id: member.id as any,
                    updates: {
                        name: memberName,
                        email: memberEmail,
                        role: memberRole,
                        education: memberEducation,
                        schools: memberSchools,
                        acceptedRole: memberAccepted
                    }
                });
            }

        } else {
            // Add
            const tempId = Date.now().toString();
            const newMember: TeamMember = {
                id: tempId,
                name: memberName,
                email: memberEmail,
                role: memberRole as any,
                education: memberEducation,
                schools: memberSchools,
                acceptedRole: memberAccepted
            };

            onUpdateProject(p => ({
                ...p,
                teamMembers: [...p.teamMembers, newMember]
            }));

            try {
                const id = await addMember({
                    projectId: data.id as any,
                    name: memberName,
                    email: memberEmail,
                    role: memberRole,
                    education: memberEducation,
                    schools: memberSchools,
                    acceptedRole: memberAccepted
                });

                // Update temp ID with real ID
                onUpdateProject(p => ({
                    ...p,
                    teamMembers: p.teamMembers.map(m => m.id === tempId ? { ...m, id } : m)
                }));
            } catch (e) {
            }
        }
        resetForm();
    };

    const handleEditClick = (member: TeamMember) => {
        setMemberName(member.name);
        setMemberEmail(member.email);
        setMemberRole(member.role);
        setMemberEducation(member.education || '');
        setMemberSchools(member.schools || '');
        setMemberAccepted(member.acceptedRole || false);
        setEditingMemberId(member.id);
        setIsAddingMember(true);
    };

    const revokeInvite = useRevokeInvite();
    const resendInvite = useResendInvite();
    const deleteTeamMember = useRemoveTeamMember();

    const handleDeleteClick = (id: string) => {
        setMemberToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!memberToDelete) return;

        const id = memberToDelete;

        // Optimistic update (remove from UI immediately)
        onUpdateProject(p => ({
            ...p,
            teamMembers: p.teamMembers.filter(m => m.id !== id)
        }));

        try {
            if (id.length > 20) {
                await deleteTeamMember({ memberId: id as any });
            }
            toast.success("Team member removed");
        } catch (error) {
            toast.error("Failed to remove member");
            // Revert optimistic update if needed (requires refetching or more complex state)
        } finally {
            setShowDeleteModal(false);
            setMemberToDelete(null);
        }
    };

    const handleResendInvite = async (member: any) => {
        if (!member.workosInvitationId) {
            toast.error("Cannot resend: No invitation ID found");
            return;
        }

        setIsResending(member.id);
        try {
            await resendInvite({ inviteId: member.workosInvitationId, memberId: member.id });
            toast.success("Invitation resent successfully");
        } catch (error) {
            toast.error("Failed to resend invitation");
        } finally {
            setIsResending(null);
        }
    };

    const handleSendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;
        setIsInviting(true);
        try {
            await sendInvite({
                email: inviteEmail,
                orgId: data.orgId || "personal",
                projectId: data.id as any,
                name: inviteName,
                role: inviteRole
            });
            toast.success("Invitation sent successfully", { icon: <Mail className="w-4 h-4 text-black" /> });
            setShowInviteModal(false);
            setInviteEmail('');
            setInviteName('');
            setInviteRole('Intern');
        } catch (error: any) {

            if (error.message?.includes("SEAT_LIMIT_EXCEEDED")) {
                setShowSeatLimitModal(true);
                return;
            }

            toast.error("Failed to send invitation: " + (error.message || "Unknown error"));
        } finally {
            setIsInviting(false);
        }
    };

    return (
        <div className="h-screen flex bg-nobel-cream relative overflow-hidden">
            {/* Left Sidebar - Vertical Image with Logo and Title */}
            <div className="w-[20%] h-full relative overflow-hidden bg-stone-900 border-r border-stone-200 shadow-2xl z-20">
                <img
                    src="/images/Team.png"
                    className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105"
                    alt="Team & Organization"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-stone-900/40 via-transparent to-stone-900/80" />

                {/* Logo */}
                <div className="absolute top-8 left-8 z-30">
                    <Logo imageClassName="h-8 w-auto brightness-0 invert" />
                </div>

                {/* Title and Description */}
                <div className="absolute inset-x-0 bottom-0 p-8 space-y-4 bg-gradient-to-t from-stone-900 via-stone-900/60 to-transparent pt-24">
                    <div className="space-y-3">
                        <span className="text-nobel-gold font-medium tracking-wider uppercase text-xs block">Organization</span>
                        <h2 className="text-white text-2xl font-serif font-bold leading-tight">
                            Team & Organization
                        </h2>
                        <div className="h-1 w-10 bg-nobel-gold/50 rounded-full" />
                        <p className="text-stone-300 text-sm leading-relaxed">
                            Manage your team members and their roles.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Content Area */}
            <div className="w-[80%] h-full flex flex-col relative z-10">
                {/* Header */}
                <header className="px-10 py-4 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-stone-200 shrink-0 relative z-50">
                    <TabNavigation
                        currentView={currentView}
                        onNavigate={onNavigate}
                        allowedPages={allowedPages}
                        projectFeatures={{
                            canvasEnabled: data.canvasEnabled,
                            marketResearchEnabled: data.marketResearchEnabled
                        }}
                        mode="light"
                    />
                    <div className="flex items-center gap-4">
                        {data.businessStructure && (
                            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-stone-900 border border-stone-900 rounded-full shadow-sm">
                                <Award className="w-3 h-3 text-white" />
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                                    {BUSINESS_STRUCTURES.find(s => s.id === data.businessStructure)?.label}
                                </span>
                            </div>
                        )}
                        {/* User Profile Dropdown */}
                        <div className="relative ml-2">
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className="flex items-center gap-2 pl-1 pr-2 py-1 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                {user?.pictureUrl ? (
                                    <img src={user.pictureUrl} alt={user.name || 'User'} className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                        <User className="w-4 h-4" />
                                    </div>
                                )}
                                <ChevronDown size={14} className="text-gray-400" />
                            </button>
                            {isUserMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden py-1 z-[100] animate-in fade-in zoom-in-95 duration-100">
                                    <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                                        <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
                                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsUserMenuOpen(false);
                                            if (onLogout) onLogout();
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                    >
                                        <LogOut size={14} />
                                        Sign Out
                                    </button>
                                </div>
                            )}
                            {isUserMenuOpen && (
                                <div className="fixed inset-0 z-[90]" onClick={() => setIsUserMenuOpen(false)}></div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-grow overflow-auto relative p-8">

                    {/* Sub-Tabs */}
                    <div className="flex items-center gap-4 mb-8 border-b border-stone-200">
                        <button
                            onClick={() => setActiveSubTab('Overview')}
                            className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeSubTab === 'Overview' ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
                        >
                            Members
                        </button>
                        {isFounder && (
                            <button
                                onClick={() => setActiveSubTab('Team Roles')}
                                className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeSubTab === 'Team Roles' ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
                            >
                                Permissions
                            </button>
                        )}
                    </div>

                    {activeSubTab === 'Overview' && (
                        <>

                            {/* Business Structure Section */}
                            <section className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-stone-100 rounded-lg">
                                        <Building2 className="w-6 h-6 text-stone-700" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-serif text-stone-900">Business Structure</h2>
                                        <p className="text-stone-500">Select the legal entity type for your organization.</p>
                                    </div>
                                </div>

                                <div className="mb-6 relative w-full md:w-1/3 max-w-sm">
                                    {isFounder ? (
                                        <CustomSelect
                                            value={data.businessStructure || ''}
                                            onChange={handleStructureChange}
                                            options={BUSINESS_STRUCTURES.map(start => ({ label: start.label, value: start.id }))}
                                            placeholder="Select Business Structure"
                                            className="w-full"
                                        />
                                    ) : (
                                        <div className="px-4 py-3 bg-stone-100 border border-stone-200 rounded-lg text-sm text-stone-600">
                                            {BUSINESS_STRUCTURES.find(s => s.id === data.businessStructure)?.label || 'Not set'}
                                        </div>
                                    )}
                                </div>

                                <div className="max-w-sm">
                                    {BUSINESS_STRUCTURES.filter(s => s.id === data.businessStructure).map(struct => (
                                        <div
                                            key={struct.id}
                                            onClick={() => isFounder && setShowStructureSheet(true)}
                                            className={`p-4 rounded-xl border transition-all bg-nobel-gold text-white border-nobel-gold shadow-lg relative overflow-hidden group ${isFounder ? 'cursor-pointer hover:shadow-xl hover:-translate-y-0.5' : ''}`}
                                        >
                                            <div className="absolute top-0 right-0 p-2 opacity-100 transition-opacity">
                                                <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                                    <Award className="w-3 h-3" /> Registered
                                                </div>
                                            </div>

                                            {/* Hover Hint for Founder */}
                                            {isFounder && (
                                                <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <div className="bg-white text-stone-900 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                                        Manage Details
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-start mb-2 mt-1">
                                                <h3 className="font-bold text-sm uppercase tracking-wider">{struct.label}</h3>
                                            </div>
                                            <p className="text-xs text-white/80 pr-16">
                                                {struct.description}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <div className="w-full h-px bg-stone-200" />

                            {/* Team Section */}
                            <section className="mt-12">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-500">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h2 className="font-serif text-2xl text-stone-900">Team Members</h2>
                                            <p className="text-sm text-stone-500">Manage user access and permissions.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={async () => {
                                                setIsSyncing(true);
                                                try {
                                                    await syncMembers({ orgId: data.orgId!, projectId: data.id as any });
                                                    toast.success("Team status synced");
                                                } catch (e) {
                                                    toast.error("Failed to sync status");
                                                } finally {
                                                    setIsSyncing(false);
                                                }
                                            }}
                                            disabled={isSyncing}
                                            className="px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                            {isSyncing ? 'Syncing...' : 'Sync Status'}
                                        </button>
                                        <button
                                            onClick={() => onNavigate('SETTINGS')}
                                            className="px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-50 transition-colors flex items-center gap-2"
                                        >
                                            <Settings className="w-4 h-4" /> Settings
                                        </button>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 items-center">
                                    {['Team', ...customRoles.map(r => r.name)].map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${activeTab === tab
                                                ? 'bg-stone-900 text-white'
                                                : 'bg-white border border-stone-200 text-stone-500 hover:bg-stone-50'
                                                }`}
                                        >
                                            {tab}
                                        </button>
                                    ))}

                                </div>

                                {/* Member Cards Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredMembers.map((member) => (
                                        <div
                                            key={member.id}
                                            onClick={() => {
                                                setSelectedMember(member);
                                                setShowMemberSheet(true);
                                            }}
                                            className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm hover:shadow-md hover:border-nobel-gold transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-bold border border-stone-200 overflow-hidden shrink-0">
                                                    {member.pictureUrl ? (
                                                        <img src={member.pictureUrl} alt={member.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        member.name?.charAt(0).toUpperCase() || '?'
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-serif text-stone-900 font-bold">{member.name}</h3>
                                                    <p className="text-xs text-stone-500 truncate max-w-[150px]">{member.email}</p>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="px-2 py-1 bg-stone-50 text-stone-600 rounded text-xs font-bold uppercase tracking-wider border border-stone-100">
                                                    {member.role}
                                                </span>
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${(member as any).status === 'Active' || member.role === 'Founder'
                                                    ? 'text-green-700 bg-green-50'
                                                    : 'text-amber-700 bg-amber-50'
                                                    }`}>
                                                    {(member as any).status || (member.acceptedRole ? 'Active' : 'Pending')}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </>
                    )}
                    {activeSubTab === 'Team Roles' && (
                        <section className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

                            {/* Team Management Table (Moved here) */}
                            <div className="mb-12">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="font-serif text-2xl text-stone-900">Team Management</h2>
                                        <p className="text-sm text-stone-500">Manage invitations and member roles.</p>
                                    </div>
                                    <button
                                        onClick={() => setShowInviteModal(true)}
                                        className="px-4 py-2 bg-stone-900 text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-nobel-gold transition-colors flex items-center gap-2 shadow-sm"
                                    >
                                        <Mail className="w-4 h-4" /> Invite Member
                                    </button>
                                </div>

                                <TeamMemberTable
                                    members={filteredMembers}
                                    roles={availableRoles as any}
                                    currentUserRole={currentUserRole}
                                    onUpdateRole={async (id, role) => {
                                        try {
                                            await updateMember({ id: id as any, updates: { role } });
                                            toast.success("Role updated");
                                        } catch (e) { toast.error("Failed to update role"); }
                                    }}
                                    onRemoveMember={handleDeleteClick}
                                    onInvite={() => setShowInviteModal(true)}
                                    onResendInvite={handleResendInvite}
                                    isResending={isResending}
                                    userMap={orgUsers ? Object.fromEntries((orgUsers as any[]).map(u => [u.email, u])) : {}}
                                />
                            </div>

                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="font-serif text-2xl text-stone-900">Role Permissions</h2>
                                    <p className="text-sm text-stone-500">Manage {customRoles.length + DEFAULT_ROLES.length} custom and system roles.</p>
                                </div>
                                <div>
                                    {!isAddingRole ? (
                                        <button
                                            onClick={() => setIsAddingRole(true)}
                                            className="px-4 py-2 bg-black text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-stone-800 transition-colors flex items-center gap-2 shadow-sm"
                                        >
                                            <Plus className="w-3 h-3" /> Create New Role
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 p-1.5 bg-stone-900 rounded-full pl-3 pr-1.5">
                                            <input
                                                type="text"
                                                value={newRoleName}
                                                onChange={(e) => setNewRoleName(e.target.value)}
                                                className="bg-transparent text-white placeholder-stone-400 text-xs font-medium outline-none w-32"
                                                placeholder="Role Name"
                                                autoFocus
                                            />
                                            <button
                                                onClick={handleAddRole}
                                                disabled={!newRoleName.trim()}
                                                className="p-1.5 bg-white text-stone-900 rounded-full hover:bg-stone-100 disabled:opacity-50"
                                            >
                                                <Check className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => { setIsAddingRole(false); setNewRoleName(''); }}
                                                className="p-1.5 text-stone-400 hover:text-white"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
                                <div className="mb-6">



                                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Select Role to Configure</label>
                                    <div className="flex items-start gap-2">
                                        <div className="flex-grow max-w-md">
                                            {isRenaming ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={roleRename}
                                                        onChange={(e) => setRoleRename(e.target.value)}
                                                        className="w-full px-3 py-2 border border-stone-200 rounded-full font-sans text-sm outline-none focus:border-stone-900"
                                                        placeholder="New Role Name"
                                                        autoFocus
                                                    />
                                                    <button onClick={handleRenameRole} className="p-2 bg-stone-900 text-white rounded-full hover:bg-stone-800">
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setIsRenaming(false)} className="p-2 text-stone-400 hover:text-stone-900">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <CustomSelect
                                                    value={selectedRoleId}
                                                    onChange={(val) => setSelectedRoleId(val)}
                                                    options={[
                                                        { label: '-- Select a Custom Role --', value: '' },
                                                        ...customRoles.map(role => ({ label: role.name, value: role._id }))
                                                    ]}
                                                    className="w-full"
                                                    placeholder="Select a Custom Role"
                                                />
                                            )}
                                        </div>

                                        {selectedRoleId && !isRenaming && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <button
                                                    onClick={() => {
                                                        const role = customRoles.find(r => r._id === selectedRoleId);
                                                        if (role) {
                                                            setRoleRename(role.name);
                                                            setIsRenaming(true);
                                                        }
                                                    }}
                                                    className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors"
                                                    title="Rename Role"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={handleDeleteRole}
                                                    className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                    title="Delete Role"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {customRoles.length === 0 && (
                                        <p className="text-xs text-stone-400 mt-2">No custom roles found. Permissions can only be configured for custom roles.</p>
                                    )}
                                </div>

                                {selectedRoleId && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-top-2">
                                        {/* Global CRUD */}
                                        <div>
                                            <h3 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4 text-nobel-gold" /> Global Permissions
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {[
                                                    { key: 'view', label: 'Read-Only Access' },
                                                    { key: 'create', label: 'Create Content' },
                                                    { key: 'edit', label: 'Update Content' },
                                                    { key: 'delete', label: 'Delete Content' }
                                                ].map(perm => (
                                                    <label key={perm.key} className="flex items-center gap-3 p-3 border border-stone-100 rounded-lg hover:bg-stone-50 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            // @ts-ignore
                                                            checked={rolePermissions.global[perm.key]}
                                                            // @ts-ignore
                                                            onChange={(e) => setRolePermissions(prev => ({ ...prev, global: { ...prev.global, [perm.key]: e.target.checked } }))}
                                                            className="rounded border-stone-300 text-nobel-gold focus:ring-nobel-gold"
                                                        />
                                                        <span className="text-sm font-medium text-stone-700">{perm.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="h-px bg-stone-100"></div>

                                        {/* Specific Overrides */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Project Overrides */}
                                            <div>
                                                <h3 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2">
                                                    <Layout className="w-4 h-4 text-stone-400" /> Project Actions
                                                </h3>
                                                <div className="space-y-3">
                                                    <label className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={rolePermissions.project?.create ?? false}
                                                            onChange={(e) => setRolePermissions(prev => ({ ...prev, project: { ...prev.project!, create: e.target.checked } }))}
                                                            className="rounded border-stone-300 text-nobel-gold focus:ring-nobel-gold"
                                                        />
                                                        <span className="text-sm text-stone-600">Create Projects</span>
                                                    </label>
                                                    <label className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={rolePermissions.project?.delete ?? false}
                                                            onChange={(e) => setRolePermissions(prev => ({ ...prev, project: { ...prev.project!, delete: e.target.checked } }))}
                                                            className="rounded border-stone-300 text-nobel-gold focus:ring-nobel-gold"
                                                        />
                                                        <span className="text-sm text-stone-600">Delete Projects</span>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Canvas Overrides */}
                                            <div>
                                                <h3 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-stone-400" /> Canvas Actions
                                                </h3>
                                                <div className="space-y-3">
                                                    <label className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={rolePermissions.canvas?.create ?? false}
                                                            onChange={(e) => setRolePermissions(prev => ({ ...prev, canvas: { ...prev.canvas!, create: e.target.checked } }))}
                                                            className="rounded border-stone-300 text-nobel-gold focus:ring-nobel-gold"
                                                        />
                                                        <span className="text-sm text-stone-600">Create Canvas</span>
                                                    </label>
                                                    <label className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={rolePermissions.canvas?.update ?? false}
                                                            onChange={(e) => setRolePermissions(prev => ({ ...prev, canvas: { ...prev.canvas!, update: e.target.checked } }))}
                                                            className="rounded border-stone-300 text-nobel-gold focus:ring-nobel-gold"
                                                        />
                                                        <span className="text-sm text-stone-600">Update Canvas</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-4">
                                            <button
                                                onClick={handleSavePermissions}
                                                className="px-6 py-2 bg-stone-900 text-white rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-nobel-gold transition-colors shadow-lg"
                                            >
                                                Save Permissions
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Side Sheet */}
                    < div className={`fixed inset-0 z-[60] transition-opacity duration-300 ${showStructureSheet ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowStructureSheet(false)} />
                        <div className={`fixed top-0 right-0 h-full w-[400px] bg-stone-950 shadow-2xl border-l border-stone-800 transform transition-transform duration-300 z-[60] overflow-y-auto ${showStructureSheet ? 'translate-x-0' : 'translate-x-full'}`}>
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="font-serif text-xl text-white">Organization Details</h2>
                                    <button onClick={() => setShowStructureSheet(false)} className="text-stone-500 hover:text-white">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {/* Legal Documents Accordion */}
                                    <AccordionSection
                                        title="Legal Documents"
                                        icon={<FileText className="w-4 h-4" />}
                                        tags={Object.keys(orgDetails.legalDocs).filter(k => orgDetails.legalDocs[k])}
                                    >
                                        <div className="space-y-2">
                                            {LEGAL_DOCS_LIST.map(doc => (
                                                <div key={doc} className="flex items-center justify-between p-3 bg-stone-900 rounded-lg border border-stone-800">
                                                    <span className="text-sm text-stone-300">{doc}</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={!!orgDetails.legalDocs[doc]}
                                                        onChange={() => toggleLegalDoc(doc)}
                                                        className="rounded border-stone-700 bg-stone-950 text-nobel-gold focus:ring-nobel-gold"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionSection>

                                    {/* Government Contracting Accordion */}
                                    <AccordionSection
                                        title="Government Contracting"
                                        icon={<ShieldCheck className="w-5 h-5" />}
                                        tags={Object.keys(orgDetails.govContracting).filter(k => orgDetails.govContracting[k] !== 'Not Started').map(k => `${k}: ${orgDetails.govContracting[k]}`)}
                                    >
                                        <div className="space-y-3">
                                            {GOV_CONTRACTING_LIST.map(item => (
                                                <div key={item} className="p-3 bg-stone-900 rounded-lg border border-stone-800">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-sm font-medium text-white">{item}</span>
                                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${orgDetails.govContracting[item] === 'Completed' ? 'bg-green-100 text-green-700 border border-green-200/50' :
                                                            orgDetails.govContracting[item] === 'Pending' ? 'bg-amber-100 text-amber-700 border border-amber-200/50' :
                                                                'bg-stone-800 text-stone-400 border border-stone-700'
                                                            }`}>
                                                            {orgDetails.govContracting[item] || 'Not Started'}
                                                        </span>
                                                    </div>
                                                    <CustomSelect
                                                        value={orgDetails.govContracting[item] || 'Not Started'}
                                                        onChange={(val) => updateGovStatus(item, val)}
                                                        options={[
                                                            { label: 'Not Started', value: 'Not Started', color: 'bg-stone-800 text-stone-400' },
                                                            { label: 'Pending', value: 'Pending', color: 'bg-amber-950/30 text-amber-500' },
                                                            { label: 'Completed', value: 'Completed', color: 'bg-green-100 text-green-700' }
                                                        ]}
                                                        className="min-w-[140px]"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionSection>

                                    {/* CMMC Level Accordion */}
                                    <AccordionSection
                                        title="CMMC Certification"
                                        icon={<ShieldCheck className="w-4 h-4" />}
                                        tags={orgDetails.cmmcLevel !== 'None' ? [orgDetails.cmmcLevel] : []}
                                    >
                                        <div className="p-4 bg-stone-900 rounded-xl text-white">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="text-sm font-bold">Current Level</span>
                                                <span className="text-xs bg-nobel-gold text-white px-2 py-1 rounded font-bold">
                                                    {orgDetails.cmmcLevel}
                                                </span>
                                            </div>
                                            <div className="flex gap-2 flex-wrap">
                                                {['None', 'Level 1', 'Level 2', 'Level 3'].map(level => (
                                                    <button
                                                        key={level}
                                                        onClick={() => updateCmmcLevel(level)}
                                                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${orgDetails.cmmcLevel === level
                                                            ? 'bg-stone-900 text-white'
                                                            : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                                                            }`}
                                                    >
                                                        {level}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </AccordionSection>

                                    {/* Other Compliance Accordion */}
                                    <AccordionSection
                                        title="Compliance & Security"
                                        icon={<Lock className="w-4 h-4" />}
                                        tags={Object.keys(orgDetails.compliance).filter(k => orgDetails.compliance[k])}
                                    >
                                        <div className="space-y-2">
                                            {COMPLIANCE_LIST.map(item => <div key={item} className="flex items-center justify-between p-3 bg-stone-900 rounded-lg border border-stone-800">
                                                <span className="text-sm text-stone-300">{item}</span>
                                                <div className="flex gap-2">
                                                    {['Pending', 'Completed', 'Not Started'].map((status) => (
                                                        <button
                                                            key={status}
                                                            onClick={() => updateCompliance(item, status as any)}
                                                            className={`text-[10px] py-1 rounded border ${(orgDetails.compliance[item] as any) === status
                                                                ? 'bg-stone-900 text-white border-stone-700 px-3'
                                                                : 'bg-stone-950 text-stone-500 border-stone-800 px-2 hover:border-stone-600 hover:text-stone-300'
                                                                }`}
                                                        >
                                                            {status}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            )}
                                        </div>
                                    </AccordionSection>

                                    <div className="mt-8 flex justify-end">
                                        <button
                                            onClick={() => setShowStructureSheet(false)}
                                            className="px-6 py-3 bg-white text-stone-900 rounded-full font-bold uppercase tracking-wider text-xs hover:bg-stone-200 transition-colors shadow-lg"
                                        >
                                            Save & Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Add/Edit Modal */}
            {
                isAddingMember && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end transition-all duration-300" onClick={() => setShowMemberSheet(false)}>
                        <div className="bg-nobel-cream canvas-pattern w-full max-w-6xl h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col" onClick={e => e.stopPropagation()} style={{ backgroundSize: '24px 24px' }}>                          <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                            <h3 className="font-serif text-xl text-stone-900">{editingMemberId ? 'Edit Member' : 'Add Team Member'}</h3>
                            <button onClick={resetForm} className="text-stone-400 hover:text-stone-900"><X className="w-5 h-5" /></button>
                        </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Select User (Optional)</label>
                                        <CustomSelect
                                            value={'new'}
                                            onChange={(val) => {
                                                const userId = val;
                                                if (userId === 'new') {
                                                    setMemberName('');
                                                    setMemberEmail('');
                                                } else {
                                                    const user = orgUsers.find(u => u._id === userId);
                                                    if (user) {
                                                        setMemberName(user.name || '');
                                                        setMemberEmail(user.email || '');
                                                    }
                                                }
                                            }}
                                            options={[
                                                { label: 'Create New / External', value: 'new' },
                                                ...orgUsers.map(u => ({ label: `${u.name} (${u.email})`, value: u._id }))
                                            ]}
                                            placeholder="Select User..."
                                            className="mb-3"
                                        />


                                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Name</label>
                                        <input
                                            type="text"
                                            value={memberName}
                                            onChange={(e) => setMemberName(e.target.value)}
                                            className="w-full p-2 border border-stone-200 rounded font-sans text-sm focus:border-nobel-gold outline-none"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Role</label>
                                        <CustomSelect
                                            value={memberRole}
                                            onChange={(val) => setMemberRole(val)}
                                            options={availableRoles.map(role => ({ label: role.name, value: role.name }))}
                                            className="w-full bg-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={memberEmail}
                                        onChange={(e) => setMemberEmail(e.target.value)}
                                        className="w-full p-2 border border-stone-200 rounded font-sans text-sm focus:border-nobel-gold outline-none"
                                        placeholder="john@example.com"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Education Level</label>
                                        <input
                                            type="text"
                                            value={memberEducation}
                                            onChange={(e) => setMemberEducation(e.target.value)}
                                            className="w-full p-2 border border-stone-200 rounded font-sans text-sm focus:border-nobel-gold outline-none"
                                            placeholder="e.g. PhD, Masters"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Schools</label>
                                        <input
                                            type="text"
                                            value={memberSchools}
                                            onChange={(e) => setMemberSchools(e.target.value)}
                                            className="w-full p-2 border border-stone-200 rounded font-sans text-sm focus:border-nobel-gold outline-none"
                                            placeholder="e.g. Stanford, MIT"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <input
                                        type="checkbox"
                                        id="accepted"
                                        checked={memberAccepted}
                                        onChange={(e) => setMemberAccepted(e.target.checked)}
                                        className="rounded border-stone-300 text-nobel-gold focus:ring-nobel-gold"
                                    />
                                    <label htmlFor="accepted" className="text-sm text-stone-700 font-medium cursor-pointer select-none flex items-center gap-2">
                                        <Award className="w-4 h-4 text-nobel-gold" /> Accepted Role
                                    </label>
                                </div>

                                <button
                                    onClick={handleSaveMember}
                                    disabled={!memberName || !memberEmail}
                                    className="w-full py-3 bg-black text-white rounded-full font-bold uppercase tracking-wider text-xs hover:bg-stone-800 transition-colors disabled:opacity-50 mt-4"
                                >
                                    {editingMemberId ? 'Save Changes' : 'Add Member'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Invite Modal */}
            {
                showInviteModal && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-stone-100 scale-100 animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-serif font-bold text-stone-900">Invite Team Member</h3>
                                <button onClick={() => setShowInviteModal(false)} className="text-stone-400 hover:text-stone-900">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSendInvite} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Name (Optional)</label>
                                    <input
                                        type="text"
                                        value={inviteName}
                                        onChange={(e) => setInviteName(e.target.value)}
                                        className="w-full p-2 border border-stone-200 rounded focus:border-nobel-gold outline-none mb-3"
                                        placeholder="Jane Doe"
                                    />

                                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Role</label>
                                    <CustomSelect
                                        value={inviteRole}
                                        onChange={(val) => setInviteRole(val)}
                                        options={availableRoles.map(role => ({ label: role.name, value: role.name }))}
                                        className="w-full bg-white mb-3"
                                    />

                                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="w-full p-2 border border-stone-200 rounded focus:border-nobel-gold outline-none"
                                        placeholder="colleague@example.com"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowInviteModal(false)}
                                        className="px-4 py-2 text-stone-500 hover:text-stone-900 text-xs font-bold uppercase tracking-wider"
                                    >
                                        Cancel
                                    </button>
                                    {/* Send Invite Button - Gate for Trial */}
                                    {canCreate && (
                                        isTrialing ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    // Allow upgrade
                                                    onNavigate('SUBSCRIPTION');
                                                    setShowInviteModal(false);
                                                }}
                                                className="px-6 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-nobel-gold transition-colors flex items-center gap-2"
                                            >
                                                Upgrade to Invite
                                            </button>
                                        ) : (
                                            <button
                                                type="submit"
                                                disabled={isInviting}
                                                className="px-6 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-nobel-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                {isInviting ? 'Sending...' : 'Send Invite'}
                                            </button>
                                        )
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }


            {/* Add Role Modal */}
            {
                isAddingRole && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-stone-100 scale-100 animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-serif font-bold text-stone-900">Create New Role</h3>
                                <button onClick={() => setIsAddingRole(false)} className="text-stone-400 hover:text-stone-900">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">Role Name</label>
                                    <input
                                        type="text"
                                        value={newRoleName}
                                        onChange={(e) => setNewRoleName(e.target.value)}
                                        className="w-full p-2 border border-stone-200 rounded focus:border-nobel-gold outline-none"
                                        placeholder="e.g. Editor"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={handleAddRole}
                                        disabled={!newRoleName.trim()}
                                        className="px-6 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-nobel-gold transition-colors disabled:opacity-50"
                                    >
                                        Create Role
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                showDeleteModal && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-stone-100 scale-100 animate-in zoom-in-95 duration-200">
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                    <Trash2 className="w-6 h-6 text-red-600" />
                                </div>
                                <h3 className="text-xl font-serif font-bold text-stone-900 mb-2">Remove Team Member?</h3>
                                <p className="text-sm text-stone-500">
                                    Are you sure you want to remove this team member? This action cannot be undone.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="px-4 py-2 text-stone-500 hover:text-stone-900 text-xs font-bold uppercase tracking-wider"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-6 py-2 bg-red-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                                >
                                    Remove Member
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Member Details Side Sheet */}
            {
                showMemberSheet && selectedMember && (
                    <>
                        <div
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
                            onClick={() => setShowMemberSheet(false)}
                        ></div>
                        <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out border-l border-stone-200 overflow-y-auto">
                            <div className="p-8">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-bold text-2xl border border-stone-200 overflow-hidden relative">
                                            {selectedMember.pictureUrl ? (
                                                <img src={selectedMember.pictureUrl} alt={selectedMember.name} className="w-full h-full object-cover" />
                                            ) : (
                                                selectedMember.name.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-serif text-2xl text-stone-900 leading-tight">{selectedMember.name}</h3>
                                            <p className="text-sm font-bold uppercase tracking-wider text-nobel-gold mt-1">{selectedMember.role}</p>
                                            <p className="text-stone-500 text-sm mt-0.5">{selectedMember.email}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowMemberSheet(false)} className="text-stone-400 hover:text-stone-900">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                {/* Details */}
                                <div className="space-y-6 mb-8">
                                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">Member Details</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-stone-500">Joined</span>
                                                <span className="font-medium text-stone-900">May 12, 2024</span>
                                            </div>

                                            {selectedMember.education && (
                                                <div className="flex justify-between">
                                                    <span className="text-stone-500">Education</span>
                                                    <span className="font-medium text-stone-900 text-right">{selectedMember.education}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Documents Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-serif text-lg text-stone-900">Associated Documents</h4>
                                        {isFounder && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setShowFileSelector(true)}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 text-stone-700 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-stone-50 transition-colors"
                                                >
                                                    <Folder className="w-3 h-3" />
                                                    Select File
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1  gap-6 h-[600px]">
                                        {/* Left Column: Document List */}
                                        <div className="overflow-y-auto pr-2">
                                            {memberDocuments.length > 0 ? (
                                                <div className="space-y-3">
                                                    {memberDocuments.map((doc: any) => (
                                                        <div
                                                            key={doc.id}
                                                            onClick={() => {
                                                                if (doc.content || doc.attachmentUrl) {
                                                                    setPreviewDoc({
                                                                        name: doc.name || "Untitled",
                                                                        content: doc.content,
                                                                        attachmentUrl: doc.attachmentUrl,
                                                                        type: doc.type
                                                                    });
                                                                }
                                                            }}
                                                            className={`flex items-center justify-between p-3 border rounded-lg transition-all group cursor-pointer ${previewDoc?.attachmentUrl === doc.attachmentUrl ? 'bg-stone-50 border-nobel-gold ring-1 ring-nobel-gold/20' : 'bg-white border-stone-200 hover:border-nobel-gold'}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-stone-100 rounded-lg text-stone-500">
                                                                    <FileText className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-stone-900 truncate max-w-[200px]">{doc.name || doc.type}</p>
                                                                    <p className="text-xs text-stone-400">{new Date(doc.createdAt).toLocaleDateString()}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setDocToDelete({ id: doc.id, name: doc.name || "Untitled" });
                                                                        setShowDeleteDocDialog(true);
                                                                    }}
                                                                    className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                                                    <FileText className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                                                    <p className="text-sm text-stone-500">No documents uploaded for this member.</p>
                                                </div>
                                            )}
                                        </div>


                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )
            }


            {/* File Selector Modal */}
            {
                showFileSelector && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col border border-stone-200 animate-in zoom-in-95 duration-200 overflow-hidden">
                            <div className="flex justify-between items-center p-4 border-b border-stone-100 bg-stone-50">
                                <h3 className="font-serif text-lg font-bold text-stone-900">Select File from Project</h3>
                                <button onClick={() => setShowFileSelector(false)} className="text-stone-400 hover:text-stone-900">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-hidden p-0 relative">
                                <FileSelector
                                    projectId={data.id}
                                    onSelect={(url, storageId, file) => handleLinkFile(url, storageId, file)}
                                    title=""
                                />
                            </div>
                        </div>
                    </div>
                )
            }



            {/* Document Delete Confirmation Modal */}
            {
                showDeleteDocDialog && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-stone-100 scale-100 animate-in zoom-in-95 duration-200">
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                    <Trash2 className="w-6 h-6 text-red-600" />
                                </div>
                                <h3 className="text-xl font-serif font-bold text-stone-900 mb-2">Delete Document?</h3>
                                <p className="text-sm text-stone-500">
                                    Are you sure you want to delete <strong>{docToDelete?.name}</strong>? This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setShowDeleteDocDialog(false)}
                                    className="px-4 py-2 text-stone-500 hover:text-stone-900 text-xs font-bold uppercase tracking-wider"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDeleteDoc}
                                    className="px-6 py-2 bg-red-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-colors"
                                >
                                    Delete Document
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Seat Limit Modal */}
            {showSeatLimitModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-stone-100 scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-serif font-bold text-stone-900">Add Seats</h3>
                            <button onClick={() => setShowSeatLimitModal(false)} className="text-stone-400 hover:text-stone-900">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mb-6">
                            <p className="text-sm text-stone-600 leading-relaxed mb-4">
                                You have reached your seat limit. Add more seats to your plan to invite more team members.
                            </p>

                            <div className="bg-stone-50 p-4 rounded-lg border border-stone-100">
                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Additional Seats</label>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setSeatsToAdd(Math.max(1, seatsToAdd - 1))}
                                        className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center hover:bg-stone-100"
                                    >
                                        -
                                    </button>
                                    <span className="font-mono text-lg font-bold w-8 text-center">{seatsToAdd}</span>
                                    <button
                                        onClick={() => setSeatsToAdd(seatsToAdd + 1)}
                                        className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center hover:bg-stone-100"
                                    >
                                        +
                                    </button>
                                </div>
                                <div className="mt-3 text-xs text-stone-500">
                                    Total: <span className="font-bold text-stone-900">${seatsToAdd * seatPrice}{intervalLabel}</span> (will be prorated)
                                </div>
                                <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 text-[10px] rounded border border-yellow-100 leading-tight">
                                    <strong>Note:</strong> You will be charged immediately for the remainder of the current billing cycle. Future charges will align with your existing <strong>{isYearly ? 'Yearly' : 'Monthly'}</strong> plan.
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowSeatLimitModal(false)}
                                className="px-4 py-2 text-stone-500 hover:text-stone-900 text-xs font-bold uppercase tracking-wider"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (isTrialing) {
                                        onNavigate('SUBSCRIPTION');
                                        setShowSeatLimitModal(false);
                                        return;
                                    }
                                    try {
                                        await addSeats({ seatsToAdd: seatsToAdd });
                                        toast.success(`Successfully added ${seatsToAdd} seat(s)`);
                                        setShowSeatLimitModal(false);
                                        // Ideally invalidate query or wait for webhook
                                    } catch (error) {
                                        toast.error("Failed to add seats. Please check your billing info.");
                                    }
                                }}
                                className="px-6 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-nobel-gold transition-colors flex items-center gap-2"
                            >
                                <CreditCard className="w-4 h-4" /> {isTrialing ? 'Upgrade Plan' : 'Purchase Seats'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showMemberSheet && selectedMember && (
                <MemberDetailSheet
                    member={selectedMember}
                    projectId={data.id as any}
                    onClose={() => {
                        setShowMemberSheet(false);
                        setSelectedMember(null);
                    }}
                />
            )}
        </div>
    );
};

export default TeamOrganization;
