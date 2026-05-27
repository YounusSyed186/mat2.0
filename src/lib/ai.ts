import { supabase } from "@/lib/supabaseClient";

type AiAction =
  | "generateEmbedding"
  | "generateProfileOptimization"
  | "generateMatchExplanation"
  | "parseSearchFilters";

async function invokeAiGateway<T>(action: AiAction, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>("ai-gateway", {
    body: { action, ...payload },
  });

  if (error) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      const responseBody = await context.clone().json().catch(() => null) as {
        error?: string;
        stage?: string;
        code?: string;
        details?: string;
        hint?: string;
      } | null;
      console.error("[AI Gateway] Function request failed", {
        action,
        status: context.status,
        response: responseBody,
      });
      const detailParts = [
        responseBody?.error || `AI service failed with status ${context.status}.`,
        responseBody?.stage ? `Stage: ${responseBody.stage}` : null,
        responseBody?.code ? `Code: ${responseBody.code}` : null,
        responseBody?.details ? `Details: ${responseBody.details}` : null,
        responseBody?.hint ? `Hint: ${responseBody.hint}` : null,
      ].filter(Boolean);
      throw new Error(detailParts.join(" | "));
    }
    console.error("[AI Gateway] Function invoke failed before response", { action, error });
    throw error;
  }

  if (data === null || data === undefined) throw new Error("AI service returned an empty response.");
  return data;
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
