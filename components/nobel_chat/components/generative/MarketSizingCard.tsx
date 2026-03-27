
import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from 'sonner';
import ApprovalGuard from './ApprovalGuard';

interface MarketSizingCardProps {
    tam: string;
    sam: string;
    som: string;
    tamDescription: string;
    samDescription: string;
    somDescription: string;
    projectId?: string | null;
    onSendMessage?: (text: string) => void;
}

const MarketSizingCard: React.FC<MarketSizingCardProps> = ({
    tam = "$-", sam = "$-", som = "$-", tamDescription = "", samDescription = "", somDescription = "", projectId, onSendMessage
}) => {
    const updateMarket = useMutation(api.market.updateMarketWithSignature);
    const [isSaved, setIsSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDenied, setIsDenied] = useState(false);

    const parseAmount = (val: string) => {
        const clean = val.replace(/[^0-9.]/g, '');
        return parseFloat(clean || '0');
    };

    const handleApprove = async () => {
        if (!projectId) {
            toast.error("No project selected to save to.");
            return;
        }

        setIsSaving(true);
        try {
            // Cryptographic Signing Flow
            let signature = undefined;
            let publicKey = undefined;

            try {
                const { ensureIdentity, signApproval } = await import('../../../../services/crypto');
                const identity = await ensureIdentity();
                if (identity.privateKey) {
                    const contentToSign = JSON.stringify({ tam, sam, som, tamDescription, samDescription, somDescription });
                    const signedProof = await signApproval(
                        "market_research",
                        "sizing_update",
                        contentToSign,
                        identity.privateKey
                    );
                    signature = signedProof.signature;
                    publicKey = identity.publicKey;
                }
            } catch (cryptoErr) {
            }

            await updateMarket({
                projectId: projectId as any,
                tam: parseAmount(tam),
                sam: parseAmount(sam),
                som: parseAmount(som),
                reportContent: `Analysis Summary:\nTAM: ${tamDescription}\nSAM: ${samDescription}\nSOM: ${somDescription}`,
                signature,
                publicKey
            });

            setIsSaved(true);
            toast.success("Market research updated (Signed)");
        } catch (e) {
            toast.error("Failed to update market research");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeny = () => {
        setIsDenied(true);
        const rejectionMsg = `I've denied the suggested market sizing (TAM: ${tam}). I suspect the Serviceable Available Market (SAM) of ${sam} might be overly optimistic given our current channel focus. Can you refine these estimates or ask for my specific regional assumptions?`;
        onSendMessage?.(rejectionMsg);
        toast.info("Suggestion denied. Follow-up sent to AI.");
    };

    return (
        <div className="my-6 md:max-w-md w-full text-left">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                    <Layers size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-stone-900 leading-tight">Market Sizing</h3>
                    <p className="text-xs text-stone-500 font-medium">TAM / SAM / SOM Analysis</p>
                </div>
            </div>

            <div className="space-y-2 mb-4">
                {/* TAM */}
                <div className="bg-stone-900 text-white rounded-t-xl p-4 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Layers size={100} />
                    </div>
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Total Addressable Market</p>
                            <h2 className="text-3xl font-serif font-bold text-white mb-2">{tam}</h2>
                            <p className="text-xs text-stone-400 leading-relaxed max-w-[80%]">{tamDescription}</p>
                        </div>
                    </div>
                </div>

                {/* SAM */}
                <div className="bg-stone-800 text-white mx-4 p-4 shadow-md border-t border-white/10 relative group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Serviceable Available Market</p>
                            <h2 className="text-2xl font-serif font-bold text-white mb-2">{sam}</h2>
                            <p className="text-xs text-stone-400 leading-relaxed max-w-[90%]">{samDescription}</p>
                        </div>
                    </div>
                </div>

                {/* SOM */}
                <div className="bg-nobel-gold text-white mx-8 rounded-b-xl p-4 shadow-sm border-t border-white/10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-white/80 mb-1">Serviceable Obtainable Market</p>
                            <h2 className="text-xl font-serif font-bold text-white mb-2">{som}</h2>
                            <p className="text-xs text-white/90 leading-relaxed">{somDescription}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Approval Guard */}
            <div className="flex justify-end">
                <ApprovalGuard
                    onApprove={handleApprove}
                    onDeny={handleDeny}
                    isSaved={isSaved}
                    isSaving={isSaving}
                    isDenied={isDenied}
                    approveLabel="Update Market Analysis"
                />
            </div>
        </div>
    );
};

export default MarketSizingCard;
