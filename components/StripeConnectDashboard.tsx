import React, { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner'; // Added toast import
import { useAction } from 'convex/react';
import { api } from "../convex/_generated/api";
import { StartupData } from '../types';
import {
    ConnectComponentsProvider,
    ConnectPayments,
    ConnectPayouts,
    ConnectAccountOnboarding,
    ConnectAccountManagement,
    ConnectDocuments,
    ConnectNotificationBanner
} from "@stripe/react-connect-js";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import { PaymentComingSoon } from './paymentComingSoon';
import { GlobeViz } from './GlobeViz';
import { Logo } from './Logo';
import ProjectSelector from './ProjectSelector';
import TabNavigation from './TabNavigation';
import { ViewState } from '../types';
import { CustomProductsTab } from './CustomProductsTab';
import { CustomInvoicesTab } from './CustomInvoicesTab';

interface StripeConnectDashboardProps {
    project: StartupData;
    allProjects: StartupData[];
    onSwitchProject: (projectId: string) => void;
    onNewProject: () => void;
    onNavigate: (view: ViewState) => void;
    currentView: ViewState;
    allowedPages?: string[];
}

const StripeConnectDashboard: React.FC<StripeConnectDashboardProps> = ({
    project,
    allProjects,
    onSwitchProject,
    onNewProject,
    onNavigate,
    currentView,
    allowedPages
}) => {
    const createStripeLink = useAction(api.stripeActions.createAccountLink);
    const createAccountSession = useAction(api.stripeActions.createAccountSession);

    const [isConnecting, setIsConnecting] = useState(false);
    const [stripeConnectInstance, setStripeConnectInstance] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'onboarding' | 'products' | 'invoices' | 'payments' | 'payouts' | 'documents' | 'settings'>('products');
    const [error, setError] = useState<string | null>(null);

    const handleConnectStripe = async () => {
        try {
            setIsConnecting(true);
            const { url } = await createStripeLink({ projectId: project.id });
            window.location.href = url;
        } catch (e) {
            setIsConnecting(false);
            toast.error("Failed to start connection");
        }
    };

    // Initialize Stripe Connect
    useEffect(() => {
        if (project.stripeAccountId && !stripeConnectInstance) {
            const initStripe = async () => {
                try {
                    const instance = await loadConnectAndInitialize({
                        publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "", // Ensure this is set
                        fetchClientSecret: async () => {
                            const { clientSecret } = await createAccountSession({ stripeAccountId: project.stripeAccountId! });
                            return clientSecret;
                        },
                        /* Enable Stripe Testing Assistant in Development */
                        // @ts-ignore - property might not be typed in current SDK version but supports passthrough
                        developerTools: {
                            assistant: {
                                enabled: true,
                            },
                        },
                    });
                    setStripeConnectInstance(instance);
                } catch (e) {
                    setError("Failed to load financial dashboard. Please check your configuration.");
                }
            };
            initStripe();
        }
    }, [project.stripeAccountId, createAccountSession]);

    const tabDescriptions = {
        products: "Create and manage your products, prices, and payment links.",
        invoices: "Draft and send invoices to your customers.",
        payments: "View and manage all your customer transactions, refunds, and disputes.",
        payouts: "Track your funds, view upcoming payouts, and manage your bank account transfers.",
        documents: "Access your 1099-K tax forms and other important financial documents.",
        settings: "Update your business profile, branding, and payout details."
    } as const;

    return (
        <div className="flex flex-col h-screen bg-[#F9F8F4]">
            {/* Header */}
            <header className="px-6 py-3 bg-white/80 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between border-b border-stone-200">
                <div className="flex items-center gap-4">
                    <Logo imageClassName="h-8 w-auto" />
                    <div className="h-6 w-px bg-stone-200" />
                    <div className="h-6 w-px bg-stone-200" />
                    <TabNavigation
                        currentView={currentView}
                        onNavigate={onNavigate}
                        allowedPages={allowedPages}
                        projectFeatures={{
                            canvasEnabled: project.canvasEnabled,
                            marketResearchEnabled: project.marketResearchEnabled
                        }}
                    />
                </div>
            </header>

            <div className="relative w-full flex-grow flex flex-col overflow-hidden">
                {/* Background Globe Visualization - Moved to right */}
                <div className="absolute top-[60%] -right-24 -translate-y-1/2 w-[90rem] h-[90rem] z-0 opacity-10 mix-blend-multiply pointer-events-none transform scale-75 md:scale-100">
                    <GlobeViz />
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#F9F8F4] via-[#F9F8F4]/80 to-transparent pointer-events-none" />

                {/* Content Area */}
                <div className="relative z-10 flex-1 overflow-auto p-6 md:p-12">
                    <div className="max-w-7xl mx-auto h-full flex flex-col">

                        {!project.stripeAccountId ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="space-y-4">
                                    <h1 className="text-4xl md:text-6xl font-serif text-stone-900 leading-tight">
                                        Manage your Revenue <br />
                                        <span className="italic text-nobel-gold">Embedded & Integrated.</span>
                                    </h1>
                                    <p className="text-lg text-stone-600 leading-relaxed max-w-lg mx-auto">
                                        Connect a Stripe account to invoice customers, manage subscriptions, and track revenue directly within your startup operating system.
                                    </p>
                                </div>

                                <button
                                    onClick={handleConnectStripe}
                                    disabled={isConnecting}
                                    className="px-8 py-4 bg-[#635BFF] text-white rounded-full text-lg font-medium hover:bg-[#5851DF] transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 disabled:opacity-70 disabled:pointer-events-none flex items-center gap-3"
                                >
                                    {isConnecting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Connecting...
                                        </>
                                    ) : (
                                        <>
                                            Connect Stripe
                                            <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current opacity-80" xmlns="http://www.w3.org/2000/svg"><path d="M16 0C7.163 0 0 7.163 0 16s7.163 16 16 16 16-7.163 16-16S24.837 0 16 0zm0 30C8.268 30 2 23.732 2 16S8.268 2 16 2s14 6.268 14 14-6.268 14-14 14z" /></svg>
                                        </>
                                    )}
                                </button>

                                <div className="flex items-center gap-6 pt-4 text-xs font-semibold uppercase tracking-widest text-stone-400">
                                    <span>Powered by Stripe Connect</span>
                                    <div className="w-1 h-1 rounded-full bg-stone-300" />
                                    <span>Secure Payments</span>
                                    <div className="w-1 h-1 rounded-full bg-stone-300" />
                                    <span>Global Payouts</span>
                                </div>
                            </div>
                        ) : (
                            // Connected State
                            <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-500">
                                {!stripeConnectInstance ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-stone-400 space-y-4">
                                        <Loader2 className="w-10 h-10 animate-spin text-nobel-gold" />
                                        <p>Initializing Secure Financial Dashboard...</p>
                                    </div>
                                ) : (
                                    <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
                                        <div className="flex flex-col min-h-0 h-auto rounded-3xl bg-white shadow-xl border border-stone-200 overflow-hidden">
                                            {/* Notification Banner - Critical for Risk/Compliance */}
                                            <div className="px-6 pt-4">
                                                <ConnectNotificationBanner />
                                            </div>

                                            {/* Dashboard Tabs */}
                                            <div className="px-6 py-4 border-b border-stone-100 flex flex-col gap-4 bg-stone-50/50">
                                                <div className="flex gap-1 flex-wrap">
                                                    {[
                                                        { id: 'products', label: 'Products' },
                                                        { id: 'invoices', label: 'Invoices' },
                                                        { id: 'payments', label: 'Payments' },
                                                        { id: 'payouts', label: 'Payouts' },
                                                        { id: 'documents', label: 'Documents' },
                                                        { id: 'settings', label: 'Account Settings' }
                                                    ].map(tab => (
                                                        <button
                                                            key={tab.id}
                                                            onClick={() => setActiveTab(tab.id as any)}
                                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                                                ? 'bg-white text-stone-900 shadow-sm ring-1 ring-black/5'
                                                                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'}`}
                                                        >
                                                            {tab.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                {/* Tab Description */}
                                                <div className="px-1">
                                                    <p className="text-sm text-stone-500">
                                                        {tabDescriptions[activeTab]}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Component Render Area */}
                                            <div className="bg-white p-8">
                                                {activeTab === 'products' && <CustomProductsTab stripeAccountId={project.stripeAccountId!} />}
                                                {activeTab === 'invoices' && <CustomInvoicesTab stripeAccountId={project.stripeAccountId!} />}
                                                {activeTab === 'payments' && <ConnectPayments />}
                                                {activeTab === 'payouts' && <ConnectPayouts />}
                                                {activeTab === 'documents' && <ConnectDocuments />}
                                                {activeTab === 'settings' && <ConnectAccountManagement />}
                                            </div>
                                        </div>
                                    </ConnectComponentsProvider>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default StripeConnectDashboard;
