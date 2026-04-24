-- Notion-Style Database System
-- Comprehensive database pages with multiple views, relations, formulas, and rollups

-- ============================================
-- 1. DATABASE PAGES
-- ============================================

-- Add database-specific fields to pages table
ALTER TABLE pages ADD COLUMN IF NOT EXISTS page_type VARCHAR(50) DEFAULT 'document';
ALTER TABLE pages ADD COLUMN IF NOT EXISTS database_config JSONB DEFAULT '{}'::jsonb;

-- Page types: 'document', 'database', 'board', 'calendar', 'gallery', 'timeline', 'list'

COMMENT ON COLUMN pages.page_type IS 'Type of page: document, database, board, calendar, gallery, timeline, list';
COMMENT ON COLUMN pages.database_config IS 'Configuration for database pages including schema a