import React from 'react';
import { X } from 'lucide-react';

interface Signer {
    userId: string;
    role?: string;
    status: string;
    signedAt?: number;
    ipAddress?: string;
    signatureData?: string;
    signatureType?: 'text' | 'draw';
}

interface SignatureItemProps {
    signer: Signer;
    user: any; // Ideally strictly typed from Convex
    isMe: boolean;
    isOwner: boolean;
    onSign: () => void;
    onRemove: () => void;
}

export const SignatureItem: React.FC<SignatureItemProps> = ({ signer, user, isMe, isOwner, onSign, onRemove }) => {
    const isSigned = signer.status === 'signed';

    return (
        <div className="relative group">
            {isOwner && (
                <button
                    onClick={onRemove}
                    className="absolute -top-2 -right-2 p-1 bg-white border border-stone-200 rounded-full text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
                    title="Remove Signer"
                >
                    <X size={12} />
                </button>
            )}

            <div className="flex flex-col items-center text-center relative">
                <div className="w-full border-b-2 border-nobel-dark pb-4 mb-3 min-h-[100px] flex items-end justify-center relative">
                    {isSigned ? (
                        signer.signatureData?.startsWith('data:image') ? (
                            <img
                                src={signer.signatureData}
                                alt="Signature"
                                className="h-16 max-w-[80%] object-contain filter drop-shadow-sm opacity-90 transform -rotate-1"
                            />
                        ) : (
                            <div className="font-serif italic text-4xl text-nobel-dark transform -rotate-2 break-all leading-tight px-4">
                                {signer.signatureData || user?.name || "Signed"}
                            </div>
                        )
                    ) : (
                        isMe ? (
                            <button
                                onClick={onSign}
                                className="mb-4 px-6 py-2 bg-nobel-gold/10 text-nobel-dark border border-nobel-gold/30 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-nobel-gold hover:text-white shadow-lg transition-all animate-pulse"
                            >
                                Click to Sign
                            </button>
                        ) : (
                            <div className="text-stone-300 italic font-serif text-lg mb-4 select-none">Waiting for signature...</div>
                        )
                    )}
                </div>

                <div className="font-bold text-nobel-dark uppercase text-xs tracking-wider mb-1">
                    {user?.name || "Unknown User"}
                </div>
                <div className="text-[10px] text-nobel-gold font-bold uppercase tracking-widest">
                    {signer.role || "Authorized Signer"}
                </div>

                {isSigned && signer.signedAt && (
                    <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 rotate-12 bg-white/90 backdrop-blur-md border border-nobel-gold/30 px-3 py-2 rounded shadow-sm text-center z-10 animate-in zoom-in spin-in-3 duration-500">
                        <div className="text-[8px] text-stone-400 uppercase tracking-widest font-bold">Verified</div>
                        <div className="text-[9px] font-mono text-nobel-dark">{new Date(signer.signedAt).toLocaleDateString()}</div>
                        <div className="text-[8px] font-mono text-stone-400 truncate max-w-[80px]">{signer.ipAddress}</div>
                    </div>
                )}
            </div>
        </div>
    );
};
