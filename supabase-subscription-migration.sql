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
