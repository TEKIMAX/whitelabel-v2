import React from 'react';

const parseBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-bold text-stone-900">{part.slice(2, -2)}</strong>;
        }
        return part;
    });
};

export const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    if (!content) return null;

    // Clean up content if it's wrapped in triple backticks
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```markdown')) {
        cleanContent = cleanContent.replace(/^```markdown\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\w*\s*/, '').replace(/\s*```$/, '');
    }

    return (
        <div className="prose prose-stone max-w-none text-stone-600 font-sans leading-loose text-sm">
            {cleanContent.split('\n').map((line, i) => {
                if (line.startsWith('# ')) return <h1 key={i} className="font-serif text-2xl text-stone-900 mb-4 mt-6 pb-2 border-b border-stone-200">{parseBold(line.replace('# ', ''))}</h1>;
                if (line.startsWith('## ')) return <h2 key={i} className="font-serif text-xl text-stone-900 mb-3 mt-6">{parseBold(line.replace('## ', ''))}</h2>;
                if (line.startsWith('### ')) return <h3 key={i} className="font-serif text-lg text-stone-800 mb-2 mt-4">{parseBold(line.replace('### ', ''))}</h3>;
                if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                    return (
                        <div key={i} className="flex gap-3 mb-1 pl-4">
                            <span className="text-nobel-gold font-bold">•</span>
                            <span>{parseBold(line.replace(/^[-*]\s/, ''))}</span>
                        </div>
                    );
                }
                if (line.trim() === '') return <br key={i} />;
                return <p key={i} className="mb-3">{parseBold(line)}</p>;
            })}
        </div>
    );
};
