import React, { useState } from 'react';
import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { CreditCard, Zap, Users, BarChart, ArrowLeft, TrendingUp, Check } from 'lucide-react';

export default function SubscriptionPage({ onBack }: { onBack?: () => void }) {
    const subscription = useQuery(api.usage.getSubscriptionStatus);
    const usageHistory = useQuery(api.usage.getUsage); // Fetch historical usage
    const createCheckout = useAction(api.stripeActions.createSubscriptionCheckout);

    const [seats, setSeats] = useState(1);
    const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
    const [loading, setLoading] = useState(false);

    if (!subscription) return <div className="p-10 text-stone-400 font-serif">Loading subscription details...</div>;

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



    // --- Usage Chart Logic ---
    const renderUsageChart = () => {
        if (!usageHistory || usageHistory.length === 0) {
            return (
                <div className="h-40 flex items-center justify-center text-stone-600 text-sm italic font-sans border border-dashed border-stone-800 rounded-lg">
                    No usage history available yet.
                </div>
            );
        }

        const maxTokens = Math.max(...usageHistory.map(u => u.tokens), 100); // Avoid div by zero
        const bars = usageHistory.slice(0, 14).reverse().map((entry, index) => { // Last 14 entries
            const heightPct = (entry.tokens / maxTokens) * 100;
            return (
                <div key={index} className="flex flex-col items-center gap-1 group relative flex-1">
                    <div className="w-full bg-stone-800 rounded-t-sm relative hover:bg-nobel-gold transition-colors" style={{ height: `${Math.max(heightPct, 5)}%` }}>
                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 border border-stone-700 font-sans shadow-xl">
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

    // Calculate usage percentage
    const usagePercent = subscription.limit > 0 ? (subscription.usage / subscription.limit) * 100 : 0;
    const seatUsagePercent = subscription.seatCount > 0 ? (1 / subscription.seatCount) * 100 : 0; // Assuming 1 active user for now if we don't track active seats separately here

    return (
        <div className="min-h-screen bg-stone-950 text-stone-300 font-sans selection:bg-nobel-gold selection:text-black">
            <div className="max-w-6xl mx-auto p-8 md:p-12">

                {/* Header */}
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <button
                            onClick={onBack || (() => window.location.href = '/')}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white text-stone-900 rounded-full text-xs tracking-widest uppercase font-bold shadow-lg hover:shadow-xl hover:bg-stone-100 transition-all mb-4"
                        >
                            <ArrowLeft className="w-3 h-3" /> Back to Portfolio
                        </button>
                        <h1 className="text-4xl md:text-5xl font-serif text-white mb-2">Subscription & Usage</h1>
                        <p className="text-stone-500 text-lg font-light">Manage your plan, monitor usage, and scale your resources.</p>
                    </div>
                    <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-stone-900 rounded-full border border-stone-800">
                        <div className={`w-2 h-2 rounded-full ${subscription.isPro ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-yellow-500'}`} />
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                            {subscription.status === 'active' ? 'Active Plan' : (subscription.status === 'trialing' ? 'Trial Period' : 'Free Tier')}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN: Plan & Seats */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* 1. Current Plan Card */}
                        <div className="bg-stone-900/50 backdrop-blur-sm border border-stone-800 p-8 rounded-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <CreditCard className="w-48 h-48 text-white -rotate-12" />
                            </div>

                            <div className="relative z-10">
                                <h2 className="text-2xl font-serif text-white mb-6 flex items-center gap-3">
                                    Current Plan
                                    {subscription.isPro && <span className="text-xs font-sans font-bold bg-nobel-gold text-black px-2 py-0.5 rounded-full">PRO</span>}
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <div className="text-sm uppercase tracking-widest text-stone-500 font-bold mb-1">Status</div>
                                        <div className="text-white text-xl capitalize flex items-center gap-2">
                                            {subscription.status}
                                            {subscription.status === 'active' && <Check className="w-4 h-4 text-green-500" />}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-white text-xl">
                                            {subscription.daysLeft > 0 ? `${subscription.daysLeft} Days Left` : 'Auto-renews'}
                                        </div>
                                    </div>
                                    {/* Free Plan Token Limit Warning */}
                                    {!subscription.isPro && (
                                        <div className="col-span-2 bg-stone-950/50 border border-stone-800 rounded-lg p-3 flex items-start gap-3">
                                            <Zap className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                            <div>
                                                <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Explorer Limit</div>
                                                <p className="text-sm text-stone-300">
                                                    You are on a limited AI plan (10k tokens/mo).
                                                    <br />
                                                    <span className="text-stone-500 text-xs">Upgrade to Pro for 4M+ tokens/mo.</span>
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 pt-8 border-t border-stone-800">
                                    <h3 className="text-lg text-white mb-4">Update Seats</h3>
                                    <div className="flex flex-col md:flex-row gap-4 items-end">
                                        <div className="flex-1 w-full">
                                            <label className="text-xs text-stone-500 uppercase font-bold mb-2 block">Total Seats Needed</label>
                                            <div className="relative">
                                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={seats}
                                                    onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
                                                    className="w-full bg-stone-950 text-white pl-10 pr-4 py-3 rounded-xl border border-stone-800 focus:border-stone-600 focus:ring-0 outline-none transition-all font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1 text-sm text-stone-500 pb-3">
                                            <div className="flex justify-between">
                                                <span>Base Plan</span>
                                                <div className="text-right">
                                                    <span className={`text-stone-300 ${billingInterval === 'year' ? 'line-through text-stone-600 text-xs mr-2' : ''}`}>$160/mo</span>
                                                    {billingInterval === 'year' && <span className="text-stone-300">$1,728/yr</span>}
                                                </div>
                                            </div>
                                            {(seats - 1) > 0 && (
                                                <div className="flex justify-between mt-1 text-nobel-gold">
                                                    <span>+{seats - 1} Extra Seats</span>
                                                    <span>+${(seats - 1) * 49}/mo</span>
                                                </div>
                                            )}
                                            {(seats - 1) > 0 && (
                                                <div className="mt-2 text-[10px] text-stone-500 leading-tight">
                                                    * Charged immediately (prorated). Renews with base plan.
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-3 w-full md:w-auto">
                                            {/* Billing Interval Toggle */}
                                            <div className="flex p-1 bg-stone-950 border border-stone-800 rounded-lg">
                                                <button
                                                    onClick={() => setBillingInterval('month')}
                                                    className={`flex-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${billingInterval === 'month' ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-500 hover:text-stone-300'}`}
                                                >
                                                    Monthly
                                                </button>
                                                <button
                                                    onClick={() => setBillingInterval('year')}
                                                    className={`flex-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${billingInterval === 'year' ? 'bg-nobel-gold text-black shadow-sm' : 'text-stone-500 hover:text-stone-300'}`}
                                                >
                                                    Yearly <span className="text-[9px] opacity-70 ml-1">-10%</span>
                                                </button>
                                            </div>

                                            <button
                                                onClick={handleSubscribe}
                                                disabled={loading}
                                                className="bg-stone-100 text-stone-950 font-bold px-6 py-3 rounded-xl hover:bg-white transition-colors disabled:opacity-50 whitespace-nowrap"
                                            >
                                                {loading ? 'Processing...' : `Update Plan (${billingInterval === 'year' ? '$1,728/yr' : '$160/mo'})`}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Seat Usage */}
                        <div className="bg-stone-900/50 border border-stone-800 p-8 rounded-2xl">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-serif text-white">Seat Usage</h2>
                                <div className="text-stone-400 text-sm">Managing <strong>{subscription.seatCount || 1}</strong> total seats</div>
                            </div>

                            {/* Fake Visualization for Seat Usage since we don't have exact active user count in this payload yet */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-stone-500">
                                    <span>Active Members</span>
                                    <span>{subscription.seatCount ? `1 / ${subscription.seatCount}` : '1 / 1'}</span>
                                </div>
                                <div className="h-3 w-full bg-stone-950 rounded-full overflow-hidden border border-stone-800">
                                    {/* Hardcoded 1 for now as current user */}
                                    <div
                                        className="h-full bg-stone-700 rounded-full"
                                        style={{ width: `${Math.min((1 / (subscription.seatCount || 1)) * 100, 100)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-stone-500 mt-2">
                                    You are currently using 1 seat (yourself). Invite team members to utilize your remaining seats.
                                </p>
                            </div>
                        </div>
                    </div>


                    {/* RIGHT COLUMN: AI Usage & Top-up */}
                    <div className="space-y-8">

                        {/* 3. AI Token Usage Card */}
                        <div className="bg-stone-900/50 border border-stone-800 p-8 rounded-2xl h-full flex flex-col">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-stone-950 rounded-lg border border-stone-800">
                                    <Zap className="w-5 h-5 text-nobel-gold" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-serif text-white leading-tight">AI Usage</h2>
                                    <div className="text-xs text-stone-500 uppercase tracking-wide font-bold">Token Limits</div>
                                </div>
                            </div>

                            <div className="flex-grow">
                                <div className="mb-8">
                                    <div className="flex items-end gap-2 mb-2">
                                        <div className="text-3xl font-serif text-white">{subscription.usage.toLocaleString()}</div>
                                        <div className="text-stone-500 mb-1">/ {subscription.limit.toLocaleString()}</div>
                                    </div>
                                    <div className="h-2 w-full bg-stone-950 rounded-full overflow-hidden mb-2">
                                        <div
                                            className={`h-full ${usagePercent > 90 ? 'bg-red-500' : 'bg-nobel-gold'} transition-all duration-500`}
                                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                        />
                                    </div>
                                    {usagePercent > 80 && (
                                        <div className="text-xs text-red-400 flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" /> Running low on tokens
                                        </div>
                                    )}
                                </div>

                                <div className="bg-stone-950/50 rounded-xl p-4 border border-stone-800/50">
                                    <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">30 Day History</div>
                                    {renderUsageChart()}
                                </div>
                            </div>


                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
