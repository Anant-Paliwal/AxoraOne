import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronRight, RotateCcw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface QuizCardProps {
  title: string;
  questions: QuizQuestion[];
  onComplete?: (score: number) => void;
  quizId?: string;
  workspaceId?: string;
  skillId?: string;
}

export function QuizCard({ title, questions, onComplete, quizId, workspaceId, skillId }: QuizCardProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<boolean[]>(
    new Array(questions.length).fill(false)
  );
  const [isComplete, setIsComplete] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(questions.length).fill(null));

  const question = questions[currentQuestion];
  const isCorrect = selectedAnswer === question.correctAnswer;
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleAnswerSelect = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) return;
    
    setShowResult(true);
    
    if (isCorrect && !answeredQuestions[currentQuestion]) {
      setScore(score + 1);
    }
    
    const newAnswered = [...answeredQuestions];
    newAnswered[currentQuestion] = true;
    setAnsweredQuestions(newAnswered);
    
    // Store answer for later memory update
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = selectedAnswer;
    setAnswers(newAnswers);
  };

  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      // Quiz complete - save results and update learning memory
      const finalScore = score + (isCorrect ? 1 : 0);
      const percentage = (finalScore / questions.length) * 100;
      
      try {
        // Save quiz attempt if quizId provided
        if (quizId) {
          await api.recordQuizAttempt(quizId, finalScore, questions.length);
        }
        
        // Update learning memory for each question
        if (workspaceId) {
          for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            const userAnswer = i === currentQuestion ? selectedAnswer : answers[i];
            const isQuestionCorrect = userAnswer === question.correctAnswer;
            
            try {
              await api.updateLearningMemory({
                workspace_id: workspaceId,
                skill_id: skillId || 'general',
                topic: question.question,
                is_correct: isQuestionCorrect,
                study_time: 30
              });
            } catch (memError) {
              console.warn('Failed to update learning memory:', memError);
            }
          }
        }
        
        // Update skill confidence if linked and passed
        if (skillId && percentage >= 70) {
          try {
            await api.updateSkill(skillId, {
              confidence: Math.min(100, percentage)
            });
          } catch (skillError) {
            console.warn('Failed to update skill confidence:', skillError);
          }
        }
      } catch (error) {
        console.error('Failed to save quiz results:', error);
      }
      
      setIsComplete(true);
      onComplete?.(finalScore);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setAnsweredQuestions(new Array(questions.length).fill(false));
    setIsComplete(false);
  };

  if (isComplete) {
    const percentage = Math.round((score / questions.length) * 100);
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <Trophy className="w-12 h-12 text-primary" />
        </motion.div>
        
        <h3 className="text-2xl font-bold text-foreground mb-2">Quiz Complete!</h3>
        <p className="text-muted-foreground mb-6">
          You scored {score} out of {questions.length}
        </p>
        
        <div className="mb-8">
          <div className="text-5xl font-bold text-primary mb-2">{percentage}%</div>
          <p className="text-sm text-muted-foreground">
            {percentage >= 80 ? '🎉 Excellent!' : percentage >= 60 ? '👍 Good job!' : '💪 Keep practicing!'}
          </p>
        </div>
        
        <Button onClick={handleRestart} className="rounded-xl">
          <RotateCcw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{currentQuestion + 1}</span>
            <span>/</span>
            <span>{questions.length}</span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
            className="h-full bg-primary"
          />
        </div>
      </div>

      {/* Question */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <h4 className="text-xl font-medium text-foreground mb-6">
              {question.question}
            </h4>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {question.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrectOption = index === question.correctAnswer;
                const showCorrect = showResult && isCorrectOption;
                const showIncorrect = showResult && isSelected && !isCorrect;

                return (
                  <motion.button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showResult}
                    whileHover={{ scale: showResult ? 1 : 1.02 }}
                    whileTap={{ scale: showResult ? 1 : 0.98 }}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border-2 transition-all",
                      "flex items-center gap-3",
                      !showResult && !isSelected && "border-border hover:border-primary/30 hover:bg-secondary/50",
                      !showResult && isSelected && "border-primary bg-primary/10",
                      showCorrect && "border-green-500 bg-green-500/10",
                      showIncorrect && "border-red-500 bg-red-500/10"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                      !showResult && !isSelected && "border-border",
                      !showResult && isSelected && "border-primary bg-primary",
                      showCorrect && "border-green-500 bg-green-500",
                      showIncorrect && "border-red-500 bg-red-500"
                    )}>
                      {showCorrect && <Check className="w-4 h-4 text-white" />}
                      {showIncorrect && <X className="w-4 h-4 text-white" />}
                      {!showResult && isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className={cn(
                      "flex-1 font-medium",
                      showCorrect && "text-green-700 dark:text-green-400",
                      showIncorrect && "text-red-700 dark:text-red-400",
                      !showResult && "text-foreground"
                    )}>
                      {option}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Explanation */}
            <AnimatePresence>
              {showResult && question.explanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={cn(
                    "p-4 rounded-xl mb-6",
                    isCorrect ? "bg-green-500/10 border border-green-500/30" : "bg-blue-500/10 border border-blue-500/30"
                  )}
                >
                  <p className={cn(
                    "text-sm font-medium mb-1",
                    isCorrect ? "text-green-700 dark:text-green-400" : "text-blue-700 dark:text-blue-400"
                  )}>
                    {isCorrect ? '✓ Correct!' : 'ℹ️ Explanation'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {question.explanation}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Score: <span className="font-semibold text-foreground">{score}/{questions.length}</span>
              </div>
              
              {!showResult ? (
                <Button
                  onClick={handleSubmit}
                  disabled={selectedAnswer === null}
                  className="rounded-xl"
                >
                  Submit Answer
                </Button>
              ) : (
                <Button onClick={handleNext} className="rounded-xl">
                  {currentQuestion < questions.length - 1 ? (
                    <>
                      Next Question
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    'Finish Quiz'
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
