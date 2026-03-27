
import React, { useState } from 'react';
import { X, Search, Check, Shield, Lock, Unlock, Link2, Copy, Clock, Key, Trash2, Loader2 } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from "../../convex/_generated/api";
import { Id } from '../../convex/_generated/dataModel';
import { useUpdateDocument } from '../../hooks/useUpdate';
import { toast } from 'sonner';

interface ShareDialogProps {
    isOpen: boolean;
    onClose: () => void;
    docId: Id<"documents">;
    docTitle: string;
    orgId: string;
    currentCollaborators: string[];
    isLocked: boolean;
    creatorId?: string;
    me: any;
    storageId?: string; // For file-backed documents
}

const EXPIRY_OPTIONS = [
    { label: '1 hour', value: 60 * 60 * 1000 },
    { label: '24 hours', value: 24 * 60 * 60 * 1000 },
    { label: '7 days', value: 7 * 24 * 60 * 60 * 1000 },
    { label: '30 days', value: 30 * 24 * 60 * 60 * 1000 },
    { label: 'Never', value: 0 },
];

export const ShareDialog: React.FC<ShareDialogProps> = ({
    isOpen,
    onClose,
    docId,
    docTitle,
    orgId,
    currentCollaborators = [],
    isLocked,
    creatorId,
    me,
    storageId,
}) => {
    const updateDocument = useUpdateDocument();
    const users = useQuery(api.users.listByOrg, { orgId });
    const [searchQuery, setSearchQuery] = useState('');

    // Shareable Link State
    const [showLinkCreator, setShowLinkCreator] = useState(false);
    const [linkExpiry, setLinkExpiry] = useState(7 * 24 * 60 * 60 * 1000); // Default 7 days
    const [linkMaxUses, setLinkMaxUses] = useState<number | undefined>(undefined);
    const [linkPassword, setLinkPassword] = useState('');
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const createShareableLink = useMutation(api.filesControl.createShareableLink);

    if (!isOpen) return null;

    const filteredUsers = (users || []).filter(u =>
        u._id !== me?._id &&
        (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const isOwner = me?._id === creatorId;

    const handleToggleCollaborator = async (userId: string) => {
        if (!isOwner) {
            toast.error("Only the document owner can manage collaborators");
            return;
        }

        const isCollaborator = currentCollaborators.includes(userId);
        let newCollaborators;

        if (isCollaborator) {
            newCollaborators = currentCollaborators.filter(id => id !== userId);
            toast.success("Removed collaborator");
        } else {
            newCollaborators = [...currentCollaborators, userId];
            toast.success("Added collaborator");
        }

        await updateDocument({
            id: docId,
            collaborators: newCollaborators
        });
    };

    const handleToggleLock = async () => {
        if (!isOwner) {
            toast.error("Only the document owner can lock/unlock");
            return;
        }
        await updateDocument({
            id: docId,
            isLocked: !isLocked
        });
        toast.success(isLocked ? "Document Unlocked" : "Document Locked");
    };

    const handleCreateLink = async () => {
        if (!storageId) {
            toast.error("This document doesn't have a file attachment to share via link.");
            return;
        }

        setIsGenerating(true);
        try {
            const result = await createShareableLink({
                storageId,
                fileName: docTitle.endsWith('.md') ? docTitle : `${docTitle}.md`,
                expiresInMs: linkExpiry || undefined,
                maxUses: linkMaxUses,
                password: linkPassword || undefined,
            });

            setGeneratedLink(result.url);
            toast.success("Shareable link created!");
        } catch (e: any) {
            toast.error(e.message || "Failed to create link");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyLink = () => {
        if (generatedLink) {
            navigator.clipboard.writeText(generatedLink);
            toast.success("Link copied to clipboard!");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-nobel-gold" />
                            Share "{docTitle}"
                        </h2>
                        <p className="text-xs text-stone-500 mt-1">Manage access and collaboration</p>
                    </div>
                    <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100"><X size={20} /></button>
                </div>

                {/* Content */}
                <div className="p-0 overflow-y-auto flex-1">
                    {/* General Access */}
                    <div className="p-4 border-b border-stone-100">
                        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">General Access</h3>
                        <div className="flex items-center justify-between bg-stone-50 p-3 rounded-lg border border-stone-100">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${isLocked ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                                    {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-stone-800">
                                        {isLocked ? "Restricted Access" : "Organization Access"}
                                    </div>
                                    <div className="text-xs text-stone-500">
                                        {isLocked
                                            ? "Only added collaborators can edit this document."
                                            : "Anyone in the organization can edit."}
                                    </div>
                                </div>
                            </div>
                            {isOwner && (
                                <button
                                    onClick={handleToggleLock}
                                    className="text-xs font-medium text-nobel-gold hover:text-nobel-dark hover:underline px-2 py-1"
                                >
                                    {isLocked ? "Unlock" : "Lock"}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Shareable Link Section */}
                    <div className="p-4 border-b border-stone-100">
                        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Shareable Link</h3>

                        {generatedLink ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 bg-green-50 p-3 rounded-lg border border-green-100">
                                    <Link2 size={16} className="text-green-600 shrink-0" />
                                    <input
                                        value={generatedLink}
                                        readOnly
                                        className="flex-1 bg-transparent text-xs text-green-800 font-mono truncate focus:outline-none"
                                    />
                                    <button
                                        onClick={handleCopyLink}
                                        className="p-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shrink-0"
                                        title="Copy link"
                                    >
                                        <Copy size={12} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-stone-500">
                                    {linkExpiry ? (
                                        <span className="flex items-center gap-1">
                                            <Clock size={10} /> Expires in {EXPIRY_OPTIONS.find(o => o.value === linkExpiry)?.label}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1"><Clock size={10} /> No expiration</span>
                                    )}
                                    {linkMaxUses && (
                                        <span>Max {linkMaxUses} downloads</span>
                                    )}
                                    {linkPassword && (
                                        <span className="flex items-center gap-1"><Key size={10} /> Password protected</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => {
                                        setGeneratedLink(null);
                                        setShowLinkCreator(false);
                                    }}
                                    className="text-xs text-stone-500 hover:text-nobel-gold transition-colors"
                                >
                                    Create another link
                                </button>
                            </div>
                        ) : showLinkCreator ? (
                            <div className="space-y-3 bg-stone-50 p-3 rounded-lg border border-stone-100">
                                {/* Expiration */}
                                <div>
                                    <label className="text-xs font-medium text-stone-600 mb-1 block">Expiration</label>
                                    <select
                                        value={linkExpiry}
                                        onChange={(e) => setLinkExpiry(Number(e.target.value))}
                                        className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-nobel-gold"
                                    >
                                        {EXPIRY_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Max Downloads */}
                                <div>
                                    <label className="text-xs font-medium text-stone-600 mb-1 block">Max Downloads (optional)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={linkMaxUses || ''}
                                        onChange={(e) => setLinkMaxUses(e.target.value ? Number(e.target.value) : undefined)}
                                        placeholder="Unlimited"
                                        className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-nobel-gold"
                                    />
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="text-xs font-medium text-stone-600 mb-1 block">Password (optional)</label>
                                    <input
                                        type="text"
                                        value={linkPassword}
                                        onChange={(e) => setLinkPassword(e.target.value)}
                                        placeholder="Leave empty for no password"
                                        className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-nobel-gold"
                                    />
                                </div>

                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={handleCreateLink}
                                        disabled={isGenerating || !storageId}
                                        className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-nobel-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                                        {isGenerating ? 'Generating...' : 'Generate Link'}
                                    </button>
                                    <button
                                        onClick={() => setShowLinkCreator(false)}
                                        className="px-3 py-2 text-xs text-stone-500 hover:text-stone-700"
                                    >
                                        Cancel
                                    </button>
                                </div>

                                {!storageId && (
                                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-md border border-amber-100">
                                        This document doesn't have a file attachment. Shareable links work with uploaded files.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowLinkCreator(true)}
                                className="flex items-center gap-2 w-full p-3 bg-stone-50 rounded-lg border border-stone-100 hover:border-nobel-gold/50 hover:bg-nobel-gold/5 transition-all text-sm text-stone-600 hover:text-nobel-dark"
                            >
                                <Link2 size={16} className="text-nobel-gold" />
                                <span className="font-medium">Create Shareable Link</span>
                                <span className="text-xs text-stone-400 ml-auto">Expiring, password-protected</span>
                            </button>
                        )}
                    </div>

                    {/* Add People */}
                    <div className="p-4 pb-0">
                        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Add People</h3>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name or email..."
                                className="w-full pl-9 pr-4 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold/50"
                            />
                        </div>
                    </div>

                    {/* Users List */}
                    <div className="flex-1 overflow-y-auto min-h-[200px] px-4 pb-4 space-y-1">
                        {!users ? (
                            <div className="flex items-center justify-center py-8 text-stone-400">Loading users...</div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="text-center py-8 text-stone-400 text-sm">No users found</div>
                        ) : (
                            filteredUsers.map(user => {
                                const isCollaborator = currentCollaborators.includes(user._id);
                                return (
                                    <div key={user._id} className="flex items-center justify-between p-2 hover:bg-stone-50 rounded-lg transition-colors group">
                                        <div className="flex items-center gap-3">
                                            {user.pictureUrl ? (
                                                <img src={user.pictureUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-nobel-gold/20 flex items-center justify-center text-nobel-gold font-bold text-xs">
                                                    {(user.name || user.email || "?")[0].toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <div className="text-sm font-medium text-stone-800">{user.name || "Unknown User"}</div>
                                                <div className="text-xs text-stone-500">{user.email}</div>
                                            </div>
                                        </div>

                                        {isOwner && (
                                            <button
                                                onClick={() => handleToggleCollaborator(user._id)}
                                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${isCollaborator
                                                    ? "text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100"
                                                    : "text-nobel-dark border border-stone-200 hover:border-nobel-gold hover:text-nobel-gold"
                                                    }`}
                                            >
                                                {isCollaborator ? "Remove" : "Add"}
                                            </button>
                                        )}
                                        {!isOwner && isCollaborator && (
                                            <span className="text-xs text-stone-400 px-3">Collaborator</span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-stone-200 text-stone-600 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
