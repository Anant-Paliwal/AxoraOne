import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OutlineItem {
  id: string;
  text: string;
  level: number;
  children: OutlineItem[];
}

interface OutlineViewProps {
  content: string;
  onNavigate: (id: string) => void;
}

export function OutlineView({ content, onNavigate }: OutlineViewProps) {
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Parse HTML content to extract headings
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');

    const items: OutlineItem[] = [];
    const stack: OutlineItem[] = [];

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      const id = heading.id || `heading-${index}`;
      const text = heading.textContent || '';

      const item: OutlineItem = { id, text, level, children: [] };

      // Find parent
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (stack.length === 0) {
        items.push(item);
      } else {
        stack[stack.length - 1].children.push(item);
      }

      stack.push(item);
    });

    setOutline(items);
  }, [content]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderItem = (item: OutlineItem, depth: number = 0) => {
    const hasChildren = item.children.length > 0;
    const isExpanded = expandedIds.has(item.id);

    return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleExpand(item.id);
            }
            onNavigate(item.id);
          }}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors text-left",
            depth > 0 && "ml-4"
          )}
        >
          {hasChildren && (
            <span className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </span>
          )}
          {!hasChildren && <span className="w-4" />}
          <span className="flex-1 truncate text-foreground">{item.text}</span>
        </button>
        {hasChildren && isExpanded && (
          <div className="ml-2">
            {item.children.map((child) => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (outline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          No headings found
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Add headings to see the outline
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-1"
    >
      {outline.map((item) => renderItem(item))}
    </motion.div>
  );
}
