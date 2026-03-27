
import React, { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Activity, PieChart } from 'lucide-react';
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from 'sonner';
import ApprovalGuard from './ApprovalGuard';

interface FinancialSnapshotCardProps {
    cac: number;
    ltv: number;
    arpu: number;
    revenue: string;
    burnRate: string;
    margin: string;
    projectId?: string | null;
    onSendMessage?: (text: string) => void;
}

const FinancialSnapshotCard: React.FC<FinancialSnapshotCardProps> = ({
    cac, ltv, arpu, revenue, burnRate, margin, projectId, onSendMessage
}) => {
    const updateFinancials = useMutation(api.projects.updateFinancialSnapshot);
    const [isSaved, setIsSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDenied, setIsDenied] = useState(false);

    const ltvCacRatio = (ltv / (cac || 1)).toFixed(1);
    const isHealthyRatio = Number(ltvCacRatio) >= 3.0;

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
                    const contentToSign = JSON.stringify({ cac, ltv, arpu, revenue, burnRate, margin });
                    const signedProof = await signApproval(
                        "financial_model",
                        "snapshot_update",
                        contentToSign,
                        identity.privateKey
                    );
                    signature = signedProof.signature;
                    publicKey = identity.publicKey;
                }
            } catch (cryptoErr) {
            }

            await updateFinancials({
                projectId: projectId as any,
                cac,
                ltv,
                arpu,
                revenue,
                burnRate,
                margin,
                signature,
                publicKey
            });

            setIsSaved(true);
            toast.success("Financial profile updated (Signed)");
        } catch (e) {
            toast.error("Failed to update financial profile");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeny = () => {
        setIsDenied(true);
        const rejectionMsg = `I've denied the suggested financial snapshot. These assumptions (CAC: $${cac}, LTV: $${ltv}) don't quite align with my current burn rate or market observations. Can you help me adjust these numbers or explain the logic behind them?`;
        onSendMessage?.(rejectionMsg);
        toast.info("Suggestion denied. Follow-up sent to AI.");
    };

    return (
        <div className="my-6 md:max-w-xl w-full text-left">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                    <DollarSign size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-stone-900 leading-tight">Financial Snapshot</h3>
                    <p className="text-xs text-stone-500 font-medium">Unit Economics & Key Metrics</p>
                </div>
            </div>

            {/* Unit Economics Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">CAC</p>
                    <div className="font-bold text-xl text-stone-800">${cac}</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">LTV</p>
                    <div className="font-bold text-xl text-stone-800">${ltv}</div>
                </div>
                <div className={`p-3 rounded-xl border shadow-sm ${isHealthyRatio ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isHealthyRatio ? 'text-emerald-600' : 'text-red-500'}`}>LTV:CAC</p>
                    <div className={`font-bold text-xl ${isHealthyRatio ? 'text-emerald-800' : 'text-red-800'}`}>{ltvCacRatio}x</div>
                </div>
            </div>

            {/* Mini P&L / Summary Table */}
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm mb-4">
                <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50/50">
                    <span className="text-xs font-bold text-stone-500">Metric</span>
                    <span className="text-xs font-bold text-stone-500">Value</span>
                </div>

                <div className="divide-y divide-stone-100">
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                            <Activity size={14} className="text-purple-500" />
                            <span className="text-sm font-medium text-stone-700">Projected Revenue (ARR)</span>
                        </div>
                        <span className="text-sm font-bold text-stone-900">{revenue}</span>
                    </div>

                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                            <TrendingDown size={14} className="text-red-500" />
                            <span className="text-sm font-medium text-stone-700">Monthly Burn</span>
                        </div>
                        <span className="text-sm font-bold text-stone-900">{burnRate}</span>
                    </div>

                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                            <PieChart size={14} className="text-blue-500" />
                            <span className="text-sm font-medium text-stone-700">Gross Margin</span>
                        </div>
                        <span className="text-sm font-bold text-stone-900">{margin}</span>
                    </div>

                    <div className="flex items-center justify-between px-4 py-3 bg-stone-50/30">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={14} className="text-emerald-500" />
                            <span className="text-sm font-medium text-stone-700">ARPU</span>
                        </div>
                        <span className="text-sm font-bold text-stone-900">${arpu}</span>
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
                    approveLabel="Update Profile"
                />
            </div>
        </div>
    );
};

export default FinancialSnapshotCard;
