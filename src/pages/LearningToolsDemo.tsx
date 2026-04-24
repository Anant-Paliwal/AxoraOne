import { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, BookOpen, GitBranch, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FlashcardDeck } from '@/components/learning/FlashcardDeck';
import { QuizCard } from '@/components/learning/QuizCard';
import { MindMap } from '@/components/learning/MindMap';
import { toast } from 'sonner';

// Sample data
const sampleFlashcards = [
  {
    front: 'What is React?',
    back: 'A JavaScript library for building user interfaces, maintained by Meta and a community of developers.',
    category: 'React Basics',
  },
  {
    front: 'What are React Hooks?',
    back: 'Functions that let you use state and other React features in functional components. Examples: useState, useEffect, useContext.',
    category: 'React Hooks',
  },
  {
    front: 'What is JSX?',
    back: 'JavaScript XML - a syntax extension that allows you to write HTML-like code in JavaScript files.',
    category: 'React Basics',
  },
  {
    front: 'What is the Virtual DOM?',
    back: 'A lightweight copy of the actual DOM that React uses to optimize updates and improve performance.',
    category: 'React Concepts',
  },
  {
    front: 'What is useState?',
    back: 'A Hook that lets you add state to functional components. Returns an array with the current state and a function to update it.',
    category: 'React Hooks',
  },
];

const sampleQuiz = [
  {
    question: 'Which Hook is used to perform side effects in React?',
    options: ['useState', 'useEffect', 'useContext', 'useReducer'],
    correctAnswer: 1,
    explanation: 'useEffect is used to perform side effects like data fetching, subscriptions, or manually changing the DOM.',
  },
  {
    question: 'What does JSX stand for?',
    options: ['JavaScript XML', 'Java Syntax Extension', 'JavaScript Extension', 'JSON XML'],
    correctAnswer: 0,
    explanation: 'JSX stands for JavaScript XML. It allows us to write HTML-like syntax in JavaScript.',
  },
  {
    question: 'Which method is used to update state in a class component?',
    options: ['updateState()', 'setState()', 'changeState()', 'modifyState()'],
    correctAnswer: 1,
    explanation: 'setState() is the method used to update state in React class components.',
  },
  {
    question: 'What is the purpose of keys in React lists?',
    options: [
      'To style list items',
      'To help React identify which items have changed',
      'To sort the list',
      'To add animations',
    ],
    correctAnswer: 1,
    explanation: 'Keys help React identify which items have changed, are added, or are removed, improving performance.',
  },
  {
    question: 'Which Hook would you use to access context in a functional component?',
    options: ['useState', 'useEffect', 'useContext', 'useRef'],
    correctAnswer: 2,
    explanation: 'useContext is the Hook used to access context values in functional components.',
  },
];

const sampleMindMap = {
  id: 'react',
  label: 'React',
  type: 'central' as const,
  children: [
    {
      id: 'components',
      label: 'Components',
      type: 'main' as const,
      children: [
        { id: 'functional', label: 'Functional', type: 'sub' as const },
        { id: 'class', label: 'Class', type: 'sub' as const },
        { id: 'props', label: 'Props', type: 'sub' as const },
      ],
    },
    {
      id: 'hooks',
      label: 'Hooks',
      type: 'main' as const,
      children: [
        { id: 'useState', label: 'useState', type: 'sub' as const },
        { id: 'useEffect', label: 'useEffect', type: 'sub' as const },
        { id: 'useContext', label: 'useContext', type: 'sub' as const },
        { id: 'useRef', label: 'useRef', type: 'sub' as const },
      ],
    },
    {
      id: 'concepts',
      label: 'Core Concepts',
      type: 'main' as const,
      children: [
        { id: 'jsx', label: 'JSX', type: 'sub' as const },
        { id: 'virtualdom', label: 'Virtual DOM', type: 'sub' as const },
        { id: 'lifecycle', label: 'Lifecycle', type: 'sub' as const },
      ],
    },
    {
      id: 'advanced',
      label: 'Advanced',
      type: 'main' as const,
      children: [
        { id: 'context', label: 'Context API', type: 'sub' as const },
        { id: 'portals', label: 'Portals', type: 'sub' as const },
        { id: 'suspense', label: 'Suspense', type: 'sub' as const },
      ],
    },
  ],
};

export function LearningToolsDemo() {
  const [activeTab, setActiveTab] = useState('flashcards');

  const handleFlashcardsComplete = () => {
    toast.success('🎉 Flashcard deck completed!');
  };

  const handleQuizComplete = (score: number) => {
    toast.success(`Quiz completed! Score: ${score}/${sampleQuiz.length}`);
  };

  const handleNodeClick = (nodeId: string) => {
    toast.info(`Clicked node: ${nodeId}`);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <Sparkles className="w-10 h-10 text-primary" />
              <div className="absolute inset-0 blur-xl bg-primary/30 rounded-full" />
            </div>
            <h1 className="text-4xl font-display font-bold text-foreground">
              Interactive Learning Tools
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Engage with your content through flashcards, quizzes, and mind maps
          </p>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="flashcards" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Flashcards
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Quiz
            </TabsTrigger>
            <TabsTrigger value="mindmap" className="flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Mind Map
            </TabsTrigger>
          </TabsList>

          <TabsContent value="flashcards">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <FlashcardDeck
                title="React Fundamentals"
                cards={sampleFlashcards}
                onComplete={handleFlashcardsComplete}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="quiz">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <QuizCard
                title="React Knowledge Check"
                questions={sampleQuiz}
                onComplete={handleQuizComplete}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="mindmap">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <MindMap
                title="React Ecosystem"
                data={sampleMindMap}
                onNodeClick={handleNodeClick}
              />
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8"
        >
          <div className="bg-card border border-border rounded-xl p-4">
            <BookOpen className="w-8 h-8 text-primary mb-2" />
            <h3 className="font-semibold text-foreground mb-1">Flashcards</h3>
            <p className="text-sm text-muted-foreground">
              Flip cards to test your memory. Mark cards as known or review later.
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <Brain className="w-8 h-8 text-primary mb-2" />
            <h3 className="font-semibold text-foreground mb-1">Quizzes</h3>
            <p className="text-sm text-muted-foreground">
              Test your knowledge with multiple choice questions and instant feedback.
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <GitBranch className="w-8 h-8 text-primary mb-2" />
            <h3 className="font-semibold text-foreground mb-1">Mind Maps</h3>
            <p className="text-sm text-muted-foreground">
              Visualize connections between concepts in an interactive diagram.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
