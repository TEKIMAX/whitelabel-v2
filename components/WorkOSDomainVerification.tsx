import React, { useState, useEffect } from 'react';
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { AdminPortalDomainVerification, WorkOsWidgets } from "@workos-inc/widgets";
import { Globe } from 'lucide-react';

export const WorkOSDomainVerification = ({ orgId }: { orgId: string }) => {
    const getWidgetToken = useAction(api.workos.getWidgetToken);
    const [token, setToken] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (orgId) {
            getWidgetToken({ orgId })
                .then(setToken)
                .catch(err => {
                    setError(err.message);
                });
        }
    }, [orgId, getWidgetToken]);

    if (!orgId) return (
        <div className="flex flex-col items-center justify-center p-8 text-center h-[400px] border border-stone-200 rounded-xl bg-stone-50">
            <div className="w-12 h-12 bg-stone-200 rounded-full flex items-center justify-center mb-4 text-stone-500">
                <Globe className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">Domain Verification Unavailable</h3>
            <p className="text-stone-500 text-sm max-w-sm mt-2">
                This project is not linked to a WorkOS Organization yet. Please ensure the project is synced to the cloud to access domain verification.
            </p>
        </div>
    );

    if (error) return <div className="p-4 text-red-500 bg-red-50 rounded-lg">Error loading domain verification: {error}</div>;
    if (!token) return <div className="p-4 flex items-center gap-2 text-stone-500"><div className="w-4 h-4 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" /> Loading Domain Verification...</div>;

    return (
        <div className="h-[700px] w-full bg-white p-6 md:p-10 overflow-auto">
            <div className="mb-8">
                <h2 className="font-serif text-2xl font-bold text-stone-900">Domain Verification</h2>
                <p className="text-stone-500 text-sm mt-1">Verify your company domains to enable SSO and other enterprise features.</p>
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
                    },
                    dialog: {
                        align: 'center',
                    }
                }}
            >
                <AdminPortalDomainVerification authToken={token} />
            </WorkOsWidgets>
        </div>
    );
};
