import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FlashcardDeck } from '@/components/learning/FlashcardDeck';
import { api } from '@/lib/api';

export function FlashcardsPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (deckId) {
      loadDeck();
    }
  }, [deckId]);

  const loadDeck = async () => {
    try {
      setLoading(true);
      const data = await api.getFlashcardDeck(deckId!);
      setDeck(data);
    } catch (error) {
      console.error('Failed to load flashcard deck:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    // Optionally navigate back or show completion message
    console.log('Flashcard deck completed!');
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Flashcard deck not found</h2>
          <p className="text-muted-foreground mb-4">The flashcard deck you're looking for doesn't exist.</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          {deck.description && (
            <p className="text-muted-foreground mt-2">{deck.description}</p>
          )}
        </div>

        {/* Flashcard Component */}
        <FlashcardDeck
          title={deck.title}
          cards={deck.cards}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}
