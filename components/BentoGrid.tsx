"use client";
import React from "react";
import { motion } from "framer-motion";

export const BentoGrid = ({
    className = "",
    children,
}: {
    className?: string;
    children?: React.ReactNode;
}) => {
    return (
        <div
            className={`grid md:auto-rows-[24rem] grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto w-full ${className}`}
        >
            {children}
        </div>
    );
};

export const BentoGridItem = ({
    className = "",
    title,
    description,
    header,
    icon,
    badge,
    badgeColor,
    onClick
}: {
    className?: string;
    title?: string | React.ReactNode;
    description?: string | React.ReactNode;
    header?: React.ReactNode;
    icon?: React.ReactNode;
    badge?: string;
    badgeColor?: string;
    onClick?: () => void;
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01, y: -4 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`rounded-2xl group/bento hover:shadow-xl transition duration-300 shadow-sm p-6 bg-white border border-stone-200 justify-between flex flex-col space-y-4 cursor-pointer relative overflow-hidden ${className}`}
            onClick={onClick}
        >
            <div className="flex-1 w-full relative min-h-0">
                {header}
            </div>
            <div className="group-hover/bento:translate-x-1 transition duration-200 z-10 shrink-0 border-t border-stone-100 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center text-stone-600 shadow-sm border border-stone-100">
                        {icon}
                    </div>
                    {badge && (
                        <div className="flex items-center gap-2">
                            {badgeColor?.includes('red') && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                            {badgeColor?.includes('emerald') && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${badgeColor || 'bg-stone-100 text-stone-600 border border-stone-200'}`}>
                                {badge}
                            </span>
                        </div>
                    )}
                </div>
                <div className="font-serif font-bold text-stone-900 mb-1 text-xl">
                    {title}
                </div>
                <div className="font-sans font-normal text-stone-500 text-sm leading-relaxed max-w-sm">
                    {description}
                </div>
            </div>

            {/* Subtle hover gradient */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-stone-50/80 to-transparent opacity-0 group-hover/bento:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </motion.div>
    );
};
