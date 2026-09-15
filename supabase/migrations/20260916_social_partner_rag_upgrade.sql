-- ============================================================================
-- VIVAH MATRIMONIAL APP — SOCIAL PRESENCE, PARTNER PREFERENCES & RAG UPGRADE
-- ============================================================================

-- 1. SOCIAL PRESENCE COLUMNS
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS twitter_url TEXT,
ADD COLUMN IF NOT EXISTS other_social_url TEXT;

-- 2. PARTNER PREFERENCES COLUMNS
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS partner_age_min INTEGER,
ADD COLUMN IF NOT EXISTS partner_age_max INTEGER,

ADD COLUMN IF NOT EXISTS partner_religion TEXT,
ADD COLUMN IF NOT EXISTS partner_religion_strict BOOLEAN DEFAULT false,

ADD COLUMN IF NOT EXISTS partner_city TEXT,
ADD COLUMN IF NOT EXISTS partner_willing_to_relocate BOOLEAN,

ADD COLUMN IF NOT EXISTS partner_education TEXT,
ADD COLUMN IF NOT EXISTS partner_profession TEXT,

ADD COLUMN IF NOT EXISTS partner_height_min INTEGER,
ADD COLUMN IF NOT EXISTS partner_height_max INTEGER,

ADD COLUMN IF NOT EXISTS partner_fitness_level TEXT,

ADD COLUMN IF NOT EXISTS partner_languages TEXT[] DEFAULT '{}',

ADD COLUMN IF NOT EXISTS partner_lifestyle TEXT,
ADD COLUMN IF NOT EXISTS partner_family_goals TEXT,
ADD COLUMN IF NOT EXISTS partner_career_ambition TEXT,

ADD COLUMN IF NOT EXISTS partner_hobbies TEXT[] DEFAULT '{}',

ADD COLUMN IF NOT EXISTS partner_smoking TEXT,
ADD COLUMN IF NOT EXISTS partner_drinking TEXT,

ADD COLUMN IF NOT EXISTS partner_children_preference TEXT,

ADD COLUMN IF NOT EXISTS partner_marital_status TEXT,

ADD COLUMN IF NOT EXISTS partner_must_have TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS partner_deal_breakers TEXT[] DEFAULT '{}';

-- 3. VALIDATION CHECK CONSTRAINTS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_partner_age_min_check') THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_partner_age_min_check
      CHECK (partner_age_min IS NULL OR partner_age_min >= 18);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_partner_age_max_check') THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_partner_age_max_check
      CHECK (partner_age_max IS NULL OR partner_age_max >= 18);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_partner_age_range_check') THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_partner_age_range_check
      CHECK (partner_age_min IS NULL OR partner_age_max IS NULL OR partner_age_min <= partner_age_max);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_partner_height_min_check') THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_partner_height_min_check
      CHECK (partner_height_min IS NULL OR partner_height_min > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_partner_height_max_check') THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_partner_height_max_check
      CHECK (partner_height_max IS NULL OR partner_height_max > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_partner_height_range_check') THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_partner_height_range_check
      CHECK (partner_height_min IS NULL OR partner_height_max IS NULL OR partner_height_min <= partner_height_max);
  END IF;
END $$;

-- 4. TARGETED INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_partner_religion ON profiles(partner_religion);
CREATE INDEX IF NOT EXISTS idx_profiles_partner_city ON profiles(partner_city);
CREATE INDEX IF NOT EXISTS idx_profiles_partner_profession ON profiles(partner_profession);
CREATE INDEX IF NOT EXISTS idx_profiles_needs_embedding ON profiles(needs_embedding) WHERE needs_embedding = true;

-- 5. UPDATED EMBEDDING INVALIDATION TRIGGER
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
    OLD.gender IS DISTINCT FROM NEW.gender OR
    OLD.religion IS DISTINCT FROM NEW.religion OR
    OLD.city IS DISTINCT FROM NEW.city OR
    OLD.education IS DISTINCT FROM NEW.education OR
    OLD.profession IS DISTINCT FROM NEW.profession OR
    OLD.bio IS DISTINCT FROM NEW.bio OR
    OLD.languages IS DISTINCT FROM NEW.languages OR
    OLD.ethnicity IS DISTINCT FROM NEW.ethnicity OR
    OLD.willing_to_relocate IS DISTINCT FROM NEW.willing_to_relocate OR
    OLD.introvert_extrovert IS DISTINCT FROM NEW.introvert_extrovert OR
    OLD.hobbies IS DISTINCT FROM NEW.hobbies OR
    OLD.habits IS DISTINCT FROM NEW.habits OR
    OLD.social_preferences IS DISTINCT FROM NEW.social_preferences OR
    OLD.career_ambition IS DISTINCT FROM NEW.career_ambition OR
    OLD.family_goals IS DISTINCT FROM NEW.family_goals OR
    OLD.lifestyle_choices IS DISTINCT FROM NEW.lifestyle_choices OR
    OLD.height IS DISTINCT FROM NEW.height OR
    OLD.weight IS DISTINCT FROM NEW.weight OR
    OLD.fitness_level IS DISTINCT FROM NEW.fitness_level OR
    OLD.style IS DISTINCT FROM NEW.style OR
    OLD.skin_tone IS DISTINCT FROM NEW.skin_tone OR
    OLD.search_intent IS DISTINCT FROM NEW.search_intent OR
    OLD.prompts IS DISTINCT FROM NEW.prompts OR
    -- Partner Preferences
    OLD.partner_age_min IS DISTINCT FROM NEW.partner_age_min OR
    OLD.partner_age_max IS DISTINCT FROM NEW.partner_age_max OR
    OLD.partner_religion IS DISTINCT FROM NEW.partner_religion OR
    OLD.partner_religion_strict IS DISTINCT FROM NEW.partner_religion_strict OR
    OLD.partner_city IS DISTINCT FROM NEW.partner_city OR
    OLD.partner_willing_to_relocate IS DISTINCT FROM NEW.partner_willing_to_relocate OR
    OLD.partner_education IS DISTINCT FROM NEW.partner_education OR
    OLD.partner_profession IS DISTINCT FROM NEW.partner_profession OR
    OLD.partner_height_min IS DISTINCT FROM NEW.partner_height_min OR
    OLD.partner_height_max IS DISTINCT FROM NEW.partner_height_max OR
    OLD.partner_fitness_level IS DISTINCT FROM NEW.partner_fitness_level OR
    OLD.partner_languages IS DISTINCT FROM NEW.partner_languages OR
    OLD.partner_lifestyle IS DISTINCT FROM NEW.partner_lifestyle OR
    OLD.partner_family_goals IS DISTINCT FROM NEW.partner_family_goals OR
    OLD.partner_career_ambition IS DISTINCT FROM NEW.partner_career_ambition OR
    OLD.partner_hobbies IS DISTINCT FROM NEW.partner_hobbies OR
    OLD.partner_smoking IS DISTINCT FROM NEW.partner_smoking OR
    OLD.partner_drinking IS DISTINCT FROM NEW.partner_drinking OR
    OLD.partner_children_preference IS DISTINCT FROM NEW.partner_children_preference OR
    OLD.partner_marital_status IS DISTINCT FROM NEW.partner_marital_status OR
    OLD.partner_must_have IS DISTINCT FROM NEW.partner_must_have OR
    OLD.partner_deal_breakers IS DISTINCT FROM NEW.partner_deal_breakers
  ) THEN
    NEW.needs_embedding := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. MATCH PROFILES V2 RPC (BIDIRECTIONAL HYBRID MATCHING)
CREATE OR REPLACE FUNCTION match_profiles_v2(
  query_embedding   vector(1536),
  match_limit       int  DEFAULT 12,
  match_offset      int  DEFAULT 0,
  filter_age_min    int  DEFAULT 18,
  filter_age_max    int  DEFAULT 100,
  filter_gender     text DEFAULT NULL,
  filter_religion   text DEFAULT NULL,
  current_user_id   uuid DEFAULT NULL
)
RETURNS TABLE (
  id                        uuid,
  name                      text,
  age                       int,
  gender                    text,
  city                      text,
  profession                text,
  religion                  text,
  bio                       text,
  avatar_url                text,
  languages                 text[],
  education                 text,
  family_goals              text,
  lifestyle_choices         text,
  similarity                float,
  preference_score          float,
  lifestyle_score           float,
  hard_compatibility_score  float,
  deal_breaker_status       boolean,
  final_match_score         float,
  matched_preferences       text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u profiles%ROWTYPE;
BEGIN
  -- Load current user profile if provided
  IF current_user_id IS NOT NULL THEN
    SELECT * INTO u FROM profiles WHERE profiles.id = current_user_id;
  END IF;

  RETURN QUERY
  WITH candidate_base AS (
    SELECT
      p.*,
      1 - (p.embedding <=> query_embedding) AS vec_similarity,
      -- Check mutual block
      EXISTS (
        SELECT 1 FROM user_blocks ub
        WHERE (ub.blocker_id = current_user_id AND ub.blocked_id = p.id)
           OR (ub.blocker_id = p.id AND ub.blocked_id = current_user_id)
      ) AS is_mutually_blocked
    FROM profiles p
    WHERE
      p.embedding IS NOT NULL
      AND p.is_blocked = false
      AND (current_user_id IS NULL OR p.id != current_user_id)
      AND (filter_gender IS NULL OR p.gender = filter_gender)
      AND (filter_religion IS NULL OR p.religion ILIKE '%' || filter_religion || '%')
      AND p.age >= filter_age_min
      AND p.age <= filter_age_max
  ),
  scored_candidates AS (
    SELECT
      c.*,
      -- 1. Hard compatibility
      (
        CASE
          WHEN c.is_mutually_blocked THEN 0.0
          WHEN u.partner_religion_strict = true AND u.partner_religion IS NOT NULL AND LOWER(c.religion) != LOWER(u.partner_religion) THEN 0.0
          WHEN c.partner_religion_strict = true AND c.partner_religion IS NOT NULL AND u.religion IS NOT NULL AND LOWER(c.partner_religion) != LOWER(u.religion) THEN 0.0
          ELSE 1.0
        END
      )::float AS hard_compat,

      -- 2. Deal breaker check
      (
        CASE
          -- If current user has deal breakers matching candidate habits
          WHEN u.partner_deal_breakers IS NOT NULL AND ARRAY_LENGTH(u.partner_deal_breakers, 1) > 0 AND (
            (EXISTS (SELECT 1 FROM UNNEST(u.partner_deal_breakers) db WHERE LOWER(db) LIKE '%smok%' AND LOWER(COALESCE(c.partner_smoking, c.lifestyle_choices, '')) LIKE '%smok%')) OR
            (EXISTS (SELECT 1 FROM UNNEST(u.partner_deal_breakers) db WHERE LOWER(db) LIKE '%drink%' AND LOWER(COALESCE(c.partner_drinking, c.lifestyle_choices, '')) LIKE '%drink%')) OR
            (EXISTS (SELECT 1 FROM UNNEST(u.partner_deal_breakers) db WHERE LOWER(db) LIKE '%relocat%' AND c.willing_to_relocate = false))
          ) THEN false
          -- If candidate has deal breakers matching user habits
          WHEN c.partner_deal_breakers IS NOT NULL AND ARRAY_LENGTH(c.partner_deal_breakers, 1) > 0 AND (
            (EXISTS (SELECT 1 FROM UNNEST(c.partner_deal_breakers) db WHERE LOWER(db) LIKE '%smok%' AND LOWER(COALESCE(u.partner_smoking, u.lifestyle_choices, '')) LIKE '%smok%')) OR
            (EXISTS (SELECT 1 FROM UNNEST(c.partner_deal_breakers) db WHERE LOWER(db) LIKE '%drink%' AND LOWER(COALESCE(u.partner_drinking, u.lifestyle_choices, '')) LIKE '%drink%')) OR
            (EXISTS (SELECT 1 FROM UNNEST(c.partner_deal_breakers) db WHERE LOWER(db) LIKE '%relocat%' AND u.willing_to_relocate = false))
          ) THEN false
          ELSE true
        END
      )::boolean AS deal_breaker_ok,

      -- 3. Forward preference score (Candidate satisfies User preferences)
      (
        0.2 * (CASE WHEN u.partner_age_min IS NULL OR u.partner_age_max IS NULL OR (c.age >= u.partner_age_min AND c.age <= u.partner_age_max) THEN 1.0 ELSE 0.3 END) +
        0.2 * (CASE WHEN u.partner_city IS NULL OR LOWER(c.city) = LOWER(u.partner_city) OR c.willing_to_relocate = true OR u.willing_to_relocate = true THEN 1.0 ELSE 0.4 END) +
        0.2 * (CASE WHEN u.partner_religion IS NULL OR LOWER(c.religion) = LOWER(u.partner_religion) THEN 1.0 ELSE 0.2 END) +
        0.2 * (CASE WHEN u.partner_education IS NULL OR LOWER(COALESCE(c.education, '')) LIKE '%' || LOWER(u.partner_education) || '%' THEN 1.0 ELSE 0.5 END) +
        0.2 * (CASE WHEN u.partner_profession IS NULL OR LOWER(COALESCE(c.profession, '')) LIKE '%' || LOWER(u.partner_profession) || '%' THEN 1.0 ELSE 0.5 END)
      )::float AS forward_pref_score,

      -- 4. Reverse preference score (User satisfies Candidate preferences)
      (
        0.2 * (CASE WHEN c.partner_age_min IS NULL OR c.partner_age_max IS NULL OR (u.age >= c.partner_age_min AND u.age <= c.partner_age_max) THEN 1.0 ELSE 0.3 END) +
        0.2 * (CASE WHEN c.partner_city IS NULL OR LOWER(u.city) = LOWER(c.partner_city) OR u.willing_to_relocate = true OR c.willing_to_relocate = true THEN 1.0 ELSE 0.4 END) +
        0.2 * (CASE WHEN c.partner_religion IS NULL OR LOWER(u.religion) = LOWER(c.partner_religion) THEN 1.0 ELSE 0.2 END) +
        0.2 * (CASE WHEN c.partner_education IS NULL OR LOWER(COALESCE(u.education, '')) LIKE '%' || LOWER(c.partner_education) || '%' THEN 1.0 ELSE 0.5 END) +
        0.2 * (CASE WHEN c.partner_profession IS NULL OR LOWER(COALESCE(u.profession, '')) LIKE '%' || LOWER(c.partner_profession) || '%' THEN 1.0 ELSE 0.5 END)
      )::float AS reverse_pref_score,

      -- 5. Lifestyle score
      (
        0.4 * (CASE WHEN LOWER(COALESCE(c.family_goals, '')) = LOWER(COALESCE(u.family_goals, '')) OR c.family_goals IS NULL OR u.family_goals IS NULL THEN 1.0 ELSE 0.5 END) +
        0.3 * (CASE WHEN LOWER(COALESCE(c.career_ambition, '')) = LOWER(COALESCE(u.career_ambition, '')) OR c.career_ambition IS NULL OR u.career_ambition IS NULL THEN 1.0 ELSE 0.5 END) +
        0.3 * (CASE WHEN c.languages && u.languages OR ARRAY_LENGTH(c.languages, 1) IS NULL OR ARRAY_LENGTH(u.languages, 1) IS NULL THEN 1.0 ELSE 0.4 END)
      )::float AS l_score,

      -- Matched preferences list
      ARRAY_REMOVE(ARRAY[
        CASE WHEN (u.partner_age_min IS NULL OR (c.age >= u.partner_age_min AND c.age <= u.partner_age_max)) THEN 'Age' ELSE NULL END,
        CASE WHEN (u.partner_religion IS NULL OR LOWER(c.religion) = LOWER(u.partner_religion)) THEN 'Religion' ELSE NULL END,
        CASE WHEN (u.partner_city IS NULL OR LOWER(c.city) = LOWER(u.partner_city) OR c.willing_to_relocate = true) THEN 'Location' ELSE NULL END,
        CASE WHEN (c.languages && u.languages) THEN 'Languages' ELSE NULL END,
        CASE WHEN (LOWER(COALESCE(c.family_goals, '')) = LOWER(COALESCE(u.family_goals, ''))) THEN 'Family Goals' ELSE NULL END,
        CASE WHEN (LOWER(COALESCE(c.lifestyle_choices, '')) = LOWER(COALESCE(u.lifestyle_choices, ''))) THEN 'Lifestyle' ELSE NULL END
      ], NULL) AS matched_prefs
    FROM candidate_base c
  )
  SELECT
    sc.id,
    sc.name,
    sc.age,
    sc.gender,
    sc.city,
    sc.profession,
    sc.religion,
    sc.bio,
    sc.avatar_url,
    sc.languages,
    sc.education,
    sc.family_goals,
    sc.lifestyle_choices,
    sc.vec_similarity AS similarity,
    ((sc.forward_pref_score * 0.6 + sc.reverse_pref_score * 0.4))::float AS preference_score,
    sc.l_score AS lifestyle_score,
    sc.hard_compat AS hard_compatibility_score,
    sc.deal_breaker_ok AS deal_breaker_status,
    (
      CASE
        WHEN sc.hard_compat = 0.0 OR sc.deal_breaker_ok = false THEN 0.1 * sc.vec_similarity
        ELSE (
          0.20 * sc.hard_compat +
          0.35 * (sc.forward_pref_score * 0.6 + sc.reverse_pref_score * 0.4) +
          0.35 * sc.vec_similarity +
          0.10 * sc.l_score
        )
      END
    )::float AS final_match_score,
    sc.matched_prefs AS matched_preferences
  FROM scored_candidates sc
  WHERE sc.is_mutually_blocked = false
  ORDER BY final_match_score DESC
  LIMIT match_limit
  OFFSET match_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION match_profiles_v2 TO authenticated;
