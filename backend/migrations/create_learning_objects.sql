-- Create learning objects tables for quizzes and flashcards

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    source_page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
    linked_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz attempts table (for tracking scores)
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flashcard decks table
CREATE TABLE IF NOT EXISTS flashcard_decks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    source_page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
    linked_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
    cards JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flashcard progress table (for tracking known/unknown cards)
CREATE TABLE IF NOT EXISTS flashcard_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deck_id UUID NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_index INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('known', 'unknown', 'learning')),
    last_reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    review_count INTEGER DEFAULT 0,
    UNIQUE(deck_id, user_id, card_index)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quizzes_workspace ON quizzes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_user ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_source_page ON quizzes(source_page_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_skill ON quizzes(linked_skill_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);

CREATE INDEX IF NOT EXISTS idx_flashcard_decks_workspace ON flashcard_decks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_user ON flashcard_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_source_page ON flashcard_decks(source_page_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_skill ON flashcard_decks(linked_skill_id);

CREATE INDEX IF NOT EXISTS idx_flashcard_progress_deck ON flashcard_progress(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_user ON flashcard_progress(user_id);

-- Enable RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quizzes
CREATE POLICY "Users can view their own quizzes"
    ON quizzes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quizzes"
    ON quizzes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quizzes"
    ON quizzes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quizzes"
    ON quizzes FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for quiz attempts
CREATE POLICY "Users can view their own quiz attempts"
    ON quiz_attempts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quiz attempts"
    ON quiz_attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for flashcard decks
CREATE POLICY "Users can view their own flashcard decks"
    ON flashcard_decks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flashcard decks"
    ON flashcard_decks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcard decks"
    ON flashcard_decks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcard decks"
    ON flashcard_decks FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for flashcard progress
CREATE POLICY "Users can view their own flashcard progress"
    ON flashcard_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flashcard progress"
    ON flashcard_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcard progress"
    ON flashcard_progress FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcard progress"
    ON flashcard_progress FOR DELETE
    USING (auth.uid() = user_id);
