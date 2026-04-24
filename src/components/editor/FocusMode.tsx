import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FocusModeProps {
  isActive: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function FocusMode({ isActive, onToggle, children }: FocusModeProps) {
  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background"
      >
        {/* Exit Button */}
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Centered Content */}
        <div className="h-full overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-16">
            {children}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function FocusModeToggle({ isActive, onToggle }: { isActive: boolean; onToggle: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className={cn(
        "rounded-lg",
        isActive && "bg-primary text-primary-foreground"
      )}
      title="Focus Mode (F11)"
    >
      <Maximize2 className="w-4 h-4" />
    </Button>
  );
}
