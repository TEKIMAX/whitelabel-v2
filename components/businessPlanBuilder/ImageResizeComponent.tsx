import React from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';

const ImageResizeComponent: React.FC<NodeViewProps> = (props) => {
  const handler = (mouseDownEvent: React.MouseEvent<HTMLDivElement>) => {
    const parent = (mouseDownEvent.target as HTMLElement).closest('.image-resizer');
    const image = parent?.querySelector('img');

    if (!image) return;

    const startX = mouseDownEvent.pageX;
    const startWidth = image.clientWidth;

    const onMouseMove = (mouseMoveEvent: MouseEvent) => {
      const currentX = mouseMoveEvent.pageX;
      const diffX = currentX - startX;
      
      const newWidth = startWidth + diffX;
      
      props.updateAttributes({
        width: newWidth,
      });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <NodeViewWrapper className="image-resizer">
      <img
        src={props.node.attrs.src}
        alt={props.node.attrs.alt}
        style={{
          width: props.node.attrs.width,
        }}
      />
      <div className="resize-handle br" onMouseDown={handler} />
    </NodeViewWrapper>
  );
};

export default ImageResizeComponent;
