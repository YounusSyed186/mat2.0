-- Migration: Add entitlements flags (allow_unlimited_photos, allow_social_links) to subscription_plans
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS allow_unlimited_photos BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allow_social_links BOOLEAN NOT NULL DEFAULT FALSE;

-- Set default values based on plan tiers
UPDATE subscription_plans
SET allow_unlimited_photos = TRUE, allow_social_links = TRUE
WHERE LOWER(name) IN ('gold', 'diamond', 'silver', 'pro', 'premium');

UPDATE subscription_plans
SET allow_unlimited_photos = FALSE, allow_social_links = FALSE
WHERE LOWER(name) = 'free';
