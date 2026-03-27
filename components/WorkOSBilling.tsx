import React, { useState } from 'react';
import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { CreditCard, Zap, Users, BarChart, TrendingUp, Check, Plus, Minus, DollarSign, Settings as SettingsIcon, ExternalLink } from 'lucide-react';

export const WorkOSBilling = () => {
    const subscription = useQuery(api.usage.getSubscriptionStatus);
    const usageHistory = useQuery(api.usage.getUsage);
    // Subscription checkout removed — billing is metering-only
    // const createCheckout = useAction(api.stripeActions.createSubscriptionCheckout);
    const buyTokens = useAction(api.stripeActions.buyTokens);
    // const createPortalSession = useAction(api.stripeActions.createBillingPortalSession);

    // const seats = 1; // Subscription seats removed
    const [tokenPacks, setTokenPacks] = useState(1);
    // const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
    const [loading, setLoading] = useState(false);

    if (!subscription) return (
        <div className="p-12 flex flex-col items-center justify-center gap-4 text-stone-500 min-h-[400px]">
            <div className="w-8 h-8 border-2 border-stone-200 border-t-nobel-gold rounded-full animate-spin" />
            <span className="text-sm font-medium tracking-wide">Loading billing details...</span>
        </div>
    );

    /* Subscription handlers removed — billing is metering-only
    const handleSubscribe = async () => {
        setLoading(true);
        try {
            const referralCode = sessionStorage.getItem('referral_code') || undefined;
            const { url } = await createCheckout({ seats, interval: billingInterval, referralCode, origin: window.location.origin });
            if (url) window.location.href = url;
        } catch (error) {
            alert("Failed to start checkout");
        } finally {
            setLoading(false);
        }
    };
    */

    const handleBuyTokens = async () => {
        setLoading(true);
        try {
            const { url } = await buyTokens({ packs: tokenPacks, origin: window.location.origin });
            if (url) window.location.href = url;
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    /* Manage subscription removed — billing is metering-only
    const handleManageSubscription = async () => {
        setLoading(true);
        try {
            const url = await createPortalSession({ origin: window.location.origin });
            if (url) window.location.href = url;
        } catch (error) {
            alert("Failed to open billing portal. Please try again.");
        } finally {
            setLoading(false);
        }
    };
    */

    const renderUsageChart = () => {
        if (!usageHistory || usageHistory.length === 0) {
            return (
                <div className="h-40 flex items-center justify-center text-stone-400 text-sm italic border border-dashed border-stone-200 rounded-xl bg-stone-50/50">
                    No usage history available yet.
                </div>
            );
        }

        const maxTokens = Math.max(...usageHistory.map(u => u.tokens), 100);
        const bars = usageHistory.slice(0, 14).reverse().map((entry, index) => {
            const heightPct = (entry.tokens / maxTokens) * 100;
            return (
                <div key={index} className="flex flex-col items-center gap-1 group relative flex-1">
                    <div
                        className="w-full bg-stone-200 rounded-t-sm relative hover:bg-nobel-gold transition-colors"
                        style={{ height: `${Math.max(heightPct, 5)}%` }}
                    >
                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 font-bold shadow-xl pointer-events-none">
                            {entry.date}: {entry.tokens.toLocaleString()}
                        </div>
                    </div>
                </div>
            );
        });

        return (
            <div className="h-40 flex items-end gap-1 mt-4 px-2">
                {bars}
            </div>
        );
    };

    const usagePercent = subscription.limit > 0 ? (subscription.usage / subscription.limit) * 100 : 0;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-400 max-w-6xl mx-auto space-y-8 pb-12">
            {/* Subscription Plan card removed — billing is metering-only
            <div className="bg-white border border-stone-200 p-8 rounded-2xl shadow-sm relative overflow-hidden group">
                ... subscription plan UI ...
            </div>
            */}

            {/* LOWER SECTION: SIDE BY SIDE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                {/* 2. ACTIVITY TRACKING */}
                <div className="bg-white border border-stone-200 p-8 rounded-2xl shadow-sm h-full flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-stone-100 rounded-lg">
                                <BarChart className="w-5 h-5 text-stone-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-serif text-stone-900 font-bold">Activity Tracking</h2>
                                <p className="text-[10px] text-stone-400 uppercase font-bold tracking-widest">30-Day Token Consumption</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-serif font-bold text-stone-900">
                                {subscription.usage.toLocaleString()}
                                <span className="text-stone-300 mx-1">/</span>
                                <span className="text-stone-400 text-lg">{subscription.limit.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 flex-grow flex flex-col justify-end">
                        <div className="h-2.5 w-full bg-stone-100 rounded-full overflow-hidden border border-stone-200/50">
                            <div
                                className={`h-full ${usagePercent > 90 ? 'bg-red-500' : 'bg-nobel-gold'} transition-all duration-700 ease-out`}
                                style={{ width: `${Math.min(usagePercent, 100)}%` }}
                            />
                        </div>

                        <div className="bg-stone-50 rounded-2xl p-6 border border-stone-100">
                            {renderUsageChart()}
                            <div className="mt-4 flex justify-between text-[10px] text-stone-400 font-bold uppercase tracking-widest px-2">
                                <span>Last 30 Days</span>
                                <span>Today</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. SECURE CARD / TOP-UP */}
                <div className="bg-white border border-stone-200 p-8 rounded-2xl shadow-sm flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                            <Zap className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-serif text-stone-900 font-bold leading-tight">Token Top-up</h2>
                            <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">On-Demand Power</p>
                        </div>
                    </div>

                    <div className="flex-grow flex flex-col justify-center mb-8">
                        <div className="text-center mb-6">
                            <div className="text-4xl font-serif font-bold text-stone-900">{tokenPacks}M</div>
                            <div className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Additional Tokens</div>
                        </div>

                        <div className="px-2 mb-8">
                            <input
                                type="range"
                                min="1"
                                max="50"
                                step="1"
                                value={tokenPacks}
                                onChange={(e) => setTokenPacks(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-nobel-gold hover:accent-amber-500 transition-all border border-stone-200"
                            />
                        </div>

                        <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-stone-900 uppercase tracking-widest">Secure Payment</span>
                                <span className="font-serif font-bold text-nobel-gold text-lg">${tokenPacks * 10}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleBuyTokens}
                        disabled={loading}
                        className="w-full flex items-center justify-between bg-stone-900 hover:bg-stone-800 text-white p-4 rounded-xl transition-all group shadow-md active:scale-[0.98] disabled:opacity-50"
                    >
                        <span className="font-bold text-xs uppercase tracking-widest">Buy Tokens</span>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-nobel-gold font-bold text-sm">${tokenPacks * 10}</span>
                            <TrendingUp className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>
                    <p className="text-[10px] text-stone-400 text-center mt-4 italic">
                        Tokens are added immediately.
                    </p>
                </div>
            </div>
        </div>
    );
};

