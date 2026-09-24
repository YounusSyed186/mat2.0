-- ============================================================================
-- VIVAH MATRIMONIAL APP — HOROSCOPE & KUNDLI INTEGRATION MIGRATION
-- ============================================================================

-- 1. ADD HOROSCOPE & KUNDLI COLUMNS TO PROFILES TABLE
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS rashi TEXT,
ADD COLUMN IF NOT EXISTS nakshatra TEXT,
ADD COLUMN IF NOT EXISTS manglik_status TEXT DEFAULT 'dont_know',
ADD COLUMN IF NOT EXISTS birth_place TEXT,
ADD COLUMN IF NOT EXISTS birth_time TEXT,
ADD COLUMN IF NOT EXISTS gotra TEXT,
ADD COLUMN IF NOT EXISTS horoscope_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS horoscope_url TEXT;

-- 2. ADD PARTNER HOROSCOPE PREFERENCES COLUMNS TO PROFILES TABLE
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS partner_horoscope_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS partner_manglik TEXT DEFAULT 'any',
ADD COLUMN IF NOT EXISTS partner_rashi TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS partner_nakshatra TEXT[] DEFAULT '{}';

-- 3. VALIDATION CHECK CONSTRAINTS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_manglik_status_check') THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_manglik_status_check
      CHECK (manglik_status IS NULL OR manglik_status IN ('non_manglik', 'manglik', 'anshik_manglik', 'dont_know'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_partner_manglik_check') THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_partner_manglik_check
      CHECK (partner_manglik IS NULL OR partner_manglik IN ('any', 'non_manglik', 'manglik', 'anshik_manglik', 'dont_know'));
  END IF;
END $$;

-- 4. PERFORMANCE INDEXES FOR DISCOVERY FILTERING
CREATE INDEX IF NOT EXISTS idx_profiles_manglik_status 
ON profiles(manglik_status) 
WHERE manglik_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_rashi 
ON profiles(rashi) 
WHERE rashi IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_nakshatra 
ON profiles(nakshatra) 
WHERE nakshatra IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_horoscope_available 
ON profiles(horoscope_available) 
WHERE horoscope_available = true;

-- 5. AUTOMATIC HOROSCOPE AVAILABILITY SYNCHRONIZATION TRIGGER
CREATE OR REPLACE FUNCTION fn_sync_horoscope_available()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.rashi IS NOT NULL AND NEW.rashi != '') OR 
     (NEW.nakshatra IS NOT NULL AND NEW.nakshatra != '') OR 
     (NEW.horoscope_url IS NOT NULL AND NEW.horoscope_url != '') THEN
    NEW.horoscope_available := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_horoscope_available ON profiles;
CREATE TRIGGER trg_sync_horoscope_available
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION fn_sync_horoscope_available();
