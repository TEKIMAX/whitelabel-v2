import React from 'react';

/**
 * A decorative background component that renders a subtle dot pattern.
 * Uses SVG pattern for performance and scalability.
 */
export const DotPatternBackground: React.FC<{ className?: string, color?: string }> = ({
    className = '',
    color = '#D6D3D1' // Stone-300 equivalent
}) => {
    return (
        <div className={`absolute inset-0 w-full h-full pointer-events-none select-none z-0 ${className}`} aria-hidden="true">
            <svg
                className="absolute w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
                width="100%"
                height="100%"
            >
                <defs>
                    <pattern
                        id="dot-pattern"
                        x="0"
                        y="0"
                        width="24"
                        height="24"
                        patternUnits="userSpaceOnUse"
                    >
                        <circle cx="2" cy="2" r="1" fill={color} className="opacity-40" />
                    </pattern>
                </defs>
                <rect x="0" y="0" width="100%" height="100%" fill="url(#dot-pattern)" />
            </svg>
        </div>
    );
};

export default DotPatternBackground;
