import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, BookOpen, GitBranch, Sparkles, Plus, TrendingUp, Clock, Target } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: any[];
  source_page_id?: string;
  linked_skill?: string;
  created_at: string;
  last_attempt?: string;
  best_score?: number;
}

interface FlashcardDeck {
  id: string;
  title: string;
  description: string;
  cards: any[];
  source_page_id?: string;
  created_at: string;
  progress?: number;
  known_count?: number;
}

interface LearningStats {
  total_quizzes: number;
  total_flashcards: number;
  quizzes_completed: number;
  average_score: number;
  study_streak: number;
  total_study_time: number;
}

export function LearningPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardDeck[]>([]);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const { currentWorkspace } = useWorkspace();

  useEffect(() => {
    loadLearningData();
  }, [workspaceId]);

  const loadLearningData = async () => {
    try {
      setLoading(true);
      
      // Fetch quizzes
      const quizzesData = await api.getQuizzes(workspaceId || currentWorkspace?.id);
      setQuizzes(quizzesData || []);

      // Fetch flashcard decks
      const flashcardsData = await api.getFlashcardDecks(workspaceId || currentWorkspace?.id);
      setFlashcards(flashcardsData || []);

      // Fetch learning stats
      const statsData = await api.getLearningStats(workspaceId || currentWorkspace?.id);
      setStats(statsData);

    } catch (error) {
      console.error('Error loading learning data:', error);
      toast.error('Failed to load learning data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = (quizId: string) => {
    const basePath = workspaceId ? `/workspace/${workspaceId}` : '';
    navigate(`${basePath}/quiz/${quizId}`);
  };

  const handleStartFlashcards = (deckId: string) => {
    const basePath = workspaceId ? `/workspace/${workspaceId}` : '';
    navigate(`${basePath}/flashcards/${deckId}`);
  };

  const handleViewGraph = () => {
    const basePath = workspaceId ? `/workspace/${workspaceId}` : '';
    navigate(`${basePath}/graph?mode=mindmap`);
  };

  const handleCreateNew = () => {
    const basePath = workspaceId ? `/workspace/${workspaceId}` : '';
    navigate(`${basePath}/ask`);
    toast.info('Use Ask Anything in BUILD mode to create quizzes and flashcards');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading learning tools...</p>
        </div>
      </div>
    );
  }

  const hasContent = quizzes.length > 0 || flashcards.length > 0;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <Sparkles className="w-10 h-10 text-primary" />
                <div className="absolute inset-0 blur-xl bg-primary/30 rounded-full" />
              </div>
              <h1 className="text-4xl font-display font-bold text-foreground">
                Learning Tools
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              {hasContent 
                ? 'Continue your learning journey with interactive tools'
                : 'Create quizzes and flashcards to start learning'}
            </p>
          </div>
          <Button onClick={handleCreateNew} size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            Create New
          </Button>
        </motion.div>

        {/* Stats Cards */}
        {stats && hasContent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Quizzes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_quizzes}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.quizzes_completed} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Flashcard Decks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_flashcards}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active learning
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.average_score > 0 ? `${Math.round(stats.average_score)}%` : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all quizzes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Study Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.study_streak} days</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Keep it up!
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Empty State */}
        {!hasContent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="max-w-md mx-auto">
              <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">No Learning Tools Yet</h2>
              <p className="text-muted-foreground mb-6">
                Create quizzes and flashcards using Ask Anything in BUILD mode to start your learning journey.
              </p>
              <Button onClick={handleCreateNew} size="lg" className="gap-2">
                <Plus className="w-5 h-5" />
                Create Your First Learning Tool
              </Button>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
              <Card>
                <CardHeader>
                  <BookOpen className="w-8 h-8 text-primary mb-2" />
                  <CardTitle className="text-base">Flashcards</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Create flashcard decks from your pages to memorize key concepts
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Brain className="w-8 h-8 text-primary mb-2" />
                  <CardTitle className="text-base">Quizzes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Test your knowledge with auto-generated quizzes from your content
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <GitBranch className="w-8 h-8 text-primary mb-2" />
                  <CardTitle className="text-base">Mind Maps</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Visualize connections in your knowledge graph
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Content Tabs */}
        {hasContent && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="quizzes" className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Quizzes ({quizzes.length})
              </TabsTrigger>
              <TabsTrigger value="flashcards" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Flashcards ({flashcards.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="space-y-6">
                {/* Recent Quizzes */}
                {quizzes.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Recent Quizzes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {quizzes.slice(0, 4).map((quiz) => (
                        <Card key={quiz.id} className="hover:border-primary/50 transition-colors">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg">{quiz.title}</CardTitle>
                                <CardDescription className="mt-1">
                                  {quiz.questions.length} questions
                                </CardDescription>
                              </div>
                              {quiz.best_score !== undefined && (
                                <Badge variant={quiz.best_score >= 80 ? 'default' : 'secondary'}>
                                  {Math.round(quiz.best_score)}%
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <Button 
                              onClick={() => handleStartQuiz(quiz.id)}
                              className="w-full"
                            >
                              {quiz.last_attempt ? 'Retake Quiz' : 'Start Quiz'}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Flashcards */}
                {flashcards.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Flashcard Decks</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {flashcards.slice(0, 4).map((deck) => (
                        <Card key={deck.id} className="hover:border-primary/50 transition-colors">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg">{deck.title}</CardTitle>
                                <CardDescription className="mt-1">
                                  {deck.cards.length} cards
                                </CardDescription>
                              </div>
                              {deck.progress !== undefined && (
                                <Badge variant="secondary">
                                  {Math.round(deck.progress)}% known
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <Button 
                              onClick={() => handleStartFlashcards(deck.id)}
                              className="w-full"
                            >
                              Review Cards
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mind Map CTA */}
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <GitBranch className="w-8 h-8 text-primary" />
                      <div>
                        <CardTitle>Knowledge Graph</CardTitle>
                        <CardDescription>
                          Visualize connections between your learning materials
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={handleViewGraph} variant="outline" className="gap-2">
                      <GitBranch className="w-4 h-4" />
                      View Mind Map
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="quizzes">
              <div className="space-y-4">
                {quizzes.length === 0 ? (
                  <div className="text-center py-12">
                    <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No quizzes yet. Create one using Ask Anything!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quizzes.map((quiz) => (
                      <Card key={quiz.id} className="hover:border-primary/50 transition-colors">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{quiz.title}</CardTitle>
                              <CardDescription className="mt-1">
                                {quiz.description || `${quiz.questions.length} questions`}
                              </CardDescription>
                            </div>
                            {quiz.best_score !== undefined && (
                              <Badge variant={quiz.best_score >= 80 ? 'default' : 'secondary'}>
                                Best: {Math.round(quiz.best_score)}%
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                            <Clock className="w-4 h-4" />
                            <span>
                              {quiz.last_attempt 
                                ? `Last attempt: ${new Date(quiz.last_attempt).toLocaleDateString()}`
                                : 'Not attempted yet'}
                            </span>
                          </div>
                          <Button 
                            onClick={() => handleStartQuiz(quiz.id)}
                            className="w-full"
                          >
                            {quiz.last_attempt ? 'Retake Quiz' : 'Start Quiz'}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="flashcards">
              <div className="space-y-4">
                {flashcards.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No flashcard decks yet. Create one using Ask Anything!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {flashcards.map((deck) => (
                      <Card key={deck.id} className="hover:border-primary/50 transition-colors">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{deck.title}</CardTitle>
                              <CardDescription className="mt-1">
                                {deck.description || `${deck.cards.length} cards`}
                              </CardDescription>
                            </div>
                            {deck.progress !== undefined && (
                              <Badge variant="secondary">
                                {Math.round(deck.progress)}%
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                            <Target className="w-4 h-4" />
                            <span>
                              {deck.known_count || 0} of {deck.cards.length} cards known
                            </span>
                          </div>
                          <Button 
                            onClick={() => handleStartFlashcards(deck.id)}
                            className="w-full"
                          >
                            Review Cards
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
