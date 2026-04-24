import React from 'react';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  // Parse and render markdown-like content with better formatting
  const renderContent = () => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: string[] = [];
    let currentTable: string[][] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLang = '';

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="space-y-2 my-4 ml-4">
            {currentList.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span className="flex-1">{item}</span>
              </li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    const flushTable = () => {
      if (currentTable.length > 0) {
        elements.push(
          <div key={`table-${elements.length}`} className="my-4 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  {currentTable[0].map((cell, i) => (
                    <th key={i} className="px-4 py-2 text-left text-sm font-semibold text-foreground">
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentTable.slice(1).map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-2 text-sm text-foreground">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        currentTable = [];
      }
    };

    lines.forEach((line, index) => {
      // Code blocks
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          flushList();
          flushTable();
          inCodeBlock = true;
          codeBlockLang = line.slice(3).trim();
        } else {
          elements.push(
            <div key={`code-${elements.length}`} className="my-4 rounded-xl bg-muted/50 border border-border overflow-hidden">
              {codeBlockLang && (
                <div className="px-4 py-2 bg-muted border-b border-border text-xs font-mono text-muted-foreground">
                  {codeBlockLang}
                </div>
              )}
              <pre className="p-4 overflow-x-auto">
                <code className="text-sm font-mono text-foreground">
                  {codeBlockContent.join('\n')}
                </code>
              </pre>
            </div>
          );
          inCodeBlock = false;
          codeBlockContent = [];
          codeBlockLang = '';
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // Remove ### and ** formatting
      let cleanLine = line
        .replace(/^###\s+/g, '')
        .replace(/^##\s+/g, '')
        .replace(/^#\s+/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1');

      // Table rows
      if (cleanLine.includes('|') && cleanLine.trim().startsWith('|')) {
        flushList();
        const cells = cleanLine.split('|').map(c => c.trim()).filter(c => c);
        if (cells.length > 0 && !cells.every(c => c.match(/^[-:]+$/))) {
          currentTable.push(cells);
        }
        return;
      } else {
        flushTable();
      }

      // List items
      if (cleanLine.match(/^[-*]\s+/) || cleanLine.match(/^\d+\.\s+/)) {
        const content = cleanLine.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
        currentList.push(content);
        return;
      } else {
        flushList();
      }

      // Empty lines
      if (!cleanLine.trim()) {
        if (elements.length > 0) {
          elements.push(<div key={`space-${elements.length}`} className="h-3" />);
        }
        return;
      }

      // Detect if line looks like a heading (starts with capital, ends with colon, or is short and bold)
      const isHeading = cleanLine.match(/^[A-Z][^.!?]*:$/) || 
                       (cleanLine.length < 50 && line.includes('**'));

      if (isHeading) {
        elements.push(
          <h3 key={`heading-${elements.length}`} className="text-base font-semibold text-foreground mt-6 mb-3">
            {cleanLine.replace(/:$/, '')}
          </h3>
        );
      } else {
        // Regular paragraph
        elements.push(
          <p key={`p-${elements.length}`} className="text-foreground leading-relaxed mb-3">
            {cleanLine}
          </p>
        );
      }
    });

    flushList();
    flushTable();

    return elements;
  };

  return (
    <div className={cn("prose-custom", className)}>
      {renderContent()}
    </div>
  );
};
