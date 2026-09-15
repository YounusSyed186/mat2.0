-- ============================================================================
-- VIVAH MATRIMONIAL APP — UNIFIED DATABASE SETUP (PRODUCTION READY)
-- ============================================================================
-- Run this in your Supabase SQL Editor to set up the entire database.
-- Includes: Rich Profiles, AI Hybrid Search, Subscriptions, and RLS Policies.
-- ============================================================================

-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  age           INTEGER NOT NULL CHECK (age >= 18 AND age <= 100),
  gender        TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  religion      TEXT NOT NULL,
  city          TEXT NOT NULL,
  education     TEXT,
  profession    TEXT,
  bio           TEXT,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'primary_admin')),
  is_blocked    BOOLEAN NOT NULL DEFAULT false,
  avatar_url    TEXT,
  
  -- Identity & Background
  languages     TEXT[] DEFAULT '{}',
  ethnicity     TEXT,
  willing_to_relocate BOOLEAN DEFAULT false,
  
  -- Personality & Lifestyle
  introvert_extrovert INTEGER, -- 1-10 scale
  hobbies       TEXT[] DEFAULT '{}',
  habits        TEXT,
  social_preferences TEXT,
  
  -- Values & Preferences
  career_ambition TEXT,
  family_goals    TEXT,
  lifestyle_choices TEXT,
  
  -- Physical Attributes
  height        INTEGER, -- in cm
  weight        INTEGER, -- in kg
  fitness_level TEXT,
  style         TEXT,
  skin_tone     TEXT,
  
  -- Intent & Goals
  search_intent   TEXT,
  
  -- Media & Expression
  prompts       JSONB DEFAULT '{}'::jsonb, -- Record<string, string>
  voice_url     TEXT,
  video_url     TEXT,

  -- AI vector embedding (text-embedding-004, 1536 dims)
  embedding     vector(1536),
  needs_embedding BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Interests
CREATE TABLE IF NOT EXISTS interests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id),
  CHECK (sender_id != receiver_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (LENGTH(TRIM(content)) > 0)
);

-- User Blocks
CREATE TABLE IF NOT EXISTS user_blocks (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason           TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (reporter_id != reported_user_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('interest_received', 'interest_accepted', 'message')),
  reference_id UUID,
  is_read      BOOLEAN NOT NULL DEFAULT false,
  metadata     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  description      TEXT,
  price_monthly    NUMERIC NOT NULL DEFAULT 0,
  price_quarterly  NUMERIC NOT NULL DEFAULT 0,
  price_yearly     NUMERIC NOT NULL DEFAULT 0,
  interest_limit   INTEGER NOT NULL DEFAULT 0,
  features         JSONB DEFAULT '[]'::jsonb,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id       UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  start_date    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date      TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_gender       ON profiles(gender);
CREATE INDEX IF NOT EXISTS idx_profiles_religion     ON profiles(religion);
CREATE INDEX IF NOT EXISTS idx_profiles_city         ON profiles(city);
CREATE INDEX IF NOT EXISTS profiles_embedding_idx    ON profiles USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS profiles_needs_embedding_idx ON profiles (needs_embedding) WHERE needs_embedding = true;
CREATE INDEX IF NOT EXISTS idx_interests_sender      ON interests(sender_id);
CREATE INDEX IF NOT EXISTS idx_interests_receiver    ON interests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation  ON messages(sender_id, receiver_id);

-- ============================================================================
-- 3. FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interests_updated_at BEFORE UPDATE ON interests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Flag profiles that need a fresh embedding
CREATE OR REPLACE FUNCTION flag_profile_needs_embedding()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.needs_embedding := true;
    RETURN NEW;
  END IF;
  IF (
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.age IS DISTINCT FROM NEW.age OR
    OLD.profession IS DISTINCT FROM NEW.profession OR
    OLD.bio IS DISTINCT FROM NEW.bio OR
    OLD.religion IS DISTINCT FROM NEW.religion OR
    OLD.hobbies IS DISTINCT FROM NEW.hobbies OR
    OLD.prompts IS DISTINCT FROM NEW.prompts OR
    OLD.weight IS DISTINCT FROM NEW.weight OR
    OLD.height IS DISTINCT FROM NEW.height OR
    OLD.search_intent IS DISTINCT FROM NEW.search_intent
  ) THEN
    NEW.needs_embedding := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_flag_profile_needs_embedding BEFORE INSERT OR UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION flag_profile_needs_embedding();

-- Hybrid Match RPC
CREATE OR REPLACE FUNCTION match_profiles(
  query_embedding vector(1536),
  match_limit     int  DEFAULT 10,
  match_offset    int  DEFAULT 0,
  filter_age_min  int  DEFAULT 18,
  filter_age_max  int  DEFAULT 100,
  filter_gender   text DEFAULT NULL,
  filter_religion text DEFAULT NULL,
  exclude_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id         uuid,
  name       text,
  age        int,
  gender     text,
  city       text,
  profession text,
  religion   text,
  bio        text,
  avatar_url text,
  similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.name, p.age, p.gender, p.city, p.profession, p.religion, p.bio, p.avatar_url,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM profiles p
  WHERE
    p.embedding IS NOT NULL
    AND p.age        >= filter_age_min
    AND p.age        <= filter_age_max
    AND (filter_gender   IS NULL OR p.gender = filter_gender)
    AND (filter_religion IS NULL OR p.religion ILIKE '%' || filter_religion || '%')
    AND (exclude_user_id IS NULL OR p.id    != exclude_user_id)
    AND p.is_blocked = false
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_limit
  OFFSET match_offset;
END;
$$;

-- ============================================================================
-- 4. RLS POLICIES (BASIC)
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated" ON profiles;
CREATE POLICY "Public profiles are viewable by authenticated" ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Storage bucket setup for profile photos
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'profile-photos');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- 5. SEED DATA
-- ============================================================================
INSERT INTO subscription_plans (name, description, price_monthly, interest_limit, features, is_active)
VALUES 
  ('Free', 'Basic access', 0, 5, '["Basic Search"]', true),
  ('Gold', 'Enhanced features', 999, 50, '["AI Matchmaking", "Profile Optimizer"]', true),
  ('Diamond', 'Full experience', 1999, 100, '["AI Matchmaking", "Profile Optimizer", "Voice Intro"]', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. FEATURE MIGRATION: LIMITS, RECOVERABLE MESSAGE ENCRYPTION, REPORT EVIDENCE
-- ============================================================================

ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS profile_view_limit_monthly INTEGER NOT NULL DEFAULT 20;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS ai_token_limit_monthly INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS message_limit_monthly INTEGER;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS ciphertext TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS iv TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS key_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS encryption_scheme TEXT NOT NULL DEFAULT 'plaintext_legacy';
ALTER TABLE messages ALTER COLUMN content DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_content_or_ciphertext_check') THEN
    ALTER TABLE messages
      ADD CONSTRAINT messages_content_or_ciphertext_check
      CHECK (
        (content IS NOT NULL AND LENGTH(TRIM(content)) > 0)
        OR (ciphertext IS NOT NULL AND iv IS NOT NULL)
      );
  END IF;
END $$;

ALTER TABLE reports ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reports_status_check') THEN
    ALTER TABLE reports
      ADD CONSTRAINT reports_status_check
      CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS profile_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month_bucket DATE NOT NULL DEFAULT DATE_TRUNC('month', NOW())::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(viewer_id, viewed_user_id, month_bucket),
  CHECK (viewer_id != viewed_user_id)
);

CREATE TABLE IF NOT EXISTS ai_usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  estimated_tokens INTEGER NOT NULL CHECK (estimated_tokens > 0),
  month_bucket DATE NOT NULL DEFAULT DATE_TRUNC('month', NOW())::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_decryption_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  legal_reference TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'denied', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS report_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  message_created_at TIMESTAMPTZ,
  content_snapshot TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_month ON profile_views(viewer_id, month_bucket);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_month ON ai_usage_events(user_id, month_bucket);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_report_evidence_report ON report_evidence(report_id);

CREATE OR REPLACE FUNCTION is_admin_user(user_id uuid DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role IN ('admin', 'primary_admin')
  );
$$;

CREATE OR REPLACE FUNCTION current_subscription_plan(user_id uuid)
RETURNS TABLE (
  plan_id uuid,
  plan_name text,
  profile_view_limit_monthly int,
  ai_token_limit_monthly int,
  message_limit_monthly int
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.id, sp.name, sp.profile_view_limit_monthly, sp.ai_token_limit_monthly, sp.message_limit_monthly
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = $1
    AND us.status = 'active'
    AND us.end_date >= NOW()
  ORDER BY us.created_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION record_ai_usage(feature_name text, estimated_tokens int)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester uuid := auth.uid();
  requester_role text;
  month_start date := DATE_TRUNC('month', NOW())::date;
  monthly_limit int := 0;
  used_tokens int := 0;
  requested_tokens int := GREATEST(record_ai_usage.estimated_tokens, 1);
  requested_feature_name text := record_ai_usage.feature_name;
BEGIN
  IF requester IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  END IF;

  SELECT role INTO requester_role FROM profiles WHERE id = requester;
  IF requester_role IN ('admin', 'primary_admin') THEN
    INSERT INTO ai_usage_events (user_id, feature_name, estimated_tokens, month_bucket)
    VALUES (requester, requested_feature_name, requested_tokens, month_start);
    RETURN jsonb_build_object('allowed', true, 'reason', 'admin_bypass', 'remaining', NULL, 'limit', NULL);
  END IF;

  SELECT COALESCE(csp.ai_token_limit_monthly, 0)
  INTO monthly_limit
  FROM current_subscription_plan(requester) csp
  LIMIT 1;

  SELECT COALESCE(SUM(aue.estimated_tokens), 0)
  INTO used_tokens
  FROM ai_usage_events aue
  WHERE aue.user_id = requester AND aue.month_bucket = month_start;

  IF monthly_limit <= 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'ai_not_in_plan', 'used', used_tokens, 'requested', requested_tokens, 'remaining', 0, 'limit', monthly_limit);
  END IF;

  IF used_tokens + requested_tokens > monthly_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'ai_token_limit_exceeded', 'used', used_tokens, 'requested', requested_tokens, 'remaining', GREATEST(monthly_limit - used_tokens, 0), 'limit', monthly_limit);
  END IF;

  INSERT INTO ai_usage_events (user_id, feature_name, estimated_tokens, month_bucket)
  VALUES (requester, requested_feature_name, requested_tokens, month_start);

  RETURN jsonb_build_object('allowed', true, 'used', used_tokens + requested_tokens, 'requested', requested_tokens, 'remaining', GREATEST(monthly_limit - used_tokens - requested_tokens, 0), 'limit', monthly_limit);
END;
$$;

GRANT EXECUTE ON FUNCTION record_ai_usage(text, int) TO authenticated;

CREATE OR REPLACE FUNCTION record_profile_view(viewed_user_id uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer uuid := auth.uid();
  viewer_role text;
  month_start date := DATE_TRUNC('month', NOW())::date;
  monthly_limit int := 20;
  used_count int := 0;
  already_viewed boolean := false;
  has_block boolean := false;
BEGIN
  IF viewer IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  END IF;

  IF viewer = record_profile_view.viewed_user_id THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'self_view', 'remaining', NULL, 'limit', NULL);
  END IF;

  SELECT role INTO viewer_role FROM profiles WHERE id = viewer;
  IF viewer_role IN ('admin', 'primary_admin') THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'admin_bypass', 'remaining', NULL, 'limit', NULL);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = viewer AND blocked_id = record_profile_view.viewed_user_id)
       OR (blocker_id = record_profile_view.viewed_user_id AND blocked_id = viewer)
  ) INTO has_block;

  IF has_block THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'blocked');
  END IF;

  SELECT COALESCE(csp.profile_view_limit_monthly, 20)
  INTO monthly_limit
  FROM current_subscription_plan(viewer) csp
  LIMIT 1;

  IF monthly_limit IS NULL OR monthly_limit < 0 THEN
    INSERT INTO profile_views (viewer_id, viewed_user_id, month_bucket)
    VALUES (viewer, record_profile_view.viewed_user_id, month_start)
    ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('allowed', true, 'remaining', NULL, 'limit', monthly_limit);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM profile_views
    WHERE viewer_id = viewer
      AND profile_views.viewed_user_id = record_profile_view.viewed_user_id
      AND month_bucket = month_start
  ) INTO already_viewed;

  SELECT COUNT(*) INTO used_count
  FROM profile_views
  WHERE viewer_id = viewer AND month_bucket = month_start;

  IF already_viewed THEN
    RETURN jsonb_build_object('allowed', true, 'already_viewed', true, 'remaining', GREATEST(monthly_limit - used_count, 0), 'limit', monthly_limit);
  END IF;

  IF used_count >= monthly_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'profile_view_limit_exceeded', 'remaining', 0, 'limit', monthly_limit);
  END IF;

  INSERT INTO profile_views (viewer_id, viewed_user_id, month_bucket)
  VALUES (viewer, record_profile_view.viewed_user_id, month_start)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('allowed', true, 'already_viewed', false, 'remaining', GREATEST(monthly_limit - used_count - 1, 0), 'limit', monthly_limit);
END;
$$;

GRANT EXECUTE ON FUNCTION record_profile_view(uuid) TO authenticated;

ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_decryption_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create reports" ON reports;
CREATE POLICY "Users can create reports" ON reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Users and admins can view reports" ON reports;
CREATE POLICY "Users and admins can view reports" ON reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR is_admin_user());

DROP POLICY IF EXISTS "Admins can update reports" ON reports;
CREATE POLICY "Admins can update reports" ON reports FOR UPDATE TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "Users can view own profile view usage" ON profile_views;
CREATE POLICY "Users can view own profile view usage" ON profile_views FOR SELECT TO authenticated USING (viewer_id = auth.uid() OR is_admin_user());

DROP POLICY IF EXISTS "Users can view own AI usage" ON ai_usage_events;
CREATE POLICY "Users can view own AI usage" ON ai_usage_events FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin_user());

DROP POLICY IF EXISTS "Admins can view decryption audit" ON message_decryption_audit;
CREATE POLICY "Admins can view decryption audit" ON message_decryption_audit FOR SELECT TO authenticated USING (is_admin_user());

DROP POLICY IF EXISTS "Report evidence visible to reporter and admins" ON report_evidence;
CREATE POLICY "Report evidence visible to reporter and admins" ON report_evidence
  FOR SELECT TO authenticated
  USING (
    is_admin_user()
    OR EXISTS (
      SELECT 1 FROM reports
      WHERE reports.id = report_evidence.report_id
        AND reports.reporter_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create report evidence for own reports" ON report_evidence;
CREATE POLICY "Users can create report evidence for own reports" ON report_evidence
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reports
      WHERE reports.id = report_evidence.report_id
        AND reports.reporter_id = auth.uid()
    )
  );

-- Subscription plan policies
-- Required when RLS is enabled on subscription_plans. Without these, admin updates
-- can silently affect zero visible rows from the browser client.
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active subscription plans" ON subscription_plans;
CREATE POLICY "Users can view active subscription plans" ON subscription_plans
  FOR SELECT TO authenticated
  USING (is_active = true OR is_admin_user());

DROP POLICY IF EXISTS "Admins can manage subscription plans" ON subscription_plans;
CREATE POLICY "Admins can manage subscription plans" ON subscription_plans
  FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

UPDATE subscription_plans SET profile_view_limit_monthly = 20, ai_token_limit_monthly = 0 WHERE name = 'Free';
UPDATE subscription_plans SET profile_view_limit_monthly = 100, ai_token_limit_monthly = 50000 WHERE name = 'Gold';
UPDATE subscription_plans SET profile_view_limit_monthly = -1, ai_token_limit_monthly = 200000 WHERE name = 'Diamond';
