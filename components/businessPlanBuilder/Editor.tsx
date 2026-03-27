import React, { useEffect } from 'react';
import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Image } from '@tiptap/extension-image';
import Mention from '@tiptap/extension-mention';
import Toolbar from './Toolbar';
import { INITIAL_CONTENT } from './constants';
import ImageResizeComponent from './ImageResizeComponent';
import suggestion from './suggestion';
import { CanvasData } from './types';

interface EditorProps {
  setEditorInstance: (editor: any) => void;
  canvasData: CanvasData;
}

const Editor: React.FC<EditorProps> = ({ setEditorInstance, canvasData }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Type your business plan details here...',
      }),
      Typography,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        inline: true,
        allowBase64: true,
      }).extend({
        addNodeView() {
          return ReactNodeViewRenderer(ImageResizeComponent);
        },
        addAttributes() {
          return {
            ...this.parent?.(),
            width: {
              default: '100%',
              renderHTML: (attributes) => ({
                width: attributes.width
              })
            }
          }
        }
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion,
      }),
    ],
    content: INITIAL_CONTENT,
    editorProps: {
      attributes: {
        class: 'prose prose-lg prose-headings:font-serif prose-p:font-sans focus:outline-none max-w-none mx-auto',
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      localStorage.setItem('nobel-plan-content', JSON.stringify(json));
    },
  });

  useEffect(() => {
    if (editor) {
      setEditorInstance(editor);
      const savedContent = localStorage.getItem('nobel-plan-content');
      if (savedContent) {
        try {
          editor.commands.setContent(JSON.parse(savedContent));
        } catch (e) {
        }
      }
    }
  }, [editor, setEditorInstance]);

  return (
    <div className="flex flex-col h-full bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200">
      <Toolbar editor={editor} canvasData={canvasData} />
      <div
        className="flex-1 overflow-y-auto bg-white cursor-text p-8 sm:p-12 md:p-16"
        onClick={() => editor?.chain().focus().run()}
      >
        <EditorContent editor={editor} className="min-h-[800px] max-w-[850px] mx-auto pb-32" />
      </div>
    </div>
  );
};

export default Editor;
