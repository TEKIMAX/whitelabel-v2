import React from 'react';
import { useBranding } from './BrandingProvider';

interface LogoProps {
    className?: string;
    textClassName?: string;
    imageClassName?: string;
    src?: string;
}

export const Logo: React.FC<LogoProps> = ({
    className = "flex items-center gap-2",
    textClassName = "font-serif font-bold text-xl tracking-wide text-stone-900",
    imageClassName = "h-20 w-auto rounded-lg",
    src,
}) => {
    const branding = useBranding();
    const logoSrc = src || branding.logoUrl || '/images/adaptive-startup.png';

    // Strip problematic masking filters if the logo is not transparent
    let finalImageClassName = imageClassName;
    if (branding.isLogoTransparent === false) {
        finalImageClassName = finalImageClassName
            .replace(/\bbrightness-0\b/g, '')
            .replace(/\binvert\b/g, '')
            .replace(/\bmix-blend-[a-z-]+\b/g, '')
            .trim();
    }

    return (
        <div className={className}>
            <img src={logoSrc} alt={branding.appName || "Adaptive Startup"} className={finalImageClassName} />
        </div>
    );
};
