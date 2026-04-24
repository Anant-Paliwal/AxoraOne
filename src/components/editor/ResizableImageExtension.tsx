import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { ResizableMedia } from './ResizableMedia';

export interface ResizableImageOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resizableImage: {
      setResizableImage: (options: { src: string; alt?: string; width?: number; alignment?: string }) => ReturnType;
    };
  }
}

export const ResizableImageExtension = Node.create<ResizableImageOptions>({
  name: 'resizableImage',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      width: {
        default: 100,
      },
      alignment: {
        default: 'center',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'resizable-image',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['resizable-image', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(({ node, updateAttributes, deleteNode, editor }) => {
      return (
        <NodeViewWrapper>
          <ResizableMedia
            src={node.attrs.src}
            type="image"
            alt={node.attrs.alt}
            initialWidth={node.attrs.width}
            initialAlignment={node.attrs.alignment}
            onUpdate={(data) => {
              updateAttributes(data);
            }}
            onDelete={() => deleteNode()}
            editable={editor.isEditable}
          />
        </NodeViewWrapper>
      );
    });
  },

  addCommands() {
    return {
      setResizableImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
