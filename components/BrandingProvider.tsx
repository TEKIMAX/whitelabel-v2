import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

interface BrandingData {
    logoUrl: string | null;
    isLogoTransparent: boolean;
    appName: string | null;
    primaryColor: string | null;
}

const DEFAULT_BRANDING: BrandingData = {
    logoUrl: '/images/adaptive-startup.png',
    isLogoTransparent: true,
    appName: 'Adaptive Startup',
    primaryColor: null,
};

const BrandingContext = createContext<BrandingData>(DEFAULT_BRANDING);

export const useBranding = () => useContext(BrandingContext);

interface BrandingProviderProps {
    orgId?: string;
    children: ReactNode;
}

export const BrandingProvider: React.FC<BrandingProviderProps> = ({ orgId, children }) => {
    const orgBranding = useQuery(api.branding.getLogo, orgId ? { orgId } : 'skip');
    const globalBranding = useQuery(api.branding.getLogo, { orgId: '_global' });

    const value: BrandingData = {
        logoUrl: orgBranding?.logoUrl || globalBranding?.logoUrl || DEFAULT_BRANDING.logoUrl,
        isLogoTransparent: orgBranding?.isLogoTransparent ?? globalBranding?.isLogoTransparent ?? DEFAULT_BRANDING.isLogoTransparent,
        appName: globalBranding?.appName || orgBranding?.appName || DEFAULT_BRANDING.appName,
        primaryColor: globalBranding?.primaryColor || orgBranding?.primaryColor || DEFAULT_BRANDING.primaryColor,
    };

    React.useEffect(() => {
        if (typeof document !== 'undefined') {
            const hex = value.primaryColor || '#C5A059';
            let r = 197, g = 160, b = 89; // Default gold

            const cleanHex = hex.replace(/^#/, '');
            if (cleanHex.length === 6) {
                r = parseInt(cleanHex.slice(0, 2), 16);
                g = parseInt(cleanHex.slice(2, 4), 16);
                b = parseInt(cleanHex.slice(4, 6), 16);
            } else if (cleanHex.length === 3) {
                r = parseInt(cleanHex.charAt(0) + cleanHex.charAt(0), 16);
                g = parseInt(cleanHex.charAt(1) + cleanHex.charAt(1), 16);
                b = parseInt(cleanHex.charAt(2) + cleanHex.charAt(2), 16);
            }

            document.documentElement.style.setProperty(
                '--brand-color',
                `${r} ${g} ${b}`
            );
        }
    }, [value.primaryColor]);

    return (
        <BrandingContext.Provider value={value}>
            {children}
        </BrandingContext.Provider>
    );
};
