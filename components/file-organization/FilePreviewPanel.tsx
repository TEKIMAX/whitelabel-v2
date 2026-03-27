import React, { useState, useEffect } from 'react';
import {
    X, Music, File as FileIcon, Download, Link2, Copy, Clock, Key, Loader2, Trash2,
    ExternalLink, Edit2, Check, QrCode, Shield, BarChart3, History, Users, Droplets
} from 'lucide-react';
import { getFileIcon, formatSize } from './utils';
import { File as FileDoc } from '../../types';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { ShareAnalyticsSheet } from './ShareAnalyticsSheet';
import { FileVersionsSheet } from './FileVersionsSheet';
import { CollaboratorsDialog } from './CollaboratorsDialog';

const EXPIRY_OPTIONS = [
    { label: '1 hour', value: 60 * 60 * 1000 },
    { label: '24 hours', value: 24 * 60 * 60 * 1000 },
    { label: '7 days', value: 7 * 24 * 60 * 60 * 1000 },
    { label: '30 days', value: 30 * 24 * 60 * 60 * 1000 },
    { label: 'Never', value: 0 },
];

interface FilePreviewPanelProps {
    selectedFile: FileDoc | null;
    onClose: () => void;
    handleDownload: (file: FileDoc) => void;
}

export const FilePreviewPanel: React.FC<FilePreviewPanelProps> = ({
    selectedFile,
    onClose,
    handleDownload
}) => {
    // Share link state
    const [showShareCreator, setShowShareCreator] = useState(false);
    const [linkExpiry, setLinkExpiry] = useState(7 * 24 * 60 * 60 * 1000);
    const [linkMaxUses, setLinkMaxUses] = useState<number | undefined>(undefined);
    const [linkPassword, setLinkPassword] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Editing state
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editTagInput, setEditTagInput] = useState('');

    // Dialog state
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [showVersions, setShowVersions] = useState(false);
    const [showCollaborators, setShowCollaborators] = useState(false);
    const [showQR, setShowQR] = useState<string | null>(null);

    // Watermark local state (optimistic)
    const [watermarkOn, setWatermarkOn] = useState(false);

    // Mutations
    const createShareableLink = useMutation(api.filesControl.createShareableLink);
    const deleteShareLink = useMutation(api.filesControl.deleteShareLink);
    const updateFile = useMutation(api.files.updateFile);
    const toggleWatermark = useMutation(api.files.toggleWatermark);

    // Queries
    const existingLinks = useQuery(
        api.filesControl.getShareLinksForFile,
        selectedFile?.storageId ? { storageId: selectedFile.storageId as any } : "skip"
    ) || [];

    const hasActiveLinks = existingLinks.length > 0;

    // Reset edit state when file changes
    useEffect(() => {
        if (selectedFile) {
            setEditName(selectedFile.name);
            setEditDescription((selectedFile as any).description || '');
            setIsEditing(false);
            setWatermarkOn((selectedFile as any).watermarkEnabled || false);
        }
    }, [selectedFile?._id, (selectedFile as any)?.watermarkEnabled]);

    const handleCreateLink = async () => {
        if (!selectedFile?.storageId) return;
        setIsGenerating(true);
        try {
            await createShareableLink({
                storageId: selectedFile.storageId as any,
                fileName: selectedFile.name,
                expiresInMs: linkExpiry || undefined,
                maxUses: linkMaxUses,
                password: linkPassword || undefined,
            });
            toast.success("Shareable link created!");
            setShowShareCreator(false);
            setLinkPassword('');
            setLinkMaxUses(undefined);
        } catch (e: any) {
            toast.error(e.message || "Failed to create link");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyLink = (url: string) => {
        navigator.clipboard.writeText(url);
        toast.success("Link copied!");
    };

    const handleUnshare = async (linkId: any) => {
        try {
            await deleteShareLink({ linkId });
            toast.success("Share link removed");
        } catch (e: any) {
            toast.error(e.message || "Failed to remove link");
        }
    };

    const handleSaveMetadata = async () => {
        if (!selectedFile) return;
        try {
            const tags = editTagInput
                ? editTagInput.split(',').map(t => ({ name: t.trim(), color: '#6b7280' }))
                : (selectedFile.tags || []);
            await updateFile({
                fileId: selectedFile._id as any,
                name: editName,
                description: editDescription || undefined,
                tags,
            });
            toast.success("File updated");
            setIsEditing(false);
        } catch (e: any) {
            toast.error(e.message || "Failed to update");
        }
    };

    const handleToggleWatermark = async () => {
        if (!selectedFile) return;
        const newValue = !watermarkOn;
        setWatermarkOn(newValue); // Optimistic update
        try {
            await toggleWatermark({ fileId: selectedFile._id as any, enabled: newValue });
            toast.success(newValue ? "Watermark enabled" : "Watermark disabled");
        } catch (e: any) {
            setWatermarkOn(!newValue); // Revert on error
            toast.error(e.message || "Failed to toggle watermark");
        }
    };

    const formatExpiry = (expiresAt: number | null) => {
        if (!expiresAt) return "Never";
        const diff = expiresAt - Date.now();
        if (diff <= 0) return "Expired";
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        if (days > 0) return `${days}d left`;
        if (hours > 0) return `${hours}h left`;
        return `${Math.floor(diff / (1000 * 60))}m left`;
    };

    const resetShareState = () => {
        setShowShareCreator(false);
        setLinkPassword('');
        setLinkMaxUses(undefined);
        setLinkExpiry(7 * 24 * 60 * 60 * 1000);
    };

    // Simple QR code SVG generator (data URL based)
    const generateQRDataUrl = (text: string) => {
        // Encode the URL into a Google Charts QR code API (simple, no dependencies)
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
    };

    return (
        <>
            <div className={`absolute top-0 right-0 h-full w-full md:w-[60%] lg:w-[50%] xl:w-[40%] bg-white border-l border-stone-200 shadow-2xl transform transition-transform duration-300 z-40 flex flex-col ${selectedFile ? 'translate-x-0' : 'translate-x-full'}`}>
                {selectedFile && (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50 flex-shrink-0">
                            <div className="flex items-center gap-3 overflow-hidden">
                                {getFileIcon(selectedFile.type)}
                                <h2 className="text-lg font-bold text-stone-900 truncate" title={selectedFile.name}>{selectedFile.name}</h2>
                            </div>
                            <button onClick={() => { onClose(); resetShareState(); setIsEditing(false); }} className="text-stone-400 hover:text-stone-900">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-grow flex flex-col min-h-0 bg-stone-50/50 overflow-y-auto">
                            {/* Preview Area */}
                            <div className="flex-grow relative overflow-hidden flex items-center justify-center bg-stone-100 min-h-[200px]">
                                {selectedFile.type.startsWith('image/') ? (
                                    <img src={selectedFile.url} alt={selectedFile.name} className="max-w-full max-h-full object-contain p-4" />
                                ) : selectedFile.type.startsWith('video/') ? (
                                    <video src={selectedFile.url} controls className="max-w-full max-h-full" />
                                ) : selectedFile.type.startsWith('audio/') ? (
                                    <div className="w-full p-8 flex flex-col items-center justify-center">
                                        <Music className="w-16 h-16 text-stone-300 mb-4" />
                                        <audio src={selectedFile.url} controls className="w-full max-w-md" />
                                    </div>
                                ) : selectedFile.type === 'application/pdf' ? (
                                    <iframe src={selectedFile.url} className="w-full h-full border-none" title="PDF Preview" />
                                ) : (
                                    <div className="text-center p-8">
                                        <FileIcon className="w-16 h-16 text-stone-300 mx-auto mb-4" />
                                        <p className="text-stone-500">Preview not available.</p>
                                    </div>
                                )}
                            </div>

                            {/* Details + Actions */}
                            <div className="p-5 bg-white border-t border-stone-200 flex-shrink-0 space-y-4">

                                {/* === FILE DETAILS (Editable) === */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-stone-400">File Details</label>
                                        <button
                                            onClick={() => {
                                                if (isEditing) handleSaveMetadata();
                                                else {
                                                    setEditName(selectedFile.name);
                                                    setEditDescription((selectedFile as any).description || '');
                                                    setEditTagInput(selectedFile.tags?.map(t => t.name).join(', ') || '');
                                                    setIsEditing(true);
                                                }
                                            }}
                                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${isEditing ? 'bg-teal-500 text-white hover:bg-teal-600' : 'text-stone-400 hover:bg-stone-100'}`}
                                        >
                                            {isEditing ? <><Check size={10} /> Save</> : <><Edit2 size={10} /> Edit</>}
                                        </button>
                                    </div>

                                    {isEditing ? (
                                        <div className="space-y-2">
                                            <input value={editName} onChange={(e) => setEditName(e.target.value)}
                                                className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-nobel-gold" placeholder="File name" />
                                            <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                                                className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-nobel-gold resize-none" rows={2} placeholder="Description" />
                                            <input value={editTagInput} onChange={(e) => setEditTagInput(e.target.value)}
                                                className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-nobel-gold" placeholder="Tags (comma separated)" />
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <span className="text-stone-500 block text-xs">Size</span>
                                                    <span className="font-medium text-stone-900">{formatSize(selectedFile.size)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-stone-500 block text-xs">Type</span>
                                                    <span className="font-medium text-stone-900 truncate block" title={selectedFile.type}>{selectedFile.type}</span>
                                                </div>
                                            </div>
                                            {(selectedFile as any).description && (
                                                <div>
                                                    <span className="text-stone-500 text-xs">Description</span>
                                                    <p className="text-sm text-stone-700">{(selectedFile as any).description}</p>
                                                </div>
                                            )}
                                            {selectedFile.tags && selectedFile.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {selectedFile.tags.map((tag, idx) => (
                                                        <span key={idx} className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full text-[10px] font-medium">{tag.name}</span>
                                                    ))}
                                                </div>
                                            )}
                                            <div>
                                                <span className="text-stone-500 text-xs">Uploaded </span>
                                                <span className="text-xs text-stone-700">{new Date(selectedFile.createdAt).toLocaleDateString()} {new Date(selectedFile.createdAt).toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* === WATERMARK TOGGLE (hidden for now) === */}

                                {/* === TOOL BUTTONS ROW === */}
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setShowAnalytics(true)}
                                        className="flex flex-col items-center gap-1 py-2 px-2 bg-stone-50 border border-stone-100 rounded-lg hover:bg-stone-100 transition-colors"
                                    >
                                        <BarChart3 size={14} className="text-stone-500" />
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-stone-500">Analytics</span>
                                    </button>
                                    <button
                                        onClick={() => setShowVersions(true)}
                                        className="flex flex-col items-center gap-1 py-2 px-2 bg-stone-50 border border-stone-100 rounded-lg hover:bg-stone-100 transition-colors"
                                    >
                                        <History size={14} className="text-stone-500" />
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-stone-500">Versions</span>
                                    </button>
                                    <button
                                        onClick={() => setShowCollaborators(true)}
                                        className="flex flex-col items-center gap-1 py-2 px-2 bg-stone-50 border border-stone-100 rounded-lg hover:bg-stone-100 transition-colors"
                                    >
                                        <Users size={14} className="text-stone-500" />
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-stone-500">Access</span>
                                    </button>
                                </div>

                                {/* === MAIN ACTION BUTTONS === */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleDownload(selectedFile)}
                                        className="flex items-center justify-center gap-2 flex-1 py-3 bg-stone-900 text-white rounded-lg font-bold uppercase tracking-wider text-xs hover:bg-nobel-gold transition-colors"
                                    >
                                        <Download className="w-4 h-4" /> Download
                                    </button>
                                    <button
                                        onClick={() => setShowShareCreator(!showShareCreator)}
                                        className={`flex items-center justify-center gap-2 flex-1 py-3 rounded-lg font-bold uppercase tracking-wider text-xs transition-colors ${hasActiveLinks || showShareCreator
                                            ? 'bg-teal-500 text-white hover:bg-teal-600'
                                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
                                            }`}
                                    >
                                        <Link2 className="w-4 h-4" />
                                        {hasActiveLinks ? `Shared (${existingLinks.length})` : 'Share Link'}
                                    </button>
                                </div>

                                {/* === ACTIVE SHARE LINKS === */}
                                {hasActiveLinks && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-stone-400 block">Active Share Links</label>
                                        {existingLinks.map((link) => (
                                            <div key={link._id} className="bg-teal-50 border border-teal-100 rounded-lg p-3 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Link2 size={12} className="text-teal-600 shrink-0" />
                                                    <input value={link.url} readOnly className="flex-1 bg-transparent text-xs text-teal-800 font-mono truncate focus:outline-none" />
                                                    <button onClick={() => handleCopyLink(link.url)} className="p-1.5 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors shrink-0" title="Copy">
                                                        <Copy size={10} />
                                                    </button>
                                                    <button onClick={() => setShowQR(showQR === link.token ? null : link.url)} className="p-1.5 bg-teal-100 text-teal-600 rounded-md hover:bg-teal-200 transition-colors shrink-0" title="QR Code">
                                                        <QrCode size={10} />
                                                    </button>
                                                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-teal-100 text-teal-600 rounded-md hover:bg-teal-200 transition-colors shrink-0" title="Open">
                                                        <ExternalLink size={10} />
                                                    </a>
                                                </div>

                                                {/* QR Code */}
                                                {showQR === link.url && (
                                                    <div className="flex justify-center py-2 animate-in fade-in duration-200">
                                                        <img src={generateQRDataUrl(link.url)} alt="QR Code" className="w-36 h-36 rounded-lg border border-teal-100" />
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 text-[10px] text-teal-700">
                                                        <span className="flex items-center gap-1"><Clock size={9} /> {formatExpiry(link.expiresAt)}</span>
                                                        <span>{link.useCount}{link.maxUses ? `/${link.maxUses}` : ''} downloads</span>
                                                        {link.hasPassword && <span className="flex items-center gap-1"><Key size={9} /> Password</span>}
                                                    </div>
                                                    <button onClick={() => handleUnshare(link._id)} className="flex items-center gap-1 px-2 py-1 text-[10px] text-red-500 hover:bg-red-50 rounded-md font-medium transition-colors">
                                                        <Trash2 size={10} /> Unshare
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* === CREATE SHARE LINK FORM === */}
                                {(showShareCreator || hasActiveLinks) && (
                                    <div className="space-y-3 bg-stone-50 p-3 rounded-lg border border-stone-100">
                                        <label className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
                                            {hasActiveLinks ? 'Create Another Link' : 'New Share Link'}
                                        </label>
                                        <div>
                                            <label className="text-xs font-medium text-stone-600 mb-1 block">Expiration</label>
                                            <select value={linkExpiry} onChange={(e) => setLinkExpiry(Number(e.target.value))}
                                                className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-nobel-gold">
                                                {EXPIRY_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-stone-600 mb-1 block">Max Downloads</label>
                                            <input type="number" min={1} value={linkMaxUses || ''} onChange={(e) => setLinkMaxUses(e.target.value ? Number(e.target.value) : undefined)}
                                                placeholder="Unlimited" className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-nobel-gold" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-stone-600 mb-1 block">Password</label>
                                            <input type="text" value={linkPassword} onChange={(e) => setLinkPassword(e.target.value)}
                                                placeholder="Optional" className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-nobel-gold" />
                                        </div>
                                        <button onClick={handleCreateLink} disabled={isGenerating}
                                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-nobel-gold transition-colors disabled:opacity-50">
                                            {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                                            {isGenerating ? 'Generating...' : 'Generate Link'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* === DIALOGS/SHEETS === */}
            {selectedFile && (
                <>
                    <ShareAnalyticsSheet
                        storageId={selectedFile.storageId}
                        fileName={selectedFile.name}
                        isOpen={showAnalytics}
                        onClose={() => setShowAnalytics(false)}
                    />
                    <FileVersionsSheet
                        fileId={selectedFile._id}
                        fileName={selectedFile.name}
                        isOpen={showVersions}
                        onClose={() => setShowVersions(false)}
                    />
                    <CollaboratorsDialog
                        fileId={selectedFile._id}
                        fileName={selectedFile.name}
                        currentCollaborators={(selectedFile as any).collaborators || []}
                        isOpen={showCollaborators}
                        onClose={() => setShowCollaborators(false)}
                    />
                </>
            )}
        </>
    );
};
