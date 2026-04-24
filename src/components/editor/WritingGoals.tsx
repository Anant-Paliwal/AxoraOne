import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WritingGoalsProps {
  currentWords: number;
}

export function WritingGoals({ currentWords }: WritingGoalsProps) {
  const [goal, setGoal] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const progress = goal ? Math.min((currentWords / goal) * 100, 100) : 0;
  const isComplete = goal ? currentWords >= goal : false;

  const handleSetGoal = () => {
    const value = parseInt(inputValue);
    if (value > 0) {
      setGoal(value);
      setIsEditing(false);
      setInputValue('');
    }
  };

  const handleClearGoal = () => {
    setGoal(null);
    setIsEditing(false);
    setInputValue('');
  };

  if (!goal && !isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
      >
        <Target className="w-4 h-4" />
        <span>Set writing goal</span>
      </button>
    );
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-accent rounded-lg">
        <Target className="w-4 h-4 text-muted-foreground" />
        <input
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSetGoal();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          placeholder="Word count goal"
          className="w-24 px-2 py-1 text-sm bg-background border border-border rounded"
          autoFocus
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSetGoal}
          className="h-6 w-6 p-0"
        >
          <Check className="w-4 h-4 text-green-500" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(false)}
          className="h-6 w-6 p-0"
        >
          <X className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative px-3 py-2 bg-accent rounded-lg"
    >
      <div className="flex items-center gap-3">
        <Target className={cn(
          "w-4 h-4",
          isComplete ? "text-green-500" : "text-muted-foreground"
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-medium text-foreground">
              {currentWords} / {goal} words
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
              className={cn(
                "h-full rounded-full",
                isComplete ? "bg-green-500" : "bg-primary"
              )}
            />
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearGoal}
          className="h-6 w-6 p-0"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full whitespace-nowrap"
        >
          🎉 Goal reached!
        </motion.div>
      )}
    </motion.div>
  );
}
