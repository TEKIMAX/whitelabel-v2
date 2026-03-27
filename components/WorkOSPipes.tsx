import React from 'react';
import { useAuth } from '../contexts/CustomAuthProvider';
import { Pipes, WorkOsWidgets } from '@workos-inc/widgets';
import { Plug } from 'lucide-react';

export const WorkOSPipes = () => {
    const { isLoading, user, getAccessToken } = useAuth();

    if (isLoading) return (
        <div className="p-12 flex flex-col items-center justify-center gap-4 text-stone-500 min-h-[300px]">
            <div className="w-8 h-8 border-2 border-stone-200 border-t-nobel-gold rounded-full animate-spin" />
            <span className="text-sm font-medium tracking-wide">Loading Integrations...</span>
        </div>
    );

    if (!user) return (
        <div className="p-12 flex flex-col items-center justify-center gap-4 text-stone-500 min-h-[300px] border border-stone-200 rounded-2xl bg-stone-50/50">
            <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center text-stone-400">
                <Plug className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium">Please sign in to manage integrations.</p>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden p-6 md:p-10 min-h-[500px]">
            <div className="mb-8">
                <h2 className="font-serif text-2xl font-bold text-stone-900">Connections & Integrations</h2>
                <p className="text-stone-500 text-sm mt-1">Manage your connections to third-party providers and external tools.</p>
            </div>

            <WorkOsWidgets
                theme={{
                    accentColor: 'gold',
                    grayColor: 'sand',
                    radius: 'large',
                }}
                elements={{
                    primaryButton: {
                        color: 'amber',
                        variant: 'surface',
                        highContrast: true,
                    },
                    avatar: {
                        radius: 'full',
                    }
                }}
            >
                <Pipes authToken={getAccessToken} />
            </WorkOsWidgets>
        </div>
    );
};
