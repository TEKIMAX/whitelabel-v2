import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from "../../convex/_generated/api";
import { Id } from '../../convex/_generated/dataModel';
import { useUpdateDocument, useSignDocument } from '../../hooks/useUpdate';
import { Plus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { SignatureDialog } from './SignatureDialog';
import { SignatureItem } from './SignatureItem';

interface Signer {
    userId: string;
    role?: string;
    status: string; // 'pending' | 'signed'
    signedAt?: number;
    ipAddress?: string;
    signatureData?: string;
    signatureType?: 'text' | 'draw';
}

interface SignatureSectionProps {
    documentId: Id<"documents">;
    signers: Signer[];
    isOwner: boolean;
    meId: string;
    orgId?: string;
    isOpen: boolean;
}

export const SignatureSection: React.FC<SignatureSectionProps> = ({ documentId, signers = [], isOwner, meId, orgId, isOpen }) => {
    const updateDocument = useUpdateDocument();
    const signDocument = useSignDocument();
    const orgUsers = useQuery(api.users.listByOrg, orgId ? { orgId } : "skip");

    const [isAssigning, setIsAssigning] = useState(false);
    const [assignUserId, setAssignUserId] = useState('');
    const [assignRole, setAssignRole] = useState('');
    const [isSigning, setIsSigning] = useState(false);

    const activeSigner = signers.find(s => s.userId === meId);

    const handleAssign = async () => {
        if (!assignUserId) return;

        try {
            if (signers.some(s => s.userId === assignUserId)) {
                toast.error("User is already assigned as a signer.");
                return;
            }

            const newSigner: Signer = {
                userId: assignUserId,
                role: assignRole,
                status: 'pending'
            };

            await updateDocument({
                id: documentId,
                signers: [...signers, newSigner],
                collaborators: undefined
            });

            toast.success("Signer assigned.");
            setIsAssigning(false);
            setAssignUserId('');
            setAssignRole('');
        } catch (e) {
            toast.error("Failed to assign signer.");
        }
    };

    const handleSignatureSubmit = async (data: string, type: 'text' | 'draw') => {
        try {
            await signDocument({
                id: documentId,
                signerId: meId,
                role: activeSigner?.role,
                signatureData: data
            });
            toast.success("Document successfully signed!");
            setIsSigning(false);
        } catch (e) {
            toast.error("Failed to sign document.");
        }
    };

    const handleRemove = async (userIdToRemove: string) => {
        const newSigners = signers.filter(s => s.userId !== userIdToRemove);
        await updateDocument({
            id: documentId,
            signers: newSigners
        });
        toast.success("Signer removed.");
    };

    if (!isOpen) return null;

    return (
        <div className="mt-8 border-t-2 border-dashed border-nobel-gold/30 pt-8 pb-12 px-6 max-w-4xl mx-auto bg-nobel-cream/30 rounded-b-xl animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-8">
                <h3 className="font-serif text-2xl text-nobel-dark flex items-center gap-2">
                    <ShieldCheck size={24} className="text-nobel-gold" />
                    Verified Signatures
                </h3>
                {isOwner && !isAssigning && (
                    <button
                        onClick={() => setIsAssigning(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 text-stone-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-50 transition-colors shadow-sm"
                    >
                        <Plus size={14} /> Add Signer
                    </button>
                )}
            </div>

            {/* Main Content Area - Split Layout when Assigning */}
            <div className={`flex flex-col md:flex-row gap-8 transition-all duration-300`}>

                {/* Left Column: Signatures List */}
                <div className={`transition-all duration-300 ${isAssigning ? 'flex-1 md:w-1/2 md:border-r md:border-nobel-gold/10 md:pr-8' : 'w-full'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12">
                        {signers.map((signer, idx) => {
                            const user = orgUsers?.find((u: any) => u._id === signer.userId) || (signer.userId === meId ? { name: "Me" } : null);
                            return (
                                <SignatureItem
                                    key={idx}
                                    signer={signer}
                                    user={user}
                                    isMe={signer.userId === meId}
                                    isOwner={isOwner}
                                    onSign={() => setIsSigning(true)}
                                    onRemove={() => handleRemove(signer.userId)}
                                />
                            );
                        })}

                        {signers.length === 0 && (
                            <div className="col-span-1 md:col-span-2 py-8 text-center bg-stone-50 rounded-lg border border-dashed border-stone-200">
                                <p className="text-stone-400 text-sm font-serif italic">No signatures required.</p>
                                {isOwner && !isAssigning && (
                                    <button onClick={() => setIsAssigning(true)} className="mt-2 text-xs font-bold text-nobel-gold hover:underline uppercase tracking-wider">
                                        Assign a signer
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Assignment Form */}
                {isAssigning && (
                    <div className="flex-1 md:w-1/2 animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm h-full flex flex-col justify-between">
                            <div>
                                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-6 pb-2 border-b border-stone-100">Assign New Signer</h4>
                                <div className="space-y-4">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">User</label>
                                        <select
                                            value={assignUserId}
                                            onChange={(e) => setAssignUserId(e.target.value)}
                                            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-nobel-gold transition-colors"
                                        >
                                            <option value="">Select Organization Member...</option>
                                            <option value={meId}>Me</option>
                                            {orgUsers?.map((u: any) => (
                                                <option key={u._id} value={u._id}>{u.name || u.email}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Role</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Founder, Witness"
                                            value={assignRole}
                                            onChange={(e) => setAssignRole(e.target.value)}
                                            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-nobel-gold transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Live Preview */}
                            <div className="mt-8 pt-4 border-t border-dashed border-stone-200">
                                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4 text-center">Preview</label>
                                <div className="bg-stone-50/50 rounded-xl p-6 border border-stone-100">
                                    <SignatureItem
                                        signer={{
                                            userId: assignUserId || 'preview',
                                            role: assignRole || 'Role',
                                            status: 'pending',
                                        }}
                                        user={assignUserId ? (orgUsers?.find((u: any) => u._id === assignUserId) || (assignUserId === meId ? { name: "Me" } : { name: "Selected User" })) : { name: "Select a User" }}
                                        isMe={false}
                                        isOwner={false} // Preview only
                                        onSign={() => { }}
                                        onRemove={() => { }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-stone-100">
                                <button onClick={() => setIsAssigning(false)} className="px-4 py-2 bg-white border border-stone-200 text-stone-600 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors">Cancel</button>
                                <button onClick={handleAssign} disabled={!assignUserId} className="px-6 py-2 bg-nobel-dark text-white rounded-lg text-sm font-medium hover:bg-nobel-gold disabled:opacity-50 transition-colors shadow-lg">Assign Signer</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <SignatureDialog
                isOpen={isSigning}
                onClose={() => setIsSigning(false)}
                onSubmit={handleSignatureSubmit}
            />
        </div>
    );
};
