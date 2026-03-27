import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import VariableComponent from '../VariableComponent';

export default Node.create({
  name: 'variable',

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      label: {
        default: 'Variable',
      },
      value: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'variable-component',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['variable-component', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VariableComponent);
  },
});
