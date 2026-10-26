import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, ChevronRight, FileText, Folder, Library, MessageSquare, Pencil, PlayCircle, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Pill } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { get, type Band } from "@/lib/api";
import { contentBands } from "@/lib/bands";
import { useUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { EpubReader } from "./EpubReader";
import { ExercisePlayer } from "./ExercisePlayer";

// School Library (docs/13, 47): the offline course channels (Khan Academy, storybooks, simulations, video lessons), browsed
// by channel and topic. Videos and books play here; interactive apps run in a sandboxed frame; practice sets say so plainly.
interface Item { id: string; title: string; kind: string; description: string; thumbnail: string | null; license: string | null; author: string | null; count: number | null; url?: string; format?: string; captions?: string }
interface Channel { id: string; title: string; description: string; thumbnail: string | null }
interface NodeRes { node: Item; trail: { id: string; title: string }[]; children: Item[] }

const KIND: Record<string, { label: string; icon: ReactNode }> = {
  topic: { label: "Folder", icon: <Folder className="h-5 w-5" strokeWidth={1.6} /> },
  video: { label: "Video", icon: <PlayCircle className="h-5 w-5" strokeWidth={1.6} /> },
  audio: { label: "Audio", icon: <PlayCircle className="h-5 w-5" strokeWidth={1.6} /> },
  html5: { label: "Interactive", icon: <Sparkles className="h-5 w-5" strokeWidth={1.6} /> },
  document: { label: "Book", icon: <FileText className="h-5 w-5" strokeWidth={1.6} /> },
  exercise: { label: "Practice", icon: <Pencil className="h-5 w-5" strokeWidth={1.6} /> },
};
// Which channels suit which grade bands (students see their band's shelves; staff and students without a grade see all).
const CHANNEL_BANDS: [RegExp, Band[]][] = [[/storybook|digital library/i, ["discover", "explore"]], [/blockly/i, ["discover", "explore", "build"]],
  [/phet/i, ["explore", "build", "launch"]], [/blossoms/i, ["build", "launch"]]];
const channelFits = (title: string, bands: Band[] | null) => !bands || (CHANNEL_BANDS.find(([re]) => re.test(title))?.[1] ?? ["discover", "explore", "build", "launch"]).some((b) => bands.includes(b));

const kind = (k: string) => KIND[k] ?? { label: "Resource", icon: <BookOpen className="h-5 w-5" strokeWidth={1.6} /> };

export function LibraryBrowser({ at, open, go, isStudent }: { at: string | null; open: string | null; go: (o: { at?: string | null; open?: string | null }) => void; isStudent: boolean }) {
  const nav = useNavigate();
  const channels = useQuery({ queryKey: ["library-channels"], queryFn: () => get<{ channels: Channel[]; unavailable?: boolean }>("/api/library/channels"), enabled: !at });
  const folder = useQuery({ queryKey: ["library-node", at], queryFn: () => get<NodeRes>(`/api/library/nodes/${at}`), enabled: !!at });
  const user = useUser();
  const bands = user.band ? contentBands(user) : null;
  const items: Item[] = at ? folder.data?.children ?? [] : (channels.data?.channels ?? []).filter((c) => channelFits(c.title, bands)).map((c) => ({ ...c, kind: "topic", license: null, author: null, count: null }));
  const loading = at ? folder.isLoading : channels.isLoading;
  const current = items.find((i) => i.id === open && i.kind !== "topic");
  const trail = at && folder.data ? [...folder.data.trail, { id: folder.data.node.id, title: folder.data.node.title }] : [];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section aria-label="Library shelves" className="rounded-xl border border-border bg-white p-4 card-soft">
        <nav aria-label="Where you are" className="mb-2 flex flex-wrap items-center gap-1 text-sm">
          <button className={cn("hover:underline", trail.length ? "text-primary" : "font-serif text-[22px] text-primary")} onClick={() => go({ at: null, open: null })}>School Library</button>
          {trail.map((t, i) => (
            <span key={t.id} className="flex items-center gap-1"><ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              {i === trail.length - 1 ? <span className="font-serif text-[20px] text-primary">{t.title}</span> : <button className="text-primary hover:underline" onClick={() => go({ at: t.id, open: null })}>{t.title}</button>}
            </span>))}
        </nav>
        {!at && <p className="mb-2 text-sm text-muted-foreground">Courses, videos, storybooks and science simulations, stored on your school's device.</p>}
        {loading && <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>}
        {channels.data?.unavailable && !at && <p className="rounded-lg bg-[#fbf3e2] p-4 text-sm text-[#5a4210]">The School Library isn't available right now. Your lessons and Build still work. Ask your teacher to check Lab Status.</p>}
        {!loading && !channels.data?.unavailable && items.length === 0 && <p className="p-4 text-[15px] text-muted-foreground">Nothing here yet.</p>}
        <ul className="divide-y divide-border">
          {items.map((it) => (
            <li key={it.id}><button onClick={() => (it.kind === "topic" ? go({ at: it.id, open: null }) : go({ open: it.id }))} aria-current={open === it.id}
              className={cn("flex w-full items-start gap-3 rounded-lg px-2 py-3 text-left hover:bg-[#f4f6fb]", open === it.id && "bg-[#e9eff8]")}>
              {it.thumbnail ? <img src={it.thumbnail} alt="" className="h-10 w-14 shrink-0 rounded-md bg-[#e4eefc] object-cover" loading="lazy" />
                : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#e4eefc] text-primary">{kind(it.kind).icon}</span>}
              <span className="min-w-0 flex-1"><span className="block font-serif text-[17px] text-primary">{it.title}</span>
                {it.description && <span className="line-clamp-2 text-[14px] text-muted-foreground">{it.description}</span>}
                <span className="mt-1 inline-flex gap-1.5"><Pill tone={it.kind === "topic" ? "blue" : "green"}>{kind(it.kind).label}</Pill>{it.kind === "topic" && it.count ? <Pill tone="gray">{it.count} items</Pill> : null}</span></span>
              <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-primary" />
            </button></li>))}
        </ul>
      </section>

      <section aria-label="Reader" className="flex min-h-[520px] flex-col overflow-hidden rounded-xl border border-border bg-white card-soft lg:sticky lg:top-[76px] lg:self-start">
        {current ? (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e4eefc] text-primary">{kind(current.kind).icon}</span>
                <div className="min-w-0"><p className="truncate font-serif text-[18px] text-primary">{current.title}</p><p className="truncate text-xs text-muted-foreground">{[current.author, current.license].filter(Boolean).join(" · ") || trail[0]?.title}</p></div></div>
              <Pill tone="green">Approved Local Material</Pill>
            </div>
            <div className="flex min-h-[420px] flex-1 bg-white">
              {current.kind === "video" && current.url && <video key={current.id} controls preload="metadata" poster={current.thumbnail ?? undefined} className="m-auto max-h-[70vh] w-full bg-black">
                <source src={current.url} />{current.captions && <track kind="captions" src={current.captions} srcLang="en" label="English" default />}</video>}
              {current.kind === "audio" && current.url && <audio key={current.id} controls src={current.url} className="m-auto w-4/5" />}
              {current.kind === "html5" && current.url && <iframe key={current.id} title={current.title} src={current.url} sandbox="allow-scripts allow-popups allow-forms allow-modals allow-pointer-lock" allow="fullscreen" className="min-h-[480px] w-full flex-1" />}
              {current.kind === "document" && current.url && (current.format === "pdf" ? <iframe key={current.id} title={current.title} src={current.url} className="min-h-[480px] w-full flex-1" />
                : current.format === "epub" ? <EpubReader key={current.id} url={current.url} title={current.title} />
                : <p className="m-auto p-8 text-center text-sm text-muted-foreground">This book opens on its own: <a className="text-primary underline" href={current.url} target="_blank" rel="noopener">download it</a>.</p>)}
              {current.kind === "exercise" && <ExercisePlayer key={current.id} nodeId={current.id} />}
              {current.kind !== "exercise" && !current.url && <div className="m-auto max-w-sm p-8 text-center"><Pencil className="mx-auto h-10 w-10 text-primary/60" strokeWidth={1.4} /><p className="mt-3 font-serif text-[20px] text-primary">This item can't be shown here</p><p className="mt-1 text-sm text-muted-foreground">Try another item in this folder, or ask the tutor about the topic.</p></div>}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border bg-[#f3f2fc] px-4 py-3">
              <div className="min-w-0"><p className="font-serif text-[16px] text-primary">Ask about this topic</p><p className="text-xs text-muted-foreground">The tutor can explain it in simpler words.</p></div>
              {isStudent && <Button className="shrink-0" onClick={() => nav(`/ask?q=${encodeURIComponent(`Can you explain ${current.title.replace(/^Video:\s*/, "")} in simple words?`)}`)}><MessageSquare className="mr-2 h-4 w-4" />Ask the tutor</Button>}
            </div>
          </>
        ) : (
          <div className="m-auto max-w-sm p-8 text-center"><Library className="mx-auto h-10 w-10 text-primary/60" strokeWidth={1.4} /><p className="mt-3 font-serif text-[20px] text-primary">Open a folder, then pick something to watch or try</p><p className="mt-1 text-sm text-muted-foreground">Everything in the School Library is stored on your school's device, so it works even when the internet is off.</p></div>
        )}
      </section>
    </div>
  );
}
