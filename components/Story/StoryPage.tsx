
import React from 'react';
import { OdysseyStep } from '../../types';

interface StepViewProps {
    step: OdysseyStep;
    imageUrl?: string;
    onNext: () => void;
    onPrev: () => void;
    isLast: boolean;
    isFirst: boolean;
}

const StepView: React.FC<StepViewProps> = ({ step, imageUrl, onNext, onPrev, isLast, isFirst }) => {
    const TextContent = (
        <div className="flex flex-col justify-center h-full p-8 md:p-16 lg:p-24 space-y-8 animate-fade-in-up bg-nobel-dark">
            <div className="space-y-2">
                <span className="text-nobel-gold font-mono uppercase tracking-[0.3em] text-sm opacity-80">
                    Chapter {step.id}
                </span>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-nobel-paper leading-tight">
                    {step.title}
                </h2>
                <p className="text-xl md:text-2xl text-nobel-gold italic font-serif opacity-90">
                    {step.subtitle}
                </p>
            </div>

            <div className="space-y-6">
                <div className="relative pl-6 border-l border-nobel-gold/30">
                    <p className="text-lg text-nobel-cream/80 leading-relaxed font-sans">
                        <span className="text-nobel-gold font-bold">The Myth:</span> {step.mythDescription}
                    </p>
                </div>

                <div className="relative pl-6 border-l border-nobel-gold">
                    <p className="text-lg text-nobel-cream font-medium leading-relaxed font-sans">
                        <span className="text-nobel-gold font-bold uppercase tracking-wider">The 2026 Founder:</span> {step.founderModernParallel}
                    </p>
                </div>
            </div>

            <div className="pt-4">
                <p className="text-xl font-signature text-nobel-gold opacity-80 max-w-lg italic">
                    "{step.quote}"
                </p>
            </div>

            {/* Navigation Buttons Integrated in Text Area */}
            <div className="pt-12 flex items-center space-x-6">
                <button
                    onClick={onPrev}
                    className="group flex items-center space-x-2 text-nobel-gold/50 hover:text-nobel-gold transition-all font-mono uppercase tracking-[0.2em] text-xs py-3 rounded-full px-4 hover:bg-nobel-gold/10"
                >
                    <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    <span>Recede</span>
                </button>

                <button
                    onClick={onNext}
                    className="md:flex-none flex items-center justify-between space-x-8 px-10 py-4 bg-nobel-gold text-nobel-dark font-sans font-bold uppercase tracking-widest hover:bg-nobel-paper transition-all duration-300 group shadow-xl rounded-full"
                >
                    <span>{isLast ? 'Conclude Journey' : 'Next Chapter'}</span>
                    <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
        </div>
    );

    const ImageContent = (
        <div className="relative h-screen w-full overflow-hidden flex items-center justify-center bg-black">
            {imageUrl ? (
                <>
                    <img
                        src={imageUrl}
                        alt={step.title}
                        className="w-full h-full object-cover animate-fade-in-up transition-transform duration-[20s] scale-110 hover:scale-100"
                    />
                    {/* Futuristic Overlay Effects */}
                    <div className="absolute inset-0 bg-gradient-to-r from-nobel-dark/40 via-transparent to-transparent"></div>
                    <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
                </>
            ) : (
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 border-4 border-nobel-gold border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-nobel-gold font-mono text-xs tracking-widest animate-pulse">PREPARING VISION...</span>
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-nobel-dark via-transparent to-transparent opacity-60"></div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 w-full h-screen">
            {step.layout === 'left' ? (
                <>
                    <div className="order-2 lg:order-1 h-full overflow-y-auto hide-scrollbar">{TextContent}</div>
                    <div className="order-1 lg:order-2 h-full">{ImageContent}</div>
                </>
            ) : (
                <>
                    <div className="order-1 h-full">{ImageContent}</div>
                    <div className="order-2 h-full overflow-y-auto hide-scrollbar">{TextContent}</div>
                </>
            )}
        </div>
    );
};

export default StepView;
