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
CREATE POLICY "Public profiles are viewable by authenticated" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ============================================================================
-- 5. SEED DATA
-- ============================================================================
INSERT INTO subscription_plans (name, description, price_monthly, interest_limit, features, is_active)
VALUES 
  ('Free', 'Basic access', 0, 5, '["Basic Search"]', true),
  ('Gold', 'Enhanced features', 999, 50, '["AI Matchmaking", "Profile Optimizer"]', true),
  ('Diamond', 'Full experience', 1999, 100, '["AI Matchmaking", "Profile Optimizer", "Voice Intro"]', true)
ON CONFLICT DO NOTHING;
