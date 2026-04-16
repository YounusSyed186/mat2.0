-- ============================================================================
-- MATRIMONIAL APP - SUPABASE DATABASE SCHEMA
-- ============================================================================
-- Run this SQL in your Supabase SQL Editor to set up all required tables
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 18 AND age <= 100),
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  religion TEXT NOT NULL,
  city TEXT NOT NULL,
  education TEXT,
  profession TEXT,
  bio TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INTERESTS TABLE (Match Requests)
-- ============================================================================
CREATE TABLE IF NOT EXISTS interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate interests
  UNIQUE(sender_id, receiver_id),
  
  -- Prevent self-interests
  CHECK (sender_id != receiver_id)
);

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent empty messages
  CHECK (LENGTH(TRIM(content)) > 0)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON profiles(is_blocked);
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON profiles(gender);
CREATE INDEX IF NOT EXISTS idx_profiles_religion ON profiles(religion);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_age ON profiles(age);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interests_sender ON interests(sender_id);
CREATE INDEX IF NOT EXISTS idx_interests_receiver ON interests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_interests_status ON interests(status);
CREATE INDEX IF NOT EXISTS idx_interests_created_at ON interests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Anyone can view non-blocked profiles
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_blocked = false);

-- Users can view their own profile even if blocked
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile (except role and is_blocked)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Prevent users from changing their own role or block status
    (SELECT role FROM profiles WHERE id = auth.uid()) = role AND
    (SELECT is_blocked FROM profiles WHERE id = auth.uid()) = is_blocked
  );

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- INTERESTS POLICIES
-- ============================================================================

-- Users can view interests where they are sender or receiver
CREATE POLICY "Users can view own interests"
  ON interests FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid() OR 
    receiver_id = auth.uid()
  );

-- Users can send interests to non-blocked users
CREATE POLICY "Users can send interests"
  ON interests FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    sender_id != receiver_id AND
    NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = receiver_id AND is_blocked = true
    )
  );

-- Only receivers can update interest status
CREATE POLICY "Receivers can update interest status"
  ON interests FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Users can delete their sent interests
CREATE POLICY "Users can delete sent interests"
  ON interests FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================

-- Users can view messages they sent or received
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid() OR 
    receiver_id = auth.uid()
  );

-- Users can send messages only if they have an accepted interest
CREATE POLICY "Users can send messages with accepted interest"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    sender_id != receiver_id AND
    EXISTS (
      SELECT 1 FROM interests
      WHERE 
        ((sender_id = auth.uid() AND receiver_id = messages.receiver_id) OR
         (sender_id = messages.receiver_id AND receiver_id = auth.uid()))
        AND status = 'accepted'
    )
  );

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());

-- ============================================================================
-- FUNCTIONS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply to interests
DROP TRIGGER IF EXISTS update_interests_updated_at ON interests;
CREATE TRIGGER update_interests_updated_at
  BEFORE UPDATE ON interests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STORAGE BUCKET FOR PROFILE PHOTOS
-- ============================================================================
-- Run this in Supabase Dashboard > Storage:
-- 1. Create a new bucket named "profile-photos"
-- 2. Make it PUBLIC
-- 3. Add these policies in Storage > Policies:

-- RLS Policy for Storage (Run in SQL Editor):
-- Users can upload their own photos
INSERT INTO storage.policies (name, bucket_id, definition)
VALUES (
  'Users can upload own profile photos',
  'profile-photos',
  '(bucket_id = ''profile-photos'' AND auth.uid()::text = (storage.foldername(name))[1])'
);

-- Anyone can view photos
INSERT INTO storage.policies (name, bucket_id, definition)
VALUES (
  'Profile photos are publicly viewable',
  'profile-photos',
  'bucket_id = ''profile-photos'''
);

-- ============================================================================
-- SEED DATA (OPTIONAL)
-- ============================================================================
-- Uncomment below to add a test admin user after signup

-- UPDATE profiles
-- SET role = 'admin'
-- WHERE id = 'YOUR_USER_ID_HERE';

-- ============================================================================
-- SCHEMA SETUP COMPLETE!
-- ============================================================================
-- Next steps:
-- 1. Create storage bucket "profile-photos" in Supabase Dashboard
-- 2. Test authentication flow
-- 3. Create a user and complete profile
-- ============================================================================
