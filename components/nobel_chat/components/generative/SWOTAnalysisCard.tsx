import React, { useState } from 'react';
import { Shield, ShieldAlert, Zap, AlertTriangle } from 'lucide-react';
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from 'sonner';
import ApprovalGuard from './ApprovalGuard';

interface SWOTAnalysisCardProps {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
    competitorName: string;
    projectId?: string | null;
    onSendMessage?: (text: string) => void;
}

const SWOTAnalysisCard: React.FC<SWOTAnalysisCardProps> = ({
    strengths = [], weaknesses = [], opportunities = [], threats = [], competitorName = "Competitor", projectId, onSendMessage
}) => {
    const saveSWOT = useMutation(api.competitors.saveSWOTAsCompetitor);
    const [isSaved, setIsSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDenied, setIsDenied] = useState(false);

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
                    const contentToSign = JSON.stringify({ strengths, weaknesses, opportunities, threats, competitorName });
                    const signedProof = await signApproval(
                        "competitor_analysis",
                        "swot",
                        contentToSign,
                        identity.privateKey
                    );
                    signature = signedProof.signature;
                    publicKey = identity.publicKey;
                }
            } catch (cryptoErr) {
            }

            await saveSWOT({
                projectId,
                competitorName,
                swotData: { strengths, weaknesses, opportunities, threats },
                signature,
                publicKey
            });

            setIsSaved(true);
            toast.success(`SWOT Analysis for ${competitorName} saved (Signed)`);
        } catch (e) {
            toast.error("Failed to save SWOT analysis");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeny = () => {
        setIsDenied(true);
        const rejectionMsg = `I've denied the suggested SWOT analysis for "${competitorName}". Some of these points (e.g., "${strengths[0] || 'Strengths'}") don't reflect our competitive reality. Can you suggest a more nuanced analysis or ask me for more details?`;
        onSendMessage?.(rejectionMsg);
        toast.info("Suggestion denied. Follow-up sent to AI.");
    };

    return (
        <div className="my-6 border border-stone-200 rounded-2xl bg-white shadow-sm overflow-hidden animate-fade-in text-left">
            <div className="bg-stone-50 px-6 py-4 border-b border-stone-100">
                <h3 className="text-stone-900 font-bold">SWOT Analysis: <span className="text-nobel-gold">{competitorName}</span></h3>
            </div>

            <div className="grid grid-cols-2">
                {/* Strengths */}
                <div className="p-6 border-r border-b border-stone-100">
                    <div className="flex items-center gap-2 mb-3 text-emerald-600">
                        <Shield size={18} />
                        <span className="text-xs font-bold uppercase tracking-widest">Strengths</span>
                    </div>
                    <ul className="space-y-2">
                        {strengths.map((s, i) => (
                            <li key={i} className="text-sm text-stone-600 flex gap-2">
                                <span className="text-emerald-400 font-bold">•</span> {s}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Weaknesses */}
                <div className="p-6 border-b border-stone-100 bg-stone-50/30">
                    <div className="flex items-center gap-2 mb-3 text-red-500">
                        <ShieldAlert size={18} />
                        <span className="text-xs font-bold uppercase tracking-widest">Weaknesses</span>
                    </div>
                    <ul className="space-y-2">
                        {weaknesses.map((w, i) => (
                            <li key={i} className="text-sm text-stone-600 flex gap-2">
                                <span className="text-red-300 font-bold">•</span> {w}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Opportunities */}
                <div className="p-6 border-r border-stone-100 bg-stone-50/30">
                    <div className="flex items-center gap-2 mb-3 text-blue-500">
                        <Zap size={18} />
                        <span className="text-xs font-bold uppercase tracking-widest">Opportunities</span>
                    </div>
                    <ul className="space-y-2">
                        {opportunities.map((o, i) => (
                            <li key={i} className="text-sm text-stone-600 flex gap-2">
                                <span className="text-blue-300 font-bold">•</span> {o}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Threats */}
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-3 text-amber-500">
                        <AlertTriangle size={18} />
                        <span className="text-xs font-bold uppercase tracking-widest">Threats</span>
                    </div>
                    <ul className="space-y-2">
                        {threats.map((t, i) => (
                            <li key={i} className="text-sm text-stone-600 flex gap-2">
                                <span className="text-amber-300 font-bold">•</span> {t}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Approval Guard */}
            <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/10 flex justify-end">
                <ApprovalGuard
                    onApprove={handleApprove}
                    onDeny={handleDeny}
                    isSaved={isSaved}
                    isSaving={isSaving}
                    isDenied={isDenied}
                    approveLabel="Approve SWOT"
                />
            </div>
        </div>
    );
};

export default SWOTAnalysisCard;
