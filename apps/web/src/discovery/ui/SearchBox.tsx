/** "What would you like to explore?": a combobox that searches the local catalog on every keystroke (no AI, nothing sent). */
import { Search } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pill } from "@/components/common";
import { cn } from "@/lib/utils";
import { search, type Doc } from "../search.ts";
import { useCatalog } from "./data";

const KIND: Record<Doc["kind"], string> = { experience: "Experiment", topic: "Topic", lab: "Lab", journey: "Journey" };

export function hrefFor(d: Doc) {
  if (d.kind === "lab") return `/discover/${d.labId}`;
  if (d.kind === "journey") return `/discover/journey/${d.id}`;
  if (d.kind === "topic") return `/discover/${d.labId}?topic=${d.topicId}`;
  return d.status === "working" ? `/discover/${d.labId}/${d.id}` : `/discover/${d.labId}?topic=${d.topicId}`;
}

export function SearchBox({ big = false, className, autoFocus = false }: { big?: boolean; className?: string; autoFocus?: boolean }) {
  const { index } = useCatalog();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const hits = useMemo(() => search(index, q, 8), [index, q]);
  const go = (d: Doc) => { setOpen(false); setQ(""); input.current?.blur(); nav(hrefFor(d)); };
  const show = open && q.trim().length > 0;

  return (
    <div className={cn("relative", className)}>
      <form role="search" onSubmit={(e) => { e.preventDefault(); if (show && hits[active]) go(hits[active].doc); else if (q.trim()) { setOpen(false); nav(`/discover/search?q=${encodeURIComponent(q.trim())}`); } }}>
        <Search className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground", big ? "left-5 h-5 w-5" : "left-3 h-4 w-4")} aria-hidden="true" />
        <input ref={input} value={q} autoFocus={autoFocus} role="combobox" aria-expanded={show} aria-controls={`${id}-list`} aria-autocomplete="list"
          aria-activedescendant={show && hits[active] ? `${id}-${active}` : undefined} aria-label="Search experiments, topics and labs"
          placeholder={big ? "Try gravity, circuits, the Moon…" : "Search Discovery Lab…"}
          onChange={(e) => { setQ(e.target.value); setActive(0); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(hits.length - 1, a + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
            else if (e.key === "Escape") { setOpen(false); }
          }}
          className={cn("w-full border border-input bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            big ? "h-14 rounded-2xl pl-13 pr-4 text-[17px] card-soft" : "h-10 rounded-[10px] pl-9 pr-3 text-sm")} />
      </form>
      {show && (
        <ul id={`${id}-list`} role="listbox" aria-label="Search results" className="absolute inset-x-0 top-full z-40 mt-2 max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-white p-1.5 text-left shadow-lg">
          {hits.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">Nothing matches “{q.trim()}” yet. Try a simpler word, like “light” or “numbers”.</li>}
          {hits.map((h, i) => (
            <li key={`${h.doc.kind}-${h.doc.id}`} id={`${id}-${i}`} role="option" aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); go(h.doc); }} onMouseEnter={() => setActive(i)}
              className={cn("flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5", i === active && "bg-accent")}>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-primary">{h.doc.title}</span>
                <span className="block truncate text-[13px] text-muted-foreground">{h.doc.detail}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{KIND[h.doc.kind]}</span>
                {h.doc.kind === "experience" && <Pill tone={h.doc.status === "working" ? "green" : "gray"} className="text-[10.5px]">{h.doc.status === "working" ? "Ready" : "Planned"}</Pill>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
