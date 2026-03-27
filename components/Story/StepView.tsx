
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ODYSSEY_STEPS } from '../../constants';
import { OnboardingState } from '../../types';
import StepView from './StepView'; // This imports the default export from THIS same file if not careful, likely user meant StoryPage.
// Checking user's file structure: file name is StepView.tsx but it imports StepView from './StepView'? 
// Ah, user created `StoryPage.tsx` which exports `StepView`.
// And `StepView.tsx` exports `App` as default.
// Let's fix imports first.
import StoryPageRenderer from './StoryPage';
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface StoryFlowProps {
    onComplete: () => void;
}

const StoryFlow: React.FC<StoryFlowProps> = ({ onComplete }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [state, setState] = useState<OnboardingState>(OnboardingState.INTRO);
    // Removed unused imageCache state

    const completeStoryMutation = useMutation(api.story.completeStory);

    const currentStep = ODYSSEY_STEPS[currentStepIndex];
    const progress = ((currentStepIndex + 1) / ODYSSEY_STEPS.length) * 100;

    // The specific requested blessing
    const founderBlessing = "Brave Founder, having steered thy vessel through the wine-dark sea of stochastic weights and outwitted the Sirens of vaporware, thou hast reached the rocky shores of product-market fit.";

    const handleNext = useCallback(() => {
        if (currentStepIndex < ODYSSEY_STEPS.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            setState(OnboardingState.OUTRO);
        }
    }, [currentStepIndex]);

    const handlePrev = useCallback(() => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        } else {
            setState(OnboardingState.INTRO);
        }
    }, [currentStepIndex]);

    const handleFinish = async () => {
        await completeStoryMutation();
        onComplete();
    };

    if (state === OnboardingState.INTRO) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-nobel-dark relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-nobel-gold/5 rounded-full blur-3xl animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-nobel-gold/5 rounded-full blur-3xl animate-pulse-slow"></div>

                <div className="z-10 max-w-3xl space-y-8 animate-fade-in-up">
                    <div className="space-y-4">
                        <span className="text-nobel-gold font-mono tracking-[0.5em] uppercase text-sm">2026 Era of Intelligence</span>
                        <h1 className="text-6xl md:text-8xl font-serif text-nobel-paper">The Odyssey</h1>
                        <p className="text-xl md:text-2xl text-nobel-gold italic font-serif">Every founder is a voyager. Every venture is a return home.</p>
                    </div>

                    <div className="space-y-6 max-w-2xl mx-auto py-6">
                        <p className="text-lg md:text-xl text-nobel-cream/90 leading-relaxed font-serif italic border-l-2 border-nobel-gold/40 pl-6 text-left">
                            "In the old world, the hero fought with steel and sail. In the new world of 2026, you fight with silicon and code. Your Ithaca is not just a destination, but a vision of what the world can be. Before you claim your kingdom, you must face the giants, hear the sirens, and choose your path through the storm."
                        </p>
                        <p className="text-base md:text-lg text-nobel-cream/60 leading-relaxed font-sans text-left pl-6">
                            You have crossed the threshold. You have committed to building the future. Before you set sail, witness the journey of those who came before, mapped onto the frontier you are about to conquer.
                        </p>
                    </div>

                    <button
                        onClick={() => setState(OnboardingState.JOURNEY)}
                        className="group relative px-12 py-5 bg-nobel-gold text-nobel-dark font-sans font-bold uppercase tracking-widest hover:bg-nobel-paper transition-all duration-300 overflow-hidden shadow-2xl rounded-full"
                    >
                        <span className="relative z-10">Begin Your Voyage</span>
                    </button>
                </div>
            </div>
        );
    }

    if (state === OnboardingState.OUTRO) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-nobel-dark relative overflow-hidden">
                <div className="z-10 max-w-4xl space-y-12 animate-fade-in-up">
                    <div className="space-y-6">
                        <h1 className="text-6xl font-serif text-nobel-paper">Welcome Home</h1>
                        <div className="h-1 w-24 bg-nobel-gold mx-auto"></div>
                    </div>

                    <div className="space-y-8 bg-nobel-gold/5 p-12 rounded-3xl border border-nobel-gold/20 backdrop-blur-md shadow-2xl">
                        <p className="text-xl md:text-2xl font-serif text-nobel-gold leading-relaxed italic">
                            {founderBlessing}
                        </p>
                    </div>

                    <button
                        className="px-12 py-5 border-2 border-nobel-gold text-nobel-gold font-sans font-bold uppercase tracking-widest hover:bg-nobel-gold hover:text-nobel-dark transition-all duration-500 rounded-full"
                        onClick={handleFinish}
                    >
                        Enter the Terminal
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-screen bg-nobel-dark overflow-hidden flex flex-col">
            <header className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center pointer-events-none">
                <div className="flex items-center space-x-4 pointer-events-auto">
                    <div className="w-10 h-10 border-2 border-nobel-gold rotate-45 flex items-center justify-center bg-nobel-dark/40 backdrop-blur-sm">
                        <span className="text-xs font-mono -rotate-45 text-nobel-gold">Ω</span>
                    </div>
                    <span className="font-serif italic text-nobel-gold tracking-widest text-lg drop-shadow-lg">Odyssey 2026</span>
                </div>

                <div className="flex items-center space-x-8 pointer-events-auto">
                    <button
                        onClick={handleFinish}
                        className="bg-black text-white px-4 py-2 rounded-full text-[10px] font-mono uppercase tracking-[0.2em] hover:bg-zinc-800 transition-colors"
                    >
                        Skip Sequence
                    </button>

                    <div className="hidden md:flex flex-col items-end space-y-2 bg-nobel-dark/40 backdrop-blur-sm p-2 rounded">
                        <div className="w-48 h-1 bg-nobel-gold/20 relative rounded-full overflow-hidden">
                            <div
                                className="absolute left-0 top-0 h-full bg-nobel-gold transition-all duration-700 ease-out"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <span className="text-[10px] font-mono text-nobel-gold tracking-[0.2em] uppercase">
                            Trajectory: {Math.round(progress)}%
                        </span>
                    </div>
                </div>
            </header>

            <main className="flex-1">
                <StoryPageRenderer
                    step={currentStep}
                    imageUrl={currentStep.imageUrl}
                    onNext={handleNext}
                    onPrev={handlePrev}
                    isLast={currentStepIndex === ODYSSEY_STEPS.length - 1}
                    isFirst={currentStepIndex === 0}
                />
            </main>
        </div>
    );
};

export default StoryFlow;

