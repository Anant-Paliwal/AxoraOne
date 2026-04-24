import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LucideIcon, iconMap } from '@/components/ui/IconPicker';

interface Page {
  id: string;
  title: string;
  icon?: string;
  content?: string;
  parent_page_id?: string | null;
}

interface PageTimelineProps {
  currentPage: Page;
  allPages: Page[];
  onNavigate: (pageId: string) => void;
}

export function PageTimeline({ currentPage, allPages, onNavigate }: PageTimelineProps) {
  const [hoveredPageId, setHoveredPageId] = useState<string | null>(null);

  // Get parent page if exists
  const parentPage = currentPage.parent_page_id 
    ? allPages.find(p => p.id === currentPage.parent_page_id)
    : null;

  // Get subpages of current page
  const subPages = allPages.filter(p => p.parent_page_id === currentPage.id);

  // Build timeline: parent -> current -> subpages
  const timelinePages: Page[] = [];
  
  if (parentPage) {
    timelinePages.push(parentPage);
  }
  
  timelinePages.push(currentPage);
  
  if (subPages.length > 0) {
    timelinePages.push(...subPages);
  }

  const stripHtml = (html: string): string => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (timelinePages.length <= 1) {
    return null; // Don't show timeline if only current page
  }

  return (
    <div className="relative mb-6 pb-6 border-b border-border">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">
          {parentPage ? 'Page Navigation' : 'Subpages'}
        </span>
      </div>

      {/* Timeline Container */}
      <div className="relative">
        {/* Connection Line */}
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-border" 
             style={{ 
               left: '20px',
               right: '20px'
             }} 
        />

        {/* Pages as Points */}
        <div className="flex items-start justify-between relative">
          {timelinePages.map((page, index) => {
            const isCurrent = page.id === currentPage.id;
            const isHovered = hoveredPageId === page.id;

            return (
              <div
                key={page.id}
                className="relative flex flex-col items-center"
                style={{ flex: 1 }}
                onMouseEnter={() => setHoveredPageId(page.id)}
                onMouseLeave={() => setHoveredPageId(null)}
              >
                {/* Point/Dot */}
                <motion.button
                  onClick={() => !isCurrent && onNavigate(page.id)}
                  className={cn(
                    "relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all",
                    isCurrent 
                      ? "bg-primary text-primary-foreground shadow-lg scale-110" 
                      : "bg-secondary hover:bg-primary/20 hover:scale-105"
                  )}
                  whileHover={{ scale: isCurrent ? 1.1 : 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={isCurrent}
                >
                  {page.icon && iconMap[page.icon] ? (
                    <LucideIcon name={page.icon} className="w-5 h-5" />
                  ) : (
                    <span className="text-lg">{page.icon || '📄'}</span>
                  )}
                  
                  {/* Current Page Indicator */}
                  {isCurrent && (
                    <motion.div
                      className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-primary rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 }}
                    />
                  )}
                </motion.button>

                {/* Page Title Below Point */}
                <div className="mt-3 text-center max-w-[120px]">
                  <p className={cn(
                    "text-xs font-medium line-clamp-2",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}>
                    {page.title}
                  </p>
                  {index === 0 && parentPage && (
                    <span className="text-[10px] text-muted-foreground/60">Parent</span>
                  )}
                  {index > 0 && !isCurrent && subPages.some(sp => sp.id === page.id) && (
                    <span className="text-[10px] text-muted-foreground/60">Subpage</span>
                  )}
                </div>

                {/* Preview Card on Hover */}
                <AnimatePresence>
                  {isHovered && !isCurrent && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-20 z-50 w-64 bg-card border border-border rounded-xl shadow-xl p-4 cursor-pointer"
                      onClick={() => onNavigate(page.id)}
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                          {page.icon && iconMap[page.icon] ? (
                            <LucideIcon name={page.icon} className="w-5 h-5" />
                          ) : (
                            <span className="text-lg">{page.icon || '📄'}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground line-clamp-2 text-sm">
                            {page.title}
                          </h4>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {page.content 
                          ? truncateText(stripHtml(page.content), 100)
                          : 'No content yet'}
                      </p>

                      <div className="mt-3 pt-3 border-t border-border">
                        <button className="text-xs text-primary hover:underline font-medium">
                          Click to view →
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
