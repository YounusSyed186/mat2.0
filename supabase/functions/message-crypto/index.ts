import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const scheme = "aes-256-gcm-recoverable-v1";

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function getKeyMaterial(version: number) {
  const keysJson = Deno.env.get("MESSAGE_ENCRYPTION_KEYS");
  if (keysJson) {
    const parsed = JSON.parse(keysJson) as Record<string, string>;
    if (parsed[String(version)]) return parsed[String(version)];
  }
  const fallbackKey = Deno.env.get("MESSAGE_ENCRYPTION_KEY_BASE64");
  if (fallbackKey && version === 1) return fallbackKey;
  throw new Error(`Missing message encryption key version ${version}.`);
}

async function importKey(version: number) {
  const keyBytes = base64ToBytes(getKeyMaterial(version));
  if (keyBytes.length !== 32) throw new Error("Message encryption key must be 32 bytes base64 encoded.");
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptContent(content: string) {
  const keyVersion = Number(Deno.env.get("MESSAGE_ENCRYPTION_ACTIVE_VERSION") || "1");
  const key = await importKey(keyVersion);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(content));
  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
    key_version: keyVersion,
    encryption_scheme: scheme,
  };
}

async function decryptContent(ciphertext: string, iv: string, keyVersion: number) {
  const key = await importKey(keyVersion);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(iv) }, key, base64ToBytes(ciphertext));
  return decoder.decode(decrypted);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json();
    if (body.action === "encrypt") {
      if (!body.content?.trim()) return jsonResponse({ error: "Message content is required." }, 400);
      return jsonResponse(await encryptContent(body.content.trim()));
    }

    if (body.action === "decrypt") {
      const messageIds = body.messages.map((message) => message.id);
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
      const isAdmin = profile?.role === "admin" || profile?.role === "primary_admin";
      const { data: dbMessages, error: dbError } = await supabase
        .from("messages")
        .select("id, sender_id, receiver_id")
        .in("id", messageIds);
      if (dbError) throw dbError;

      const allowedIds = new Set(
        (dbMessages || [])
          .filter((message) => isAdmin || message.sender_id === userData.user.id || message.receiver_id === userData.user.id)
          .map((message) => message.id),
      );
      const decrypted = await Promise.all(
        body.messages
          .filter((message) => allowedIds.has(message.id))
          .map(async (message) => ({
            id: message.id,
            content: await decryptContent(message.ciphertext, message.iv, message.key_version || 1),
          })),
      );
      return jsonResponse({ messages: decrypted });
    }

    return jsonResponse({ error: "Unsupported action." }, 400);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
