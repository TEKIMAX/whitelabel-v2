import React, { useState } from 'react';
import { ArrowRight, FileText, RefreshCw, ShieldCheck, X, Check, Loader2 } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from "../convex/_generated/api";
import { toast } from 'sonner';

export const PaymentComingSoon: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isJoined, setIsJoined] = useState(false);

    const joinWaitlist = useMutation(api.waitlist.joinWaitlist);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsLoading(true);
        try {
            await joinWaitlist({ email });
            setIsJoined(true);
            setIsOpen(false);
            toast.success("You've been added to the waitlist!");
        } catch (error) {
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl animate-fade-in-up">


            {/* <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.1] mb-6 text-nobel-dark">
                Unified <br />
                <span className="italic text-nobel-gold">Revenue</span> <br />
                Management.
            </h1>

            <p className="font-sans text-base md:text-lg text-nobel-dim leading-relaxed mb-10 max-w-lg border-l-2 border-nobel-gold/30 pl-6">
                Empower your business with a complete financial toolkit. Create professional invoices, manage recurring subscription plans, and handle refunds instantly all from one powerful dashboard.
            </p> */}

            <div className="flex flex-col sm:flex-row items-start gap-4 mb-12">
                {isJoined ? (
                    <div className="px-8 py-4 bg-green-50 text-green-700 rounded-full font-medium tracking-wide flex items-center justify-center gap-3 border border-green-200">
                        <Check className="w-5 h-5" />
                        <span className="relative z-10 whitespace-nowrap">You're on the list!</span>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsOpen(true)}
                        className="group relative w-full sm:w-auto px-8 py-4 bg-nobel-dark text-white font-medium tracking-wide shadow-xl hover:bg-nobel-gold transition-all duration-300 overflow-hidden flex items-center justify-center gap-3 rounded-full"
                    >
                        <span className="relative z-10 whitespace-nowrap">Join the Waitlist</span>
                        <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-3 gap-4 md:gap-8 border-t border-nobel-dark/10 pt-8">
                <div className="flex flex-col gap-1">
                    <FileText size={20} className="text-nobel-gold mb-1" strokeWidth={1.5} />
                    <span className="font-serif text-lg font-bold text-nobel-dark">Smart</span>
                    <span className="text-[10px] text-nobel-dim uppercase tracking-wider">Invoicing</span>
                </div>
                <div className="flex flex-col gap-1">
                    <RefreshCw size={20} className="text-nobel-gold mb-1" strokeWidth={1.5} />
                    <span className="font-serif text-lg font-bold text-nobel-dark">Auto</span>
                    <span className="text-[10px] text-nobel-dim uppercase tracking-wider">Subscriptions</span>
                </div>
                <div className="flex flex-col gap-1">
                    <ShieldCheck size={20} className="text-nobel-gold mb-1" strokeWidth={1.5} />
                    <span className="font-serif text-lg font-bold text-nobel-dark">Secure</span>
                    <span className="text-[10px] text-nobel-dim uppercase tracking-wider">Refunds</span>
                </div>
            </div>

            {/* Waitlist Dialog */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200 md:p-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-6">
                            <h3 className="font-serif text-2xl font-bold text-stone-900 mb-2">Get Early Access</h3>
                            <p className="text-stone-500 text-sm">Be the first to know when our unified revenue management tools launch.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="sr-only">Email address</label>
                                <input
                                    type="email"
                                    id="email"
                                    required
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-nobel-gold/50 focus:border-nobel-gold transition-all"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full px-6 py-3 bg-stone-900 text-white font-bold rounded-lg hover:bg-nobel-gold transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Joining...
                                    </>
                                ) : (
                                    "Join Waitlist"
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};