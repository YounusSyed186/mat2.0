import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.24.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const groqApiKey = Deno.env.get("GROQ_API_KEY") || "";
const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";
const groqUrl = "https://api.groq.com/openai/v1/chat/completions";
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

type GatewayError = Error & {
  status?: number;
  stage?: string;
  code?: string;
  details?: string;
  hint?: string;
};

function estimateTokens(input: unknown) {
  return Math.max(1, Math.ceil(JSON.stringify(input ?? "").length / 4));
}

function normalizeError(error: unknown, fallbackMessage = "Unexpected error"): GatewayError {
  if (error instanceof Error) return error as GatewayError;

  if (typeof error === "object" && error !== null) {
    const err = error as {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
      status?: number;
    };
    const normalized = new Error(err.message || fallbackMessage) as GatewayError;
    normalized.status = err.status;
    normalized.code = err.code;
    normalized.details = err.details;
    normalized.hint = err.hint;
    return normalized;
  }

  return new Error(String(error || fallbackMessage)) as GatewayError;
}

function withStage(error: unknown, stage: string, status?: number): GatewayError {
  const normalized = normalizeError(error);
  normalized.stage = normalized.stage || stage;
  normalized.status = normalized.status || status;
  return normalized;
}

async function recordUsage(supabase: ReturnType<typeof createClient>, featureName: string, requestedTokens: number, billable = true) {
  if (!billable) return;

  console.info("[ai-gateway] Recording AI usage", {
    featureName,
    requestedTokens,
    billable,
  });

  const { data, error } = await supabase.rpc("record_ai_usage", {
    feature_name: featureName,
    estimated_tokens: requestedTokens,
  });

  if (error) throw withStage(error, "record_usage");
  console.info("[ai-gateway] Usage RPC result", data);
  if (data && data.allowed === false) {
    const err = new Error(data.reason || "AI usage limit exceeded.") as GatewayError;
    err.status = 402;
    err.stage = "record_usage_limit";
    throw err;
  }
}

async function groqJson(prompt: string) {
  if (!groqApiKey) throw new Error("GROQ_API_KEY is not configured.");
  const response = await fetch(groqUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${groqApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const err = new Error(`Groq API error: ${response.status} ${response.statusText}${body ? ` - ${body.slice(0, 300)}` : ""}`) as GatewayError;
    err.status = response.status;
    err.stage = "groq_json";
    throw err;
  }
  const data = await response.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    throw withStage(error, "groq_json_parse", 502);
  }
}

async function groqText(prompt: string) {
  if (!groqApiKey) throw new Error("GROQ_API_KEY is not configured.");
  const response = await fetch(groqUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${groqApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const err = new Error(`Groq API error: ${response.status} ${response.statusText}${body ? ` - ${body.slice(0, 300)}` : ""}`) as GatewayError;
    err.status = response.status;
    err.stage = "groq_text";
    throw err;
  }
  const data = await response.json();
  return data.choices[0].message.content;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const action = body.action as string;
    console.info("[ai-gateway] Request received", {
      action,
      userId: userData.user.id,
    });

    if (action === "generateEmbedding") {
      if (!genAI) throw new Error("GEMINI_API_KEY is not configured.");
      const text = String(body.text || "");
      await recordUsage(supabase, body.featureName || "embedding", estimateTokens(text), body.billable !== false);
      const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
      const result = await model.embedContent(text).catch((error) => {
        throw withStage(error, "gemini_embedding", 502);
      });
      return jsonResponse({ embedding: result.embedding.values.slice(0, 1536) });
    }

    if (action === "generateProfileOptimization") {
      await recordUsage(supabase, "profile_optimizer", estimateTokens(body.profile));
      const profile = body.profile || {};
      const prompt = `Analyze this matrimonial profile and improve it for better matchmaking success.

Profile details:
Name: ${profile.name}
Age: ${profile.age}
Gender: ${profile.gender}
City: ${profile.city}
Profession: ${profile.profession}
Bio: ${profile.bio}
Languages: ${profile.languages?.join(", ")}
Ethnicity: ${profile.ethnicity}
Willing to relocate: ${profile.willing_to_relocate}
Introvert/Extrovert: ${profile.introvert_extrovert} (1-10)
Hobbies: ${profile.hobbies?.join(", ")}
Habits/Lifestyle: ${profile.habits}
Social Preferences: ${profile.social_preferences}
Career Ambition: ${profile.career_ambition}
Family Goals: ${profile.family_goals}
Lifestyle Choices: ${profile.lifestyle_choices}
Height: ${profile.height}
Fitness Level: ${profile.fitness_level}
Style: ${profile.style}
Search Intent: ${profile.search_intent}
Prompts: ${JSON.stringify(profile.prompts)}

Return ONLY valid JSON with keys: profile_score, strengths, weaknesses, missing_fields, suggestions, improved_bio, improved_profession, improved_hobbies, improved_habits, improved_prompts, match_boost_estimate.`;
      return jsonResponse({ result: await groqJson(prompt) });
    }

    if (action === "generateMatchExplanation") {
      const profiles = body.profiles || [];
      await recordUsage(supabase, "ai_match_explanation", estimateTokens({ query: body.query, profiles }));
      if (!Array.isArray(profiles) || profiles.length === 0) {
        return jsonResponse({ explanation: "I couldn't find any profiles matching your exact criteria right now. Try adjusting your search!" });
      }
      const simpleProfiles = profiles.map((p) => ({
        name: p.name,
        age: p.age,
        city: p.city,
        profession: p.profession,
        bio: p.bio,
        match_score: `${Math.round((p.similarity || 0) * 100)}%`,
      }));
      const prompt = `A user is searching for matrimonial matches with this query: "${body.query}"

Based on the vector search, here are the top matching profiles:
${JSON.stringify(simpleProfiles, null, 2)}

Write a friendly, concise response explaining WHY these profiles match the user's request. Keep it under 4 short paragraphs.`;
      return jsonResponse({ explanation: await groqText(prompt) });
    }

    if (action === "parseSearchFilters") {
      await recordUsage(supabase, "ai_match_filter_parse", estimateTokens(body.query));
      const prompt = `Analyze this search query for a matrimonial app: "${body.query}"

Return ONLY valid JSON: {"religion": string|null, "age_min": number|null, "age_max": number|null, "gender": string|null}`;
      return jsonResponse({ filters: await groqJson(prompt) });
    }

    return jsonResponse({ error: "Unsupported action." }, 400);
  } catch (error) {
    const normalized = normalizeError(error);
    const status = normalized.status || 500;
    console.error("[ai-gateway] Request failed", {
      message: normalized.message,
      stage: normalized.stage,
      code: normalized.code,
      details: normalized.details,
      hint: normalized.hint,
      status,
      raw: error,
    });
    return jsonResponse({
      error: normalized.message,
      stage: normalized.stage,
      code: normalized.code,
      details: normalized.details,
      hint: normalized.hint,
    }, status);
  }
});
