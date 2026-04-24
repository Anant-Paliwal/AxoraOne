import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { ResizableMedia } from './ResizableMedia';

export interface ResizableVideoOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resizableVideo: {
      setResizableVideo: (options: { src: string; width?: number; alignment?: string }) => ReturnType;
    };
  }
}

export const ResizableVideoExtension = Node.create<ResizableVideoOptions>({
  name: 'resizableVideo',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      src: {
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
        tag: 'resizable-video',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['resizable-video', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(({ node, updateAttributes, deleteNode, editor }) => {
      return (
        <NodeViewWrapper>
          <ResizableMedia
            src={node.attrs.src}
            type="video"
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
      setResizableVideo:
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
