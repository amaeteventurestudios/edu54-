import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, FileUp, KeyRound, Pencil, Plus, Printer, Search, UserMinus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Empty, PageHeader, Pill } from "@/components/common";
import { LoginCards, type Cred } from "@/components/LoginCards";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError, get, post } from "@/lib/api";
import { ago } from "@/lib/format";
import { cn } from "@/lib/utils";

const wide = "mx-auto w-full max-w-[1440px]";
const say = (e: unknown) => toast.error(e instanceof ApiError ? e.message : "That didn't work.");
interface Stu { id: number; name: string; username: string; status: string; pin_login: boolean; grade?: number | null; grade_label?: string | null; last_login_at: string | null; lesson_percent: number; classes?: { id: number; name: string }[] }
interface ClassRes { class: { id: number; name: string; age_band: string }; students: Stu[] }
interface AllRes { classes: { id: number; name: string }[]; students: Stu[] }
type Modal = { kind: "add" } | { kind: "import" } | { kind: "rename"; s: Stu } | { kind: "move"; s: Stu; from: number } | { kind: "remove"; s: Stu; from: number } | null;

function Row({ s, classId, classes, onAct }: { s: Stu; classId?: number; classes?: { id: number; name: string }[]; onAct: (m: NonNullable<Modal> | { kind: "reset"; s: Stu }) => void }) {
  const from = classId ?? s.classes?.[0]?.id ?? 0;
  const btn = "h-8 w-8 p-0";
  return (
    <TableRow>
      <TableCell className="font-medium text-primary"><Link to={`/teacher/students/${s.id}`} className="hover:underline">{s.name}</Link></TableCell>
      <TableCell className="font-mono text-[13px]">{s.username}{s.pin_login && <Pill tone="amber" className="ml-2">PIN</Pill>}</TableCell>
      <TableCell className="whitespace-nowrap text-muted-foreground">{s.grade_label ?? "Not set"}</TableCell>
      {classes && <TableCell className="text-muted-foreground">{s.classes?.map((c) => c.name).join(", ")}</TableCell>}
      <TableCell className="w-40"><div className="flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-track"><div className="h-full rounded-full" style={{ width: `${Math.round(s.lesson_percent)}%`, background: "var(--progress)" }} /></div><span className="text-xs text-muted-foreground">{Math.round(s.lesson_percent)}%</span></div></TableCell>
      <TableCell className="text-muted-foreground">{s.last_login_at ? ago(s.last_login_at) : "Never"}</TableCell>
      <TableCell className="text-right"><span className="inline-flex gap-0.5">
        <Button variant="ghost" className={btn} aria-label={`Edit ${s.name}`} onClick={() => onAct({ kind: "rename", s })}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" className={btn} aria-label={`Reset password or PIN for ${s.name}`} onClick={() => onAct({ kind: "reset", s })}><KeyRound className="h-4 w-4" /></Button>
        <Button variant="ghost" className={btn} aria-label={`Move ${s.name} to another class`} onClick={() => onAct({ kind: "move", s, from })}><ArrowRightLeft className="h-4 w-4" /></Button>
        <Button variant="ghost" className={btn} aria-label={`Remove ${s.name} from the class`} onClick={() => onAct({ kind: "remove", s, from })}><UserMinus className="h-4 w-4" /></Button></span></TableCell>
    </TableRow>
  );
}

function useRosterActions(refresh: () => void) {
  const [modal, setModal] = useState<Modal>(null);
  const [creds, setCreds] = useState<Cred[] | null>(null);
  const reset = useMutation({ mutationFn: (v: { s: Stu; kind: string }) => post<{ name: string; username: string; credential: string; pin_login: boolean }>(`/api/teacher/students/${v.s.id}/reset`, { kind: v.kind }),
    onSuccess: (r) => { setCreds([{ name: r.name, username: r.username, credential: r.credential, pin: r.pin_login }]); refresh(); }, onError: say });
  const [resetFor, setResetFor] = useState<Stu | null>(null);
  const onAct = (m: NonNullable<Modal> | { kind: "reset"; s: Stu }) => (m.kind === "reset" ? setResetFor(m.s) : setModal(m));
  return { modal, setModal, creds, setCreds, reset, resetFor, setResetFor, onAct };
}

function ResetDialog({ s, onClose, onPick }: { s: Stu; onClose: () => void; onPick: (kind: string) => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}><DialogContent>
      <DialogHeader><DialogTitle>New login for {s.name}</DialogTitle><DialogDescription>The old password stops working straight away. You'll get a card to print.</DialogDescription></DialogHeader>
      <div className="grid gap-2 sm:grid-cols-2"><Button variant="outline" className="h-auto flex-col items-start gap-0.5 py-3 text-left" onClick={() => { onPick("password"); onClose(); }}><span className="font-medium">Temporary password</span><span className="text-xs font-normal text-muted-foreground">Two words and a number. They choose their own at first sign-in.</span></Button>
        <Button variant="outline" className="h-auto flex-col items-start gap-0.5 py-3 text-left" onClick={() => { onPick("pin"); onClose(); }}><span className="font-medium">4-digit PIN</span><span className="text-xs font-normal text-muted-foreground">For younger students. You keep control of it.</span></Button></div>
    </DialogContent></Dialog>
  );
}

function Dialogs({ a, classId, classes, refresh }: { a: ReturnType<typeof useRosterActions>; classId?: number; classes: { id: number; name: string }[]; refresh: () => void }) {
  const { modal, setModal } = a;
  const [name, setName] = useState("");
  const [pin, setPin] = useState(false);
  const [csv, setCsv] = useState("");
  const [to, setTo] = useState(0);
  const add = useMutation({ mutationFn: () => post<{ name: string; username: string; credential: string; pin_login: boolean }>(`/api/teacher/classes/${classId}/students`, { name, credential: pin ? "pin" : "password" }),
    onSuccess: (r) => { toast.success(`${r.name} was added`); a.setCreds([{ name: r.name, username: r.username, credential: r.credential, pin: r.pin_login }]); setModal(null); setName(""); refresh(); }, onError: say });
  const imp = useMutation({ mutationFn: () => post<{ created: { name: string; username: string; credential: string; pin_login: boolean }[]; errors: { row: number; message: string }[] }>(`/api/teacher/classes/${classId}/students/import`, { csv, credential: pin ? "pin" : "password" }),
    onSuccess: (r) => { toast.success(`${r.created.length} students added${r.errors.length ? `, ${r.errors.length} skipped` : ""}`); if (r.errors.length) toast.warning(r.errors.slice(0, 3).map((e) => `Row ${e.row}: ${e.message}`).join(" ")); a.setCreds(r.created.map((c) => ({ name: c.name, username: c.username, credential: c.credential, pin: c.pin_login }))); setModal(null); setCsv(""); refresh(); }, onError: say });
  const rename = useMutation({ mutationFn: (v: { s: Stu; name: string; grade: number | null }) => api(`/api/teacher/students/${v.s.id}`, { method: "PATCH", json: { name: v.name, grade: v.grade } }), onSuccess: () => { toast.success("Saved"); setModal(null); refresh(); }, onError: say });
  const [grade, setGrade] = useState<string | null>(null);
  const move = useMutation({ mutationFn: (v: { s: Stu; from: number }) => post(`/api/teacher/students/${v.s.id}/move`, { from_class_id: v.from, to_class_id: to }), onSuccess: () => { toast.success("Moved"); setModal(null); refresh(); }, onError: say });
  const remove = useMutation({ mutationFn: (v: { s: Stu; from: number }) => api(`/api/teacher/classes/${v.from}/students/${v.s.id}`, { method: "DELETE" }), onSuccess: () => { toast.success("Removed from the class"); setModal(null); refresh(); }, onError: say });
  const [newName, setNewName] = useState("");
  const others = (from?: number) => classes.filter((c) => c.id !== from);
  return (
    <>
      {modal?.kind === "add" && <Dialog open onOpenChange={(o) => !o && setModal(null)}><DialogContent><DialogHeader><DialogTitle>Add a student</DialogTitle><DialogDescription>They get a username and a temporary login. You can print it as a card.</DialogDescription></DialogHeader>
        <div><Label htmlFor="sn">Full name</Label><Input id="sn" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 h-11" autoFocus onKeyDown={(e) => e.key === "Enter" && name.trim() && add.mutate()} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} />Use a 4-digit PIN (younger students)</label>
        <DialogFooter><Button variant="outline" onClick={() => setModal(null)}>Cancel</Button><Button disabled={!name.trim() || add.isPending} onClick={() => add.mutate()}>Add student</Button></DialogFooter></DialogContent></Dialog>}
      {modal?.kind === "import" && <Dialog open onOpenChange={(o) => !o && setModal(null)}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Import students from a CSV</DialogTitle><DialogDescription>One name per line, first column. A header row called “name” is fine. Up to 200 at a time.</DialogDescription></DialogHeader>
        <Textarea aria-label="Student names" rows={8} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={"name\nAmy Ash\nBen Birch"} className="font-mono text-[13px]" />
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary"><FileUp className="h-4 w-4" />Choose a file<input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setCsv(await f.text()); }} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} />Use 4-digit PINs</label>
        <DialogFooter><Button variant="outline" onClick={() => setModal(null)}>Cancel</Button><Button disabled={!csv.trim() || imp.isPending} onClick={() => imp.mutate()}>Import</Button></DialogFooter></DialogContent></Dialog>}
      {modal?.kind === "rename" && <Dialog open onOpenChange={(o) => { if (!o) { setModal(null); setGrade(null); } }}><DialogContent><DialogHeader><DialogTitle>Edit {modal.s.name}</DialogTitle><DialogDescription>The grade sets which screens and content the student sees. Students can't change it.</DialogDescription></DialogHeader>
        <div><Label htmlFor="en">Name</Label><Input id="en" defaultValue={modal.s.name} onChange={(e) => setNewName(e.target.value)} className="mt-1.5 h-11" autoFocus /></div>
        <div><Label htmlFor="eg">Grade</Label>
          <select id="eg" className="mt-1.5 h-11 w-full rounded-md border border-input bg-white px-3" value={grade ?? String(modal.s.grade ?? "")} onChange={(e) => setGrade(e.target.value)}>
            <option value="">Not set</option><option value="0">Kindergarten</option>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>Grade {i + 1}</option>)}
          </select></div>
        <DialogFooter><Button variant="outline" onClick={() => setModal(null)}>Cancel</Button><Button disabled={rename.isPending} onClick={() => { const g = grade ?? String(modal.s.grade ?? ""); rename.mutate({ s: modal.s, name: newName || modal.s.name, grade: g === "" ? null : Number(g) }); setGrade(null); }}>Save</Button></DialogFooter></DialogContent></Dialog>}
      {modal?.kind === "move" && <Dialog open onOpenChange={(o) => !o && setModal(null)}><DialogContent><DialogHeader><DialogTitle>Move {modal.s.name}</DialogTitle><DialogDescription>Choose one of your other classes.</DialogDescription></DialogHeader>
        {others(modal.from).length === 0 ? <p className="text-sm text-muted-foreground">You only have one class. Ask an admin to create another.</p> :
          <select aria-label="Move to class" className="h-11 rounded-md border border-input bg-white px-3" value={to} onChange={(e) => setTo(Number(e.target.value))}><option value={0}>Choose a class…</option>{others(modal.from).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
        <DialogFooter><Button variant="outline" onClick={() => setModal(null)}>Cancel</Button><Button disabled={!to || move.isPending} onClick={() => move.mutate({ s: modal.s, from: modal.from })}>Move</Button></DialogFooter></DialogContent></Dialog>}
      {modal?.kind === "remove" && <Dialog open onOpenChange={(o) => !o && setModal(null)}><DialogContent><DialogHeader><DialogTitle>Remove {modal.s.name} from this class?</DialogTitle><DialogDescription>Their account, work and XP stay. They just leave this class's roster and assignments.</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setModal(null)}>Keep them</Button><Button disabled={remove.isPending} onClick={() => remove.mutate({ s: modal.s, from: modal.from })}>Remove from class</Button></DialogFooter></DialogContent></Dialog>}
      {a.resetFor && <ResetDialog s={a.resetFor} onClose={() => a.setResetFor(null)} onPick={(kind) => a.reset.mutate({ s: a.resetFor!, kind })} />}
      <LoginCards open={!!a.creds} creds={a.creds ?? []} onClose={() => a.setCreds(null)} />
    </>
  );
}

export function TeacherClasses() {
  const qc = useQueryClient();
  const classes = useQuery({ queryKey: ["teacher-classes"], queryFn: () => get<{ classes: { id: number; name: string; subject: string; students: number }[] }>("/api/teacher/classes") });
  const [pick, setPick] = useState<number | null>(null);
  const cid = pick ?? classes.data?.classes[0]?.id ?? null;
  const roster = useQuery({ queryKey: ["teacher-roster", cid], queryFn: () => get<ClassRes>(`/api/teacher/classes/${cid}/students`), enabled: cid !== null });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["teacher-roster"] }); qc.invalidateQueries({ queryKey: ["teacher-classes"] }); qc.invalidateQueries({ queryKey: ["teacher-students"] }); qc.invalidateQueries({ queryKey: ["teacher-overview"] }); };
  const a = useRosterActions(refresh);
  const cls = classes.data?.classes ?? [];
  return (
    <div className={wide}>
      <PageHeader title="Classes" subtitle="Your rosters. Add students one by one or from a CSV, and print their login cards."
        right={cid !== null ? <div className="flex flex-wrap gap-2"><Button className="h-11" onClick={() => a.setModal({ kind: "add" })}><Plus className="mr-2 h-4 w-4" />Add student</Button><Button variant="outline" className="h-11" onClick={() => a.setModal({ kind: "import" })}><FileUp className="mr-2 h-4 w-4" />Import CSV</Button></div> : undefined} />
      {classes.data && cls.length === 0 && <Empty title="You don't have a class yet" text="An admin can create one for you in Admin > Classes." />}
      {cls.length > 0 && <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Your classes">{cls.map((c) => <button key={c.id} role="tab" aria-selected={cid === c.id} onClick={() => setPick(c.id)} className={cn("rounded-full border px-4 py-2 text-[14px]", cid === c.id ? "border-primary bg-primary text-white" : "border-border bg-white text-primary hover:bg-muted")}>{c.name} <span className="opacity-70">· {c.students}</span></button>)}</div>}
      {!roster.data ? (cid !== null && <Skeleton className="h-64" />) : (
        <div className="rounded-xl border border-border bg-white card-soft">
          <Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Username</TableHead><TableHead>Grade</TableHead><TableHead>Lesson 6</TableHead><TableHead>Last sign-in</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>{roster.data.students.map((s) => <Row key={s.id} s={s} classId={cid!} onAct={a.onAct} />)}</TableBody></Table>
        </div>)}
      <Dialogs a={a} classId={cid ?? undefined} classes={cls} refresh={refresh} />
    </div>
  );
}

export function TeacherStudents() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const d = useQuery({ queryKey: ["teacher-students", q], queryFn: () => get<AllRes>(`/api/teacher/students?q=${encodeURIComponent(q)}`) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["teacher-students"] }); qc.invalidateQueries({ queryKey: ["teacher-roster"] }); qc.invalidateQueries({ queryKey: ["teacher-classes"] }); };
  const a = useRosterActions(refresh);
  return (
    <div className={wide}>
      <PageHeader title="Students" subtitle="Everyone in your classes." />
      <div className="relative mb-4 max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search students" placeholder="Search by name or username" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 pl-9" /></div>
      {!d.data ? <Skeleton className="h-64" /> : d.data.students.length === 0 ? <Empty title="No students found" /> : (
        <div className="rounded-xl border border-border bg-white card-soft"><Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Username</TableHead><TableHead>Grade</TableHead><TableHead>Class</TableHead><TableHead>Lesson 6</TableHead><TableHead>Last sign-in</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>{d.data.students.map((s) => <Row key={s.id} s={s} classes={d.data!.classes} onAct={a.onAct} />)}</TableBody></Table></div>)}
      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Printer className="h-4 w-4" />Need a card for someone? Use the key button to make a new login, then print it.</div>
      <Dialogs a={a} classes={d.data?.classes ?? []} refresh={refresh} />
    </div>
  );
}
