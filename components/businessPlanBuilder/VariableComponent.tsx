import React from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';

const VariableComponent: React.FC<NodeViewProps> = (props) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.updateAttributes({
      value: e.target.value,
    });
  };

  const isFilled = props.node.attrs.value && props.node.attrs.value.length > 0;

  return (
    <NodeViewWrapper className="inline-block mx-1 align-baseline">
      <div className="relative inline-flex items-center">
        <input
          type="text"
          value={props.node.attrs.value}
          onChange={handleChange}
          placeholder={props.node.attrs.label}
          className={`
            py-0.5 px-2 rounded-md text-sm font-medium border-2 focus:outline-none focus:ring-2 focus:ring-nobel-gold/50 transition-all min-w-[120px]
            ${isFilled 
              ? 'bg-white border-nobel-gold text-nobel-dark' 
              : 'bg-nobel-cream border-dashed border-nobel-gold/50 text-gray-500'
            }
          `}
        />
        {!isFilled && (
            <span className="absolute right-2 pointer-events-none text-xs text-nobel-gold/50 font-bold opacity-50">
                *
            </span>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default VariableComponent;
