import React, { useEffect, useState } from 'react';
import { Plus, ArrowRight } from 'lucide-react';

const MockCursor = ({ label, color, initialPos }: { label: string, color: string, initialPos: { x: number, y: number } }) => {
    const [pos, setPos] = useState(initialPos);

    useEffect(() => {
        const interval = setInterval(() => {
            setPos({
                x: Math.random() * 80 + 10,
                y: Math.random() * 80 + 10
            });
        }, 3000 + Math.random() * 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            className="absolute transition-all duration-[3000ms] ease-in-out z-20 pointer-events-none"
            style={{ left: `${pos.x}% `, top: `${pos.y}% ` }}
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="transform -rotate-12 drop-shadow-sm">
                <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19138L11.7841 12.3673H5.65376Z" fill={color} stroke="white" strokeWidth="1" />
            </svg>
            <div
                className="ml-4 -mt-2 px-2 py-0.5 rounded-full text-xs font-medium text-white shadow-sm whitespace-nowrap"
                style={{ backgroundColor: color }}
            >
                {label}
            </div>
        </div>
    );
};

const FloatingCursors = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <MockCursor label="Brie" color="#14B8A6" initialPos={{ x: 20, y: 30 }} />
            <MockCursor label="David" color="#A855F7" initialPos={{ x: 70, y: 60 }} />
            <MockCursor label="Sarah" color="#F97316" initialPos={{ x: 40, y: 80 }} />
        </div>
    );
};

interface IdeationTeaserProps {
    onCreate?: () => void;
    hideButton?: boolean;
}

export const IdeationTeaser: React.FC<IdeationTeaserProps> = ({ onCreate, hideButton = false }) => {

    return (
        <div className="flex-1 flex flex-col md:flex-row h-full min-h-[600px] w-full relative">

            {/* Left: Content */}
            <div className="flex-1 py-12 pr-12 pl-6 md:pl-20 lg:pl-32 flex flex-col justify-center items-start z-10 relative bg-white overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
                </div>

                {/* Mock Cursors */}
                <FloatingCursors />

                <div className="relative z-20 max-w-lg">

                    <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl font-medium text-nobel-dark mb-6 leading-tight">
                        Brainstorm. <br />
                        Collaborate. <br />
                        <span className="italic text-nobel-gold">Innovate.</span>
                    </h2>
                    <p className="text-lg text-gray-500 mb-8 font-light leading-relaxed max-w-xl">
                        Unleash your team's creativity on an infinite canvas. From messy sticky notes to structured strategy maps, <strong className="font-bold text-stone-700">Adaptive Startup Ideation</strong> is where scattered thoughts become investable businesses. Real-time collaboration for the modern founder.
                    </p>

                    {!hideButton && (
                        <button
                            onClick={onCreate}
                            className="bg-nobel-dark text-white px-8 py-4 rounded-full font-medium text-lg hover:bg-gray-800 transition-all flex items-center gap-3 shadow-lg hover:shadow-xl hover:-translate-y-1 group"
                        >
                            <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                            Create New Workspace
                        </button>
                    )}
                </div>
            </div>

            {/* Right: Image */}
            <div className="flex-1 relative h-[50vh] md:h-auto overflow-hidden">
                <img
                    src="/images/hero-carousel-2.png"
                    alt="Inspiration"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Overlays for readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute inset-0 bg-nobel-dark/20 mix-blend-multiply"></div>

                {/* Quote */}
                <div className="absolute bottom-16 right-12 max-w-md text-right">
                    <p className="text-3xl font-serif italic text-white drop-shadow-lg leading-relaxed mb-4">
                        "Great execution is the ultimate differentiator, but it starts with a clear, collaborative vision."
                    </p>
                </div>
            </div>
        </div>
    );
};
