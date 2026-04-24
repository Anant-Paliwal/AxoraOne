import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactCardFlip from 'react-card-flip';
import { ChevronLeft, ChevronRight, RotateCcw, Check, X, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface Flashcard {
  front: string;
  back: string;
  category?: string;
}

interface FlashcardDeckProps {
  title: string;
  cards: Flashcard[];
  onComplete?: () => void;
  deckId?: string;
  workspaceId?: string;
  skillId?: string;
}

export function FlashcardDeck({ title, cards, onComplete, deckId, workspaceId, skillId }: FlashcardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<number>>(new Set());
  const [unknownCards, setUnknownCards] = useState<Set<number>>(new Set());
  const [shuffledCards, setShuffledCards] = useState(cards);

  const currentCard = shuffledCards[currentIndex];
  const progress = ((currentIndex + 1) / shuffledCards.length) * 100;
  const masteredCount = knownCards.size;
  const reviewCount = unknownCards.size;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleKnown = async () => {
    setKnownCards(new Set([...knownCards, currentIndex]));
    unknownCards.delete(currentIndex);
    setUnknownCards(new Set(unknownCards));
    
    // Save flashcard progress and update learning memory
    if (deckId && workspaceId) {
      try {
        // Save progress using the correct API method
        await api.updateFlashcardProgress(deckId, currentIndex, 'known');
        
        // Update learning memory
        await api.updateLearningMemory({
          workspace_id: workspaceId,
          skill_id: skillId || 'general',
          topic: currentCard.front,
          is_correct: true,
          study_time: 10
        });
      } catch (error) {
        console.warn('Failed to save flashcard progress:', error);
      }
    }
    
    handleNext();
  };

  const handleUnknown = async () => {
    setUnknownCards(new Set([...unknownCards, currentIndex]));
    knownCards.delete(currentIndex);
    setKnownCards(new Set(knownCards));
    
    // Save flashcard progress and update learning memory
    if (deckId && workspaceId) {
      try {
        // Save progress using the correct API method
        await api.updateFlashcardProgress(deckId, currentIndex, 'unknown');
        
        // Update learning memory
        await api.updateLearningMemory({
          workspace_id: workspaceId,
          skill_id: skillId || 'general',
          topic: currentCard.front,
          is_correct: false,
          study_time: 10
        });
      } catch (error) {
        console.warn('Failed to save flashcard progress:', error);
      }
    }
    
    handleNext();
  };

  const handleNext = () => {
    if (currentIndex < shuffledCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else if (currentIndex === shuffledCards.length - 1) {
      onComplete?.();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards(new Set());
    setUnknownCards(new Set());
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards(new Set());
    setUnknownCards(new Set());
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShuffle}
              className="rounded-lg"
            >
              <Shuffle className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestart}
              className="rounded-lg"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Card {currentIndex + 1} of {shuffledCards.length}
            </span>
            <div className="flex items-center gap-4">
              <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                <Check className="w-4 h-4" />
                {masteredCount}
              </span>
              <span className="text-orange-600 dark:text-orange-400 flex items-center gap-1">
                <X className="w-4 h-4" />
                {reviewCount}
              </span>
            </div>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-primary"
            />
          </div>
        </div>
      </div>

      {/* Flashcard */}
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <ReactCardFlip isFlipped={isFlipped} flipDirection="horizontal">
            {/* Front */}
            <motion.div
              key="front"
              onClick={handleFlip}
              whileHover={{ scale: 1.02 }}
              className="cursor-pointer"
            >
              <div className="aspect-[3/2] bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg">
                {currentCard.category && (
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-4 px-3 py-1 bg-primary/10 rounded-full">
                    {currentCard.category}
                  </span>
                )}
                <p className="text-2xl font-medium text-foreground mb-4">
                  {currentCard.front}
                </p>
                <p className="text-sm text-muted-foreground">
                  Click to reveal answer
                </p>
              </div>
            </motion.div>

            {/* Back */}
            <motion.div
              key="back"
              onClick={handleFlip}
              whileHover={{ scale: 1.02 }}
              className="cursor-pointer"
            >
              <div className="aspect-[3/2] bg-gradient-to-br from-secondary to-secondary/50 border-2 border-border rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Check className="w-6 h-6 text-primary" />
                </div>
                <p className="text-xl font-medium text-foreground whitespace-pre-wrap">
                  {currentCard.back}
                </p>
              </div>
            </motion.div>
          </ReactCardFlip>

          {/* Controls */}
          <div className="mt-8 flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="rounded-xl"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <AnimatePresence>
              {isFlipped && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-3"
                >
                  <Button
                    variant="outline"
                    onClick={handleUnknown}
                    className="rounded-xl border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500"
                  >
                    <X className="w-4 h-4 mr-2 text-orange-600" />
                    Review
                  </Button>
                  <Button
                    onClick={handleKnown}
                    className="rounded-xl bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Got it!
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              variant="outline"
              onClick={handleNext}
              disabled={currentIndex === shuffledCards.length - 1}
              className="rounded-xl"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
