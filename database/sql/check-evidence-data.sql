-- Diagnostic query to check evidence data format
-- Run this first to see what's in your skills table

-- Check skills with evidence
SELECT 
    id,
    name,
    evidence,
    pg_typeof(evidence) as evidence_type,
    array_length(evidence, 1) as evidence_count
FROM skills
WHERE evidence IS NOT NULL
ORDER BY name;

-- Check if evidence contains valid UUIDs
SELECT 
    s.id as skill_id,
    s.name as skill_name,
    evidence_item,
    CASE 
        WHEN evidence_item ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN 'Valid UUID'
        ELSE 'Invalid - Not a UUID'
    END as validation_status
FROM skills s,
     unnest(s.evidence) as evidence_item
WHERE s.evidence IS NOT NULL 
  AND array_length(s.evidence, 1) > 0
ORDER BY s.name;

-- Check if those page IDs actually exist
SELECT 
    s.name as skill_name,
    evidence_item as page_id,
    p.title as page_title,
    CASE 
        WHEN p.id IS NOT NULL THEN 'Page exists'
        ELSE 'Page NOT found'
    END as page_status
FROM skills s,
     unnest(s.evidence) as evidence_item
LEFT JOIN pages p ON evidence_item::uuid = p.id
WHERE s.evidence IS NOT NULL 
  AND array_length(s.evidence, 1) > 0
  AND evidence_item ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
ORDER BY s.name;

-- Check current graph_edges table
SELECT 
    COUNT(*) as total_edges,
    COUNT(CASE WHEN edge_type = 'evidence' THEN 1 END) as evidence_edges,
    COUNT(CASE WHEN edge_type = 'linked' THEN 1 END) as linked_edges
FROM graph_edges;
