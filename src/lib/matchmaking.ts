import type { Profile, MatchScoreBreakdown } from "@/types";

export interface MatchWeights {
  hardCompatibility: number;
  preferenceCompatibility: number;
  semanticSimilarity: number;
  lifestyleCompatibility: number;
}

export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  hardCompatibility: 0.20,
  preferenceCompatibility: 0.35,
  semanticSimilarity: 0.35,
  lifestyleCompatibility: 0.10,
};

const norm = (s?: string | null) => (s || "").trim().toLowerCase();

/**
 * Checks if a candidate violates any of the user's explicit deal breakers.
 * Returns true if candidate passes (no deal breaker triggered), false if candidate triggered a deal breaker.
 */
export function checkDealBreakers(
  user: Partial<Profile>,
  candidate: Partial<Profile>
): { passed: boolean; reason?: string } {
  const dealBreakers = (user.partner_deal_breakers || []).map(norm);

  for (const db of dealBreakers) {
    if (!db) continue;

    // Smoking deal breaker
    if (db.includes("smok")) {
      const candidateSmoking = norm(candidate.partner_smoking || candidate.lifestyle_choices || "");
      if (candidateSmoking.includes("smok") && !candidateSmoking.includes("non-smok") && !candidateSmoking.includes("no")) {
        return { passed: false, reason: "Candidate smokes" };
      }
    }

    // Drinking deal breaker
    if (db.includes("drink") || db.includes("alcohol")) {
      const candidateDrinking = norm(candidate.partner_drinking || candidate.lifestyle_choices || "");
      if (candidateDrinking.includes("drink") && !candidateDrinking.includes("non-drink") && !candidateDrinking.includes("no")) {
        return { passed: false, reason: "Candidate drinks" };
      }
    }

    // Children deal breaker
    if (db.includes("children") || db.includes("kid")) {
      const candidateChildren = norm(candidate.partner_children_preference || candidate.family_goals || "");
      if (db.includes("doesn't want") || db.includes("no children") || db.includes("not want")) {
        if (candidateChildren.includes("doesn't want") || candidateChildren.includes("no children")) {
          return { passed: false, reason: "Children preference conflict" };
        }
      }
    }

    // Relocation deal breaker
    if (db.includes("relocat")) {
      if (candidate.willing_to_relocate === false && norm(candidate.city) !== norm(user.city)) {
        return { passed: false, reason: "Unwilling to relocate" };
      }
    }

    // Marital status deal breaker
    if (db.includes("married") || db.includes("divorc")) {
      const candidateMarital = norm(candidate.partner_marital_status || "");
      if (candidateMarital.includes("divorc") || candidateMarital.includes("separated")) {
        return { passed: false, reason: "Marital status conflict" };
      }
    }
  }

  return { passed: true };
}

/**
 * Calculates how well candidateProfile matches userPreferences (Forward direction: 0.0 - 1.0)
 */
export function calculatePreferenceCompatibility(
  user: Partial<Profile>,
  candidate: Partial<Profile>
): { score: number; matchedCriteria: string[] } {
  const matchedCriteria: string[] = [];
  let totalWeight = 0;
  let earnedScore = 0;

  // 1. Age (Weight: 20)
  const minAge = user.partner_age_min;
  const maxAge = user.partner_age_max;
  if (minAge || maxAge) {
    totalWeight += 20;
    const cAge = candidate.age;
    if (cAge) {
      if ((!minAge || cAge >= minAge) && (!maxAge || cAge <= maxAge)) {
        earnedScore += 20;
        matchedCriteria.push("Age");
      } else {
        const diff = Math.min(
          minAge ? Math.max(0, minAge - cAge) : 0,
          maxAge ? Math.max(0, cAge - maxAge) : 0
        );
        earnedScore += Math.max(0, 20 - diff * 4);
      }
    } else {
      earnedScore += 10;
    }
  }

  // 2. Religion (Weight: 20)
  if (user.partner_religion) {
    totalWeight += 20;
    const uRel = norm(user.partner_religion);
    const cRel = norm(candidate.religion);
    if (cRel === uRel) {
      earnedScore += 20;
      matchedCriteria.push("Religion");
    } else if (user.partner_religion_strict) {
      earnedScore += 0;
    } else {
      earnedScore += 5; // flexible
    }
  }

  // 3. Location & Relocation (Weight: 15)
  if (user.partner_city) {
    totalWeight += 15;
    const sameCity = norm(candidate.city) === norm(user.partner_city);
    const canRelocate = Boolean(candidate.willing_to_relocate || user.partner_willing_to_relocate);
    if (sameCity) {
      earnedScore += 15;
      matchedCriteria.push("Location");
    } else if (canRelocate) {
      earnedScore += 12;
      matchedCriteria.push("Relocation Compatible");
    } else {
      earnedScore += 4;
    }
  }

  // 4. Education & Profession (Weight: 15)
  if (user.partner_education || user.partner_profession) {
    totalWeight += 15;
    let epEarned = 0;
    if (user.partner_education && candidate.education) {
      if (norm(candidate.education).includes(norm(user.partner_education))) {
        epEarned += 7.5;
        matchedCriteria.push("Education");
      } else {
        epEarned += 3.5;
      }
    } else {
      epEarned += 7.5;
    }

    if (user.partner_profession && candidate.profession) {
      if (norm(candidate.profession).includes(norm(user.partner_profession))) {
        epEarned += 7.5;
        matchedCriteria.push("Profession");
      } else {
        epEarned += 3.5;
      }
    } else {
      epEarned += 7.5;
    }
    earnedScore += epEarned;
  }

  // 5. Height (Weight: 10)
  if (user.partner_height_min || user.partner_height_max) {
    totalWeight += 10;
    const cHeight = candidate.height;
    if (cHeight) {
      if (
        (!user.partner_height_min || cHeight >= user.partner_height_min) &&
        (!user.partner_height_max || cHeight <= user.partner_height_max)
      ) {
        earnedScore += 10;
        matchedCriteria.push("Height");
      } else {
        earnedScore += 4;
      }
    } else {
      earnedScore += 6;
    }
  }

  // 6. Languages (Weight: 10)
  if (user.partner_languages && user.partner_languages.length > 0) {
    totalWeight += 10;
    const cLangs = (candidate.languages || []).map(norm);
    const uLangs = user.partner_languages.map(norm);
    const common = uLangs.filter((l) => cLangs.includes(l));
    if (common.length > 0) {
      earnedScore += 10;
      matchedCriteria.push("Languages");
    } else {
      earnedScore += 3;
    }
  }

  // 7. Lifestyle / Habits (Weight: 10)
  if (user.partner_smoking || user.partner_drinking || user.partner_lifestyle) {
    totalWeight += 10;
    let lsScore = 10;
    if (user.partner_smoking && candidate.partner_smoking) {
      if (norm(user.partner_smoking) !== norm(candidate.partner_smoking)) lsScore -= 3;
    }
    if (user.partner_drinking && candidate.partner_drinking) {
      if (norm(user.partner_drinking) !== norm(candidate.partner_drinking)) lsScore -= 3;
    }
    earnedScore += Math.max(2, lsScore);
    if (lsScore >= 7) matchedCriteria.push("Lifestyle");
  }

  const score = totalWeight > 0 ? Math.min(1.0, Math.max(0.0, earnedScore / totalWeight)) : 0.85;
  return { score, matchedCriteria };
}

/**
 * Calculates bidirectional compatibility between User A and User B.
 * 
 * Answers both:
 * 1. "How well does Candidate B fit User A's preferences?"
 * 2. "How well does User A fit Candidate B's preferences?"
 */
export function calculateBidirectionalCompatibility(
  userA: Partial<Profile>,
  userB: Partial<Profile>
): {
  forwardScore: number;
  reverseScore: number;
  compositePreferenceScore: number;
  matchedPreferences: string[];
} {
  const forward = calculatePreferenceCompatibility(userA, userB);
  const reverse = calculatePreferenceCompatibility(userB, userA);

  // Combine matched preferences without duplicates
  const matchedPreferences = Array.from(
    new Set([...forward.matchedCriteria, ...reverse.matchedCriteria])
  );

  // If one side has very low compatibility (e.g. 0.2), apply a mutual dampening penalty
  const forwardScore = forward.score;
  const reverseScore = reverse.score;

  let compositePreferenceScore = (forwardScore * 0.55) + (reverseScore * 0.45);
  if (forwardScore < 0.35 || reverseScore < 0.35) {
    compositePreferenceScore *= 0.6; // Strong penalty if either person's preferences are violated
  }

  return {
    forwardScore,
    reverseScore,
    compositePreferenceScore,
    matchedPreferences,
  };
}

/**
 * Computes the full breakdown score combining:
 * - Hard compatibility (20%)
 * - Bidirectional preferences (35%)
 * - Semantic vector similarity (35%)
 * - Lifestyle / values alignment (10%)
 * - Deal breaker enforcement
 */
export function calculateCompositeMatchScore(
  user: Partial<Profile>,
  candidate: Partial<Profile>,
  semanticSimilarity: number,
  weights: MatchWeights = DEFAULT_MATCH_WEIGHTS
): MatchScoreBreakdown {
  // 1. Hard compatibility
  let hardScore = 1.0;
  if (user.gender && candidate.gender && user.gender === candidate.gender) {
    // Unless specifically configured, usually heterosexual matrimonial matching
  }
  if (user.partner_religion_strict && user.partner_religion && candidate.religion) {
    if (norm(user.partner_religion) !== norm(candidate.religion)) {
      hardScore = 0.0;
    }
  }
  if (candidate.partner_religion_strict && candidate.partner_religion && user.religion) {
    if (norm(candidate.partner_religion) !== norm(user.religion)) {
      hardScore = 0.0;
    }
  }

  // 2. Deal breakers
  const userCheck = checkDealBreakers(user, candidate);
  const candidateCheck = checkDealBreakers(candidate, user);
  const dealBreakerOk = userCheck.passed && candidateCheck.passed;

  // 3. Bidirectional preferences
  const bidi = calculateBidirectionalCompatibility(user, candidate);

  // 4. Lifestyle / family goals score
  let lifestyleScore = 0.7;
  if (user.family_goals && candidate.family_goals) {
    if (norm(user.family_goals) === norm(candidate.family_goals)) {
      lifestyleScore += 0.2;
    }
  }
  if (user.career_ambition && candidate.career_ambition) {
    if (norm(user.career_ambition) === norm(candidate.career_ambition)) {
      lifestyleScore += 0.1;
    }
  }
  lifestyleScore = Math.min(1.0, lifestyleScore);

  // 5. Final weighted score
  let finalMatchScore =
    hardScore * weights.hardCompatibility +
    bidi.compositePreferenceScore * weights.preferenceCompatibility +
    semanticSimilarity * weights.semanticSimilarity +
    lifestyleScore * weights.lifestyleCompatibility;

  // Strict deal-breaker override
  if (!dealBreakerOk || hardScore === 0.0) {
    finalMatchScore = Math.min(finalMatchScore * 0.15, 0.25);
  }

  return {
    hardCompatibilityScore: hardScore,
    preferenceScore: bidi.compositePreferenceScore,
    forwardPreferenceScore: bidi.forwardScore,
    reversePreferenceScore: bidi.reverseScore,
    lifestyleScore,
    semanticSimilarity,
    dealBreakerStatus: dealBreakerOk,
    finalMatchScore: Math.round(finalMatchScore * 100) / 100,
    matchedPreferences: bidi.matchedPreferences,
  };
}

/**
 * Generates user-facing, concise compatibility factors derived from actual profile data.
 * Does not expose internal AI prompts or technical weights.
 */
export function getMatchExplanations(user: Partial<Profile>, candidate: Partial<Profile>): string[] {
  const reasons: string[] = [];

  // Age match
  if (user.partner_age_min && user.partner_age_max && candidate.age) {
    if (candidate.age >= user.partner_age_min && candidate.age <= user.partner_age_max) {
      reasons.push("Preferred age range");
    }
  } else if (user.age && candidate.age && Math.abs(user.age - candidate.age) <= 3) {
    reasons.push("Close in age");
  }

  // Faith match
  if (user.religion && candidate.religion && norm(user.religion) === norm(candidate.religion)) {
    reasons.push("Shared faith");
  }

  // Location match
  if (user.city && candidate.city && norm(user.city) === norm(candidate.city)) {
    reasons.push("Same city");
  } else if (candidate.willing_to_relocate || user.willing_to_relocate) {
    reasons.push("Open to relocation");
  }

  // Family goals
  if (user.family_goals && candidate.family_goals) {
    if (norm(user.family_goals) === norm(candidate.family_goals) || norm(candidate.family_goals).includes("children")) {
      reasons.push("Aligned family goals");
    }
  }

  // Lifestyle / Smoking
  const userSmoking = norm(user.partner_smoking || user.lifestyle_choices || "");
  const candSmoking = norm(candidate.partner_smoking || candidate.lifestyle_choices || "");
  if (userSmoking.includes("no") && (candSmoking.includes("no") || candSmoking.includes("non-smok"))) {
    reasons.push("Both non-smokers");
  }

  // Education / Career
  if (user.education && candidate.education && norm(user.education) === norm(candidate.education)) {
    reasons.push("Similar educational background");
  }
  if (user.profession && candidate.profession && norm(user.profession) === norm(candidate.profession)) {
    reasons.push("Similar profession");
  }

  // Languages
  const commonLangs = (user.languages || []).filter((l) =>
    (candidate.languages || []).map(norm).includes(norm(l))
  );
  if (commonLangs.length > 0) {
    reasons.push(`Shared language (${commonLangs[0]})`);
  }

  // Shared hobbies
  const commonHobbies = (user.hobbies || []).filter((h) =>
    (candidate.hobbies || []).map(norm).includes(norm(h))
  );
  if (commonHobbies.length > 0) {
    reasons.push(`${commonHobbies.length} shared interest${commonHobbies.length > 1 ? "s" : ""}`);
  }

  return reasons.slice(0, 5);
}
