import React, { useState, useEffect } from 'react';
import { X, Brain, Loader2, Sparkles, MessageSquare, Briefcase, Zap } from 'lucide-react';
import { useAIExplainScenario } from "../hooks/useAI";

interface ScenarioExplanationModalProps {
    isOpen: boolean;
    onClose: () => void;
    scenario: any;
}

const parseBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-bold text-stone-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
            return <em key={i} className="italic">{part.slice(1, -1)}</em>;
        }
        return part;
    });
};

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    if (!content) return null;

    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Heading detection
        if (line.startsWith('# ')) {
            elements.push(<h1 key={i} className="font-serif text-xl text-stone-900 mb-3 mt-4 pb-2 border-b border-stone-200">{parseBold(line.replace('# ', ''))}</h1>);
            i++;
            continue;
        }
        if (line.startsWith('## ')) {
            elements.push(<h2 key={i} className="font-serif text-lg text-stone-900 mb-2 mt-4">{parseBold(line.replace('## ', ''))}</h2>);
            i++;
            continue;
        }
        if (line.startsWith('### ')) {
            elements.push(<h3 key={i} className="font-serif text-base text-stone-800 mb-2 mt-3">{parseBold(line.replace('### ', ''))}</h3>);
            i++;
            continue;
        }

        // Table detection (lines starting with |)
        if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
            const tableRows: string[] = [];
            while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
                tableRows.push(lines[i]);
                i++;
            }

            // Parse table
            if (tableRows.length >= 2) {
                const headerRow = tableRows[0];
                const dataRows = tableRows.slice(2); // Skip header and separator

                const parseRow = (row: string) => row.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(cell => cell.trim());

                const headers = parseRow(headerRow);
                const rows = dataRows.map(parseRow);

                elements.push(
                    <div key={`table-${i}`} className="overflow-x-auto my-4">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b-2 border-stone-300">
                                    {headers.map((h, idx) => (
                                        <th key={idx} className="px-3 py-2 text-left font-bold text-stone-700 bg-stone-100">{parseBold(h)}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, rowIdx) => (
                                    <tr key={rowIdx} className="border-b border-stone-100 hover:bg-stone-50">
                                        {row.map((cell, cellIdx) => (
                                            <td key={cellIdx} className="px-3 py-2 text-stone-600">{parseBold(cell)}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            }
            continue;
        }

        // Bullet points
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().startsWith('• ')) {
            elements.push(
                <div key={i} className="flex gap-2 mb-1 pl-2">
                    <span className="text-nobel-gold font-bold">•</span>
                    <span>{parseBold(line.replace(/^[\s]*[-*•]\s/, ''))}</span>
                </div>
            );
            i++;
            continue;
        }

        // Empty lines
        if (line.trim() === '') {
            elements.push(<br key={i} />);
            i++;
            continue;
        }

        // Default paragraph
        elements.push(<p key={i} className="mb-2">{parseBold(line)}</p>);
        i++;
    }

    return (
        <div className="prose prose-stone max-w-none text-stone-600 font-sans leading-relaxed text-sm">
            {elements}
        </div>
    );
};

const ScenarioExplanationModal: React.FC<ScenarioExplanationModalProps> = ({ isOpen, onClose, scenario }) => {
    const [style, setStyle] = useState<"Analogy" | "Simplify" | "Professional">("Professional");
    const [explanation, setExplanation] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [displayedText, setDisplayedText] = useState("");

    const explainScenario = useAIExplainScenario();

    useEffect(() => {
        if (isOpen) {
            setExplanation("");
            setDisplayedText("");
            // Auto-generate on open if empty? Let's wait for user to click or select style.
            // Actually, let's auto-generate with default style for better UX.
            handleGenerate("Professional");
        }
    }, [isOpen, scenario]);

    // Typewriter effect
    useEffect(() => {
        if (explanation && displayedText.length < explanation.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(explanation.slice(0, displayedText.length + 5)); // Chunk of 5 chars
            }, 10);
            return () => clearTimeout(timeout);
        }
    }, [explanation, displayedText]);

    const handleGenerate = async (selectedStyle: "Analogy" | "Simplify" | "Professional") => {
        setStyle(selectedStyle);
        setIsGenerating(true);
        setExplanation("");
        setDisplayedText("");

        try {
            const result = await explainScenario({
                scenario,
                style: selectedStyle,
                useOllama: true
            });
            setExplanation(result);
        } catch (error) {
            setExplanation("Sorry, I couldn't generate an explanation at this time. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-nobel-gold/10 rounded-lg flex items-center justify-center text-nobel-gold">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-serif text-xl font-bold text-stone-900">AI Scenario Analysis</h2>
                            <p className="text-xs text-stone-500 uppercase tracking-wider">Understanding your deal</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-grow overflow-y-auto p-6">
                    {/* Style Selector */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <button
                            onClick={() => handleGenerate("Professional")}
                            disabled={isGenerating}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${style === 'Professional' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'}`}
                        >
                            <Briefcase className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Professional</span>
                        </button>
                        <button
                            onClick={() => handleGenerate("Simplify")}
                            disabled={isGenerating}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${style === 'Simplify' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'}`}
                        >
                            <Zap className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Simplify</span>
                        </button>
                        <button
                            onClick={() => handleGenerate("Analogy")}
                            disabled={isGenerating}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${style === 'Analogy' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'}`}
                        >
                            <Brain className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Analogy</span>
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="bg-stone-50 rounded-xl p-6 min-h-[200px] border border-stone-100">
                        {isGenerating && !displayedText ? (
                            <div className="flex flex-col items-center justify-center h-40 text-stone-400 gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-nobel-gold" />
                                <span className="text-xs font-bold uppercase tracking-widest">Analyzing Scenario...</span>
                            </div>
                        ) : (
                            <MarkdownRenderer content={displayedText} />
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white border border-stone-200 text-stone-600 rounded-lg text-sm font-bold hover:bg-stone-100 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScenarioExplanationModal;
