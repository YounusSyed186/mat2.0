-- ============================================================================
-- VIVAH MATRIMONIAL APP — BACKFILL / SEED HOROSCOPE DATA FOR ALL PROFILES
-- ============================================================================

-- Run this in Supabase SQL Editor to populate realistic horoscope details
-- and partner horoscope preferences for all existing user profiles.

WITH numbered_profiles AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM profiles
),
horoscope_dataset AS (
  SELECT 
    np.id,
    -- 1. Deterministic Rashi (12 Rashis)
    (ARRAY[
      'Aries', 'Taurus', 'Gemini', 'Cancer', 
      'Leo', 'Virgo', 'Libra', 'Scorpio', 
      'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ])[((np.rn - 1) % 12) + 1] AS rashi,

    -- 2. Deterministic Nakshatra (27 Nakshatras)
    (ARRAY[
      'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
      'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
      'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
      'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta',
      'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
    ])[((np.rn - 1) % 27) + 1] AS nakshatra,

    -- 3. Realistic Manglik Distribution (65% Non-Manglik, 20% Manglik, 10% Anshik, 5% Unknown)
    CASE 
      WHEN (np.rn % 10) IN (1, 2) THEN 'manglik'
      WHEN (np.rn % 10) = 3 THEN 'anshik_manglik'
      WHEN (np.rn % 10) = 0 THEN 'dont_know'
      ELSE 'non_manglik'
    END AS manglik_status,

    -- 4. Birth Time
    (ARRAY[
      '06:15 AM', '07:45 AM', '09:30 AM', '11:15 AM', 
      '02:20 PM', '04:45 PM', '06:30 PM', '08:15 PM', '10:40 PM'
    ])[((np.rn - 1) % 9) + 1] AS birth_time,

    -- 5. Birth Place
    (ARRAY[
      'Mumbai, Maharashtra', 'Delhi, NCR', 'Bangalore, Karnataka', 
      'Hyderabad, Telangana', 'Chennai, Tamil Nadu', 'Kolkata, West Bengal', 
      'Pune, Maharashtra', 'Ahmedabad, Gujarat', 'Jaipur, Rajasthan', 'Lucknow, Uttar Pradesh'
    ])[((np.rn - 1) % 10) + 1] AS birth_place,

    -- 6. Gotra
    (ARRAY[
      'Kashyapa', 'Bharadwaja', 'Vashistha', 'Vishwamitra', 
      'Gautama', 'Jamadagni', 'Atri', 'Agastya', 'Harita', 'Sandilya'
    ])[((np.rn - 1) % 10) + 1] AS gotra,

    -- 7. Partner Manglik Preference
    CASE 
      WHEN (np.rn % 10) IN (1, 2) THEN 'manglik'
      WHEN (np.rn % 10) IN (4, 5, 6) THEN 'non_manglik'
      ELSE 'any'
    END AS partner_manglik,

    -- 8. Partner Preferred Rashis (1-3 complementary Rashis)
    ARRAY[
      (ARRAY['Taurus', 'Cancer', 'Virgo', 'Scorpio', 'Capricorn', 'Pisces'])[((np.rn) % 6) + 1],
      (ARRAY['Aries', 'Gemini', 'Leo', 'Libra', 'Sagittarius', 'Aquarius'])[((np.rn + 2) % 6) + 1]
    ] AS partner_rashi,

    -- 9. Partner Preferred Nakshatras
    ARRAY[
      (ARRAY['Rohini', 'Pushya', 'Swati', 'Anuradha', 'Uttara Phalguni', 'Revati'])[((np.rn) % 6) + 1],
      (ARRAY['Ashwini', 'Hasta', 'Shravana', 'Magha', 'Chitra', 'Mrigashira'])[((np.rn + 3) % 6) + 1]
    ] AS partner_nakshatra

  FROM numbered_profiles np
)
UPDATE profiles p
SET 
  rashi = hd.rashi,
  nakshatra = hd.nakshatra,
  manglik_status = hd.manglik_status,
  birth_time = hd.birth_time,
  birth_place = hd.birth_place,
  gotra = hd.gotra,
  horoscope_available = true,
  partner_horoscope_required = (hd.manglik_status != 'dont_know'),
  partner_manglik = hd.partner_manglik,
  partner_rashi = hd.partner_rashi,
  partner_nakshatra = hd.partner_nakshatra
FROM horoscope_dataset hd
WHERE p.id = hd.id;

-- Verify the updated distribution
SELECT 
  manglik_status,
  COUNT(*) as profile_count,
  COUNT(DISTINCT rashi) as unique_rashis,
  COUNT(DISTINCT nakshatra) as unique_nakshatras
FROM profiles
GROUP BY manglik_status;
