import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, FileText, GraduationCap, Image, Library, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Pill } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError, get } from "@/lib/api";
import { useBrand } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { EpubReader } from "./EpubReader";

// Local Documents (the school's own files, stored on this device) and Teacher Resources (teacher guides from the course libraries).
export interface Doc { id: number; title: string; filename: string; type: string; size: number; audience: "students" | "staff"; uploaded_by: string | null; created_at: string; url: string }
export const useDocs = () => useQuery({ queryKey: ["documents"], queryFn: () => get<{ documents: Doc[]; can_upload: boolean; demo: boolean }>("/api/documents") });

function DocViewer({ d }: { d: Doc }) {
  const text = useQuery({ queryKey: ["doc-text", d.id], queryFn: async () => (await fetch(d.url, { credentials: "same-origin" })).text(), enabled: d.type === "txt" });
  if (d.type === "pdf") return <iframe title={d.title} src={d.url} className="min-h-[520px] w-full flex-1" />;
  if (d.type === "png" || d.type === "jpg") return <img src={d.url} alt={d.title} className="m-auto max-h-[70vh] max-w-full object-contain p-4" />;
  if (d.type === "epub") return <EpubReader url={d.url} title={d.title} />;
  return <pre className="m-0 w-full flex-1 overflow-auto whitespace-pre-wrap p-5 font-mono text-[14px] text-[#1f2937]">{text.data ?? "Opening…"}</pre>;
}

export function LocalDocuments({ open, go }: { open: string | null; go: (id: string | null) => void }) {
  const docs = useDocs();
  const list = docs.data?.documents ?? [];
  const current = list.find((d) => String(d.id) === open);
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section aria-label="Local documents" className="rounded-xl border border-border bg-white p-4 card-soft">
        <h2 className="mb-1 text-[22px]">Local Documents</h2>
        <p className="mb-2 text-sm text-muted-foreground">Handouts, readings and notes from your school, stored on this device.</p>
        {!docs.data ? <Skeleton className="h-40" /> : list.length === 0 ? <p className="p-4 text-[15px] text-muted-foreground">No documents yet. {docs.data.can_upload ? "Add one from Resources." : "Your teachers can add some."}</p> : (
          <ul className="divide-y divide-border">{list.map((d) => (
            <li key={d.id}><button onClick={() => go(String(d.id))} aria-current={open === String(d.id)} className={cn("flex w-full items-start gap-3 rounded-lg px-2 py-3 text-left hover:bg-[#f4f6fb]", open === String(d.id) && "bg-[#e9eff8]")}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#e4eefc] text-primary">{d.type === "png" || d.type === "jpg" ? <Image className="h-5 w-5" /> : <FileText className="h-5 w-5" />}</span>
              <span className="min-w-0 flex-1"><span className="block font-serif text-[17px] text-primary">{d.title}</span><span className="text-xs text-muted-foreground">{d.uploaded_by ? `From ${d.uploaded_by} · ` : ""}{new Date(d.created_at).toLocaleDateString()}</span>
                {d.audience === "staff" && <Pill tone="amber" className="ml-2">Staff only</Pill>}</span>
              <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-primary" />
            </button></li>))}</ul>)}
      </section>
      <section aria-label="Reader" className="flex min-h-[520px] flex-col overflow-hidden rounded-xl border border-border bg-white card-soft lg:sticky lg:top-[76px] lg:self-start">
        {current ? (<><div className="border-b border-border px-4 py-3"><p className="font-serif text-[18px] text-primary">{current.title}</p><p className="text-xs text-muted-foreground">{current.filename}</p></div><DocViewer d={current} /></>)
          : <div className="m-auto max-w-sm p-8 text-center"><Library className="mx-auto h-10 w-10 text-primary/60" strokeWidth={1.4} /><p className="mt-3 font-serif text-[20px] text-primary">Pick a document to read it here</p></div>}
      </section>
    </div>
  );
}

const TEACHER_SHELVES = [
  { title: "Khan for Educators", text: "How to teach with Khan Academy: getting started, mastery learning, classroom routines.", node: "8a508ec8bb57543187defb18c73d3b24", source: "Khan Academy" },
  { title: "AI for education", text: "Short lessons on using AI in teaching and learning, safely.", node: "0b08b6b232da54998eabe11441e488d2", source: "Khan Academy" },
  { title: "Art history: for teachers", text: "Lesson ideas and guides for art and humanities.", node: "ade91d8ed3ff5a089e84591495000585", source: "Khan Academy" },
  { title: "Simulation teacher guides", text: "Every PhET simulation with its coach guide (shown to staff only).", node: "197934f144305350b5820c7c4dd8e194", source: "PhET" },
  { title: "Science video lessons with teacher notes", text: "Classroom video lessons with teacher guides, grades 9-12.", node: "913efe9f14c65cb1b23402f21f056e99", source: "MIT BLOSSOMS" },
];

export function TeacherShelves() {
  // These shelves are the AI Lab's School Library channels. Other brands ship only content they may resell
  // (EDU54: none of these channels yet, so no shelves and no credits; docs/edu54/EDU54-EXCLUSIONS.md).
  const shelves = useBrand().brand.id === "umanah" ? TEACHER_SHELVES : [];
  if (!shelves.length) return <p className="text-[15px] text-muted-foreground">No teacher guides are on this device yet. Documents you upload below appear for your students in Explore.</p>;
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Teacher resources">
      {shelves.map((s) => (
        <li key={s.node}><Link to={`/explore?cat=library&at=${s.node}`} className="flex h-full items-start gap-4 rounded-xl border border-border bg-white p-4 card-soft card-press">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#eaeefb] text-primary"><GraduationCap className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><span className="block font-serif text-[18px] leading-tight text-primary">{s.title}</span><span className="mt-1 block text-[14px] text-[#374151]">{s.text}</span><span className="text-xs text-muted-foreground">{s.source}</span></span>
          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary" />
        </Link></li>))}
    </ul>
  );
}

export function TeacherResources() {
  const qc = useQueryClient();
  const docs = useDocs();
  const file = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState<"students" | "staff">("students");
  const [picked, setPicked] = useState<File | null>(null);
  const say = (e: unknown) => toast.error(e instanceof ApiError ? e.message : "That didn't work.");
  const add = useMutation({
    mutationFn: async () => {
      const csrf = document.cookie.match(/umanah_csrf=([^;]+)/)?.[1] ?? "";
      const r = await fetch(`/api/documents?${new URLSearchParams({ title: title || picked!.name, filename: picked!.name, audience })}`, { method: "POST", body: picked, credentials: "same-origin", headers: { "Content-Type": picked!.type || "application/octet-stream", "X-CSRF-Token": csrf } });
      if (!r.ok) throw new ApiError(r.status, "error", ((await r.json().catch(() => ({}))) as { error?: { message?: string } }).error?.message ?? "That didn't work.");
    },
    onSuccess: () => { toast.success("Added to Local Documents"); setTitle(""); setPicked(null); if (file.current) file.current.value = ""; qc.invalidateQueries({ queryKey: ["documents"] }); }, onError: say,
  });
  const remove = useMutation({ mutationFn: (id: number) => api(`/api/documents/${id}`, { method: "DELETE" }), onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["documents"] }); }, onError: say });
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-8">
      <div><h1 className="text-[40px] leading-tight">Resources</h1><p className="mt-1 text-[17px] text-muted-foreground">Teacher guides from the course libraries, and your school's own documents.</p></div>
      <section aria-label="Teacher guides"><h2 className="mb-3 text-[24px]">Teacher guides</h2><TeacherShelves /></section>
      <section aria-label="Your documents" className="rounded-xl border border-border bg-white p-5 card-soft">
        <h2 className="text-[24px]">Local Documents</h2>
        <p className="text-sm text-muted-foreground">PDFs, pictures, text files and EPUB books (up to 25 MB). They stay on this device. Students find the ones you share in Explore, under Local Documents.</p>
        {docs.data?.demo ? <p className="mt-4 rounded-lg bg-[#fbf3e2] p-4 text-sm text-[#5a4210]">Adding documents is turned off in the demo. On a school's own device, teachers add PDFs here.</p> : (
          <form className="mt-4 grid grid-cols-1 items-end gap-3 md:grid-cols-[2fr_1fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); if (picked) add.mutate(); }}>
            <div><Label htmlFor="dt">Title</Label><Input id="dt" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="For example: Unit 3 reading" className="mt-1.5 h-11" /></div>
            <div><Label htmlFor="df">File</Label><input id="df" ref={file} type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.epub" onChange={(e) => setPicked(e.target.files?.[0] ?? null)} className="mt-1.5 block h-11 w-full text-sm" /></div>
            <div><Label htmlFor="da">Who can see it</Label><select id="da" value={audience} onChange={(e) => setAudience(e.target.value as "students" | "staff")} className="mt-1.5 h-11 w-full rounded-md border border-input bg-white px-3"><option value="students">Students and staff</option><option value="staff">Staff only</option></select></div>
            <Button type="submit" className="h-11" disabled={!picked || add.isPending}><Upload className="mr-2 h-4 w-4" />Add document</Button>
          </form>)}
        <ul className="mt-5 divide-y divide-border">{(docs.data?.documents ?? []).map((d) => (
          <li key={d.id} className="flex items-center gap-3 py-2.5 text-[15px]">
            <FileText className="h-4 w-4 text-primary" /><a href={d.url} target="_blank" rel="noopener" className="flex-1 text-primary hover:underline">{d.title}</a>
            <Pill tone={d.audience === "staff" ? "amber" : "green"}>{d.audience === "staff" ? "Staff only" : "Students"}</Pill>
            <span className="hidden text-xs text-muted-foreground sm:inline">{(d.size / 1024).toFixed(0)} KB</span>
            {docs.data?.can_upload && <Button variant="ghost" className="h-8 w-8 p-0" aria-label={`Remove ${d.title}`} onClick={() => remove.mutate(d.id)}><Trash2 className="h-4 w-4" /></Button>}
          </li>))}</ul>
      </section>
    </div>
  );
}
