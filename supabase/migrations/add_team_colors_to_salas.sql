-- Add team color fields to salas table for dynamic border colors
ALTER TABLE salas ADD COLUMN IF NOT EXISTS time_a_color text;
ALTER TABLE salas ADD COLUMN IF NOT EXISTS time_b_color text;

-- Default colors (fallback in case color isn't saved)
-- These will be overridden when teams enter rooms
UPDATE salas SET time_a_color = '#3b82f6' WHERE time_a_color IS NULL AND time_a_id IS NOT NULL;
UPDATE salas SET time_b_color = '#ef4444' WHERE time_b_color IS NULL AND time_b_id IS NOT NULL;
