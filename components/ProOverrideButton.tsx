import React, { useState, useEffect } from 'react';
import { Shield, Check, X, ShieldAlert } from 'lucide-react';
import * as Switch from '@radix-ui/react-switch';
import { isProOverridden, setProOverride } from '../lib/pro-override';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useEntitlements } from '../hooks/useEntitlements';



export const ProOverrideButton: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isForcePro, setIsForcePro] = useState(false);
    const [isDbSynced, setIsDbSynced] = useState(false);
    const toggleProStatus = useMutation(api.admin.toggleProStatus);
    const entitlements = useEntitlements();


    useEffect(() => {
        setIsForcePro(isProOverridden());
    }, [isOpen]); // Refresh when opening

    const toggleProMode = (checked: boolean) => {
        setIsForcePro(checked);
        setProOverride(checked);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-50 p-3 bg-stone-900 border border-nobel-gold rounded-full shadow-2xl hover:scale-105 transition-transform group"
            >
                <ShieldAlert className="w-6 h-6 text-nobel-gold group-hover:text-white transition-colors" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border border-stone-900"></div>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
            <div
                className="bg-stone-900 border border-nobel-gold/50 rounded-2xl p-6 w-80 shadow-2xl mb-16 mr-4 animate-in slide-in-from-bottom-5"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-lg font-serif text-white mb-1">Admin Override</h3>
                        <p className="text-xs text-stone-400">Force enable capabilities for demos.</p>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4 text-stone-400" />
                    </button>
                </div>

                <div className="space-y-3">
                    {/* Local Override */}
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isForcePro ? 'bg-nobel-gold/20' : 'bg-stone-800'}`}>
                                <Shield className={`w-5 h-5 ${isForcePro ? 'text-nobel-gold' : 'text-stone-500'}`} />
                            </div>
                            <div className="flex flex-col">
                                <span className={`font-bold text-sm ${isForcePro ? 'text-nobel-gold' : 'text-stone-300'}`}>
                                    Local Override
                                </span>
                                <span className="text-[10px] text-stone-500">Bypass client checks</span>
                            </div>
                        </div>

                        <Switch.Root
                            checked={isForcePro}
                            onCheckedChange={toggleProMode}
                            className={`w-11 h-6 rounded-full relative shadow-inner transition-colors duration-200 ease-in-out ${isForcePro ? 'bg-nobel-gold' : 'bg-stone-700'
                                }`}
                        >
                            <Switch.Thumb className={`block w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 translate-x-0.5 will-change-transform ${isForcePro ? 'translate-x-[22px]' : ''
                                }`} />
                        </Switch.Root>
                    </div>

                    {/* DB Sync */}
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isDbSynced ? 'bg-nobel-gold/20' : 'bg-stone-800'}`}>
                                <Check className={`w-5 h-5 ${isDbSynced ? 'text-nobel-gold' : 'text-stone-500'}`} />
                            </div>
                            <div className="flex flex-col">
                                <span className={`font-bold text-sm ${isDbSynced ? 'text-nobel-gold' : 'text-stone-300'}`}>
                                    Sync to DB
                                </span>
                                <span className="text-[10px] text-stone-500">Persist to Backend</span>
                            </div>
                        </div>

                        <Switch.Root
                            checked={isDbSynced}
                            onCheckedChange={async (checked) => {
                                setIsDbSynced(checked);
                                try {
                                    await toggleProStatus({ enabled: checked });
                                } catch (e) {
                                    setIsDbSynced(!checked);
                                }
                            }}
                            className={`w-11 h-6 rounded-full relative shadow-inner transition-colors duration-200 ease-in-out ${isDbSynced ? 'bg-nobel-gold' : 'bg-stone-700'
                                }`}
                        >
                            <Switch.Thumb className={`block w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 translate-x-0.5 will-change-transform ${isDbSynced ? 'translate-x-[22px]' : ''
                                }`} />
                        </Switch.Root>
                    </div>
                </div>

                {/* Plan Status Display */}
                <div className="mt-4 p-3 bg-stone-800 rounded-xl border border-white/5 flex justify-between items-center">
                    <span className="text-xs text-stone-400 font-medium">Detected Plan</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${entitlements.plan === 'Pro' ? 'bg-nobel-gold/20 text-nobel-gold' : 'bg-stone-700 text-stone-300'}`}>
                        {entitlements.plan || 'Loading...'}
                    </span>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 text-center">
                    <p className="text-[10px] text-stone-500 uppercase tracking-widest font-mono">
                        System Admin Access Only
                    </p>
                </div>
            </div>
        </div>
    );
};
