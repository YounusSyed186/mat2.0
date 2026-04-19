-- ============================================================================
-- UNIFIED MATRIMONIAL APP FULL SETUP SCRIPT
-- ============================================================================

-- === FILE: supabase-schema.sql ===
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


-- === FILE: supabase-migration-v2.sql ===
-- ============================================================================
-- MATRIMONIAL APP V2 - MIGRATION SCRIPT
-- ============================================================================
-- Run this SQL in your Supabase SQL Editor to add new tables
-- ============================================================================

-- ============================================================================
-- USER BLOCKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate blocks
  UNIQUE(blocker_id, blocked_id),
  -- Prevent self-blocks
  CHECK (blocker_id != blocked_id)
);

-- ============================================================================
-- REPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent self-reports
  CHECK (reporter_id != reported_user_id)
);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('interest_received', 'interest_accepted', 'message')),
  reference_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_pair ON user_blocks(blocker_id, blocked_id);

CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER BLOCKS POLICIES
-- ============================================================================

-- Users can view their own blocks (both directions)
CREATE POLICY "Users can view own blocks"
  ON user_blocks FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

-- Admins can view all blocks
CREATE POLICY "Admins can view all blocks"
  ON user_blocks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can block others
CREATE POLICY "Users can create blocks"
  ON user_blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid() AND blocker_id != blocked_id);

-- Users can unblock
CREATE POLICY "Users can delete own blocks"
  ON user_blocks FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());

-- Admins can remove any blocks
CREATE POLICY "Admins can delete any blocks"
  ON user_blocks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- REPORTS POLICIES
-- ============================================================================

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can create reports
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND reporter_id != reported_user_id);

-- Admins can delete reports
CREATE POLICY "Admins can delete reports"
  ON reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Authenticated users can create notifications (for others)
CREATE POLICY "Users can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can manage all notifications
CREATE POLICY "Admins can manage notifications"
  ON notifications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- DONE! Tables created with proper RLS policies.
-- ============================================================================


-- === FILE: supabase-subscription-migration.sql ===
-- ============================================================================
-- MATRIMONIAL APP - SUBSCRIPTION SYSTEM SCHEMA MIGRATION
-- ============================================================================

-- ============================================================================
-- SUBSCRIPTION PLANS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  price_quarterly NUMERIC NOT NULL DEFAULT 0,
  price_yearly NUMERIC NOT NULL DEFAULT 0,
  interest_limit INTEGER NOT NULL DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- USER SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_dates ON user_subscriptions(start_date, end_date);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Subscription Plans Policies
-- Anyone can view active plans
CREATE POLICY "Public plans are viewable by authenticated users"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can view all plans and modify them
CREATE POLICY "Admins can view all plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert plans"
  ON subscription_plans FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update plans"
  ON subscription_plans FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete plans"
  ON subscription_plans FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- User Subscriptions Policies
-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Users can insert their own subscriptions (Note: In a real app, this should be done via a secure backend after payment verification)
CREATE POLICY "Users can insert own subscriptions"
  ON user_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can manage all subscriptions
CREATE POLICY "Admins can update any subscription"
  ON user_subscriptions FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete any subscription"
  ON user_subscriptions FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================================
-- AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ENFORCE INTEREST LIMIT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION check_interest_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_limit INTEGER;
  v_sent_count INTEGER;
  v_sub_start TIMESTAMPTZ;
  v_months_passed INTEGER;
  v_current_period_start TIMESTAMPTZ;
  v_sub RECORD;
BEGIN
  -- 1. Find user's active subscription and its limit
  v_limit := NULL;
  FOR v_sub IN 
    SELECT sp.interest_limit, us.start_date, us.end_date 
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = NEW.sender_id 
      AND us.status = 'active' 
      AND NOW() BETWEEN us.start_date AND us.end_date
    ORDER BY us.created_at DESC
    LIMIT 1
  LOOP
    v_limit := v_sub.interest_limit;
    v_sub_start := v_sub.start_date;
  END LOOP;

  -- 2. If no active subscription, default to a free limit of 5 per month.
  IF v_limit IS NULL THEN
    v_limit := 5; -- Free tier limit
    v_sub_start := date_trunc('month', NOW());
  END IF;

  -- 3. Calculate the start of the current monthly period based on subscription start date
  v_months_passed := (EXTRACT(year FROM age(NOW(), v_sub_start)) * 12 + EXTRACT(month FROM age(NOW(), v_sub_start)))::INTEGER;
  v_current_period_start := v_sub_start + (v_months_passed || ' months')::interval;

  -- 4. Count interests sent in the current monthly period
  v_sent_count := (
    SELECT COUNT(*)
    FROM interests
    WHERE sender_id = NEW.sender_id
      AND created_at >= v_current_period_start
      AND created_at <= NOW()
  );

  -- 5. Enforce limit
  IF v_sent_count >= v_limit THEN
    RAISE EXCEPTION 'Subscription interest limit reached. You can only send % interests per month.', v_limit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_interest_limit_trigger ON interests;
CREATE TRIGGER enforce_interest_limit_trigger
  BEFORE INSERT ON interests
  FOR EACH ROW
  EXECUTE FUNCTION check_interest_limit();

-- ============================================================================
-- SEED DATA FOR SUBSCRIPTION PLANS
-- ============================================================================

INSERT INTO subscription_plans (name, description, price_monthly, price_quarterly, price_yearly, interest_limit, features)
VALUES 
  ('Silver', 'Perfect for getting started and exploring matches.', 9.99, 24.99, 89.99, 50, '["50 interests per month", "Basic profile visibility", "Standard support"]'::jsonb),
  ('Gold', 'Our most popular plan with great value and features.', 19.99, 49.99, 179.99, 150, '["150 interests per month", "Priority profile visibility", "See who liked you", "Priority support"]'::jsonb),
  ('Diamond', 'The ultimate experience with unlimited access.', 39.99, 99.99, 349.99, 1000, '["1000 interests per month", "Top profile visibility", "See who liked you", "Advanced filters", "Dedicated matchmaker assistance"]'::jsonb);


-- === FILE: supabase-seed-users.sql ===
-- ============================================================================
-- MATRIMONIAL APP - SEED 100 DUMMY USERS
-- ============================================================================
-- Run this script in your Supabase SQL Editor to generate 100 random users
-- with complete profiles. All users will have the password: "password123"

DO $$
DECLARE
  new_user_id uuid;
  male_names text[] := ARRAY['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Rahul', 'Rohan', 'Vikram', 'Karan', 'Siddharth', 'Amit', 'Nikhil', 'Dev'];
  female_names text[] := ARRAY['Riya', 'Aanya', 'Diya', 'Ananya', 'Saanvi', 'Priya', 'Neha', 'Kavya', 'Pooja', 'Sneha', 'Shruti', 'Meera', 'Tara', 'Aditi'];
  last_names text[] := ARRAY['Sharma', 'Patel', 'Singh', 'Kumar', 'Reddy', 'Gupta', 'Verma', 'Jain', 'Rao', 'Iyer', 'Desai', 'Joshi', 'Chauhan', 'Shah'];
  cities text[] := ARRAY['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];
  professions text[] := ARRAY['Software Engineer', 'Doctor', 'Teacher', 'Business Analyst', 'Architect', 'Lawyer', 'Entrepreneur', 'Designer', 'Manager', 'Accountant'];
  religions text[] := ARRAY['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Other'];
  educations text[] := ARRAY['B.Tech', 'M.Tech', 'MBBS', 'MBA', 'B.Sc', 'M.Sc', 'PhD', 'B.Com', 'M.Com', 'B.A.'];
  genders text[] := ARRAY['male', 'female'];
  selected_gender text;
  random_name text;
  random_email text;
BEGIN
  -- Generate 100 users
  FOR i IN 1..100 LOOP
    new_user_id := gen_random_uuid();
    selected_gender := genders[floor(random() * 2 + 1)];
    
    IF selected_gender = 'male' THEN
      random_name := male_names[floor(random() * array_length(male_names, 1) + 1)] || ' ' || last_names[floor(random() * array_length(last_names, 1) + 1)];
    ELSE
      random_name := female_names[floor(random() * array_length(female_names, 1) + 1)] || ' ' || last_names[floor(random() * array_length(last_names, 1) + 1)];
    END IF;

    random_email := 'dummy_user_' || i || '_' || floor(random() * 100000) || '@example.com';
    
    -- Insert into Supabase Auth table (auth.users)
    -- Using basic fields required by Supabase Auth
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
      created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
    )
    VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      random_email,
      crypt('password123', gen_salt('bf')), -- All users will have password: password123
      NOW(),
      NOW() - (random() * interval '60 days'),
      NOW(),
      '', '', '', ''
    );
    
    -- Insert into public profiles table
    INSERT INTO public.profiles (
      id, name, age, gender, religion, city, education, profession, bio, role, is_blocked, created_at
    )
    VALUES (
      new_user_id,
      random_name,
      floor(random() * (35 - 22 + 1) + 22)::int, -- Random age between 22 and 35
      selected_gender,
      religions[floor(random() * array_length(religions, 1) + 1)],
      cities[floor(random() * array_length(cities, 1) + 1)],
      educations[floor(random() * array_length(educations, 1) + 1)],
      professions[floor(random() * array_length(professions, 1) + 1)],
      'Hello! I am ' || random_name || '. I am looking for a meaningful connection and someone to share life with. I enjoy travelling, reading, and spending time with family.',
      'user',
      false,
      NOW() - (random() * interval '60 days')
    );
  END LOOP;
END $$;




-- === FILE: supabase-roles-migration.sql ===
-- ============================================================================
-- MATRIMONIAL APP - ROLES MIGRATION (Primary Admin)
-- ============================================================================

-- 1. Drop existing role constraint and recreate with 'primary_admin'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin', 'primary_admin'));

-- 2. Drop the old Admin RLS policy
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- 3. Recreate the Admin RLS policy to allow both admin and primary_admin to update profiles
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'primary_admin')
    )
  );

-- ============================================================================
-- Migration Complete
-- ============================================================================
