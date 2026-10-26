import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BarChart3, BookOpen, ChevronDown, Code2, FileText, MessageSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ACCENT, type Accent } from "@/components/common";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CHATS_KEY } from "@/features/AskSidebar";
import { ChatInput, MessageList, ModeBadge, useTutor, useTutorMode } from "@/features/tutor";
import type { ChatContext } from "@/lib/sse";

const SUGGESTIONS: { text: string; accent: Accent; icon: React.ReactNode }[] = [
  { text: "Explain Newton's third law", accent: "ask", icon: <MessageSquare className="h-5 w-5" strokeWidth={1.5} /> },
  { text: "Help me understand Python loops", accent: "learn", icon: <Code2 className="h-5 w-5" strokeWidth={1.5} /> },
  { text: "Quiz me on how computers learn", accent: "build", icon: <BarChart3 className="h-5 w-5" strokeWidth={1.5} /> },
  { text: "Help me study for tomorrow", accent: "explore", icon: <FileText className="h-5 w-5" strokeWidth={1.5} /> },
];

export default function Ask() {
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const [lessonCtx, setLessonCtx] = useState<boolean>(false);
  const context: ChatContext = lessonCtx ? { type: "lesson", id: "py-l6" } : {};
  const mode = useTutorMode(context);
  const t = useTutor(context);
  const sent = useRef(false);
  const chatId = Number(params.get("c")) || null;
  const shown = useRef<number | null>(null);      // which saved chat is on screen

  // ?c=<id> opens a saved chat (from the sidebar); no ?c starts a new one
  useEffect(() => {
    if (chatId && chatId !== shown.current && chatId !== t.conversationId.current) { shown.current = chatId; void t.loadConversation(chatId); }
    if (!chatId && shown.current) { shown.current = null; t.reset(); }
  }, [chatId, t]);
  // ?q=... comes from the top search box: ask it once, then keep the address tidy
  useEffect(() => {
    const q = params.get("q");
    if (q && !sent.current) { sent.current = true; const n = new URLSearchParams(params); n.delete("q"); setParams(n, { replace: true }); t.send(q); }
  }, [params, setParams, t]);
  // once an answer is finished, remember which chat this is and refresh the sidebar list
  useEffect(() => {
    if (t.busy) return;
    const id = t.conversationId.current;
    if (id) { qc.invalidateQueries({ queryKey: [CHATS_KEY] }); if (id !== chatId) { shown.current = id; const n = new URLSearchParams(params); n.set("c", String(id)); setParams(n, { replace: true }); } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.busy]);

  return (
    <section className="mx-auto flex min-h-[calc(100vh-124px)] w-full max-w-[1200px] min-w-0 flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2.5 text-[14px] text-primary card-soft" aria-label="Choose what the tutor should help with">
            <BookOpen className="h-4 w-4" strokeWidth={1.5} />{lessonCtx ? "Python Foundations · Lesson 6" : "Anything (no lesson selected)"}<ChevronDown className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={() => setLessonCtx(false)}>Anything (no lesson selected)</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setLessonCtx(true)}>Python Foundations · Lesson 6</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {mode.data && <ModeBadge badge={mode.data.badge} />}
      </div>

      <MessageList messages={t.messages} queue={t.queue} className="flex-1 pb-4" onRate={t.rate} onSuggest={t.send}
        empty={(
          <div className="pt-6 text-center">
            <h1 className="text-[42px]">Ask your AI tutor</h1>
            <p className="mx-auto mt-2 max-w-xl text-[16px] text-muted-foreground">Get personalized help, step-by-step explanations, and practice problems from a local AI tutor that understands your courses.</p>
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {SUGGESTIONS.map((s) => (
                <button key={s.text} onClick={() => t.send(s.text)} disabled={t.busy}
                  className={`relative flex min-h-[92px] items-center gap-3 rounded-xl border border-border p-4 pr-10 text-left font-serif text-[15px] leading-snug text-primary card-press ${ACCENT[s.accent].bg}`}>
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${ACCENT[s.accent].icon}`}>{s.icon}</span>
                  <span className="flex-1">{s.text}</span><ArrowRight className="absolute bottom-3 right-3 h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        )} />

      <div className="sticky bottom-4 mt-4 bg-gradient-to-t from-background via-background to-transparent pt-2">
        <ChatInput onSend={t.send} onStop={t.stop} busy={t.busy} placeholder="Ask anything…" />
        {mode.data && <p className="mt-2 text-center text-[12px] text-muted-foreground">AI tutor can make mistakes. Check with your teacher or the library. {mode.data.notice}</p>}
      </div>
    </section>
  );
}
