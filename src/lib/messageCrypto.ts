import { supabase } from "@/lib/supabaseClient";
import type { Message } from "@/types";

type EncryptedMessagePayload = {
  ciphertext: string;
  iv: string;
  key_version: number;
  encryption_scheme: string;
  content?: null;
};

type DecryptResponse = {
  messages: Array<{ id: string; content: string }>;
};

export async function encryptMessageContent(content: string): Promise<EncryptedMessagePayload> {
  const { data, error } = await supabase.functions.invoke<EncryptedMessagePayload>("message-crypto", {
    body: { action: "encrypt", content },
  });

  if (error) throw error;
  if (!data?.ciphertext || !data.iv) throw new Error("Message encryption failed.");
  return { ...data, content: null };
}

export async function decryptMessages<T extends Message>(messages: T[]): Promise<T[]> {
  const encrypted = messages.filter((message) => message.ciphertext && message.iv);
  if (encrypted.length === 0) return messages;

  const { data, error } = await supabase.functions.invoke<DecryptResponse>("message-crypto", {
    body: {
      action: "decrypt",
      messages: encrypted.map((message) => ({
        id: message.id,
        ciphertext: message.ciphertext,
        iv: message.iv,
        key_version: message.key_version || 1,
        encryption_scheme: message.encryption_scheme || "aes-256-gcm-recoverable-v1",
      })),
    },
  });

  if (error) {
    console.error("Message decryption failed:", error);
    return messages.map((message) => ({
      ...message,
      content: message.content || "[Encrypted message unavailable]",
    }));
  }

  const contentById = new Map((data?.messages || []).map((message) => [message.id, message.content]));
  return messages.map((message) => ({
    ...message,
    content: contentById.get(message.id) || message.content || "[Encrypted message unavailable]",
  }));
}

export function messagePreview(message?: Message | null) {
  if (!message) return "";
  if (message.content) return message.content;
  if (message.ciphertext) return "Encrypted message";
  return "";
}
