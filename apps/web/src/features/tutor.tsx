/** Tutor chat: streaming replies, visible queue, locked mode badge, fixed support responses (docs/41, 42, 43). */
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Copy, Lock, Send, ShieldCheck, Square, ThumbsDown, ThumbsUp } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Rosette } from "@/components/Rosette";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { get, post, ApiError } from "@/lib/api";
import { time } from "@/lib/format";
import { useUser } from "@/lib/session";
import { streamChat, type ChatContext } from "@/lib/sse";
import { cn, uid } from "@/lib/utils";

const Markdown = lazy(() => import("@/components/Markdown"));

export interface Msg {
  id: string;
  serverId?: number;
  role: "user" | "assistant";
  text: string;
  at: string;
  citations?: string[];
  safety?: { action: string; contact: { name: string; title: string | null } | null };
  feedback?: "up" | "down" | null;
  suggestions?: string[];
  pending?: boolean;
  /** Added in this visit (not loaded from history): it fades in. */
  fresh?: boolean;
}

export function useTutorMode(context: ChatContext) {
  return useQuery({
    queryKey: ["ai-mode", context.type ?? "none", context.id ?? "", context.question_id ?? ""],
    queryFn: () => get<{ mode: string; badge: string; locked: boolean; teacher_can_see: boolean; notice: string }>(
      `/api/ai/mode?${new URLSearchParams({ ...(context.type ? { context_type: context.type } : {}), ...(context.id ? { context_id: context.id } : {}), ...(context.question_id ? { question_id: context.question_id } : {}) })}`),
  });
}

export function useTutor(context: ChatContext) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [queue, setQueue] = useState<{ position: number; eta_s: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const conv = useRef<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  const ctxKey = JSON.stringify({ ...context, state: undefined });      // new readings are not a new conversation

  useEffect(() => { abort.current?.abort(); conv.current = null; setMessages([]); setError(null); setBusy(false); setQueue(null); }, [ctxKey]);

  const send = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setError(null);
    setBusy(true);
    const mid = uid();
    // the previous answer's follow-up chips go away once the student moves on
    setMessages((m) => [...m.map((x) => (x.suggestions ? { ...x, suggestions: undefined } : x)), { id: uid(), role: "user", text: t, at: time(), fresh: true }, { id: mid, role: "assistant", text: "", at: time(), pending: true, fresh: true }]);
    const patch = (f: (m: Msg) => Msg) => setMessages((all) => all.map((m) => (m.id === mid ? f(m) : m)));
    abort.current = new AbortController();
    try {
      await streamChat(t, context, conv.current, (e) => {
        if (e.type === "meta") conv.current = e.conversation_id;
        else if (e.type === "queue") setQueue({ position: e.position, eta_s: e.eta_s });
        else if (e.type === "token") { setQueue(null); patch((m) => ({ ...m, text: m.text + e.text })); }
        else if (e.type === "replace") patch((m) => ({ ...m, text: e.text }));
        else if (e.type === "citations") patch((m) => ({ ...m, citations: e.items }));
        else if (e.type === "suggestions") patch((m) => ({ ...m, suggestions: e.items }));
        else if (e.type === "safety") patch((m) => ({ ...m, text: e.text, safety: { action: e.action, contact: e.contact } }));
        else if (e.type === "error") { setError(e.message); patch((m) => ({ ...m, text: e.message })); }
        else if (e.type === "done") patch((m) => ({ ...m, pending: false, serverId: e.message_id }));
      }, abort.current.signal);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        const msg = err instanceof ApiError ? err.message : "The tutor isn't available right now.";
        setError(msg);
        patch((m) => ({ ...m, text: msg, pending: false }));
      }
    } finally {
      setBusy(false);
      setQueue(null);
      patch((m) => ({ ...m, pending: false, text: m.text || "Stopped.", suggestions: m.suggestions }));
    }
  }, [busy, context]);

  /** Stop generating: the reply so far stays on screen. */
  const stop = useCallback(() => { abort.current?.abort(); }, []);

  const rate = useCallback(async (m: Msg, value: "up" | "down") => {
    if (!m.serverId) return;
    const next = m.feedback === value ? null : value;
    setMessages((all) => all.map((x) => (x.id === m.id ? { ...x, feedback: next } : x)));
    try { await post(`/api/ai/messages/${m.serverId}/feedback`, { value: next }); }
    catch { setMessages((all) => all.map((x) => (x.id === m.id ? { ...x, feedback: m.feedback } : x))); }
  }, []);

  const loadConversation = useCallback(async (id: number) => {
    abort.current?.abort();
    const c = await get<{ id: number; messages: { id: number; role: "user" | "assistant"; content: string; citations: string[] | null; created_at: string; feedback: "up" | "down" | null; safety: boolean }[] }>(`/api/ai/conversations/${id}`);
    conv.current = c.id;
    setBusy(false); setQueue(null); setError(null);
    setMessages(c.messages.map((m) => ({ id: String(m.id), serverId: m.role === "assistant" ? m.id : undefined, role: m.role, text: m.content, at: time(new Date(m.created_at)), citations: m.citations ?? undefined, feedback: m.feedback, safety: m.safety ? { action: "support", contact: null } : undefined })));
  }, []);

  const reset = useCallback(() => { abort.current?.abort(); conv.current = null; setMessages([]); setError(null); setBusy(false); setQueue(null); }, []);
  return { messages, busy, queue, error, send, stop, rate, reset, loadConversation, conversationId: conv };
}

function Rich({ text }: { text: string }) {
  return <Suspense fallback={<p className="whitespace-pre-wrap leading-relaxed">{text}</p>}><Markdown text={text} /></Suspense>;
}

export function ModeBadge({ badge, className = "" }: { badge: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border border-border bg-white px-3.5 py-2 text-[13px] text-primary", className)}>
      <Lock className="h-3.5 w-3.5" aria-hidden="true" /><span>{badge}</span>
    </span>
  );
}

function Actions({ m, onRate }: { m: Msg; onRate?: (m: Msg, v: "up" | "down") => void }) {
  const [copied, setCopied] = useState(false);
  const btn = "press grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary";
  return (
    <div className="mt-2 flex items-center gap-1" role="group" aria-label="Answer actions">
      <span className="mr-2 text-xs text-muted-foreground">{m.at}</span>
      <button className={btn} aria-label={copied ? "Copied" : "Copy this answer"} title="Copy" onClick={() => { navigator.clipboard?.writeText(m.text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? <Check className="h-4 w-4 text-okay" /> : <Copy className="h-4 w-4" />}</button>
      {onRate && m.serverId && !m.safety && (<>
        <button className={cn(btn, m.feedback === "up" && "bg-[var(--pill-green)] text-[var(--pill-green-fg)]")} aria-label="This answer helped" aria-pressed={m.feedback === "up"} title="Helpful" onClick={() => onRate(m, "up")}><ThumbsUp className="h-4 w-4" /></button>
        <button className={cn(btn, m.feedback === "down" && "bg-[var(--pill-rose)] text-[var(--pill-rose-fg)]")} aria-label="This answer was wrong or unhelpful. Tell my teacher" aria-pressed={m.feedback === "down"} title="Not right. Your teacher will see this" onClick={() => onRate(m, "down")}><ThumbsDown className="h-4 w-4" /></button>
      </>)}
      {m.feedback === "down" && <span className="ml-1 text-xs text-muted-foreground">Thanks, your teacher will take a look.</span>}
    </div>
  );
}

export function MessageList({ messages, queue, empty, className = "", compact = false, onRate, onSuggest }: {
  messages: Msg[]; queue: { position: number; eta_s: number } | null; empty?: ReactNode; className?: string; compact?: boolean;
  onRate?: (m: Msg, v: "up" | "down") => void; onSuggest?: (text: string) => void;
}) {
  const user = useUser();
  const end = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  // Auto-scroll follows the answer only while the reader is at the bottom: scrolling up to re-read is never fought.
  useEffect(() => {
    const el = end.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => { nearBottom.current = e.isIntersecting; }, { rootMargin: "0px 0px 160px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [messages.length === 0]);
  useEffect(() => {
    const last = messages[messages.length - 1];
    const streaming = last?.role === "assistant" && last.pending;
    const ownNew = last?.role === "user" || (streaming && !last.text);
    // a smooth scroll on every streamed word queues up and stutters; follow the text instantly while it streams
    if (ownNew) end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    else if (nearBottom.current) end.current?.scrollIntoView({ block: "nearest", behavior: streaming ? "instant" : "smooth" });
  }, [messages, queue]);
  if (messages.length === 0) return <div className={className}>{empty}</div>;
  const lastId = messages[messages.length - 1]?.id;
  return (
    <div className={cn("flex flex-col gap-4", className)} aria-live="polite">
      {messages.map((m) => m.role === "user" ? (
        <div key={m.id} className={cn("flex flex-col items-end", m.fresh && "rise-in")}>
          <div className="flex items-start gap-2">
            <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-[#e0ebfc] px-4 py-2.5 text-[15px] text-[#0b1f3b]">{m.text}</div>
            {!compact && <Avatar className="h-9 w-9"><AvatarFallback className="bg-[#d9e1ec] text-xs text-primary">{user.initials}</AvatarFallback></Avatar>}
          </div>
          <span className="mt-1 pr-1 text-xs text-muted-foreground">{m.at}</span>
        </div>
      ) : (
        <div key={m.id} className={cn("flex items-start gap-3", m.fresh && "rise-in")}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eef2f8] text-primary"><Rosette className="h-6 w-6" /></div>
          <div className="min-w-0 max-w-[92%]">
            <div className={cn("rounded-xl border bg-white p-4 text-[15px] text-[#374151] card-soft", m.safety ? "border-[#c7d7ee] bg-[#f4f8fd]" : "border-border")}>
              {m.safety && <p className="mb-2 flex items-center gap-2 text-sm font-medium text-primary"><ShieldCheck className="h-4 w-4" />A message from your school's tutor</p>}
              {m.text ? (m.safety ? <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p> : <Rich text={m.text} />) : m.pending ? (
                <p className={cn("text-muted-foreground", !queue && "animate-pulse")}>{queue ? `You're ${queue.position === 1 ? "next" : `number ${queue.position} in line`}. About ${queue.eta_s} seconds.` : "Thinking…"}</p>
              ) : null}
              {m.citations && m.citations.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{m.citations.map((c) => (/^from /i.test(c) ? c : `From ${c}`)).join(" · ")}</p>}
            </div>
            {!m.pending && m.text && <Actions m={m} onRate={onRate} />}
            {onSuggest && m.id === lastId && !m.pending && m.suggestions && m.suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Suggested follow-up questions">
                {m.suggestions.map((s) => <button key={s} onClick={() => onSuggest(s)} className="rounded-full border border-[#c7d7ee] bg-[#eef3fb] px-3.5 py-1.5 text-[13.5px] text-primary press hover:bg-[#dfe9f8]">{s}</button>)}
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={end} />
    </div>
  );
}

/** Enter sends, Shift+Enter adds a new line. While the tutor is answering the send button becomes Stop. */
export function ChatInput({ onSend, onStop, busy, placeholder = "Ask anything…", compact = false, initial = "" }: { onSend: (t: string) => void; onStop?: () => void; busy: boolean; placeholder?: string; compact?: boolean; initial?: string }) {
  const [v, setV] = useState(initial);
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const el = ta.current; if (el) { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 140)}px`; } }, [v]);
  const submit = () => { if (v.trim() && !busy) { onSend(v); setV(""); } };
  return (
    <form className={cn("flex items-end gap-2 border border-border bg-white p-1.5 pl-4 card-soft", compact ? "rounded-lg" : "rounded-3xl")} onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <textarea ref={ta} rows={1} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} aria-label="Message to the tutor" maxLength={1200}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
        className="max-h-[140px] min-h-9 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-[15px] placeholder:text-muted-foreground focus:outline-none" />
      {busy ? (
        <button type="button" onClick={onStop} aria-label="Stop the answer" title="Stop" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-white press hover:opacity-90"><Square className="h-3.5 w-3.5 fill-current" /></button>
      ) : (
        <button type="submit" disabled={!v.trim()} aria-label="Send" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eef2f8] text-primary press hover:bg-[#dfe7f3] disabled:opacity-50">
          {compact ? <Send className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
        </button>
      )}
    </form>
  );
}
