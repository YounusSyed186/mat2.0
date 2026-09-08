import { supabase } from "@/lib/supabaseClient";
import { GoogleGenerativeAI } from "@google/generative-ai";

type AiAction =
  | "generateEmbedding"
  | "generateProfileOptimization"
  | "generateMatchExplanation"
  | "parseSearchFilters";

const viteGroqKey = import.meta.env.VITE_GROQ_API_KEY || "";
const viteGeminiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const groqUrl = "https://api.groq.com/openai/v1/chat/completions";

// Active supported models on Groq
const candidateGroqModels = [
  import.meta.env.VITE_GROQ_MODEL || "openai/gpt-oss-20b",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "qwen/qwen3.6-27b",
  "groq/compound-mini",
].filter((m, i, arr) => arr.indexOf(m) === i);

// ── Direct Groq Fallback Helper ─────────────────────────────────────────────
async function directGroqCall(prompt: string, jsonMode = false): Promise<unknown> {
  if (!viteGroqKey) {
    throw new Error("VITE_GROQ_API_KEY is not set in .env file.");
  }

  let lastError: Error | null = null;
  for (const model of candidateGroqModels) {
    try {
      const response = await fetch(groqUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${viteGroqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        // If model decommissioned (400) or not found (404), try next model in candidate list
        if (
          (response.status === 400 && (errText.includes("decommissioned") || errText.includes("invalid_request_error"))) ||
          (response.status === 404 && errText.includes("model_not_found"))
        ) {
          console.warn(`[AI Client] Model '${model}' unavailable on Groq, trying next supported model...`);
          continue;
        }
        throw new Error(`Groq API error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      if (jsonMode) {
        return JSON.parse(content);
      }
      return content;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error("Failed to process request with Groq models.");
}

// ── Direct Gemini Embedding Helper ──────────────────────────────────────────
async function directGeminiEmbedding(text: string): Promise<number[]> {
  if (!viteGeminiKey) {
    throw new Error("VITE_GEMINI_API_KEY is not set in .env file.");
  }
  const genAI = new GoogleGenerativeAI(viteGeminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  const result = await model.embedContent(text);
  return result.embedding.values.slice(0, 1536);
}

// ── Gateway Invoker with Direct Fallback ────────────────────────────────────
async function invokeAiGateway<T>(action: AiAction, payload: Record<string, unknown>): Promise<T> {
  // Direct client-side execution for Groq and Gemini
  if (action === "generateProfileOptimization") {
    const profile = (payload.profile || {}) as Record<string, unknown>;
    const prompt = `Analyze this matrimonial profile and improve it for better matchmaking success.

Profile details:
Name: ${profile.name || ""}
Age: ${profile.age || ""}
Gender: ${profile.gender || ""}
City: ${profile.city || ""}
Profession: ${profile.profession || ""}
Bio: ${profile.bio || ""}
Languages: ${Array.isArray(profile.languages) ? profile.languages.join(", ") : ""}
Ethnicity: ${profile.ethnicity || ""}
Willing to relocate: ${profile.willing_to_relocate || false}
Introvert/Extrovert: ${profile.introvert_extrovert || ""} (1-10)
Hobbies: ${Array.isArray(profile.hobbies) ? profile.hobbies.join(", ") : ""}
Habits/Lifestyle: ${profile.habits || ""}
Social Preferences: ${profile.social_preferences || ""}
Career Ambition: ${profile.career_ambition || ""}
Family Goals: ${profile.family_goals || ""}
Lifestyle Choices: ${profile.lifestyle_choices || ""}
Height: ${profile.height || ""}
Fitness Level: ${profile.fitness_level || ""}
Style: ${profile.style || ""}
Search Intent: ${profile.search_intent || ""}
Prompts: ${JSON.stringify(profile.prompts || {})}

Return ONLY valid JSON with keys: profile_score, strengths, weaknesses, missing_fields, suggestions, improved_bio, improved_profession, improved_hobbies, improved_habits, improved_prompts, match_boost_estimate.`;

    const result = await directGroqCall(prompt, true);
    return { result } as T;
  }

  if (action === "generateMatchExplanation") {
    const profiles = (payload.profiles || []) as Array<Record<string, unknown>>;
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return { explanation: "I couldn't find any profiles matching your exact criteria right now. Try adjusting your search!" } as T;
    }
    const simpleProfiles = profiles.map((p) => ({
      name: p.name,
      age: p.age,
      city: p.city,
      profession: p.profession,
      bio: p.bio,
      match_score: `${Math.round(((p.similarity as number) || 0) * 100)}%`,
    }));
    const prompt = `A user is searching for matrimonial matches with this query: "${payload.query}"

Based on the vector search, here are the top matching profiles:
${JSON.stringify(simpleProfiles, null, 2)}

Write a friendly, concise response explaining WHY these profiles match the user's request. Keep it under 4 short paragraphs.`;

    const explanation = await directGroqCall(prompt, false);
    return { explanation } as T;
  }

  if (action === "parseSearchFilters") {
    const prompt = `Analyze this search query for a matrimonial app: "${payload.query}"

Return ONLY valid JSON: {"religion": string|null, "age_min": number|null, "age_max": number|null, "gender": string|null}`;
    const filters = await directGroqCall(prompt, true);
    return { filters } as T;
  }

  if (action === "generateEmbedding") {
    try {
      const { data, error } = await supabase.functions.invoke<T>("ai-gateway", {
        body: { action, ...payload },
      });
      if (!error && data) return data;
    } catch {
      // ignore
    }
    const embedding = await directGeminiEmbedding(String(payload.text || ""));
    return { embedding } as T;
  }

  throw new Error(`Unsupported AI action: ${action}`);
}

export async function generateEmbedding(text: string, options: { billable?: boolean; featureName?: string } = {}): Promise<number[]> {
  const result = await invokeAiGateway<{ embedding: number[] }>("generateEmbedding", {
    text,
    billable: options.billable ?? true,
    featureName: options.featureName || "embedding",
  });
  return result.embedding;
}

export async function generateProfileOptimization(profile: unknown) {
  const result = await invokeAiGateway<{ result: Record<string, unknown> }>("generateProfileOptimization", { profile });
  return result.result;
}

export async function generateMatchExplanation(query: string, profiles: unknown[]) {
  const result = await invokeAiGateway<{ explanation: string }>("generateMatchExplanation", { query, profiles });
  return result.explanation;
}

export async function parseSearchFilters(query: string) {
  const result = await invokeAiGateway<{ filters: unknown }>("parseSearchFilters", { query });
  return result.filters as {
    religion: string | null;
    age_min: number | null;
    age_max: number | null;
    gender: string | null;
  } | null;
}
