"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";

export type DashboardCard = {
    id: number;
    step: number;
    title: string;
    category: string;
    color: string; // e.g., "blue", "teal", "cyan", "pink", "stone", "orange"
    badge: string;
    notificationCount?: number;
    content: React.ReactNode;
    description: string;
};

const TypewriterText = ({ text, delay = 30 }: { text: string; delay?: number }) => {
    const [displayedText, setDisplayedText] = React.useState("");
    const [currentIndex, setCurrentIndex] = React.useState(0);

    React.useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText((prev) => prev + text[currentIndex]);
                setCurrentIndex((prev) => prev + 1);
            }, delay);
            return () => clearTimeout(timeout);
        }
    }, [currentIndex, delay, text]);

    return <span>{displayedText}</span>;
};

// Map color names to Tailwind classes - Adapted for Light Theme
const getColorClasses = (color: string) => {
    const map: Record<string, { bg: string; text: string; border: string; gradient: string; headerBg: string }> = {
        stone: {
            bg: "bg-stone-100",
            text: "text-stone-600",
            border: "border-stone-200",
            gradient: "from-stone-200/50",
            headerBg: "bg-stone-200",
        },
        gold: {
            bg: "bg-[#F4EBD9]", // nobel-gold/10 roughly
            text: "text-nobel-gold",
            border: "border-[#D4C39C]",
            gradient: "from-[#F4EBD9]",
            headerBg: "bg-[#D4C39C]",
        },
        emerald: {
            bg: "bg-emerald-50",
            text: "text-emerald-600",
            border: "border-emerald-200",
            gradient: "from-emerald-100",
            headerBg: "bg-emerald-200",
        },
        blue: {
            bg: "bg-blue-50",
            text: "text-blue-600",
            border: "border-blue-200",
            gradient: "from-blue-100",
            headerBg: "bg-blue-200",
        },
        orange: {
            bg: "bg-orange-50",
            text: "text-orange-600",
            border: "border-orange-200",
            gradient: "from-orange-100",
            headerBg: "bg-orange-200",
        },
    };
    return map[color] || map.stone;
};

export const DashboardStack = ({
    items,
    offset,
    scaleFactor,
}: {
    items: DashboardCard[];
    offset?: number;
    scaleFactor?: number;
}) => {
    const CARD_OFFSET = offset || 35;
    const SCALE_FACTOR = scaleFactor || 0.04;
    // Removed internal state management

    return (
        <div className="flex flex-col items-center w-full">
            <div className="relative h-[720px] w-full max-w-[95%] mx-auto pt-20">
                {items.map((card, index) => {
                    const colors = getColorClasses(card.color);
                    const isTop = index === 0;

                    return (
                        <motion.div
                            key={card.id}
                            className={`absolute left-0 right-0 mx-auto h-[600px] w-full`}
                            style={{
                                transformOrigin: "top center",
                            }}
                            animate={{
                                top: index * -CARD_OFFSET + 140,
                                scale: 1 - index * SCALE_FACTOR,
                                zIndex: items.length - index,
                                opacity: 1
                            }}
                            transition={{
                                duration: 0.4,
                                ease: "easeInOut"
                            }}
                        >
                            {/* Notification Badge - Absolute Outside */}
                            {!isTop && (card.notificationCount ?? 0) > 0 && (
                                <div className="absolute -top-3 -right-3 z-50 w-8 h-8 rounded-full bg-red-500 border-2 border-white flex items-center justify-center shadow-md animate-in fade-in zoom-in duration-300">
                                    <span className="text-white text-xs font-bold">{card.notificationCount}</span>
                                </div>
                            )}

                            {/* Card Visual Container */}
                            <div className={`w-full h-full rounded-xl bg-white border border-stone-200 shadow-2xl overflow-hidden flex flex-col transition-shadow duration-300 ${isTop ? 'shadow-2xl' : 'shadow-md'}`}>
                                {/* Card Header (Terminal Style but Light) */}
                                <div className="h-10 bg-stone-50 border-b border-stone-100 flex items-center px-4 justify-between shrink-0">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 rounded-full bg-stone-200"></div>
                                        <div className="w-3 h-3 rounded-full bg-stone-200"></div>
                                        <div className="w-3 h-3 rounded-full bg-stone-200"></div>
                                    </div>
                                    <div className="font-sans text-[10px] text-stone-400 font-bold uppercase tracking-widest">{card.category} // {card.title}</div>
                                    <div className="w-8" /> {/* Spacer for centering */}
                                </div>

                                {/* Gradient content background */}
                                <div className={`absolute inset-0 top-10 bg-gradient-to-b ${colors.gradient} to-white opacity-20 pointer-events-none`}></div>

                                {/* Card Content */}
                                <div className="relative z-10 flex-1 flex flex-col p-6 overflow-hidden">
                                    <div className="flex justify-between items-start mb-6 shrink-0">
                                        <div>
                                            <h2 className={`text-2xl font-serif font-bold text-stone-800`}>{card.title}</h2>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-xs font-bold uppercase tracking-widest ${colors.text}`}>{card.category}</span>
                                                <div className="h-px w-8 bg-stone-200" />
                                                <span className="text-xs text-stone-400">Step {card.step} of {items.length}</span>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full ${colors.bg} border ${colors.border}`}>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${colors.text}`}>
                                                {card.badge}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Main Content Scroll Area */}
                                    <div className="flex-1 overflow-y-auto bg-white/50 rounded-xl border border-stone-100 p-2 scrollbar-thin scrollbar-thumb-stone-200 scrollbar-track-transparent">
                                        {card.content}
                                    </div>

                                    {/* Smart Caption / Typewriter Footer */}
                                    <div className="mt-4 pt-4 border-t border-stone-100 flex items-center gap-3 shrink-0">
                                        <div className={`p-1.5 rounded-full ${colors.bg}`}>
                                            <div className={`w-2 h-2 rounded-full ${colors.text.replace('text-', 'bg-')}`} />
                                        </div>
                                        <div className="flex-1 text-xs text-stone-500 font-medium italic">
                                            {isTop ? <TypewriterText text={card.description} /> : card.description}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};
