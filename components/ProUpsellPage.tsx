import React from 'react';
import { ViewState } from '../types';
import { Check, Shield, Lock, ArrowRight, Zap } from 'lucide-react';

interface ProUpsellPageProps {
    viewState: ViewState;
    onUpgrade: () => void;
    onBack: () => void;
}

interface FeatureInfo {
    title: string;
    description: string;
    benefits: string[];
    image: string;
}

const FEATURE_MAP: Partial<Record<ViewState, FeatureInfo>> = {
    // Fundraising
    DECK: {
        title: 'Pitch Deck Builder',
        description: 'Create investor-ready presentations with AI-generated content, consistent theming, and drag-and-drop slides.',
        benefits: ['AI Content Generation', 'One-Click Export', 'Investor-Ready Templates', 'Slide Management'],
        image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=1000'
    },
    BUSINESS_PLAN: {
        title: 'Business Plan Generator',
        description: 'Structure and write a comprehensive business plan in minutes, not weeks, using our intelligent editor.',
        benefits: ['Automated Financial Projections', 'Market Analysis Integration', 'Export to PDF/Docx', 'Chapter-by-Chapter Guidance'],
        image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=1000'
    },
    SAFE: {
        title: 'SAFE Agreement Generator',
        description: 'Generate standard Y Combinator SAFE agreements for your early-stage fundraising.',
        benefits: ['Pre-Money & Post-Money Support', 'Customizable Terms', 'Instant PDF Generation', 'Legally Standardized'],
        image: 'https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?auto=format&fit=crop&q=80&w=1000'
    },

    // Finance & Analysis
    REVENUE: {
        title: 'Advanced Financial Modeling',
        description: 'Build sophisticated revenue and cost models to forecast your startup\'s financial future.',
        benefits: ['Burn Rate Calculation', 'Unit Economics Analysis', 'Growth Projections', 'Scenario Planning'],
        image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=1000'
    },
    BOTTOM_UP_SIZING: {
        title: 'Bottom-Up Market Sizing',
        description: 'Calculate your TAM, SAM, and SOM with precision using the bottom-up methodology investors prefer.',
        benefits: ['Granular Data Points', 'Defensible Methodology', 'Visual Charts', 'Exportable Reports'],
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1000'
    },
    COMPETITIVE_MATRIX: {
        title: 'Competitive Matrix',
        description: 'Visually compare your startup against competitors to identify your unique value proposition.',
        benefits: ['Feature-by-Feature Comparison', 'SWOT Analysis', 'Visual Grid Generator', 'Market Positioning'],
        image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=1000'
    },

    // Operations & Team
    TEAM: {
        title: 'Team & Equity Management',
        description: 'Manage your team structure, roles, and equity distribution with a built-in cap table tool.',
        benefits: ['Cap Table Management', 'Vesting Schedules', 'Org Chart Visualization', 'Role-Based Access'],
        image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1000'
    },
    LEGAL: {
        title: 'Legal Document Hub',
        description: 'Access a library of essential legal documents for your startup, from NDAs to Advisor Agreements.',
        benefits: ['Standard Templates', 'Document Management', 'E-Signature Ready', 'Compliance Tracking'],
        image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=1000'
    },
    GRANT: {
        title: 'Grant & Funding Database',
        description: 'Access a curated database of non-dilutive funding opportunities, including government grants and R&D credits.',
        benefits: ['AI Mathching Engine', 'Application Trackers', 'Deadline Reminders', 'Expert Templates'],
        image: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&q=80&w=1000'
    },
    REPORT: {
        title: 'White Paper Generator',
        description: 'Create authoritative white papers to establish thought leadership and explain complex technology.',
        benefits: ['Technical Writing Asst', 'Professional Formatting', 'Citation Management', 'Brand Customization'],
        image: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&q=80&w=1000'
    }
};

const DEFAULT_FEATURE: FeatureInfo = {
    title: 'Pro Feature',
    description: 'This feature is available exclusively on the Pro plan. Upgrade to unlock advanced tools for scaling your startup.',
    benefits: ['Unlock All Pro Features', 'Priority Support', 'Advanced AI Models', 'Unlimited Projects'],
    image: 'https://images.unsplash.com/photo-1639322537228-ad714291f22c?auto=format&fit=crop&q=80&w=1000'
};

export const ProUpsellPage: React.FC<ProUpsellPageProps> = ({ viewState, onUpgrade, onBack }) => {
    const info = FEATURE_MAP[viewState] || DEFAULT_FEATURE;

    return (
        <div className="flex min-h-screen bg-[#F9F8F4] overflow-hidden">
            {/* Left: Content */}
            <div className="w-full lg:w-1/2 p-12 lg:p-20 flex flex-col justify-center relative">
                <button
                    onClick={onBack}
                    className="absolute top-8 left-8 text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                    ← Back to Dashboard
                </button>

                <div className="max-w-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-nobel-gold/10 text-nobel-gold font-bold text-xs tracking-wide uppercase mb-6">
                        <Shield className="w-3 h-3 fill-current" />
                        Pro Plan Exclusive
                    </div>

                    <h1 className="font-serif text-4xl lg:text-5xl text-stone-900 mb-6 leading-tight">
                        {info.title}
                    </h1>

                    <p className="text-lg text-stone-600 mb-8 leading-relaxed">
                        {info.description}
                    </p>

                    <div className="space-y-4 mb-10">
                        {info.benefits.map((benefit, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-green-600" />
                                </div>
                                <span className="text-stone-700">{benefit}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={onUpgrade}
                            className="px-8 py-4 bg-stone-900 text-white rounded-full font-bold text-lg hover:bg-stone-800 transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-stone-900/10"
                        >
                            <Zap className="w-5 h-5 fill-current" />
                            Upgrade to Pro
                        </button>
                        <button
                            onClick={onBack}
                            className="px-8 py-4 bg-white border border-stone-200 text-stone-600 rounded-full font-bold text-lg hover:bg-stone-50 transition-colors"
                        >
                            Maybe Later
                        </button>
                    </div>

                    <p className="mt-6 text-xs text-stone-400">
                        Includes 14-day money-back guarantee. No questions asked.
                    </p>
                </div>
            </div>

            {/* Right: Image */}
            <div className="hidden lg:block w-1/2 relative bg-stone-900">
                <div className="absolute inset-0 bg-stone-900/20 z-10" /> {/* Overlay */}
                <img
                    src="/pro-upsell-bg.png"
                    alt={info.title}
                    className="w-full h-full object-cover opacity-90"
                />


            </div>
        </div>
    );
};
