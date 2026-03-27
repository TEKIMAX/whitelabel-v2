import React, { useEffect, useState, useRef } from 'react';
import { Loader2, CheckCircle2, ChevronDown, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ThinkingStepProps {
    reasoning: string;
    isStreaming: boolean;
    hasContent: boolean;
}

const ThinkingStep: React.FC<ThinkingStepProps> = ({ reasoning, isStreaming, hasContent }) => {
    // "Thinking" = streaming is active BUT content hasn't started yet
    const isThinking = isStreaming && !hasContent;
    const isDone = !isStreaming;

    const [isOpen, setIsOpen] = useState(true);
    const wasStreamingRef = useRef(isStreaming);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-open when streaming starts
    useEffect(() => {
        if (isStreaming) {
            setIsOpen(true);
            wasStreamingRef.current = true;
        }
    }, [isStreaming]);

    // Auto-close when streaming finishes
    useEffect(() => {
        if (wasStreamingRef.current && isDone) {
            const timer = setTimeout(() => {
                setIsOpen(false);
            }, 1200); 
            wasStreamingRef.current = false;
            return () => clearTimeout(timer);
        }
    }, [isDone]);

    // Auto-scroll logic when reasoning updates
    useEffect(() => {
        if (scrollRef.current && isOpen) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [reasoning, isOpen]);

    return null;
};

export default ThinkingStep;
