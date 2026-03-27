import React, { useState } from 'react';
import { X, UserPlus, Users, Trash2 } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';

interface CollaboratorsDialogProps {
    fileId: string;
    fileName: string;
    currentCollaborators: string[];
    isOpen: boolean;
    onClose: () => void;
}

export const CollaboratorsDialog: React.FC<CollaboratorsDialogProps> = ({
    fileId, fileName, currentCollaborators, isOpen, onClose
}) => {
    const [email, setEmail] = useState('');
    const updateCollaborators = useMutation(api.files.updateCollaborators);

    // Look up users for display names
    const me = useQuery(api.users.getUser);

    const handleAdd = async () => {
        if (!email.trim()) return;
        try {
            const updated = [...currentCollaborators, email.trim()];
            await updateCollaborators({ fileId: fileId as any, collaborators: updated });
            toast.success(`Added ${email.trim()}`);
            setEmail('');
        } catch (e: any) {
            toast.error(e.message || "Failed to add collaborator");
        }
    };

    const handleRemove = async (userId: string) => {
        try {
            const updated = currentCollaborators.filter(c => c !== userId);
            await updateCollaborators({ fileId: fileId as any, collaborators: updated });
            toast.success("Collaborator removed");
        } catch (e: any) {
            toast.error(e.message || "Failed to remove collaborator");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-5 border-b border-stone-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-stone-900">Collaborators</h2>
                        <p className="text-xs text-stone-500 mt-0.5 truncate">{fileName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Add Collaborator */}
                <div className="p-5 border-b border-stone-100">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2 block">Add by Email or User ID</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="user@example.com"
                            className="flex-1 text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-nobel-gold"
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                        <button
                            onClick={handleAdd}
                            disabled={!email.trim()}
                            className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-nobel-gold transition-colors disabled:opacity-50"
                        >
                            <UserPlus size={12} /> Add
                        </button>
                    </div>
                </div>

                {/* Current Collaborators */}
                <div className="p-5 max-h-64 overflow-y-auto">
                    {currentCollaborators.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-stone-400">
                            <Users size={28} className="mb-2 opacity-50" />
                            <p className="text-sm">No collaborators yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {currentCollaborators.map((userId, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-stone-50 border border-stone-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-nobel-gold/20 flex items-center justify-center">
                                            <Users size={14} className="text-nobel-gold" />
                                        </div>
                                        <span className="text-sm text-stone-700 font-medium truncate">{userId}</span>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(userId)}
                                        className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
