import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { ViewState, StartupData, CanvasSection } from '../types';
import { ArrowLeft, Play, GraduationCap, ChevronRight, ChevronLeft, CheckCircle2, XCircle, HelpCircle, Mic, MicOff, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Logo } from './Logo';
import { useAction, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { GoogleGenAI } from "@google/genai";
import { AiProposalCard } from './AiProposalCard';
import { DotPatternBackground } from './DotPatternBackground';

const SchemaType = {
    STRING: "STRING",
    NUMBER: "NUMBER",
    INTEGER: "INTEGER",
    BOOLEAN: "BOOLEAN",
    ARRAY: "ARRAY",
    OBJECT: "OBJECT"
} as const;

// --- Audio Types & Utils ---

export function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

export function createPcmBlob(data: Float32Array): { data: string; mimeType: string } {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        // Clamp values
        const s = Math.max(-1, Math.min(1, data[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

// --- Quiz Types & Tools ---

interface QuizState {
    currentQuestionIndex: number;
    totalQuestions: number;
    questionText: string;
    options: string[];
    topic: string;
    isComplete: boolean;
    correctAnswerIndex?: number;
}

interface TranscriptionEntry {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: number;
}

const quizFunctionDeclaration = {
    name: "updateQuizState",
    description: "Updates the visual quiz card with a new question or status during the strategy session.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            currentQuestionIndex: { type: SchemaType.NUMBER },
            totalQuestions: { type: SchemaType.NUMBER },
            questionText: { type: SchemaType.STRING },
            options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            topic: { type: SchemaType.STRING },
            isComplete: { type: SchemaType.BOOLEAN },
            correctAnswerIndex: { type: SchemaType.NUMBER, description: "Index of the correct option (0-based)" }
        },
        required: ["currentQuestionIndex", "totalQuestions", "questionText", "options", "correctAnswerIndex"]
    }
} as any;

const canvasProposalFunctionDeclaration = {
    name: "proposeCanvasEntry",
    description: "Proposes content for a specific section of the Business Model Canvas based on user discussion.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            section: { type: SchemaType.STRING, description: "The exact name of the section (e.g., 'Problem', 'Solution', 'Customer Segments')" },
            content: { type: SchemaType.STRING, description: "The proposed text content for the section" },
            rationale: { type: SchemaType.STRING, description: "Brief explanation of why this content is being proposed" }
        },
        required: ["section", "content", "rationale"]
    }
} as any;

const highlightCanvasSectionFunctionDeclaration = {
    name: "highlightCanvasSection",
    description: "Visually highlights and defines a specific section of the Business Model Canvas on the user's screen.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            sectionName: { type: SchemaType.STRING, description: "Name of the section (e.g., Value Propositions)" },
            description: { type: SchemaType.STRING, description: "Educational definition or tip for this section." }
        },
        required: ["sectionName", "description"]
    }
} as any;

interface LearnPageProps {
    data: StartupData;
    onNavigate: (view: ViewState) => void;
}

interface Question {
    id: string;
    text: string;
    options: string[];
    correctAnswer: number; // Index
    explanation: string;
    type: 'concept' | 'reflection';
}

const STATIC_QUESTIONS: Question[] = [
    {
        id: 'q1',
        text: "What is the primary goal of the 'Problem' section in the Business Model Canvas?",
        options: [
            "To list all the features of your product",
            "To identify the top 1-3 problems your customers face",
            "To describe your marketing strategy",
            "To calculate your startup costs"
        ],
        correctAnswer: 1,
        explanation: "The Problem section is strictly for identifying the core pains your target customers experience, not your solution or features.",
        type: 'concept'
    },
    {
        id: 'q2',
        text: "Which section matches your Value Proposition to a specific Customer Segment?",
        options: [
            "Key Metrics",
            "Channels",
            "Product-Market Fit",
            "Customer Segments"
        ],
        correctAnswer: 3,
        explanation: "Your Value Proposition must be directly relevant to a specific Customer Segment. If they don't care, it's not a value prop.",
        type: 'concept'
    },
    {
        id: 'q3',
        text: "What defines an 'Unfair Advantage'?",
        options: [
            "Being the first to market",
            "Having a patent or exclusive partnership",
            "Something that cannot be easily copied or bought",
            "A lower price than competitors"
        ],
        correctAnswer: 2,
        explanation: "Real unfair advantages are hard to replicate. Lower prices or 'first mover' status are often temporary advantages.",
        type: 'concept'
    }
];

// Helper to generate a consistent color from a string (name)
const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
};

// Helper for simple hash to gradient
const getGradientFromName = (name: string) => {
    const color1 = stringToColor(name);
    const color2 = stringToColor(name + "variant");
    return `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
};

export const LearnPage: React.FC<LearnPageProps> = ({ data, onNavigate }) => {
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isQuizActive, setIsQuizActive] = useState(false);
    const [highlightedSection, setHighlightedSection] = useState<{ name: string; description: string } | null>(null);

    // UI State for Right Panel
    const [rightPanelMode, setRightPanelMode] = useState<'video' | 'ai'>('video');

    // --- AI & Audio State ---
    const [isActive, setIsActive] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [quizState, setQuizState] = useState<QuizState>({
        currentQuestionIndex: 0,
        totalQuestions: 5,
        questionText: '',
        options: [],
        topic: '',
        isComplete: false
    });
    const [transcripts, setTranscripts] = useState<TranscriptionEntry[]>([]);
    const [whoIsSpeaking, setWhoIsSpeaking] = useState<'user' | 'ai' | 'idle'>('idle');
    const [isAiExpanded, setIsAiExpanded] = useState(false);

    // Canvas Proposal State
    const [aiProposal, setAiProposal] = useState<{
        section: string;
        content: string;
        rationale: string;
    } | null>(null);
    const [isSavingProposal, setIsSavingProposal] = useState(false);
    const updateCanvasSection = useMutation(api.canvas.updateSection);

    const inputAudioCtxRef = useRef<AudioContext | null>(null);
    const outputAudioCtxRef = useRef<AudioContext | null>(null);
    const inputAnalyserRef = useRef<AnalyserNode | null>(null);
    const outputAnalyserRef = useRef<AnalyserNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const sessionRef = useRef<any>(null);

    // Auto-scroll transcript
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcripts]);

    const handleFunctionCall = useCallback((fc: any) => {
        if (fc.name === 'updateQuizState') {
            setQuizState(prev => ({ ...prev, ...fc.args }));
            setIsRightPanelOpen(false); // Auto-collapse to focus on card
            setIsQuizActive(true);
            return { status: "success", message: "Strategic UI synchronized" };
        }
        if (fc.name === 'proposeCanvasEntry') {
            setAiProposal({
                section: fc.args.section,
                content: fc.args.content,
                rationale: fc.args.rationale
            });
            return { status: "success", message: "Proposal displayed to user for approval" };
        }
        if (fc.name === 'highlightCanvasSection') {
            setHighlightedSection({
                name: fc.args.sectionName,
                description: fc.args.description
            });
            setIsRightPanelOpen(false);
            setIsQuizActive(false); // Ensure specific mode
            return { status: "success", message: `Displaying definition for ${fc.args.sectionName}` };
        }
        return { status: "error", message: "Consultation parameter mismatch" };
    }, []);

    const handleSaveProposal = async () => {
        if (!aiProposal) return;
        setIsSavingProposal(true);
        try {
            await updateCanvasSection({
                projectId: data.id, // Using correct id field from StartupData
                section: aiProposal.section,
                content: aiProposal.content,
                tags: ["AI Assisted"]
            });
            setAiProposal(null);
            setTranscripts(prev => [...prev, {
                id: Math.random().toString(),
                sender: 'ai',
                text: `[System] Saved to ${aiProposal.section}: "${aiProposal.content.substring(0, 30)}..."`,
                timestamp: Date.now()
            }]);
        } catch (e) {
            setError("Failed to save to canvas. Please try again.");
        } finally {
            setIsSavingProposal(false);
        }
    };

    const stopConversation = useCallback(() => {
        if (sessionRef.current) {
            try { sessionRef.current.close(); } catch (e) { }
            sessionRef.current = null;
        }
        setIsActive(false);
        setWhoIsSpeaking('idle');

        if (inputAudioCtxRef.current) {
            inputAudioCtxRef.current.close().catch(() => {});
            inputAudioCtxRef.current = null;
        }
        if (outputAudioCtxRef.current) {
            outputAudioCtxRef.current.close().catch(() => {});
            outputAudioCtxRef.current = null;
        }

        sourcesRef.current.forEach(source => {
            try { source.stop(); } catch (e) { }
        });
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;
    }, []);

    const startConversation = async () => {
        setError(null);
        try {
            // SA-001: API key is read server-side in Convex actions, not from client bundle.
            // The Live API session requires a client-side key for WebSocket connection.
            // Use the GEMINI_API_KEY from Convex env via a server-side action.
            const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || "";
            if (!apiKey) throw new Error("AI consultation is not configured for this deployment.");

            const ai = new GoogleGenAI({ apiKey });

            // Fixed: Don't set sampleRate to prevent NotSupportedError with MediaStreamSource
            const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            await inCtx.resume();
            await outCtx.resume();

            inputAudioCtxRef.current = inCtx;
            outputAudioCtxRef.current = outCtx;

            const inAnalyser = inCtx.createAnalyser();
            inAnalyser.fftSize = 256;
            inputAnalyserRef.current = inAnalyser;

            const outAnalyser = outCtx.createAnalyser();
            outAnalyser.fftSize = 256;
            outputAnalyserRef.current = outAnalyser;

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            let currentInputText = "";
            let currentOutputText = "";

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.0-flash-exp', // Adjusted to a known valid model if 2.5 is not yet avail
                callbacks: {
                    onopen: () => {
                        setIsActive(true);
                        // Send initial greeting trigger
                        sessionPromise.then(s => (s as any).send([{ text: "[System Event] Connection established. Greet the user by name (if known) or as 'Founder', state your role as their Adaptive Strategy Consultant, and ask how you can help build their venture today." }], true));

                        const source = inCtx.createMediaStreamSource(stream);
                        const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);

                        scriptProcessor.onaudioprocess = (e) => {
                            if (isMuted) return;
                            const inputData = e.inputBuffer.getChannelData(0);

                            const sum = inputData.reduce((a, b) => a + Math.abs(b), 0);
                            const avg = sum / inputData.length;
                            if (avg > 0.01) setWhoIsSpeaking('user');

                            const int16 = new Int16Array(inputData.length);
                            for (let i = 0; i < inputData.length; i++) {
                                const s = Math.max(-1, Math.min(1, inputData[i]));
                                int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                            }

                            const media = {
                                data: encode(new Uint8Array(int16.buffer)),
                                mimeType: `audio/pcm;rate=${inCtx.sampleRate}`,
                            };

                            sessionPromise.then(s => s.sendRealtimeInput({ media })).catch((e: any) => {
                            });
                        };

                        source.connect(inAnalyser);
                        inAnalyser.connect(scriptProcessor);
                        scriptProcessor.connect(inCtx.destination);
                    },
                    onmessage: async (message: any) => {
                        if (message.serverContent?.inputTranscription) {
                            currentInputText += message.serverContent.inputTranscription.text;
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutputText += message.serverContent.outputTranscription.text;
                            setWhoIsSpeaking('ai');
                        }

                        if (message.serverContent?.turnComplete) {
                            if (currentInputText) {
                                setTranscripts(prev => [...prev, { id: Math.random().toString(), sender: 'user', text: currentInputText, timestamp: Date.now() }]);
                            }
                            if (currentOutputText) {
                                setTranscripts(prev => [...prev, { id: Math.random().toString(), sender: 'ai', text: currentOutputText, timestamp: Date.now() }]);
                            }
                            currentInputText = "";
                            currentOutputText = "";
                            setWhoIsSpeaking('idle');
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio) {
                            const outCtx = outputAudioCtxRef.current;
                            if (outCtx) {
                                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
                                const audioBuffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
                                const source = outCtx.createBufferSource();
                                source.buffer = audioBuffer;

                                const gainNode = outCtx.createGain();
                                source.connect(gainNode);
                                gainNode.connect(outputAnalyserRef.current!);
                                outputAnalyserRef.current!.connect(outCtx.destination);

                                source.addEventListener('ended', () => {
                                    sourcesRef.current.delete(source);
                                    if (sourcesRef.current.size === 0) setWhoIsSpeaking('idle');
                                });

                                source.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += audioBuffer.duration;
                                sourcesRef.current.add(source);
                            }
                        }

                        if (message.serverContent?.interrupted) {
                            sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) { } });
                            sourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }

                        if (message.toolCall) {
                            for (const fc of message.toolCall.functionCalls) {
                                const result = handleFunctionCall(fc);
                                sessionPromise.then(s => s.sendToolResponse({
                                    functionResponses: {
                                        id: fc.id,
                                        name: fc.name,
                                        response: { result: result }
                                    }
                                })).catch(() => {});
                            }
                        }
                    },
                    onerror: (e) => {
                        setError("Network instability detected in consultation channel.");
                        stopConversation();
                    },
                    onclose: () => stopConversation()
                },
                config: {
                    responseModalities: ["AUDIO" as any],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }
                    },
                    systemInstruction: `You are an Elite Business Consulting Expert. You are professional, analytical, and direct.
          Your objective is to help the user build THEIR specific venture based on the data provided below.
          
          VENTURE CONTEXT:
          ${JSON.stringify({
                        name: data.name,
                        hypothesis: data.hypothesis,
                        canvas: data.canvas,
                        market: {
                            tam: data.market?.tam,
                            sam: data.market?.sam,
                            som: data.market?.som
                        },
                        competitors: data.competitorAnalysis?.competitors?.map((c: any) => c.name) || [],
                        customerInterviews: data.customerInterviews?.length || 0
                    }, null, 2)}
          
          RULES OF ENGAGEMENT:
          1. GROUND TRUTH: All advice must be grounded in the context above. Do not give generic advice. If the 'Hypothesis' is about "Dog Walking", do not talk about "SaaS metrics" unless relevant.
          2. QUIZZING: Use 'updateQuizState' to test the founder's knowledge of THEIR OWN risks. 
             - BAD: "What is a Value Prop?"
             - GOOD: "Your hypothesis assumes high trust. How specific is your Customer Segment for 'Busy Pet Owners'?"
          3. DIAGNOSIS PHASE:
             - If Canvas is empty, use the 'Hypothesis' as the source of truth to start building the 'Problem' and 'Customer Segments'.
             - If data exists, critique it relentlessly against the Market data and Competitors.
          4. CONSTRUCTION PHASE:
             - Guide the user sequentially: Problem -> Customer Segments -> Value Proposition.
             - When INTRODUCING a new section, ALWAYS use 'highlightCanvasSection' to show its definition first.
             - When proposing content, it must be better than what the user could write. Use the 'proposeCanvasEntry' tool.
             - Explain clearly WHY this specific wording increases their odds of success based on the data.
          
          
          Be concise. Drive the founder to decisions.`,
                    tools: [{ functionDeclarations: [quizFunctionDeclaration, canvasProposalFunctionDeclaration, highlightCanvasSectionFunctionDeclaration] }],
                }
            });

            sessionRef.current = await sessionPromise;
        } catch (err: any) {
            setError(err instanceof Error ? err.message : "Consultation failed to initialize.");
            stopConversation();
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopConversation();
        };
    }, []);

    // Generate dynamic reflection questions based on current canvas data
    useEffect(() => {
        const dynamicQuestions: Question[] = [];

        // Example: Check if they have filled out the Problem section
        const problemContent = data.canvas[CanvasSection.PROBLEM] || "";
        if (problemContent.trim().length > 10) {
            dynamicQuestions.push({
                id: 'reflection_problem',
                text: "Based on your current canvas, do you feel your 'Problem' section clearly identifies a pain point, or is it describing a solution?",
                options: [
                    "It clearly identifies a specific pain point",
                    "It might be describing a solution (need to fix)",
                    "I'm not sure yet"
                ],
                correctAnswer: 0, // This is subjective, but we encourage confidence
                explanation: "Your current entry: \"" + problemContent.substring(0, 50) + "...\" — Always ensure you are describing the 'Why', not the 'How'.",
                type: 'reflection'
            });
        }

        // Example: Customer Segments
        const textContent = data.canvas[CanvasSection.CUSTOMER_SEGMENTS] || "";
        if (textContent.trim().length > 10) {
            dynamicQuestions.push({
                id: 'reflection_customers',
                text: "Review your Customer Segments. Are they specific enough (e.g., 'Remote HR Managers in Tech') or too broad (e.g., 'Everyone')?",
                options: [
                    "They are very specific",
                    "They are somewhat broad",
                    "They are too generic"
                ],
                correctAnswer: 0,
                explanation: "Your entry: \"" + textContent.substring(0, 50) + "...\" — Niche down until it hurts. You can always expand later.",
                type: 'reflection'
            });
        }

        // Shuffle static questions + reflections - OR use AI provided state
        // If the AI is active and has provided a quiz state, we should probably prefer that or mix it?
        // For now, let's keep the existing logic for "static" mode, but maybe we can override if quizState is populated?
        // Actually, the user wants the AI to drive the quiz.
        // Let's modify the questions state to reflect quizState if the AI is "in charge" (i.e. if we have a quizState with topic)
        if (quizState.topic) {
            setQuestions([{
                id: 'ai_generated',
                text: quizState.questionText,
                options: quizState.options,
                correctAnswer: quizState.correctAnswerIndex ?? -1,
                explanation: "The AI Consultant will provide feedback on your answer.",
                type: 'concept'
            }]);
        } else {
            const combined = [...STATIC_QUESTIONS, ...dynamicQuestions].sort(() => Math.random() - 0.5);
            setQuestions(combined);
        }
    }, [data.canvas, quizState]); // Added quizState dependency

    const handleOptionSelect = (index: number) => {
        if (isAnswered) return;
        setSelectedOption(index);
        setIsAnswered(true);

        const currentQ = questions[currentQuestionIndex];
        const selectedText = currentQ.options[index];

        // Notify AI if active and quiz is active
        if (isActive && sessionRef.current && isQuizActive) {
            const isCorrect = index === currentQ.correctAnswer;
            let prompt = `[System Event] User selected option: "${selectedText}". `;

            if (currentQ.correctAnswer !== -1) {
                if (isCorrect) {
                    prompt += `RESULT: CORRECT. Briefly confirm and validate their understanding.`;
                } else {
                    const correctOpt = currentQ.options[currentQ.correctAnswer];
                    prompt += `RESULT: INCORRECT. The correct answer is "${correctOpt}". 
                     IMPORTANT: Do NOT reveal the correct answer yet. Instead, ask the user WHY they thought "${selectedText}" was the right choice. Guide them Socratically.`;
                }
            } else {
                prompt += `Provide immediate brief feedback.`;
            }

            sessionRef.current.send([{ text: prompt }], true);
        }

        // For reflection questions, any answer is "correct" in terms of progress, 
        // but for concept questions, strict checking applies.
        if (currentQ.type === 'concept') {
            if (index === currentQ.correctAnswer) {
                setScore(s => s + 1);
            }
        } else {
            setScore(s => s + 1); // Participation points for reflection
        }
    };

    const [showResultsDialog, setShowResultsDialog] = useState(false);

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedOption(null);
            setIsAnswered(false);
        } else {
            // Finished
            setShowResultsDialog(true);
        }
    };

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className="flex h-screen bg-[#F9F8F4] overflow-hidden text-stone-900 font-sans relative">

            {/* Custom Results Dialog */}
            {showResultsDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-stone-100 flex flex-col items-center">
                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6 text-purple-600">
                            <GraduationCap className="w-8 h-8" />
                        </div>

                        <h2 className="font-serif text-3xl text-stone-900 mb-2">Quiz Complete!</h2>
                        <p className="text-stone-500 mb-8">
                            You scored <strong className="text-stone-900 text-lg">{score}</strong> out of <strong className="text-stone-900 text-lg">{questions.length}</strong>
                        </p>

                        <div className="w-full flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    stopConversation();
                                    onNavigate('CANVAS');
                                }}
                                className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-stone-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                Return to Canvas
                            </button>
                            <button
                                onClick={() => {
                                    // Optional: Reset quiz logic here if desired
                                    setShowResultsDialog(false);
                                    // For now, just close dialog to review (or we could restart)
                                }}
                                className="w-full py-3 text-stone-400 hover:text-stone-600 text-sm font-medium"
                            >
                                Close & Review
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Left Panel: Quiz / Content */}
            <div className={`flex-1 flex flex-col transition-all duration-300 relative ${isRightPanelOpen ? 'md:mr-0' : ''}`}>

                {/* Header for Back Navigation */}
                <div className="p-4 md:p-6 flex items-center gap-4">
                    <button
                        onClick={() => {
                            stopConversation();
                            onNavigate('CANVAS');
                        }}
                        className="p-2 hover:bg-stone-200 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-stone-600" />
                    </button>
                    <Logo imageClassName="h-8 w-auto" />
                    <div className="h-6 w-px bg-stone-300 mx-2" />
                    <span className="font-bold uppercase tracking-wider text-xs text-stone-500">
                        <GraduationCap className="w-4 h-4 inline mr-2 text-purple-600 mb-0.5" />
                        Founder School
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto px-6 md:px-12 py-8 max-w-3xl mx-auto w-full flex flex-col justify-center relative z-10">
                    <DotPatternBackground className="opacity-50" />

                    {highlightedSection && !isQuizActive ? (
                        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl border border-blue-100 animate-in fade-in zoom-in-95 duration-500 relative z-20 overflow-hidden group">
                            {/* Decorative Background Element */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-60"></div>

                            <div className="relative z-10">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-8">
                                    {/* Left Column: Definition & Info */}
                                    <div className="flex flex-col relative">
                                        {/* Close Button positioned absolutely relative to this column or card */}
                                        <div className="absolute top-0 right-0 lg:hidden z-30">
                                            <button
                                                onClick={() => setHighlightedSection(null)}
                                                className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-full transition-colors"
                                            >
                                                <XCircle className="w-6 h-6" />
                                            </button>
                                        </div>

                                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                                            <HelpCircle className="w-8 h-8" />
                                        </div>

                                        <h4 className="text-sm font-bold uppercase tracking-widest text-blue-600 mb-2">Section Focus</h4>
                                        <h2 className="text-3xl lg:text-4xl font-serif text-stone-900 mb-6 leading-tight">{highlightedSection.name}</h2>
                                        <div className="prose prose-lg text-stone-600 leading-relaxed max-w-none">
                                            <ReactMarkdown>{highlightedSection.description}</ReactMarkdown>
                                        </div>
                                    </div>

                                    {/* Right Column: Current Canvas Data (Scrollable) */}
                                    <div className="flex flex-col h-full min-h-[300px] lg:max-h-[500px] relative">
                                        <div className="absolute top-0 right-0 hidden lg:block z-30">
                                            <button
                                                onClick={() => setHighlightedSection(null)}
                                                className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-full transition-colors"
                                            >
                                                <XCircle className="w-6 h-6" />
                                            </button>
                                        </div>

                                        <h5 className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-3 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-stone-400"></div>
                                            Current Data in Canvas
                                        </h5>
                                        <div className="flex-1 bg-stone-50 rounded-xl p-6 border border-stone-200 overflow-y-auto custom-scrollbar shadow-inner">
                                            <div className="text-stone-800 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                                                {/* @ts-ignore - Dynamic access */}
                                                {data.canvas[highlightedSection.name] ? (
                                                    <ReactMarkdown>{data.canvas[highlightedSection.name]}</ReactMarkdown>
                                                ) : (
                                                    <span className="text-stone-400 italic">This section is currently empty.</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Collapsible AI Proposal Section (Full Width Bottom) */}
                                {aiProposal && aiProposal.section === highlightedSection.name && (
                                    <div className="border-t border-stone-100 pt-6">
                                        <div className="bg-purple-50 rounded-xl border border-purple-200 overflow-hidden transition-all duration-300">
                                            <button
                                                onClick={() => setIsAiExpanded(!isAiExpanded)}
                                                className="w-full flex items-center justify-between p-4 bg-purple-100/50 hover:bg-purple-100 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700">
                                                        <Mic className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm font-bold uppercase tracking-widest text-purple-700">
                                                        AI Consultant Suggestion available
                                                    </span>
                                                </div>
                                                {isAiExpanded ? <ChevronUp className="w-5 h-5 text-purple-600" /> : <ChevronDown className="w-5 h-5 text-purple-600" />}
                                            </button>

                                            {/* Collapsible Content */}
                                            <div className={`transition-all duration-300 ease-in-out px-6 ${isAiExpanded ? 'max-h-[800px] opacity-100 py-6' : 'max-h-0 opacity-0 py-0 overflow-hidden'}`}>
                                                <div className="mb-6">
                                                    <h6 className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-2">Proposed Content</h6>
                                                    <div className="bg-white p-5 rounded-lg border border-purple-100 text-stone-800 text-sm font-medium shadow-sm">
                                                        {aiProposal.content}
                                                    </div>
                                                </div>

                                                <div className="mb-6">
                                                    <h6 className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-2">Rationale</h6>
                                                    <p className="text-purple-800 text-sm leading-relaxed italic bg-purple-100/30 p-4 rounded-lg">
                                                        "{aiProposal.rationale}"
                                                    </p>
                                                </div>

                                                <button
                                                    onClick={handleSaveProposal}
                                                    disabled={isSavingProposal}
                                                    className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isSavingProposal ? (
                                                        <>Saving...</>
                                                    ) : (
                                                        <>
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            Apply Update to Canvas
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    ) : isQuizActive && currentQuestion ? (
                        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl border border-stone-200 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-20">
                            <div className="flex justify-between items-center mb-6">
                                <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-widest ${currentQuestion.type === 'concept' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {currentQuestion.type === 'concept' ? 'Concept Check' : 'Self Reflection'}
                                </span>
                                <span className="text-stone-400 text-xs font-mono">
                                    {currentQuestionIndex + 1} / {questions.length}
                                </span>
                            </div>

                            <h2 className="text-2xl md:text-3xl font-serif text-stone-900 mb-8 leading-tight">
                                {currentQuestion.text}
                            </h2>

                            <div className="space-y-3">
                                {currentQuestion.options.map((option, idx) => {
                                    let borderColor = "border-stone-200";
                                    let bgColor = "bg-white";
                                    let textColor = "text-stone-600";
                                    let icon = null;

                                    if (isAnswered) {
                                        if (currentQuestion.type === 'concept') {
                                            if (idx === currentQuestion.correctAnswer) {
                                                borderColor = "border-green-500";
                                                bgColor = "bg-green-50";
                                                textColor = "text-green-700";
                                                icon = <CheckCircle2 className="w-5 h-5 text-green-600" />;
                                            } else if (idx === selectedOption) {
                                                borderColor = "border-red-500";
                                                bgColor = "bg-red-50";
                                                textColor = "text-red-700";
                                                icon = <XCircle className="w-5 h-5 text-red-600" />;
                                            } else {
                                                // fade out others
                                                textColor = "text-stone-300";
                                            }
                                        } else {
                                            // Reflection type - just highlight selected as 'active/neutral'
                                            if (idx === selectedOption) {
                                                borderColor = "border-blue-500";
                                                bgColor = "bg-blue-50";
                                                textColor = "text-blue-700";
                                                icon = <CheckCircle2 className="w-5 h-5 text-blue-600" />;
                                            }
                                        }
                                    } else {
                                        if (selectedOption === idx) {
                                            borderColor = "border-purple-600";
                                            bgColor = "bg-purple-50";
                                        }
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleOptionSelect(idx)}
                                            disabled={isAnswered}
                                            className={`w-full text-left p-4 md:p-5 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group ${borderColor} ${bgColor} ${!isAnswered ? 'hover:border-purple-300 hover:shadow-md' : ''}`}
                                        >
                                            <span className={`text-base md:text-lg font-medium ${textColor}`}>
                                                {option}
                                            </span>
                                            {icon}
                                        </button>
                                    );
                                })}
                            </div>

                            {isAnswered && (
                                <div className="mt-8 pt-6 border-t border-stone-100">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="p-2 bg-stone-100 rounded-lg text-stone-500">
                                            <HelpCircle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm uppercase tracking-wider text-stone-900 mb-1">Explanation</h4>
                                            <p className="text-stone-600 leading-relaxed italic">
                                                {currentQuestion.explanation}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleNext}
                                        className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-stone-800 transition-colors shadow-lg"
                                    >
                                        {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Finish Quiz"}
                                    </button>
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-full relative z-20">
                            <div className="mb-8 relative rotate-2 hover:rotate-0 transition-transform duration-500">
                                <div className="absolute inset-0 bg-stone-900 rounded-2xl transform translate-x-3 translate-y-3 opacity-10"></div>
                                <img
                                    src="/images/canvasModel.png"
                                    className="w-80 h-60 object-cover rounded-2xl border-4 border-white shadow-2xl"
                                    alt="Business Model Canvas"
                                />
                            </div>
                            <h3 className="text-3xl font-serif text-stone-800 mb-4 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-lg inline-block border border-white/60">
                                Master the Business Model Canvas
                            </h3>
                            <p className="text-stone-500 max-w-md leading-relaxed bg-white/30 backdrop-blur-sm p-4 rounded-xl border border-white/40">
                                Watch the 'Knowledge Bite' video to understand the fundamentals of the Business Model Canvas before starting your AI session.
                            </p>
                        </div>
                    )}
                </div>

                {/* Collapsible Toggle (Left Side of Split) */}
                <button
                    onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                    className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-50 p-2 rounded-full shadow-xl border-2 transition-all duration-300 transform hover:scale-110 ${isRightPanelOpen
                        ? 'bg-amber-400 text-amber-950 border-white'
                        : 'bg-emerald-500 text-white border-white'
                        }`}
                >
                    {isRightPanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>

            </div>

            {/* Right Panel: Video / Education */}
            <div
                className={`transition-all duration-300 ease-in-out bg-black border-l border-stone-800 flex flex-col ${isRightPanelOpen ? 'w-full md:w-[45%] lg:w-[40%]' : 'w-0 opacity-0 overflow-hidden'
                    }`}
            >
                {/* Tab Toggle (Video vs AI) - VISIBLE */}
                <div className="absolute top-6 right-6 z-30 flex gap-2">
                    <button
                        onClick={() => setRightPanelMode('video')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md transition-all ${rightPanelMode === 'video' ? 'bg-white text-black' : 'bg-black/40 text-white/60 hover:bg-black/60'}`}
                    >
                        <Play className="w-3 h-3" />
                        Knowledge Bite
                    </button>
                    <button
                        onClick={() => setRightPanelMode('ai')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md transition-all ${rightPanelMode === 'ai' ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'bg-black/40 text-white/60 hover:bg-black/60'}`}
                    >
                        <Mic className="w-3 h-3" />
                        Adaptive Voice
                    </button>
                </div>

                {rightPanelMode === 'video' ? (
                    /* Video Header (Only visible if open for layout stability) */
                    <div className="h-full relative group animate-in fade-in duration-500">
                        {/* Placeholder Video Cover */}
                        <div className="absolute inset-0 bg-stone-900 overflow-hidden">
                            {/* Abstract Video Background Placeholder */}
                            <div className="absolute inset-0 opacity-40 bg-[url('https://picsum.photos/800/1200?grayscale')] bg-cover bg-center mix-blend-overlay"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50"></div>

                            {/* Play Button */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <button className="w-20 h-20 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 transition-all duration-300 group-hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                                    <Play className="w-8 h-8 ml-1 fill-white" />
                                </button>
                            </div>
                        </div>

                        {/* Content Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 z-10 pointer-events-none">
                            <span className="inline-block px-3 py-1 mb-4 border border-white/20 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-white/80 backdrop-blur-sm">
                                Module 01
                            </span>
                            <h1 className="text-3xl md:text-4xl font-serif text-white mb-4 leading-tight">
                                Understanding the <br /> <span className="text-purple-400 italic">Business Model Canvas</span>
                            </h1>
                            <p className="text-white/70 text-base md:text-lg leading-relaxed max-w-md line-clamp-3 mb-6">
                                Before you build, you must map. Learn why the BMC is the standard for lean startups and how to use it to identify your riskiest assumptions.
                            </p>
                            <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg text-xs font-bold uppercase tracking-wider text-white">
                                Coming Soon
                            </div>
                        </div>
                    </div>
                ) : (
                    /* AI Conversation Mode - Redesigned */
                    <div className="h-full relative flex flex-col bg-black overflow-hidden animate-in fade-in duration-500 font-sans">
                        {/* Minimal Gradient Background */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-purple-900/10"></div>

                        {/* Teleprompter Transcript Area */}
                        <div className="flex-1 overflow-y-auto p-8 z-10 flex flex-col-reverse mask-linear-top-bottom">
                            <div ref={transcriptEndRef} />

                            {whoIsSpeaking === 'ai' && (
                                <div className="text-center py-4 mb-2 animate-pulse text-purple-400 text-sm font-medium tracking-widest uppercase">
                                    Adaptive Voice Active...
                                </div>
                            )}

                            {/* AI Proposal Overlay */}
                            {aiProposal && (
                                <div className="w-full max-w-lg mx-auto mb-8 animate-in fade-in slide-in-from-bottom-4">
                                    <AiProposalCard
                                        section={aiProposal.section}
                                        content={aiProposal.content}
                                        rationale={aiProposal.rationale}
                                        onSave={handleSaveProposal}
                                        onDiscard={() => setAiProposal(null)}
                                        isSaving={isSavingProposal}
                                    />
                                </div>
                            )}

                            {/* Messages - Teleprompter Style (Reverse Order for Logic, but we map normally and flex-col-reverse parent handles scroll anchor? No, safer to just keep standard order and auto-scroll, but styling like subtitles) */}
                            {/* Actually, for a true teleprompter feel, the 'current' text is highlighted. We'll simplify to a clean list where latest is biggest. */}
                            <div className="flex flex-col gap-6 justify-end min-h-0">
                                {transcripts.map((msg, idx) => {
                                    const isLast = idx === transcripts.length - 1;
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} transition-all duration-500`}
                                        >
                                            <span className={`text-[10px] uppercase tracking-widest mb-1 ${msg.sender === 'user' ? 'text-stone-500' : 'text-purple-500'}`}>
                                                {msg.sender === 'user' ? 'You' : 'Adaptive AI'}
                                            </span>
                                            <p className={`max-w-[90%] text-xl md:text-2xl font-light leading-snug ${isLast ? (msg.sender === 'user' ? 'text-white' : 'text-purple-100') : 'text-stone-600'
                                                }`}>
                                                {msg.text}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            {transcripts.length === 0 && (
                                <div className="flex-1 flex flex-col items-center justify-center text-stone-600 opacity-50">
                                    <MessageSquare className="w-8 h-8 mb-4 stroke-[1.5]" />
                                    <p className="text-sm tracking-widest uppercase">Session History Empty</p>
                                </div>
                            )}
                        </div>

                        {/* Modern Control Bar */}
                        <div className="relative z-20 bg-black/80 backdrop-blur-xl border-t border-white/5 p-6 pb-8 flex flex-col items-center gap-6">

                            {/* Minimal Visualizer */}
                            <div className="h-12 flex items-center justify-center w-full">
                                {isActive ? (
                                    <div className="flex items-center gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <div
                                                key={i}
                                                className="w-1 bg-purple-500 rounded-full animate-visualizer"
                                                style={{
                                                    height: whoIsSpeaking !== 'idle' ? '24px' : '4px',
                                                    animationDelay: `${i * 0.1}s`,
                                                    opacity: whoIsSpeaking !== 'idle' ? 1 : 0.3
                                                }}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="w-12 h-1 bg-stone-800 rounded-full" />
                                )}
                                <style>{`
                                    @keyframes visualizer {
                                        0%, 100% { height: 4px; opacity: 0.3; }
                                        50% { height: ${whoIsSpeaking !== 'idle' ? '32px' : '8px'}; opacity: 1; }
                                    }
                                    .animate-visualizer { animation: visualizer 0.8s ease-in-out infinite; }
                                `}</style>
                            </div>

                            {/* Controls Row */}
                            <div className="flex items-center gap-4">
                                {isActive && (
                                    <button
                                        onClick={() => setIsMuted(!isMuted)}
                                        className={`p-4 rounded-full border transition-all ${isMuted
                                            ? 'bg-red-500/10 border-red-500 text-red-500'
                                            : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'}`}
                                    >
                                        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                    </button>
                                )}

                                <button
                                    onClick={isActive ? stopConversation : startConversation}
                                    className={`h-14 px-8 rounded-full font-bold uppercase tracking-widest text-xs flex items-center gap-3 transition-all transform active:scale-95 shadow-lg ${isActive
                                        ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-900/20'
                                        : 'bg-white text-black hover:bg-stone-200 shadow-white/10'
                                        }`}
                                >
                                    {isActive ? (
                                        <>
                                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                            End Session
                                        </>
                                    ) : (
                                        <>
                                            <MessageSquare className="w-4 h-4" />
                                            Start Conversation
                                        </>
                                    )}
                                </button>
                            </div>
                            {error && <p className="mt-4 text-red-400 text-xs font-mono">{error}</p>}
                        </div>
                    </div>
                )}

                {/* Close Button Mobile (optional) */}
                <button
                    onClick={() => setIsRightPanelOpen(false)}
                    className="md:hidden absolute top-4 right-4 text-white/50 hover:text-white p-2 z-40"
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};
