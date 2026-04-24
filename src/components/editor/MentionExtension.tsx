import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';

export interface MentionItem {
  type: 'page' | 'skill' | 'task';
  id: string;
  name: string;
}

export interface MentionSuggestion {
  type: 'page' | 'skill' | 'task';
  id: string;
  name: string;
  icon?: string;
}

// Create mention marks for rendering
export const mentionMark = {
  page: {
    parseDOM: [{ tag: 'span[data-mention-type="page"]' }],
    toDOM: (node: any) => ['span', { 
      class: 'mention mention-page',
      'data-mention-type': 'page',
      'data-mention-id': node.attrs.id,
    }, `@${node.attrs.name}`],
  },
  skill: {
    parseDOM: [{ tag: 'span[data-mention-type="skill"]' }],
    toDOM: (node: any) => ['span', { 
      class: 'mention mention-skill',
      'data-mention-type': 'skill',
      'data-mention-id': node.attrs.id,
    }, `@${node.attrs.name}`],
  },
  task: {
    parseDOM: [{ tag: 'span[data-mention-type="task"]' }],
    toDOM: (node: any) => ['span', { 
      class: 'mention mention-task',
      'data-mention-type': 'task',
      'data-mention-id': node.attrs.id,
    }, `@${node.attrs.name}`],
  },
};

export const mentionPluginKey = new PluginKey('mention');

interface MentionOptions {
  onMentionStart?: (query: string, type: 'page' | 'skill' | 'task' | null) => void;
  onMentionEnd?: () => void;
  onMentionSelect?: (item: MentionSuggestion) => void;
}

export const MentionExtension = Extension.create<MentionOptions>({
  name: 'mentionExtension',

  addOptions() {
    return {
      onMentionStart: undefined,
      onMentionEnd: undefined,
      onMentionSelect: undefined,
    };
  },

  addProseMirrorPlugins() {
    const { onMentionStart, onMentionEnd } = this.options;

    return [
      new Plugin({
        key: mentionPluginKey,
        state: {
          init() {
            return { active: false, query: '', type: null as 'page' | 'skill' | 'task' | null };
          },
          apply(tr, prev) {
            const meta = tr.getMeta(mentionPluginKey);
            if (meta) {
              return meta;
            }
            return prev;
          },
        },
        props: {
          handleTextInput(view, from, to, text) {
            if (text === '@') {
              const state = { active: true, query: '', type: null };
              view.dispatch(view.state.tr.setMeta(mentionPluginKey, state));
              onMentionStart?.('', null);
              return false;
            }

            const pluginState = mentionPluginKey.getState(view.state);
            if (pluginState?.active) {
              // Check for type prefixes
              const newQuery = pluginState.query + text;
              let type: 'page' | 'skill' | 'task' | null = pluginState.type;
              
              if (newQuery.startsWith('page:') || newQuery.startsWith('p:')) {
                type = 'page';
              } else if (newQuery.startsWith('skill:') || newQuery.startsWith('s:')) {
                type = 'skill';
              } else if (newQuery.startsWith('task:') || newQuery.startsWith('t:')) {
                type = 'task';
              }

              // End mention on space
              if (text === ' ') {
                view.dispatch(view.state.tr.setMeta(mentionPluginKey, { active: false, query: '', type: null }));
                onMentionEnd?.();
                return false;
              }

              const state = { active: true, query: newQuery, type };
              view.dispatch(view.state.tr.setMeta(mentionPluginKey, state));
              onMentionStart?.(newQuery, type);
            }

            return false;
          },
          handleKeyDown(view, event) {
            const pluginState = mentionPluginKey.getState(view.state);
            
            if (pluginState?.active) {
              if (event.key === 'Escape') {
                view.dispatch(view.state.tr.setMeta(mentionPluginKey, { active: false, query: '', type: null }));
                onMentionEnd?.();
                return true;
              }
              
              if (event.key === 'Backspace' && pluginState.query.length === 0) {
                view.dispatch(view.state.tr.setMeta(mentionPluginKey, { active: false, query: '', type: null }));
                onMentionEnd?.();
                return false;
              }
              
              if (event.key === 'Backspace' && pluginState.query.length > 0) {
                const newQuery = pluginState.query.slice(0, -1);
                let type = pluginState.type;
                
                // Re-check type
                if (newQuery.startsWith('page:') || newQuery.startsWith('p:')) {
                  type = 'page';
                } else if (newQuery.startsWith('skill:') || newQuery.startsWith('s:')) {
                  type = 'skill';
                } else if (newQuery.startsWith('task:') || newQuery.startsWith('t:')) {
                  type = 'task';
                } else {
                  type = null;
                }
                
                view.dispatch(view.state.tr.setMeta(mentionPluginKey, { active: true, query: newQuery, type }));
                onMentionStart?.(newQuery, type);
                return false;
              }
            }
            
            return false;
          },
        },
      }),
    ];
  },
});

// Helper to insert mention into editor
export function insertMention(
  editor: any,
  item: MentionSuggestion
) {
  const { state, view } = editor;
  const pluginState = mentionPluginKey.getState(state);
  
  if (!pluginState?.active) return;
  
  // Find the @ position
  const { from } = state.selection;
  const textBefore = state.doc.textBetween(Math.max(0, from - 50), from, '\n');
  const atIndex = textBefore.lastIndexOf('@');
  
  if (atIndex === -1) return;
  
  const deleteFrom = from - (textBefore.length - atIndex);
  const deleteTo = from;
  
  // Create mention HTML
  const mentionClass = `mention mention-${item.type}`;
  const mentionHtml = `<span class="${mentionClass}" data-mention-type="${item.type}" data-mention-id="${item.id}">@${item.name}</span>&nbsp;`;
  
  editor
    .chain()
    .focus()
    .deleteRange({ from: deleteFrom, to: deleteTo })
    .insertContent(mentionHtml)
    .run();
  
  // Reset plugin state
  view.dispatch(state.tr.setMeta(mentionPluginKey, { active: false, query: '', type: null }));
}
