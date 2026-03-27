
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useConvexAuth } from 'convex/react';
import { api } from "../../convex/_generated/api";
import { useCreateDivision, useCreateInitiative, useCreateInitiativeComment } from '../../hooks/useCreate';
import { useUpdateInitiative, useToggleInitiativeMember, useLinkFileToInitiative, useUnlinkFileFromInitiative } from '../../hooks/useUpdate';
import { useDeleteDivision, useDeleteInitiative } from '../../hooks/useDelete';
import { Id } from '../../convex/_generated/dataModel';
import { Plus, Folder, Calendar, MessageSquare, Paperclip, ChevronRight, Hash, User as UserIcon, Flag, X, Save, Edit, Check, Trash2, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { DeleteConfirmationDialog } from '../DeleteConfirmationDialog';
import TabNavigation from '../TabNavigation';
import ProjectSelector from '../ProjectSelector';
import { Logo } from '../Logo';
import { StartupData, ViewState, PageAccess } from '../../types';

interface InitiativesProps {
    projectId: string;
    allProjects: StartupData[];
    onSwitchProject: (id: string) => void;
    onNewProject: () => void;
    onNavigate: (view: ViewState) => void;
    currentView: ViewState;
    allowedPages?: PageAccess[];
}

export const Initiatives: React.FC<InitiativesProps> = ({
    projectId,
    allProjects,
    onSwitchProject,
    onNewProject,
    onNavigate,
    currentView,
    allowedPages
}) => {
    const { isAuthenticated } = useConvexAuth();

    // Queries
    const divisions = useQuery(api.initiatives.getDivisions, isAuthenticated ? { projectId: projectId as Id<"projects"> } : "skip");
    const initiatives = useQuery(api.initiatives.getInitiatives, isAuthenticated ? { projectId: projectId as Id<"projects"> } : "skip");
    const teamMembers = useQuery(api.team.getTeam, isAuthenticated ? { projectId: projectId as Id<"projects"> } : "skip");

    // Use getAllFileSystem instead of getProjectFiles to build the tree
    const fileSystem = useQuery(api.files.getAllFileSystem, isAuthenticated ? { projectId } : "skip");

    // Mutations
    const createDivision = useCreateDivision();
    const deleteDivision = useDeleteDivision();
    const createInitiative = useCreateInitiative();
    const deleteInitiative = useDeleteInitiative();

    // State
    const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null);
    const [selectedInitiativeId, setSelectedInitiativeId] = useState<Id<"initiatives"> | null>(null);

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; type: 'division' | 'initiative'; id: string; name: string } | null>(null);

    // Create Forms
    const [isCreatingDivision, setIsCreatingDivision] = useState(false);
    const [newDivisionName, setNewDivisionName] = useState('');

    const [isCreatingInitiative, setIsCreatingInitiative] = useState(false);
    const [newInitiativeTitle, setNewInitiativeTitle] = useState('');
    const [newInitiativeDesc, setNewInitiativeDesc] = useState('');

    useEffect(() => {
        if (divisions && divisions.length > 0 && !selectedDivisionId) {
            setSelectedDivisionId(divisions[0]._id);
        }
    }, [divisions]);

    const handleCreateDivision = async () => {
        if (!newDivisionName.trim()) return;
        dismissCreateDivision();
        toast.promise(createDivision({ projectId: projectId as Id<"projects">, name: newDivisionName }), {
            loading: 'Creating division...',
            success: 'Division created!',
            error: 'Failed to create division'
        });
    };

    const handleDeleteDivision = async (id: Id<"divisions">, name: string) => {
        setDeleteModal({ isOpen: true, type: 'division', id, name });
    };

    const handleDeleteInitiative = async (e: React.MouseEvent, id: Id<"initiatives">, title: string) => {
        e.stopPropagation();
        setDeleteModal({ isOpen: true, type: 'initiative', id, name: title });
    };

    const confirmDelete = async () => {
        if (!deleteModal) return;

        if (deleteModal.type === 'division') {
            if (selectedDivisionId === deleteModal.id) setSelectedDivisionId(null);
            toast.promise(deleteDivision({ divisionId: deleteModal.id as Id<"divisions"> }), {
                loading: 'Deleting division...',
                success: 'Division deleted',
                error: 'Failed to delete'
            });
        } else {
            if (selectedInitiativeId === deleteModal.id) setSelectedInitiativeId(null);
            await deleteInitiative({ initiativeId: deleteModal.id as Id<"initiatives"> });
            toast.success("Initiative deleted");
        }
        setDeleteModal(null);
    };

    const dismissCreateDivision = () => {
        setIsCreatingDivision(false);
        setNewDivisionName('');
    }

    const handleCreateInitiative = async () => {
        if (!newInitiativeTitle.trim() || !selectedDivisionId) return;
        dismissCreateInitiative();
        toast.promise(createInitiative({
            projectId: projectId as Id<"projects">,
            divisionId: selectedDivisionId as Id<"divisions">,
            title: newInitiativeTitle,
            description: newInitiativeDesc,
            status: 'Planning',
            priority: 'Medium'
        }), {
            loading: 'Creating initiative...',
            success: 'Initiative created!',
            error: 'Failed to create initiative'
        });
    };

    const dismissCreateInitiative = () => {
        setIsCreatingInitiative(false);
        setNewInitiativeTitle('');
        setNewInitiativeDesc('');
    }

    if (!divisions || !initiatives) {
        return <div className="p-10 text-center text-stone-500 animate-pulse">Loading workspace...</div>;
    }

    // Filter initiatives
    const activeDivisionId = selectedDivisionId || (divisions.length > 0 ? divisions[0]._id : null);
    const filteredInitiatives = initiatives.filter(i => i.divisionId === activeDivisionId);
    const activeDivision = divisions.find(d => d._id === activeDivisionId);

    return (
        <div className="flex flex-col h-[calc(100vh-60px)] bg-nobel-cream canvas-pattern" style={{ backgroundSize: "24px 24px" }}>
            {/* Main Navigation Header */}
            <header className="px-6 py-3 bg-white/80 backdrop-blur-sm sticky top-0 z-50 flex items-center justify-between border-b border-stone-200 shrink-0">
                <div className="flex items-center gap-4">
                    <Logo imageClassName="h-8 w-auto" />
                    <div className="h-6 w-px bg-stone-200" />
                    <div className="h-6 w-px bg-stone-200" />
                    <TabNavigation
                        currentView={currentView}
                        onNavigate={onNavigate}
                        allowedPages={allowedPages}
                    />
                </div>
            </header>

            {/* Header with Image */}
            <div className="h-40 w-full relative overflow-hidden bg-stone-900 border-b border-stone-200 shrink-0">
                <img
                    src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000"
                    alt="Workspace Header"
                    className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 to-transparent flex items-end px-8 py-6">
                    <div className="ml-6">
                        <h1 className="text-3xl font-serif text-white tracking-tight">Initiatives & Divisions</h1>
                        <p className="text-stone-300 mt-1 max-w-2xl">Organize your strategic roadmap, assign teams, and track execution.</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar: Divisions */}
                <div className="w-64 border-r border-stone-200 bg-white flex flex-col shrink-0">
                    <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                        <h2 className="font-bold text-stone-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <Folder className="w-4 h-4 text-stone-400" /> Divisions
                        </h2>
                        <button
                            onClick={() => setIsCreatingDivision(true)}
                            className="p-1.5 rounded-md hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {divisions.map(division => (
                            <div key={division._id} className="relative group">
                                <button
                                    onClick={() => setSelectedDivisionId(division._id)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between transition-colors ${activeDivisionId === division._id
                                        ? 'bg-stone-100 text-stone-900 font-bold shadow-sm ring-1 ring-stone-200'
                                        : 'text-stone-600 hover:bg-stone-50'
                                        }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${activeDivisionId === division._id ? 'bg-nobel-gold' : 'bg-stone-300'}`} />
                                        {division.name}
                                    </span>
                                </button>
                                {activeDivisionId === division._id && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteDivision(division._id, division.name); }}
                                        className="absolute right-2 top-2.5 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete Division"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}

                        {isCreatingDivision && (
                            <div className="p-2 bg-stone-50 rounded-lg border border-stone-200 animate-in fade-in zoom-in-95 duration-200 shadow-lg">
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Division Name"
                                    className="w-full text-sm bg-white border border-stone-200 rounded px-2 py-1.5 mb-2 focus:outline-none focus:ring-1 focus:ring-nobel-gold focus:border-nobel-gold transition-all"
                                    value={newDivisionName}
                                    onChange={e => setNewDivisionName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCreateDivision()}
                                />
                                <div className="flex gap-2 justify-end">
                                    <button onClick={dismissCreateDivision} className="text-xs text-stone-500 hover:text-stone-700 px-2 py-1">Cancel</button>
                                    <button onClick={handleCreateDivision} className="text-xs bg-black text-white px-2 py-1 rounded hover:bg-stone-800">Create</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content: Initiatives List */}
                <div className="flex-1 flex flex-col bg-transparent">
                    {activeDivision ? (
                        <>
                            <div className="p-6 border-b border-stone-200 bg-white flex items-center justify-between sticky top-0 z-10 shadow-sm">
                                <div>
                                    <h2 className="text-2xl font-bold text-stone-900">{activeDivision.name}</h2>
                                    <p className="text-stone-500 text-sm mt-0.5">Manage strategic initiatives.</p>
                                </div>
                                <button
                                    onClick={() => setIsCreatingInitiative(true)}
                                    className="px-4 py-2 bg-nobel-gold text-white rounded-lg text-sm font-bold hover:bg-[#a68546] transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    <Plus className="w-4 h-4" /> New Initiative
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {isCreatingInitiative && (
                                    <div className="mb-6 bg-white p-6 rounded-xl border border-stone-200 shadow-lg animate-in slide-in-from-top-4 ring-1 ring-stone-100">
                                        <h3 className="text-lg font-bold text-stone-800 mb-4">Create New Initiative</h3>
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-stone-500 uppercase">Title</label>
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    placeholder="e.g. Q1 Marketing Launch"
                                                    className="w-full text-lg font-medium border border-stone-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-nobel-gold/20 focus:border-nobel-gold transition-all"
                                                    value={newInitiativeTitle}
                                                    onChange={e => setNewInitiativeTitle(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-stone-500 uppercase">Description</label>
                                                <textarea
                                                    placeholder="Describe the goals and scope..."
                                                    className="w-full text-sm text-stone-600 bg-stone-50 rounded-lg p-3 border border-stone-200 focus:bg-white focus:border-nobel-gold focus:outline-none resize-none h-24 transition-all"
                                                    value={newInitiativeDesc}
                                                    onChange={e => setNewInitiativeDesc(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex justify-end gap-3 pt-2">
                                                <button onClick={dismissCreateInitiative} className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">Cancel</button>
                                                <button onClick={handleCreateInitiative} className="px-4 py-2 text-sm font-bold bg-stone-900 text-white rounded-lg hover:bg-stone-800 shadow-md transition-all">Create Initiative</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredInitiatives.map(initiative => (
                                        <div
                                            key={initiative._id}
                                            onClick={() => setSelectedInitiativeId(initiative._id)}
                                            className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm hover:shadow-xl hover:border-nobel-gold/30 hover:ring-1 hover:ring-nobel-gold/30 cursor-pointer transition-all group relative overflow-hidden flex flex-col h-64"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex gap-2">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${initiative.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                        initiative.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-stone-100 text-stone-600'
                                                        }`}>
                                                        {initiative.status}
                                                    </span>
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${initiative.priority === 'High' ? 'bg-red-50 text-red-600' :
                                                        initiative.priority === 'Medium' ? 'bg-orange-50 text-orange-600' :
                                                            'bg-stone-50 text-stone-500'
                                                        }`}>
                                                        {initiative.priority}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={(e) => handleDeleteInitiative(e, initiative._id, initiative.title)}
                                                    className="text-stone-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <h3 className="font-bold text-lg text-stone-900 mb-2 leading-tight font-serif group-hover:text-nobel-gold transition-colors">{initiative.title}</h3>
                                            <p className="text-stone-500 text-sm line-clamp-3 mb-4 flex-1">{initiative.description}</p>

                                            <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-medium text-stone-400">
                                                <div className="flex -space-x-2 overflow-hidden pl-1">
                                                    {initiative.assignedIds && initiative.assignedIds.length > 0 ? (
                                                        initiative.assignedIds.map(userId => {
                                                            const member = teamMembers?.find(tm => tm._id === userId);
                                                            return (
                                                                <div
                                                                    key={userId}
                                                                    className="w-6 h-6 rounded-full bg-nobel-gold text-white flex items-center justify-center border-2 border-white text-[10px] font-bold ring-1 ring-stone-100 hover:z-10 relative cursor-help transition-transform hover:scale-110"
                                                                    title={member?.name || 'User'}
                                                                >
                                                                    {member?.name.charAt(0) || 'U'}
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-stone-200 border-2 border-white flex items-center justify-center">
                                                            <UserIcon className="w-3 h-3 text-stone-400" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1">
                                                        <ChevronRight className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {filteredInitiatives.length === 0 && !isCreatingInitiative && (
                                        <div className="col-span-full py-20 text-center border-2 border-dashed border-stone-200 rounded-xl bg-stone-50/50">
                                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                                <Flag className="w-8 h-8 text-stone-300" />
                                            </div>
                                            <h3 className="text-lg text-stone-900 font-bold mb-1">No initiatives yet</h3>
                                            <p className="text-stone-500 text-sm mb-6 max-w-sm mx-auto">Start by creating your first initiative for {activeDivision.name} to track progress and assign tasks.</p>
                                            <button
                                                onClick={() => setIsCreatingInitiative(true)}
                                                className="px-6 py-2.5 bg-white border border-stone-200 text-stone-900 text-sm font-bold rounded-lg hover:border-nobel-gold hover:text-nobel-gold transition-all shadow-sm"
                                            >
                                                Create Initiative
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-transparent">
                            <div className="max-w-xl w-full text-center">
                                <div className="relative mb-8 group">
                                    <div className="absolute inset-0 bg-nobel-gold/5 blur-2xl rounded-full scale-110 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                    <img
                                        src="/images/initiatives.png"
                                        alt="Initiatives & Divisions"
                                        className="relative w-full aspect-video object-cover rounded-2xl border-[6px] border-white shadow-2xl rotate-1 hover:rotate-0 transition-transform duration-500"
                                    />
                                </div>
                                <h3 className="font-serif text-3xl text-stone-900 mb-3 italic">Organize Your Operations</h3>
                                <p className="text-stone-500 text-sm max-w-sm mx-auto leading-relaxed">
                                    Select or create a division from the sidebar to start managing your strategic initiatives, tracking progress, and aligning your team.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Slide-over: Initiative Details */}
            {selectedInitiativeId && (
                <InitiativeDetailPanel
                    initiativeId={selectedInitiativeId}
                    onClose={() => setSelectedInitiativeId(null)}
                    projectId={projectId}
                    fileSystem={fileSystem}
                />
            )}

            {/* Delete Confirmation Dialog */}
            {deleteModal && (
                <DeleteConfirmationDialog
                    isOpen={deleteModal.isOpen}
                    onClose={() => setDeleteModal(null)}
                    onConfirm={confirmDelete}
                    title={deleteModal.type === 'division' ? "Delete Division" : "Delete Initiative"}
                    description={deleteModal.type === 'division'
                        ? "Are you sure you want to delete this division? All associated initiatives will also be permanently deleted."
                        : "Are you sure you want to delete this initiative?"}
                    itemTitle={deleteModal.name}
                />
            )}
        </div>
    );
};

// --- Sub-Component: Detail Panel ---

const InitiativeDetailPanel: React.FC<{
    initiativeId: Id<"initiatives">,
    onClose: () => void,
    projectId: string
    fileSystem: any
}> = ({ initiativeId, onClose, projectId, fileSystem }) => {
    const details = useQuery(api.initiatives.getInitiativeDetails, { initiativeId });
    const updateInitiative = useUpdateInitiative();
    const addComment = useCreateInitiativeComment();
    const toggleAssignMember = useToggleInitiativeMember();
    const linkFile = useLinkFileToInitiative();
    const unlinkFile = useUnlinkFileFromInitiative();

    // Data Sources
    const teamMembers = useQuery(api.team.getTeam, { projectId: projectId as Id<"projects"> });

    const [commentText, setCommentText] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isSelectingFile, setIsSelectingFile] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);

    // File Browser State
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    // Edit State
    const [editData, setEditData] = useState({ title: '', description: '', status: '', priority: '' });

    useEffect(() => {
        if (details) {
            setEditData({
                title: details.title,
                description: details.description,
                status: details.status,
                priority: details.priority
            });
        }
    }, [details, isEditing]);

    const handleSave = async () => {
        setIsEditing(false);
        const promise = updateInitiative({
            initiativeId,
            title: editData.title,
            description: editData.description,
            status: editData.status,
            priority: editData.priority
        });
        toast.promise(promise, {
            loading: 'Saving changes...',
            success: 'Saved successfully',
            error: 'Failed to save'
        });
    };

    const handleAddComment = async () => {
        if (!commentText.trim()) return;
        const text = commentText;
        setCommentText(''); // Optimistic clear
        await addComment({ initiativeId, content: text });
    };

    const handleToggleAssign = async (userId: string) => {
        await toggleAssignMember({ initiativeId, userId });
    };

    const handleLinkFile = async (fileId: Id<"files">) => {
        setIsSelectingFile(false);
        await linkFile({ initiativeId, fileId });
        toast.success("File attached");
    };

    // --- Tree Builder Helpers ---
    const buildTree = () => {
        if (!fileSystem) return { tree: {}, rootFolders: [], rootFiles: [] };
        const { folders, files } = fileSystem;

        const tree: Record<string, { folder?: any, children: string[], files: any[] }> = {};
        const rootFolders: string[] = [];
        const rootFiles: any[] = [];

        // Initialize tree nodes
        folders.forEach((f: any) => {
            tree[f._id] = { folder: f, children: [], files: [] };
        });

        // Hierarchy
        folders.forEach((f: any) => {
            if (f.parentId && tree[f.parentId]) {
                tree[f.parentId].children.push(f._id);
            } else {
                rootFolders.push(f._id);
            }
        });

        // Distribute files
        files.forEach((f: any) => {
            if (f.folderId && tree[f.folderId]) {
                tree[f.folderId].files.push(f);
            } else {
                rootFiles.push(f);
            }
        });

        return { tree, rootFolders, rootFiles };
    };

    const toggleFolder = (e: React.MouseEvent, folderId: string) => {
        e.stopPropagation();
        const newSet = new Set(expandedFolders);
        if (newSet.has(folderId)) newSet.delete(folderId);
        else newSet.add(folderId);
        setExpandedFolders(newSet);
    };

    const renderFolder = (folderId: string, level = 0, tree: any) => {
        const node = tree[folderId];
        if (!node) return null;

        const isExpanded = expandedFolders.has(folderId);
        const hasChildren = node.children.length > 0 || node.files.length > 0;

        return (
            <div key={folderId} style={{ marginLeft: level * 12 }}>
                <div
                    onClick={(e) => toggleFolder(e, folderId)}
                    className="flex items-center gap-2 py-1.5 px-2 hover:bg-stone-50 rounded cursor-pointer text-sm text-stone-700 select-none"
                >
                    {hasChildren ? (
                        isExpanded ? <ChevronRight className="w-3 h-3 text-stone-400 rotate-90 transition-transform" /> : <ChevronRight className="w-3 h-3 text-stone-400" />
                    ) : <span className="w-3" />}

                    <Folder className="w-4 h-4 text-nobel-gold fill-nobel-gold/10" />
                    <span className="truncate flex-grow font-medium">{node.folder.name}</span>
                </div>

                {isExpanded && (
                    <div className="border-l border-stone-100 ml-2.5 pl-1">
                        {node.children.map((childId: string) => renderFolder(childId, level + 1, tree))}
                        {node.files.map((file: any) => renderFile(file, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    const renderFile = (file: any, level = 0) => {
        const isAttached = file.initiativeId === initiativeId;
        const isAttachedElse = file.initiativeId && file.initiativeId !== initiativeId;

        return (
            <div
                key={file._id}
                onClick={!isAttached && !isAttachedElse ? () => handleLinkFile(file._id) : undefined}
                className={`flex items-center gap-2 py-1.5 px-2 rounded text-sm ml-4 transition-colors ${isAttached ? 'text-green-600 bg-green-50 cursor-default' :
                    isAttachedElse ? 'text-stone-400 cursor-not-allowed opacity-50' :
                        'hover:bg-stone-50 text-stone-600 cursor-pointer'
                    }`}
                style={{ marginLeft: (level * 12) + 16 }}
            >
                <Paperclip className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{file.name}</span>
                {isAttached && <span className="text-[10px] ml-auto font-bold uppercase">Attached</span>}
            </div>
        );
    };

    if (!details) return null;

    const assignedUsers = details.assignedIds
        ? details.assignedIds.map(id => teamMembers?.find(tm => tm._id === id)).filter(Boolean)
        : [];

    const { tree, rootFolders, rootFiles } = buildTree();

    return (
        <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl border-l border-stone-200 transform transition-transform duration-300 z-50 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-900 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                    {isEditing ? (
                        <span className="text-sm font-bold text-nobel-gold animate-pulse">Editing Mode</span>
                    ) : (
                        <div className="flex gap-2">
                            {/* Status Pill */}
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide cursor-pointer hover:opacity-80 transition-opacity ${details.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                details.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                    'bg-stone-100 text-stone-600'
                                }`} onClick={() => setIsEditing(true)}>
                                {details.status}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    {isEditing ? (
                        <button onClick={handleSave} className="flex items-center gap-2 px-3 py-1.5 bg-nobel-gold text-white rounded-lg text-xs font-bold hover:bg-[#a68546]">
                            <Save className="w-3.5 h-3.5" /> Save Changes
                        </button>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-900 transition-colors">
                            <Edit className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 relative">
                {isEditing ? (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-stone-400 uppercase">Title</label>
                            <input
                                className="w-full text-xl font-bold font-serif border-b border-stone-300 pb-2 focus:outline-none focus:border-nobel-gold bg-transparent"
                                value={editData.title}
                                onChange={e => setEditData({ ...editData, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-stone-400 uppercase">Description</label>
                            <textarea
                                className="w-full text-sm text-stone-600 bg-stone-50 rounded-lg p-3 border border-stone-200 leading-relaxed min-h-[150px] focus:outline-none focus:border-nobel-gold"
                                value={editData.description}
                                onChange={e => setEditData({ ...editData, description: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-stone-400 uppercase">Status</label>
                                <select
                                    className="w-full p-2 bg-stone-50 rounded border border-stone-200 text-sm font-medium"
                                    value={editData.status}
                                    onChange={e => setEditData({ ...editData, status: e.target.value })}
                                >
                                    <option value="Planning">Planning</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Paused">Paused</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-stone-400 uppercase">Priority</label>
                                <select
                                    className="w-full p-2 bg-stone-50 rounded border border-stone-200 text-sm font-medium"
                                    value={editData.priority}
                                    onChange={e => setEditData({ ...editData, priority: e.target.value })}
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Critical">Critical</option>
                                </select>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold text-stone-900 mb-4 font-serif leading-tight">{details.title}</h2>

                        <div className="flex items-center justify-between mb-8 pb-8 border-b border-stone-100">
                            <div className="flex items-center gap-4">
                                <div>
                                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Assigned Team</div>
                                    <div className="flex items-center gap-2 cursor-pointer hover:bg-stone-50 p-1 rounded -ml-1 pr-3 transition-colors relative" onClick={() => setIsAssigning(!isAssigning)}>

                                        <div className="flex -space-x-2">
                                            {assignedUsers.length > 0 ? (
                                                assignedUsers.map((u, i) => (
                                                    <div key={i} className="w-8 h-8 rounded-full bg-nobel-gold text-white text-[10px] font-bold flex items-center justify-center border-2 border-white ring-1 ring-stone-100" title={u?.name}>
                                                        {u?.name.charAt(0)}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center border border-dashed border-stone-300">
                                                    <Plus className="w-4 h-4" />
                                                </div>
                                            )}
                                        </div>

                                        <span className="text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors ml-1">
                                            {assignedUsers.length === 0 ? 'Assign Members' : 'Manage Team'}
                                        </span>
                                    </div>

                                    {isAssigning && (
                                        <div className="absolute mt-2 w-56 bg-white shadow-xl rounded-lg border border-stone-100 py-1 z-20 animate-in fade-in zoom-in-95">
                                            <div className="px-3 py-2 text-xs font-bold text-stone-400 uppercase border-b border-stone-50">Select Members</div>
                                            <div className="max-h-48 overflow-y-auto">
                                                {teamMembers?.map(tm => {
                                                    const isAssigned = details.assignedIds?.includes(tm._id);
                                                    return (
                                                        <button
                                                            key={tm._id}
                                                            onClick={() => handleToggleAssign(tm._id)}
                                                            className="w-full text-left px-4 py-2 text-sm hover:bg-stone-50 flex items-center justify-between group"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-stone-200 text-xs flex items-center justify-center">{tm.name.charAt(0)}</div>
                                                                <span className={isAssigned ? 'font-bold text-stone-900' : 'text-stone-600'}>{tm.name}</span>
                                                            </div>
                                                            {isAssigned && <Check className="w-4 h-4 text-nobel-gold" />}
                                                        </button>
                                                    );
                                                })}
                                                {(!teamMembers || teamMembers.length === 0) && (
                                                    <div className="px-4 py-2 text-xs text-stone-400 italic">No team members found</div>
                                                )}
                                            </div>
                                            <div className="border-t border-stone-50 p-2 text-center">
                                                <button onClick={() => setIsAssigning(false)} className="text-xs text-stone-500 hover:text-stone-800">Done</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="text-stone-600 text-[15px] whitespace-pre-wrap leading-relaxed mb-8">
                            {details.description}
                        </div>
                    </>
                )}

                <div className="space-y-8 mt-8">
                    {/* Files Section */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-2">
                                <Paperclip className="w-3 h-3" /> Attachments
                            </h3>
                            <button
                                onClick={() => setIsSelectingFile(true)}
                                className="text-xs font-bold text-nobel-gold hover:text-[#a68546] hover:underline flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" /> Add File
                            </button>
                        </div>

                        {/* File Picker Dialog */}
                        {isSelectingFile && (
                            <div className="absolute inset-x-8 bg-white border border-stone-200 shadow-2xl rounded-xl p-4 z-20 animate-in slide-in-from-top-2 max-h-80 overflow-y-auto flex flex-col">
                                <div className="flex justify-between items-center mb-3 pb-2 border-b border-stone-100 shrink-0">
                                    <h4 className="text-sm font-bold flex items-center gap-2">
                                        <Folder className="w-4 h-4 text-stone-400" /> Select File
                                    </h4>
                                    <button onClick={() => setIsSelectingFile(false)}><X className="w-4 h-4 text-stone-400" /></button>
                                </div>
                                <div className="space-y-0.5 overflow-y-auto flex-1 min-h-[100px]">
                                    {(!fileSystem || (rootFolders.length === 0 && rootFiles.length === 0)) ? (
                                        <div className="text-xs text-stone-400 italic p-2 text-center">No files found.</div>
                                    ) : (
                                        <>
                                            {rootFolders.map(fid => renderFolder(fid, 0, tree))}
                                            {rootFiles.map(f => renderFile(f, 0))}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {details.files?.length === 0 ? (
                            <div className="text-sm text-stone-400 italic bg-stone-50 p-4 rounded-lg border border-dashed border-stone-200 text-center">
                                No files attached. Add files to track documents.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {details.files?.map(file => (
                                    <div key={file._id} className="flex items-center gap-3 p-3 rounded-lg border border-stone-200 bg-white hover:border-nobel-gold/50 cursor-pointer group transition-all">
                                        <div className="w-8 h-8 bg-stone-100 rounded flex items-center justify-center group-hover:bg-nobel-gold group-hover:text-white transition-colors">
                                            <Paperclip className="w-4 h-4 text-stone-500 group-hover:text-white" />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="text-sm font-medium text-stone-900 truncate">{file.name}</div>
                                            <div className="text-[10px] text-stone-400">{(file.size / 1024).toFixed(1)} KB</div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); unlinkFile({ fileId: file._id }); }}
                                            className="p-1 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Comments Section */}
                    <div>
                        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <MessageSquare className="w-3 h-3" /> Discussion
                        </h3>
                        <div className="space-y-6 mb-6">
                            {details.comments?.map(comment => (
                                <div key={comment._id} className="flex gap-3 group">
                                    <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm mt-1">
                                        {comment.userName.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-sm font-bold text-stone-900">{comment.userName}</span>
                                            <span className="text-xs text-stone-400">{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="text-sm text-stone-700 mt-1 leading-relaxed">
                                            {comment.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {details.comments?.length === 0 && (
                                <div className="text-center py-8">
                                    <div className="w-10 h-10 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <MessageSquare className="w-5 h-5 text-stone-300" />
                                    </div>
                                    <p className="text-sm text-stone-400">No comments yet. Start the conversation.</p>
                                </div>
                            )}
                        </div>

                        {/* Comment Input */}
                        <div className="flex gap-3 items-start bg-stone-50 p-4 rounded-xl border border-stone-100">
                            <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-400 flex-shrink-0">
                                <UserIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 relative">
                                <textarea
                                    className="w-full bg-white border border-stone-200 rounded-lg pl-3 pr-10 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-nobel-gold resize-none min-h-[40px]"
                                    placeholder="Write a comment..."
                                    rows={1}
                                    value={commentText}
                                    onChange={e => setCommentText(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAddComment();
                                        }
                                    }}
                                />
                                <button
                                    onClick={handleAddComment}
                                    disabled={!commentText.trim()}
                                    className="absolute right-2 bottom-2 p-1 text-nobel-gold hover:text-[#a68546] disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                                >
                                    <ChevronRight className="w-4 h-4 stroke-[3px]" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
