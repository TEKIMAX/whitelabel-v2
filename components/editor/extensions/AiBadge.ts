import { Node, mergeAttributes } from '@tiptap/core';

export const AiBadge = Node.create({
    name: 'aiBadge',

    group: 'inline',

    inline: true,

    atom: true,

    addAttributes() {
        return {
            label: {
                default: 'AI Assisted',
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-type="ai-badge"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(HTMLAttributes, {
                'data-type': 'ai-badge',
                class: 'inline-flex rounded overflow-hidden font-bold uppercase tracking-tight shadow-sm mx-1 select-none text-[9px]',
                contenteditable: 'false',
            }),
            ['span', { class: 'bg-[#444444] text-white px-1.5 py-0.5' }, 'AI'],
            ['span', { class: 'bg-[#7c007c] text-white px-1.5 py-0.5' }, 'Assisted'],
        ];
    },
});
