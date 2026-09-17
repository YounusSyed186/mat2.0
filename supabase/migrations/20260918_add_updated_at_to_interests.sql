-- Migration: Ensure updated_at column exists on interests table
ALTER TABLE interests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
