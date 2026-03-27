
import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from "../convex/_generated/api";
import { useGenerateReferralCode } from '../hooks/useCreate';
import { toast } from 'sonner';
import { X, Users, Check, Loader2, Rocket } from 'lucide-react';

interface ReferralModalProps {
    onClose: () => void;
    user: any;
}

const ReferralModal: React.FC<ReferralModalProps> = ({ onClose, user }) => {
    const generateCodeMutation = useGenerateReferralCode();
    const referralStats = useQuery(api.referrals.getReferralStats);
    const [generating, setGenerating] = useState(false);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            await generateCodeMutation();
            toast.success("Referral link generated! $50 credit applied.");
        } catch (e) {
            toast.error("Failed to generate code.");
        } finally {
            setGenerating(false);
        }
    };

    const copyLink = () => {
        if (referralStats?.code) {
            const url = `${window.location.origin}/refer/${referralStats.code}`;
            navigator.clipboard.writeText(url);
            toast.success("Link copied to clipboard");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-100">
                <div className="bg-[#F9F8F4] text-center relative overflow-hidden">
                    <img
                        src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=1600"
                        alt="Community"
                        className="w-full h-32 object-cover object-center opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#F9F8F4] opacity-90"></div>

                    <button onClick={onClose} className="absolute top-4 right-4 text-stone-600 hover:text-stone-900 transition-colors bg-white/50 backdrop-blur-sm p-1 rounded-full z-10">
                        <X className="w-5 h-5" />
                    </button>

                    <div className="relative z-10 -mt-10 mb-4 px-6">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white text-green-600 shadow-xl border-4 border-[#F9F8F4]">
                            <Users className="w-8 h-8" />
                        </div>
                        <h3 className="font-serif text-2xl text-stone-900 mt-2 mb-2">Refer & Earn Program</h3>
                        <p className="text-stone-500 text-sm leading-relaxed max-w-xs mx-auto">
                            Invite fellow founders to join Adaptive Startup.
                            <br /><span className="font-bold text-green-700">Earn Credit</span> for every new paid subscription.
                        </p>
                        <div className="mt-4 flex gap-2 justify-center text-[10px] uppercase font-bold tracking-wider text-stone-400">
                            <span className="bg-stone-200/50 px-2 py-1 rounded">Help Pay for Extra Seats</span>
                            <span className="bg-stone-200/50 px-2 py-1 rounded">Help Pay Monthly Bill</span>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {referralStats === undefined ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-stone-300" />
                        </div>
                    ) : referralStats ? (
                        <div className="space-y-6">
                            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col items-center">
                                <span className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Your Unique Link</span>
                                <div className="flex items-center gap-2 w-full">
                                    <code className="flex-1 bg-white border border-stone-200 px-3 py-2 rounded-lg text-sm text-stone-600 font-mono truncate">
                                        {window.location.origin}/refer/{referralStats.code}
                                    </code>
                                    <button
                                        onClick={copyLink}
                                        className="p-2 bg-stone-900 text-white rounded-lg hover:bg-stone-700 transition-colors"
                                        title="Copy Link"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                                    <div className="text-2xl font-bold text-green-700 font-serif">{referralStats.count}</div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-green-600">Referrals</div>
                                </div>
                                <div className="bg-stone-50 rounded-xl p-4 text-center border border-stone-100">
                                    <div className="text-2xl font-bold text-stone-700 font-serif">
                                        {referralStats.hasReceivedCredit ? '$50' : '$0'}
                                    </div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Credit Earned</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="w-full py-4 bg-green-600 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                            >
                                {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
                                Generate My Link
                            </button>
                            <p className="mt-4 text-xs text-stone-400 italic">
                                Use this credit towards your next bill.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReferralModal;
