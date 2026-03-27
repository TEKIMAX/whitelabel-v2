import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/CustomAuthProvider';
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Check, ChevronRight, Building2, User, Shield, ArrowLeft, Rocket, Sparkles } from 'lucide-react';
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingFlowProps {
    user: any;
    onComplete: (name: string, hypothesis: string, foundingDate?: number) => void;
    mode?: 'onboarding' | 'create';
    className?: string; // Allow custom styling for embedded use cases
}

const STEPS = [
    { id: 1, title: 'Profile', icon: User },
    { id: 2, title: 'Role', icon: Shield },
    { id: 3, title: 'Organization', icon: Building2 },
    { id: 4, title: 'Start', icon: Rocket },
    { id: 5, title: 'Complete', icon: Check },
];

const ROLES = [
    "Founder",
    "Co-Founder",
    "CEO",
    "CTO",
    "Product Manager",
    "Serial Entrepreneur",
    "Business Owner",
    "Investor",
    "Other"
];

const ORG_SIZES = [
    "Just me",
    "2-10 employees",
    "11-50 employees",
    "51-200 employees",
    "201+ employees"
];

const YEARS_IN_BUSINESS = [
    "Idea Phase",
    "< 1 year",
    "1-3 years",
    "3-5 years",
    "5+ years"
];

const INDUSTRIES = [
    "SaaS",
    "AI/ML",
    "FinTech",
    "HealthTech",
    "EdTech",
    "E-commerce",
    "Marketplace",
    "CleanTech",
    "Biotech",
    "Cybersecurity",
    "DevTools",
    "Consumer Tech",
    "Real Estate",
    "LegalTech",
    "Insurance",
    "Manufacturing",
    "Logistics",
    "Media/Content",
    "Gaming",
    "Other"
];

const variants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 50 : -50,
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
    },
    exit: (direction: number) => ({
        x: direction < 0 ? 50 : -50,
        opacity: 0,
    }),
};

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ user, onComplete, mode = 'onboarding' }) => {
    const updateStep = useMutation(api.users.updateOnboardingStep);
    const completeOnboarding = useMutation(api.users.completeOnboarding);
    const seedExample = useMutation(api.seed.seedProject.seedExampleProject);
    const { signOut } = useAuth();

    const initialStep = mode === 'create' ? 3 : (user?.onboardingStep || 1);
    const [currentStep, setCurrentStep] = useState(initialStep);

    const [direction, setDirection] = useState(0);
    const [formData, setFormData] = useState({
        role: user?.onboardingData?.role || "",
        orgSize: user?.onboardingData?.orgSize || "",
        yearsInBusiness: user?.onboardingData?.yearsInBusiness || "",
        industry: user?.onboardingData?.industry || "",
        name: user?.name || "",
        startupName: "",
        hypothesis: "We help [Target Audience] solve [Problem] by [Solution] with [Secret Sauce].",
        aiInteractionStyle: user?.onboardingData?.aiInteractionStyle || "Strategist",
    });
    const [useTemplate, setUseTemplate] = useState<boolean | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sync local state with user prop if it updates
    useEffect(() => {
        // Only sync step from user profile if NOT in 'create' mode (where we always start fresh)
        if (mode !== 'create' && user?.onboardingStep && user.onboardingStep > currentStep) {
            setCurrentStep(user.onboardingStep);
        }
    }, [user?.onboardingStep, mode]);

    // Check for success redirect
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('success') === 'true' || params.get('subscription_success') === 'true') {
            setCurrentStep(7);
        }
    }, []);

    const handleNext = async () => {
        setIsSubmitting(true);
        setDirection(1);
        try {
            let nextStep = currentStep + 1;

            const { name, ...restData } = formData;
            if (mode === 'onboarding') {
                await updateStep({
                    step: nextStep,
                    name: name,
                    data: { ...restData, enableR2Storage: true }
                });
            }

            setCurrentStep(nextStep);
        } catch (error: any) {
            if (error.message && (error.message.includes("Unauthenticated") || error.message.includes("not found"))) {
                toast.error("Session expired. Please sign in again.", {
                    action: {
                        label: "Sign Out",
                        onClick: () => signOut()
                    }
                });
            } else {
                toast.error("Failed to save progress. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBack = async () => {
        if (currentStep > 1) {
            setDirection(-1);
            setCurrentStep(currentStep - 1);
            await updateStep({ step: currentStep - 1 });
        }
    };

    const renderStepContent = () => {
        return (
            <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                    key={currentStep}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="w-full"
                >
                    {(() => {
                        switch (currentStep) {
                            case 1:
                                return (
                                    <div className="space-y-8">
                                        <div>
                                            <h2 className="text-4xl font-serif text-stone-900 mb-2">Welcome, {user?.name || "User"}</h2>
                                            <p className="text-stone-500 text-lg">Let's confirm your details to get started.</p>
                                        </div>
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Full Name</label>
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="w-full bg-transparent border-b border-stone-300 py-3 text-stone-900 font-medium focus:outline-none focus:border-stone-900"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Email Address</label>
                                                <input
                                                    type="email"
                                                    value={user?.email || ''}
                                                    disabled
                                                    className="w-full bg-transparent border-b border-stone-300 py-3 text-stone-900 font-medium focus:outline-none cursor-not-allowed"
                                                />
                                            </div>
                                        </div>
                                        <div className="pt-4 flex items-center justify-between">
                                            <div />
                                            <button
                                                onClick={handleNext}
                                                className="group flex items-center justify-center gap-2 bg-stone-900 text-white rounded-full px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-stone-800 hover:gap-3 transition-all"
                                            >
                                                Continue <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="mt-6 flex justify-center">
                                            <button onClick={() => signOut()} className="text-stone-300 hover:text-stone-500 text-[10px] uppercase font-bold tracking-widest transition-colors">
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                );
                            case 2:
                                return (
                                    <div className="space-y-8">
                                        <div>
                                            <h2 className="text-4xl font-serif text-stone-900 mb-2">One last thing...</h2>
                                            <p className="text-stone-500 text-lg">What is your primary role?</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {ROLES.map(role => (
                                                <button
                                                    key={role}
                                                    onClick={() => setFormData({ ...formData, role })}
                                                    className={`p-4 px-6 text-left transition-all border rounded-full font-medium ${formData.role === role
                                                        ? 'bg-stone-900 text-white border-stone-900 shadow-md'
                                                        : 'bg-white text-stone-500 border-stone-200 hover:border-stone-900 hover:text-stone-900'
                                                        }`}
                                                >
                                                    <span className="font-medium">{role}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <div className="pt-4 flex items-center justify-between">
                                            <button
                                                onClick={handleBack}
                                                className="group flex items-center gap-2 text-stone-400 font-bold uppercase tracking-widest text-xs hover:text-stone-600 hover:bg-stone-100 px-4 py-2 rounded-full transition-all"
                                            >
                                                <ArrowLeft className="w-4 h-4" /> Back
                                            </button>
                                            <button
                                                onClick={handleNext}
                                                disabled={!formData.role || isSubmitting}
                                                className="group flex items-center justify-center gap-2 bg-stone-900 text-white rounded-full px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-stone-800 hover:gap-3 transition-all disabled:opacity-50 disabled:hover:gap-2"
                                            >
                                                {isSubmitting ? 'Saving...' : 'Continue'} <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="mt-6 flex justify-center">
                                            <button onClick={() => signOut()} className="text-stone-300 hover:text-stone-500 text-[10px] uppercase font-bold tracking-widest transition-colors">
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                );
                            case 3:
                                return (
                                    <div className="space-y-8">
                                        <div>
                                            <h2 className="text-4xl font-serif text-stone-900 mb-2">Tell us about your org</h2>
                                            <p className="text-stone-500 text-lg">We use this to benchmark your progress.</p>
                                        </div>

                                        <div className="space-y-6">
                                            {/* Startup Name & Hypothesis - ONLY FOR CREATE MODE */}
                                            {mode === 'create' && (
                                                <>
                                                    <div>
                                                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Startup Name</label>
                                                        <input
                                                            type="text"
                                                            value={formData.startupName}
                                                            onChange={(e) => setFormData({ ...formData, startupName: e.target.value })}
                                                            placeholder="e.g. Acme AI"
                                                            className="w-full bg-transparent border-b border-stone-300 py-3 text-stone-900 font-medium focus:outline-none focus:border-stone-900 text-lg"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Hypothesis</label>
                                                        <textarea
                                                            value={formData.hypothesis}
                                                            onChange={(e) => setFormData({ ...formData, hypothesis: e.target.value })}
                                                            className="w-full bg-stone-50 border border-stone-200 rounded-lg p-3 text-stone-600 focus:outline-none focus:border-stone-900 h-24 text-sm"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Organization Size</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {ORG_SIZES.map(size => (
                                                        <button
                                                            key={size}
                                                            onClick={() => setFormData({ ...formData, orgSize: size })}
                                                            className={`px-6 py-2 text-sm border rounded-full transition-all font-medium ${formData.orgSize === size
                                                                ? 'bg-stone-900 text-white border-stone-900 shadow-md'
                                                                : 'bg-white text-stone-600 border-stone-200 hover:border-stone-900'
                                                                }`}
                                                        >
                                                            {size}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Years in Business</label>
                                                    <select
                                                        value={formData.yearsInBusiness}
                                                        onChange={(e) => setFormData({ ...formData, yearsInBusiness: e.target.value })}
                                                        className="w-full bg-transparent border-b border-stone-300 py-2 text-stone-900 focus:outline-none focus:border-stone-900 rounded-none"
                                                    >
                                                        <option value="">Select...</option>
                                                        {YEARS_IN_BUSINESS.map(year => (
                                                            <option key={year} value={year}>{year}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Industry</label>
                                                    <select
                                                        value={formData.industry}
                                                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                                        className="w-full bg-transparent border-b border-stone-300 py-2 text-stone-900 focus:outline-none focus:border-stone-900 rounded-none"
                                                    >
                                                        <option value="">Select...</option>
                                                        {INDUSTRIES.map(ind => (
                                                            <option key={ind} value={ind}>{ind}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 flex items-center justify-between">
                                            <button
                                                onClick={handleBack}
                                                className="group flex items-center gap-2 text-stone-400 font-bold uppercase tracking-widest text-xs hover:text-stone-600 hover:bg-stone-100 px-4 py-2 rounded-full transition-all"
                                            >
                                                <ArrowLeft className="w-4 h-4" /> Back
                                            </button>
                                            <button
                                                onClick={handleNext}
                                                disabled={!formData.orgSize || isSubmitting}
                                                className="group flex items-center justify-center gap-2 bg-stone-900 text-white rounded-full px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-stone-800 hover:gap-3 transition-all disabled:opacity-50 disabled:hover:gap-2"
                                            >
                                                {isSubmitting ? 'Saving...' : 'Continue'} <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="mt-6 flex justify-center">
                                            <button onClick={() => signOut()} className="text-stone-300 hover:text-stone-500 text-[10px] uppercase font-bold tracking-widest transition-colors">
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                );

                            case 4:
                                return (
                                    <div className="space-y-8">
                                        <div>
                                            <h2 className="text-4xl font-serif text-stone-900 mb-2">How would you like to start?</h2>
                                            <p className="text-stone-500 text-lg">Choose a pre-filled example to explore, or start with a clean slate.</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Template Card */}
                                            <button
                                                onClick={() => setUseTemplate(true)}
                                                className={`group relative p-6 text-left border-2 rounded-2xl transition-all duration-300 ${useTemplate === true
                                                    ? 'border-stone-900 bg-stone-900 text-white shadow-xl scale-[1.02]'
                                                    : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:shadow-md'
                                                    }`}
                                            >
                                                <div className={`mb-4 h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${useTemplate === true ? 'bg-white/20' : 'bg-stone-100 group-hover:bg-stone-200'
                                                    }`}>
                                                    <Rocket className="w-6 h-6" />
                                                </div>
                                                <h3 className="text-lg font-bold mb-1">Start with Example</h3>
                                                <p className={`text-sm leading-relaxed ${useTemplate === true ? 'text-white/70' : 'text-stone-400'
                                                    }`}>
                                                    A whitelabel SaaS venture with 7 years of milestones, filled canvas, team, OKRs, financials, and customer data.
                                                </p>
                                                {useTemplate === true && (
                                                    <div className="absolute top-3 right-3">
                                                        <Check className="w-5 h-5 text-white" />
                                                    </div>
                                                )}
                                            </button>

                                            {/* Fresh Card */}
                                            <button
                                                onClick={() => setUseTemplate(false)}
                                                className={`group relative p-6 text-left border-2 rounded-2xl transition-all duration-300 ${useTemplate === false
                                                    ? 'border-stone-900 bg-stone-900 text-white shadow-xl scale-[1.02]'
                                                    : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:shadow-md'
                                                    }`}
                                            >
                                                <div className={`mb-4 h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${useTemplate === false ? 'bg-white/20' : 'bg-stone-100 group-hover:bg-stone-200'
                                                    }`}>
                                                    <Sparkles className="w-6 h-6" />
                                                </div>
                                                <h3 className="text-lg font-bold mb-1">Start Fresh</h3>
                                                <p className={`text-sm leading-relaxed ${useTemplate === false ? 'text-white/70' : 'text-stone-400'
                                                    }`}>
                                                    Create your organization from scratch. Fill in your own canvas, team, and data manually.
                                                </p>
                                                {useTemplate === false && (
                                                    <div className="absolute top-3 right-3">
                                                        <Check className="w-5 h-5 text-white" />
                                                    </div>
                                                )}
                                            </button>
                                        </div>

                                        <div className="pt-4 flex items-center justify-between">
                                            <button
                                                onClick={handleBack}
                                                className="group flex items-center gap-2 text-stone-400 font-bold uppercase tracking-widest text-xs hover:text-stone-600 hover:bg-stone-100 px-4 py-2 rounded-full transition-all"
                                            >
                                                <ArrowLeft className="w-4 h-4" /> Back
                                            </button>
                                            <button
                                                onClick={handleNext}
                                                disabled={useTemplate === null || isSubmitting}
                                                className="group flex items-center justify-center gap-2 bg-stone-900 text-white rounded-full px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-stone-800 hover:gap-3 transition-all disabled:opacity-50 disabled:hover:gap-2"
                                            >
                                                {isSubmitting ? 'Saving...' : 'Continue'} <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            case 5:
                                return (
                                    <div className="space-y-8">
                                        <div>
                                            <h2 className="text-4xl font-serif text-stone-900 mb-2">Welcome to the Club.</h2>
                                            <p className="text-stone-500 text-lg">Your entrepreneurial journey begins now. Build something legendary.</p>
                                        </div>
                                        <div className="bg-white p-8 border border-stone-100 rounded-3xl shadow-xl text-center">
                                            <div className="mb-6 flex justify-center">
                                                <div className="h-16 w-16 bg-stone-900 rounded-full flex items-center justify-center">
                                                    <Check className="w-8 h-8 text-white" />
                                                </div>
                                            </div>
                                            <h3 className="text-2xl font-serif text-stone-900 mb-2">All Systems Go</h3>
                                            <p className="text-stone-500 mb-2">Your workspace is ready.</p>
                                            {useTemplate && (
                                                <p className="text-xs text-stone-400 mb-6 bg-stone-50 rounded-lg px-4 py-2 inline-block">
                                                    <Rocket className="w-3 h-3 inline mr-1" />
                                                    Example data will be loaded — Canvas, OKRs, Team, Financials & more.
                                                </p>
                                            )}
                                            <div className="mt-4">
                                                <button
                                                    disabled={isSubmitting}
                                                    onClick={async () => {
                                                        setIsSubmitting(true);
                                                        try {
                                                            if (mode !== 'create') {
                                                                await completeOnboarding();
                                                            }
                                                            if (useTemplate) {
                                                                // Seed the example project data
                                                                const orgId = user?.orgIds?.[0] || 'default';
                                                                const userId = user?.tokenIdentifier || '';
                                                                await seedExample({ orgId, userId });
                                                                toast.success("Example venture loaded! Explore the dashboard.");
                                                            }
                                                            onComplete(
                                                                useTemplate ? 'Adaptive Whitelabel Platform' : '',
                                                                useTemplate ? 'We help SaaS founders solve the go-to-market delay problem...' : ''
                                                            );
                                                        } catch (error) {
                                                            toast.error('Failed to load example data. You can add data manually.');
                                                            onComplete('', '');
                                                        } finally {
                                                            setIsSubmitting(false);
                                                        }
                                                    }}
                                                    className="w-full py-4 bg-stone-900 text-white font-bold uppercase tracking-widest text-xs hover:bg-stone-800 transition-colors rounded-full disabled:opacity-70"
                                                >
                                                    {isSubmitting ? (
                                                        <span className="flex items-center justify-center gap-2">
                                                            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                                            {useTemplate ? 'Loading Example...' : 'Setting Up...'}
                                                        </span>
                                                    ) : (
                                                        useTemplate ? 'Launch with Example Data' : 'Go to Dashboard'
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            default:
                                return null;
                        }
                    })()}
                </motion.div>
            </AnimatePresence >
        );
    };

    return (
        <div className={`flex h-screen w-full bg-[#FAFAFA] overflow-hidden font-sans ${user ? '' : ''} ${mode === 'create' ? 'h-full min-h-[800px] rounded-2xl shadow-xl border border-stone-200' : ''}`}>
            {/* Left Side - Content */}
            <div className={`w-full lg:w-[70%] h-full flex flex-col px-8 md:px-16 lg:px-24 relative overflow-y-auto ${mode === 'create' ? 'px-8 md:px-12 lg:px-16' : ''}`}>
                {/* Header / Breadcrumbs */}
                <div className="pt-12 pb-8">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
                        {STEPS.map((step, index) => (
                            <React.Fragment key={step.id}>
                                <span className={`${currentStep === step.id ? 'text-stone-900' : ''} transition - colors`}>
                                    {step.title}
                                </span>
                                {index < STEPS.length - 1 && <span className="text-stone-300">/</span>}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col justify-center mx-auto w-full pb-20 max-w-xl">
                    {renderStepContent()}
                </div>
            </div>

            {/* Right Side - Visuals */}
            <div className="hidden lg:block lg:w-[30%] h-full relative">
                <img
                    src="/onboarding-cover.png"
                    alt="Onboarding"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-stone-900/30" />

                <div className="absolute bottom-16 left-16 max-w-md text-white">
                    <p className="font-serif text-3xl mb-4 leading-tight">
                        "The secret of getting ahead is getting started."
                    </p>
                    <p className="text-sm font-bold uppercase tracking-widest opacity-80">
                        — Mark Twain
                    </p>
                </div>
            </div>
        </div>
    );
};
