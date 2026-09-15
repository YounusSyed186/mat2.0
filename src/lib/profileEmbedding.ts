import type { Profile } from "@/types";

/**
 * Normalizes an array of strings by trimming whitespace, filtering empty values,
 * and eliminating case-insensitive duplicates while preserving canonical casing.
 */
export function normalizeStringArray(arr?: string[] | null): string[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of arr) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(trimmed);
    }
  }
  return result;
}

/**
 * Cleans a scalar text value: trims, returns null if empty or non-string.
 */
function cleanText(val?: string | number | null): string | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  return str.length > 0 ? str : null;
}

/**
 * Builds a comprehensive, deterministic two-dimensional profile document for vector embeddings.
 * 
 * Dimension 1: Who the user is (Self profile, personality, values, lifestyle, intent).
 * Dimension 2: Who the user wants to meet (Ideal partner preferences, must-haves, deal-breakers).
 * 
 * IMPORTANT: Excludes social links, authentication tokens, system IDs, timestamps, and admin flags.
 */
export function buildProfileEmbeddingDocument(profile: Partial<Profile> | Record<string, unknown>): string {
  const p = profile as Record<string, unknown>;

  const lines: string[] = ["VIVAAH VEDIKA PROFILE", ""];

  // ── SECTION 1: ABOUT THIS PERSON ──
  const aboutLines: string[] = [];
  const name = cleanText(p.name as string);
  const age = cleanText(p.age as string | number);
  const gender = cleanText(p.gender as string);
  const religion = cleanText(p.religion as string);
  const city = cleanText(p.city as string);
  const education = cleanText(p.education as string);
  const profession = cleanText(p.profession as string);

  if (name) aboutLines.push(`Name: ${name}`);
  if (age) aboutLines.push(`Age: ${age}`);
  if (gender) aboutLines.push(`Gender: ${gender}`);
  if (religion) aboutLines.push(`Religion: ${religion}`);
  if (city) aboutLines.push(`City: ${city}`);
  if (education) aboutLines.push(`Education: ${education}`);
  if (profession) aboutLines.push(`Profession: ${profession}`);

  if (aboutLines.length > 0) {
    lines.push("ABOUT THIS PERSON", ...aboutLines, "");
  }

  // ── SECTION 2: BACKGROUND ──
  const backgroundLines: string[] = [];
  const languages = normalizeStringArray(p.languages as string[]);
  const ethnicity = cleanText(p.ethnicity as string);
  const willingToRelocate = p.willing_to_relocate;

  if (languages.length > 0) backgroundLines.push(`Languages: ${languages.join(", ")}`);
  if (ethnicity) backgroundLines.push(`Ethnicity / Culture: ${ethnicity}`);
  if (typeof willingToRelocate === "boolean") {
    backgroundLines.push(`Willing to relocate: ${willingToRelocate ? "Yes" : "No"}`);
  }

  if (backgroundLines.length > 0) {
    lines.push("BACKGROUND", ...backgroundLines, "");
  }

  // ── SECTION 3: PERSONALITY & LIFESTYLE ──
  const personalityLines: string[] = [];
  const introExtro = p.introvert_extrovert;
  if (typeof introExtro === "number" && !isNaN(introExtro)) {
    const scaleLabel = introExtro <= 3 ? "Introvert" : introExtro >= 8 ? "Extrovert" : "Ambivert / Balanced";
    personalityLines.push(`Personality: ${scaleLabel} (${introExtro}/10 scale)`);
  }
  const hobbies = normalizeStringArray(p.hobbies as string[]);
  const habits = cleanText(p.habits as string);
  const socialPrefs = cleanText(p.social_preferences as string);

  if (hobbies.length > 0) personalityLines.push(`Hobbies: ${hobbies.join(", ")}`);
  if (habits) personalityLines.push(`Habits & Routine: ${habits}`);
  if (socialPrefs) personalityLines.push(`Social Preferences: ${socialPrefs}`);

  if (personalityLines.length > 0) {
    lines.push("PERSONALITY & LIFESTYLE", ...personalityLines, "");
  }

  // ── SECTION 4: VALUES & GOALS ──
  const valueLines: string[] = [];
  const careerAmbition = cleanText(p.career_ambition as string);
  const familyGoals = cleanText(p.family_goals as string);
  const lifestyleChoices = cleanText(p.lifestyle_choices as string);

  if (careerAmbition) valueLines.push(`Career ambition: ${careerAmbition}`);
  if (familyGoals) valueLines.push(`Family goals: ${familyGoals}`);
  if (lifestyleChoices) valueLines.push(`Lifestyle choices: ${lifestyleChoices}`);

  if (valueLines.length > 0) {
    lines.push("VALUES & GOALS", ...valueLines, "");
  }

  // ── SECTION 5: PHYSICAL PROFILE ──
  const physicalLines: string[] = [];
  const height = cleanText(p.height as string | number);
  const weight = cleanText(p.weight as string | number);
  const fitnessLevel = cleanText(p.fitness_level as string);
  const style = cleanText(p.style as string);

  if (height) physicalLines.push(`Height: ${height} cm`);
  if (weight) physicalLines.push(`Weight: ${weight} kg`);
  if (fitnessLevel) physicalLines.push(`Fitness level: ${fitnessLevel}`);
  if (style) physicalLines.push(`Style: ${style}`);

  if (physicalLines.length > 0) {
    lines.push("PHYSICAL PROFILE", ...physicalLines, "");
  }

  // ── SECTION 6: RELATIONSHIP INTENT & BIO ──
  const intentLines: string[] = [];
  const searchIntent = cleanText(p.search_intent as string);
  const bio = cleanText(p.bio as string);

  if (searchIntent) intentLines.push(`Looking for: ${searchIntent}`);
  if (bio) intentLines.push(`Bio:\n${bio}`);

  // Prompts
  if (p.prompts && typeof p.prompts === "object") {
    const promptEntries = Object.entries(p.prompts as Record<string, string>)
      .map(([q, a]) => {
        const cleanA = cleanText(a);
        return cleanA ? `${q.trim()} -> ${cleanA}` : null;
      })
      .filter(Boolean) as string[];
    if (promptEntries.length > 0) {
      intentLines.push(`Personal prompts:\n${promptEntries.join("\n")}`);
    }
  }

  if (intentLines.length > 0) {
    lines.push("RELATIONSHIP INTENT & EXPRESSION", ...intentLines, "");
  }

  // ── SECTION 7: IDEAL PARTNER PREFERENCES ──
  const partnerLines: string[] = [];
  const pAgeMin = cleanText(p.partner_age_min as string | number);
  const pAgeMax = cleanText(p.partner_age_max as string | number);
  if (pAgeMin || pAgeMax) {
    partnerLines.push(`Preferred age: ${pAgeMin || "18"} - ${pAgeMax || "100"} years`);
  }

  const pReligion = cleanText(p.partner_religion as string);
  const pRelStrict = Boolean(p.partner_religion_strict);
  if (pReligion) {
    partnerLines.push(`Preferred religion: ${pReligion}${pRelStrict ? " (Strict preference)" : " (Flexible)"}`);
  }

  const pCity = cleanText(p.partner_city as string);
  const pRelocate = p.partner_willing_to_relocate;
  if (pCity) partnerLines.push(`Preferred city: ${pCity}`);
  if (typeof pRelocate === "boolean") {
    partnerLines.push(`Partner willing to relocate: ${pRelocate ? "Yes" : "No / Doesn't matter"}`);
  }

  const pEducation = cleanText(p.partner_education as string);
  const pProfession = cleanText(p.partner_profession as string);
  const pCareerAmbition = cleanText(p.partner_career_ambition as string);
  if (pEducation) partnerLines.push(`Preferred education: ${pEducation}`);
  if (pProfession) partnerLines.push(`Preferred profession: ${pProfession}`);
  if (pCareerAmbition) partnerLines.push(`Partner career ambition: ${pCareerAmbition}`);

  const pHeightMin = cleanText(p.partner_height_min as string | number);
  const pHeightMax = cleanText(p.partner_height_max as string | number);
  if (pHeightMin || pHeightMax) {
    partnerLines.push(`Preferred height range: ${pHeightMin || "Any"} - ${pHeightMax || "Any"} cm`);
  }
  const pFitness = cleanText(p.partner_fitness_level as string);
  if (pFitness) partnerLines.push(`Preferred fitness: ${pFitness}`);

  const pLanguages = normalizeStringArray(p.partner_languages as string[]);
  if (pLanguages.length > 0) {
    partnerLines.push(`Preferred languages: ${pLanguages.join(", ")}`);
  }

  const pLifestyle = cleanText(p.partner_lifestyle as string);
  const pFamily = cleanText(p.partner_family_goals as string);
  const pSmoking = cleanText(p.partner_smoking as string);
  const pDrinking = cleanText(p.partner_drinking as string);
  const pChildren = cleanText(p.partner_children_preference as string);
  const pMarital = cleanText(p.partner_marital_status as string);
  const pHobbies = normalizeStringArray(p.partner_hobbies as string[]);

  if (pLifestyle) partnerLines.push(`Preferred lifestyle: ${pLifestyle}`);
  if (pFamily) partnerLines.push(`Partner family goals: ${pFamily}`);
  if (pSmoking) partnerLines.push(`Smoking preference: ${pSmoking}`);
  if (pDrinking) partnerLines.push(`Drinking preference: ${pDrinking}`);
  if (pChildren) partnerLines.push(`Children preference: ${pChildren}`);
  if (pMarital) partnerLines.push(`Marital status preference: ${pMarital}`);
  if (pHobbies.length > 0) partnerLines.push(`Partner hobbies/interests: ${pHobbies.join(", ")}`);

  const mustHaves = normalizeStringArray(p.partner_must_have as string[]);
  if (mustHaves.length > 0) {
    partnerLines.push(`Must have qualities:\n- ${mustHaves.join("\n- ")}`);
  }

  const dealBreakers = normalizeStringArray(p.partner_deal_breakers as string[]);
  if (dealBreakers.length > 0) {
    partnerLines.push(`Deal breakers:\n- ${dealBreakers.join("\n- ")}`);
  }

  if (partnerLines.length > 0) {
    lines.push("--------------------------------", "IDEAL PARTNER PREFERENCES", ...partnerLines, "");
  }

  lines.push(
    "--------------------------------",
    "MATCHING CONTEXT",
    "This profile document captures both the individual's self-identity, values, and lifestyle, as well as their structured preferences for an ideal life partner."
  );

  return lines.join("\n").trim();
}
