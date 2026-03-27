import React from 'react';

const parseBold = (text: string, theme: 'light' | 'dark' = 'light') => {
    const boldClass = theme === 'dark' ? 'text-white' : 'text-stone-900';
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className={`font-bold ${boldClass}`}>{part.slice(2, -2)}</strong>;
        }
        return part;
    });
};

export const MarkdownRenderer: React.FC<{ content: string; theme?: 'light' | 'dark' }> = ({ content, theme = 'light' }) => {
    if (!content) return null;

    // Clean up content if it's wrapped in triple backticks
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```markdown')) {
        cleanContent = cleanContent.replace(/^```markdown\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\w*\s*/, '').replace(/\s*```$/, '');
    }

    return (
        <div className={`max-w-none font-sans leading-loose text-sm ${theme === 'dark' ? 'text-stone-300' : 'text-stone-600 prose prose-stone'}`}>
            {cleanContent.split('\n').map((line, i) => {
                const h1Class = theme === 'dark' ? 'text-white border-stone-800' : 'text-stone-900 border-stone-200';
                const h2Class = theme === 'dark' ? 'text-white' : 'text-stone-900';
                const h3Class = theme === 'dark' ? 'text-stone-100' : 'text-stone-800';

                if (line.startsWith('# ')) return <h1 key={i} className={`font-serif text-2xl mb-4 mt-6 pb-2 border-b ${h1Class}`}>{parseBold(line.replace('# ', ''), theme)}</h1>;
                if (line.startsWith('## ')) return <h2 key={i} className={`font-serif text-xl mb-3 mt-6 ${h2Class}`}>{parseBold(line.replace('## ', ''), theme)}</h2>;
                if (line.startsWith('### ')) return <h3 key={i} className={`font-serif text-lg mb-2 mt-4 ${h3Class}`}>{parseBold(line.replace('### ', ''), theme)}</h3>;
                if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                    return (
                        <div key={i} className="flex gap-3 mb-1 pl-4">
                            <span className="text-nobel-gold font-bold">•</span>
                            <span>{parseBold(line.replace(/^[-*]\s/, ''), theme)}</span>
                        </div>
                    );
                }
                if (line.match(/^!\[.*?\]\(.*?\)/)) {
                    const match = line.match(/^!\[(.*?)\]\((.*?)\)/);
                    if (match) {
                        return <img key={i} src={match[2]} alt={match[1]} className="h-6 my-2" />;
                    }
                }
                if (line.trim() === '') return <br key={i} />;
                return <p key={i} className="mb-3">{parseBold(line, theme)}</p>;
            })}
        </div>
    );
};
