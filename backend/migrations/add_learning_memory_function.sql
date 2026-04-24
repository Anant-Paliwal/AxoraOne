-- =====================================================
-- LEARNING MEMORY UPDATE FUNCTION
-- =====================================================
-- This function updates learning memory after quiz/flashcard interactions

CREATE OR REPLACE FUNCTION update_learning_memory(
    p_user_id UUID,
    p_workspace_id UUID,
    p_skill_id UUID,
    p_topic TEXT,
    p_is_correct BOOLEAN,
    p_study_time INTEGER DEFAULT 0
)
RETURNS void AS $$
DECLARE
    v_memory_id UUID;
    v_correct_count INTEGER;
    v_error_count INTEGER;
    v_weak_areas JSONB;
    v_topic_found BOOLEAN := FALSE;
    v_updated_weak_areas JSONB;
BEGIN
    -- Get or create memory record
    SELECT id, correct_count, error_count, weak_areas
    INTO v_memory_id, v_correct_count, v_error_count, v_weak_areas
    FROM user_learning_memory
    WHERE user_id = p_user_id
      AND workspace_id = p_workspace_id
      AND skill_id = p_skill_id
      AND topic = p_topic;
    
    -- If not found, create new record
    IF v_memory_id IS NULL THEN
        INSERT INTO user_learning_memory (
            user_id,
            workspace_id,
            skill_id,
            topic,
            correct_count,
            error_count,
            total_study_time,
            weak_areas,
            last_reviewed
        ) VALUES (
            p_user_id,
            p_workspace_id,
            p_skill_id,
            p_topic,
            CASE WHEN p_is_correct THEN 1 ELSE 0 END,
            CASE WHEN p_is_correct THEN 0 ELSE 1 END,
            p_study_time,
            CASE WHEN p_is_correct THEN '[]'::jsonb 
                 ELSE jsonb_build_array(jsonb_build_object('topic', p_topic, 'error_count', 1))
            END,
            NOW()
        );
    ELSE
        -- Update existing record
        -- Handle weak areas update
        IF p_is_correct THEN
            -- If correct, keep weak areas as is
            v_updated_weak_areas := v_weak_areas;
        ELSE
            -- If incorrect, update or add to weak areas
            v_updated_weak_areas := '[]'::jsonb;
            v_topic_found := FALSE;
            
            -- Check if topic exists in weak areas
            IF v_weak_areas IS NOT NULL AND jsonb_array_length(v_weak_areas) > 0 THEN
                FOR i IN 0..jsonb_array_length(v_weak_areas) - 1 LOOP
                    IF (v_weak_areas->i->>'topic') = p_topic THEN
                        -- Update error count for existing topic
                        v_updated_weak_areas := v_updated_weak_areas || jsonb_build_object(
                            'topic', p_topic,
                            'error_count', COALESCE((v_weak_areas->i->>'error_count')::int, 0) + 1
                        );
                        v_topic_found := TRUE;
                    ELSE
                        -- Keep other topics
                        v_updated_weak_areas := v_updated_weak_areas || (v_weak_areas->i);
                    END IF;
                END LOOP;
            END IF;
            
            -- If topic not found, add it
            IF NOT v_topic_found THEN
                v_updated_weak_areas := v_updated_weak_areas || jsonb_build_object(
                    'topic', p_topic,
                    'error_count', 1
                );
            END IF;
        END IF;
        
        UPDATE user_learning_memory
        SET 
            correct_count = correct_count + CASE WHEN p_is_correct THEN 1 ELSE 0 END,
            error_count = error_count + CASE WHEN p_is_correct THEN 0 ELSE 1 END,
            total_study_time = total_study_time + p_study_time,
            last_reviewed = NOW(),
            weak_areas = v_updated_weak_areas
        WHERE id = v_memory_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_learning_memory TO authenticated;
