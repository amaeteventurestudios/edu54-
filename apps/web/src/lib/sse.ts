/** Streams POST /api/ai/chat (server-sent events over fetch) and calls back for every event. */
import { ApiError } from "./api";

export type ChatEvent =
  | { type: "meta"; conversation_id: number; mode: string; badge: string; locked: boolean; title: string | null }
  | { type: "suggestions"; items: string[] }
  | { type: "queue"; position: number; eta_s: number }
  | { type: "token"; text: string }
  | { type: "replace"; text: string; reason: string }
  | { type: "citations"; items: string[] }
  | { type: "hint"; step: number; total: number }
  | { type: "safety"; action: string; category: string | null; text: string; contact: { name: string; title: string | null } | null; resources: { name: string; how: string }[] }
  | { type: "error"; code: string; message: string }
  | { type: "done"; message_id: number };

export interface ChatContext { type?: "lesson" | "assignment" | "revision" | "project" | "experiment"; id?: string; question_id?: string;
  /** Discovery Lab: the experiment's current settings and readings, sent with each question (the server keeps only what the
   *  experiment declares). Changing them does not start a new conversation. */
  state?: Record<string, number | string> }

export async function streamChat(message: string, context: ChatContext, conversationId: number | null, onEvent: (e: ChatEvent) => void, signal?: AbortSignal) {
  const csrf = document.cookie.split("; ").find((c) => c.startsWith("umanah_csrf="))?.split("=")[1] ?? "";
  const res = await fetch("/api/ai/chat", {
    method: "POST", signal, credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
    body: JSON.stringify({ message, context, ...(conversationId ? { conversation_id: conversationId } : {}) }),
  });
  if (!res.ok || !res.body) {
    const j = await res.json().catch(() => null);
    throw new ApiError(res.status, j?.error?.code ?? "error", j?.error?.message ?? "The tutor isn't available right now.");
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 2);
      if (line.startsWith("data: ")) onEvent(JSON.parse(line.slice(6)) as ChatEvent);
    }
  }
}
