import { Lock, Minus, MessageSquare, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { ChatInput, MessageList, ModeBadge, useTutor, useTutorMode } from "./tutor";
import type { ChatContext } from "@/lib/sse";

/** The side-panel tutor used on Lesson and Build (docs/05: the panel shows the mode, what the tutor can do, who can see the chat). */
export function TutorPanel({ context, title = "AI Tutor", suggestions = [], defaultOpen = true }: { context: ChatContext; title?: string; suggestions?: string[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const mode = useTutorMode(context);
  const t = useTutor(context);
  return (
    <aside aria-label={title} className="rounded-xl border border-border bg-white card-soft">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#eef2f8] text-primary"><MessageSquare className="h-5 w-5" strokeWidth={1.5} /></span>
        <h2 className="flex-1 text-[19px]">{title}</h2>
        <button onClick={() => setOpen(!open)} aria-label={open ? "Collapse the tutor panel" : "Open the tutor panel"} aria-expanded={open} className="text-muted-foreground hover:text-primary"><Minus className="h-5 w-5" /></button>
      </header>
      {open && (
        <div className="flex flex-col gap-3 p-4">
          {mode.data && <ModeBadge badge={mode.data.badge} className="w-fit text-[12px]" />}
          {suggestions.length > 0 && t.messages.length === 0 && (
            <div className="flex flex-col gap-2">
              {suggestions.map((s) => <button key={s} onClick={() => t.send(s)} disabled={t.busy} className="rounded-xl bg-[#e0ebfc] px-4 py-2.5 text-left text-[14px] text-primary press hover:bg-[#d3e2fa]">{s}</button>)}
            </div>
          )}
          <MessageList messages={t.messages} queue={t.queue} compact className="max-h-[420px] overflow-y-auto pr-1" onRate={t.rate} onSuggest={t.send} />
          <ChatInput onSend={t.send} onStop={t.stop} busy={t.busy} placeholder="Ask a follow-up question…" compact />
          {mode.data && <p className="flex items-start gap-1.5 text-[11.5px] leading-snug text-muted-foreground"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />AI tutor — can make mistakes. {mode.data.notice}</p>}
        </div>
      )}
    </aside>
  );
}

export { Lock };
