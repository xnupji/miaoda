-- Add manual_filled_count column to task_orders table
ALTER TABLE task_orders ADD COLUMN IF NOT EXISTS manual_filled_count INTEGER DEFAULT 0;
