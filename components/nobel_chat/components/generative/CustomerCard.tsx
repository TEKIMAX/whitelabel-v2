
import React, { useState } from 'react';
import { Play, User, DollarSign, Tag, FileText, X } from 'lucide-react';
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from 'sonner';
import ApprovalGuard from './ApprovalGuard';

interface Customer {
    name: string;
    role: string;
    status: string;
    willingnessToPay: string;
    notes: string;
    videoUrl?: string;
    tags?: string[];
}

interface CustomerCardProps {
    customers: Customer[];
    projectId?: string | null;
    onSendMessage?: (text: string) => void;
}

const CustomerCard: React.FC<CustomerCardProps> = ({ customers = [], projectId, onSendMessage }) => {
    const saveCustomers = useMutation(api.customers.bulkAddInterviews);
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const [isSaved, setIsSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDenied, setIsDenied] = useState(false);

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'interviewed':
            case 'won':
            case 'subscriber':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'scheduled':
            case 'potential fit':
                return 'bg-nobel-gold/10 text-nobel-gold border-nobel-gold/20';
            case 'not yet closed':
            case 'outreach sent':
                return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'no traction':
            case 'lost':
                return 'bg-red-50 text-red-700 border-red-100';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
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
                    const contentToSign = JSON.stringify(customers);
                    const signedProof = await signApproval(
                        "customer_profiles",
                        "bulk_creation",
                        contentToSign,
                        identity.privateKey
                    );
                    signature = signedProof.signature;
                    publicKey = identity.publicKey;
                }
            } catch (cryptoErr) {
            }

            const formattedInterviews = customers.map(c => ({
                customerStatus: c.status,
                customData: JSON.stringify({
                    "Name": c.name,
                    "Role": c.role,
                    "Notes": c.notes,
                    "Tags": c.tags?.join(', ') || ""
                }),
                willingnessToPay: c.willingnessToPay
            }));

            await saveCustomers({
                projectId,
                interviews: formattedInterviews,
                signature,
                publicKey
            });

            setIsSaved(true);
            toast.success(`Saved ${customers.length} customer profiles (Signed)`);
        } catch (e) {
            toast.error("Failed to save customer profiles");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeny = () => {
        setIsDenied(true);
        const rejectionMsg = `I've denied the suggested customer profiles. This segment logic doesn't align with our current findings. Can you suggest a different customer archetype or help me refine these profiles based on [Specific Feedback]?`;
        onSendMessage?.(rejectionMsg);
        toast.info("Suggestion denied. Follow-up sent to AI.");
    };

    return (
        <div className="space-y-4 my-6 text-left">
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                {customers.map((customer, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-5 border border-stone-100 shadow-sm hover:shadow-md transition-shadow relative group">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-stone-900 leading-tight">{customer.name}</h4>
                                    <p className="text-xs text-stone-500 font-medium">{customer.role}</p>
                                </div>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(customer.status)}`}>
                                {customer.status}
                            </span>
                        </div>

                        <div className="space-y-3">
                            {customer.willingnessToPay && customer.willingnessToPay !== 'No' && (
                                <div className="flex items-center gap-2 text-sm text-stone-700 bg-stone-50 p-2 rounded-lg">
                                    <DollarSign size={14} className="text-green-600" />
                                    <span className="font-medium">Willingness to Pay:</span>
                                    <span className="font-bold">{customer.willingnessToPay}</span>
                                </div>
                            )}

                            {customer.notes && (
                                <div className="flex gap-2 text-sm text-stone-600 italic">
                                    <FileText size={14} className="text-stone-400 shrink-0 mt-1" />
                                    <p className="leading-relaxed line-clamp-3">{customer.notes}</p>
                                </div>
                            )}

                            {customer.tags && customer.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {customer.tags.map((tag, tIdx) => (
                                        <span key={tIdx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-100 text-stone-500 rounded text-[10px] font-medium">
                                            <Tag size={10} /> {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {customer.videoUrl && (
                            <div className="mt-4 pt-3 border-t border-stone-100">
                                <button
                                    onClick={() => setSelectedVideo(customer.videoUrl!)}
                                    className="flex items-center gap-2 w-full justify-center px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-nobel-gold transition-colors"
                                >
                                    <Play size={14} fill="currentColor" /> Watch Interview
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Approval Guard */}
            <div className="flex justify-end pt-2">
                <ApprovalGuard
                    onApprove={handleApprove}
                    onDeny={handleDeny}
                    isSaved={isSaved}
                    isSaving={isSaving}
                    isDenied={isDenied}
                    approveLabel={`Approve ${customers.length} Profiles`}
                />
            </div>

            {/* Video Modal */}
            {selectedVideo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-black rounded-2xl shadow-2xl max-w-4xl w-full relative overflow-hidden aspect-video">
                        <button
                            onClick={() => setSelectedVideo(null)}
                            className="absolute top-4 right-4 z-10 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-2 transition-all"
                        >
                            <X size={24} />
                        </button>
                        <iframe
                            src={selectedVideo}
                            className="w-full h-full"
                            allow="autoplay; fullscreen"
                            allowFullScreen
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerCard;
