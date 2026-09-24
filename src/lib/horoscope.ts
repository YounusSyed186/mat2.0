import type { Profile } from "@/types";

export interface RashiOption {
  value: string;
  label: string;
  sanskrit: string;
}

export const RASHI_LIST: RashiOption[] = [
  { value: "Aries", label: "Aries (Mesha)", sanskrit: "Mesha" },
  { value: "Taurus", label: "Taurus (Vrishabha)", sanskrit: "Vrishabha" },
  { value: "Gemini", label: "Gemini (Mithuna)", sanskrit: "Mithuna" },
  { value: "Cancer", label: "Cancer (Karka)", sanskrit: "Karka" },
  { value: "Leo", label: "Leo (Simha)", sanskrit: "Simha" },
  { value: "Virgo", label: "Virgo (Kanya)", sanskrit: "Kanya" },
  { value: "Libra", label: "Libra (Tula)", sanskrit: "Tula" },
  { value: "Scorpio", label: "Scorpio (Vrishchika)", sanskrit: "Vrishchika" },
  { value: "Sagittarius", label: "Sagittarius (Dhanu)", sanskrit: "Dhanu" },
  { value: "Capricorn", label: "Capricorn (Makara)", sanskrit: "Makara" },
  { value: "Aquarius", label: "Aquarius (Kumbha)", sanskrit: "Kumbha" },
  { value: "Pisces", label: "Pisces (Meena)", sanskrit: "Meena" },
];

export const NAKSHATRA_LIST: string[] = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishta",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
];

export interface ManglikOption {
  value: string;
  label: string;
}

export const MANGLIK_OPTIONS: ManglikOption[] = [
  { value: "any", label: "Any" },
  { value: "non_manglik", label: "Non-Manglik" },
  { value: "manglik", label: "Manglik" },
  { value: "anshik_manglik", label: "Anshik Manglik" },
  { value: "dont_know", label: "Don't know / Not specified" },
];

/**
 * Checks whether a candidate profile has horoscope data available
 */
export function isHoroscopeAvailable(profile?: Partial<Profile> | null): boolean {
  if (!profile) return false;
  if (profile.horoscope_available) return true;
  if (Boolean(profile.rashi || profile.nakshatra || profile.manglik_status)) return true;
  if (Boolean(profile.birth_time && profile.birth_place)) return true;
  return false;
}

/**
 * Maps manglik status code to clean human-readable string
 */
export function formatManglikStatus(status?: string | null): string {
  if (!status) return "Not specified";
  const s = status.toLowerCase().trim();
  if (s === "non_manglik" || s === "no" || s === "false") return "Non-Manglik";
  if (s === "manglik" || s === "yes" || s === "true") return "Manglik";
  if (s === "anshik_manglik" || s === "anshik") return "Anshik Manglik";
  if (s === "dont_know" || s === "unknown") return "Don't know / Unspecified";
  return status;
}

/**
 * Formats Rashi display with both Western and Sanskrit names
 */
export function formatRashi(rashi?: string | null): string {
  if (!rashi) return "Not specified";
  const match = RASHI_LIST.find(
    (r) => r.value.toLowerCase() === rashi.toLowerCase() || r.sanskrit.toLowerCase() === rashi.toLowerCase()
  );
  return match ? match.label : rashi;
}
