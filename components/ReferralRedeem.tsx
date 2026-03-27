import React, { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from "../convex/_generated/api";
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const ReferralRedeem = () => {
    const code = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() || "" : "";
    return <ReferralLogic code={code} />;
};

const ReferralLogic = ({ code }: { code: string }) => {
    // Simple navigation fallback
    const navigate = (path: string) => {
        window.location.href = path;
    };

    // Validate code
    const isValid = useQuery(api.referrals.validateReferralCode, code ? { code } : "skip");

    useEffect(() => {
        if (!code) {
            navigate('/');
            return;
        }

        if (isValid === undefined) return; // Loading

        if (isValid) {
            sessionStorage.setItem('referral_code', code);
            toast.success("Referral applied! Create your account to get started.");
        } else {
            toast.error("Invalid or expired referral link.");
            sessionStorage.removeItem('referral_code');
        }

        // Redirect to home/signup
        navigate('/');

    }, [code, isValid]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#F9F8F4]">
            <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
            <span className="ml-3 text-stone-500 font-medium">Applying referral...</span>
        </div>
    );
};

export default ReferralRedeem;
