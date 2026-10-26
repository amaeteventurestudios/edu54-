import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, BookOpen, CheckCircle2, Download, GraduationCap, KeyRound, MessageSquare, Pencil, Play, Plus, Power, Search, Square, Trash2, UserCheck, Users } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Empty, IconBadge, PageHeader, Pill } from "@/components/common";
import { LoginCards, type Cred } from "@/components/LoginCards";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, ApiError, get, post } from "@/lib/api";
import { ago, nf } from "@/lib/format";
import { can } from "@/lib/session";
import { useUser } from "@/lib/session";
import { cn } from "@/lib/utils";

const wide = "mx-auto w-full max-w-[1440px]";
const say = (e: unknown, fallback = "That didn't work.") => toast.error(e instanceof ApiError ? e.message : fallback);
const Select = ({ className, ...p }: React.ComponentProps<"select">) => <select {...p} className={cn("h-10 rounded-md border border-input bg-white px-3 text-[14px]", className)} />;

/* ------------------------------------------------------------------------------------------------ Overview */
interface Overview { school: string; people: { students: number; teachers: number; admins: number; counselors: number; inactive: number }; classes: number; safety_contacts: number; lessons_completed_7d: number; tutor_chats_7d: number; recent_activity: { action: string; target: string | null; at: string }[] }
function Stat({ icon, tint, value, label }: { icon: ReactNode; tint: string; value: number; label: string }) {
  return <div className={`flex items-center gap-4 rounded-xl border border-border p-5 ${tint}`}><IconBadge className="h-12 w-12 bg-white/70">{icon}</IconBadge><div><p className="font-serif text-[30px] leading-none text-primary">{nf(value)}</p><p className="mt-1 text-[14px] text-[#374151]">{label}</p></div></div>;
}
export function AdminOverview() {
  const o = useQuery({ queryKey: ["admin-overview"], queryFn: () => get<Overview>("/api/admin/overview") });
  if (!o.data) return <Skeleton className="h-64 w-full" />;
  const d = o.data;
  return (
    <div className={wide}>
      <PageHeader title="Overview" subtitle={`${d.school}: people, classes and activity at a glance.`} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Users className="h-6 w-6" />} tint="bg-learn-bg" value={d.people.students} label="Students" />
        <Stat icon={<GraduationCap className="h-6 w-6" />} tint="bg-ask-bg" value={d.people.teachers} label="Teachers" />
        <Stat icon={<BookOpen className="h-6 w-6" />} tint="bg-build-bg" value={d.lessons_completed_7d} label="Lessons completed this week" />
        <Stat icon={<MessageSquare className="h-6 w-6" />} tint="bg-explore-bg" value={d.tutor_chats_7d} label="Tutor chats this week" />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-white p-5 card-soft"><h2 className="text-[22px]">People</h2>
          <dl className="mt-3 grid grid-cols-2 gap-y-2 text-[15px]"><dt className="text-muted-foreground">Admins</dt><dd>{d.people.admins}</dd><dt className="text-muted-foreground">Counselors</dt><dd>{d.people.counselors}</dd><dt className="text-muted-foreground">Safety contacts</dt><dd>{d.safety_contacts}</dd><dt className="text-muted-foreground">Classes</dt><dd>{d.classes}</dd><dt className="text-muted-foreground">Deactivated</dt><dd>{d.people.inactive}</dd></dl></section>
        <section className="rounded-xl border border-border bg-white p-5 card-soft"><h2 className="text-[22px]">Recent admin activity</h2>
          {d.recent_activity.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nothing yet.</p> : <ul className="mt-3 divide-y divide-border">{d.recent_activity.map((a, i) => <li key={i} className="flex justify-between py-2 text-[14px]"><span>{a.action.replace(".", " ")}{a.target ? <span className="text-muted-foreground"> · {a.target}</span> : null}</span><span className="text-muted-foreground">{ago(a.at)}</span></li>)}</ul>}</section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------ People */
interface Person { id: number; name: string; username: string; role: string; role_label: string; title: string | null; status: string; permissions: string[]; pin_login: boolean; last_login_at: string | null; classes: string[] }
interface PeopleRes { people: Person[]; assignable_roles: string[]; assignable_permissions: Record<string, string>; may_grant: string[]; can_manage: boolean }
const ROLE_NAMES: Record<string, string> = { owner: "School Owner", school_admin: "Admin", sub_admin: "Sub-admin", teacher: "Teacher", counselor: "Counselor", student: "Student" };

export function AdminPeople() {
  const me = useUser();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [edit, setEdit] = useState<Person | "new" | null>(null);
  const [creds, setCreds] = useState<Cred[] | null>(null);
  const [confirm, setConfirm] = useState<{ p: Person; kind: "deactivate" | "delete" } | null>(null);
  const list = useQuery({ queryKey: ["admin-people", q, role], queryFn: () => get<PeopleRes>(`/api/admin/people?q=${encodeURIComponent(q)}${role ? `&role=${role}` : ""}`) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-people"] }); qc.invalidateQueries({ queryKey: ["admin-overview"] }); };
  const reset = useMutation({ mutationFn: (v: { p: Person; kind: string }) => post<{ credential: string; name: string; username: string; kind: string }>(`/api/admin/people/${v.p.id}/reset-password`, { kind: v.kind }),
    onSuccess: (r) => { setCreds([{ name: r.name, username: r.username, credential: r.credential, pin: r.kind === "pin" }]); toast.success("New login created"); }, onError: (e) => say(e) });
  const toggle = useMutation({ mutationFn: (v: { p: Person; act: "reactivate" | "deactivate" }) => post(`/api/admin/people/${v.p.id}/${v.act}`), onSuccess: () => { refresh(); toast.success("Done"); setConfirm(null); }, onError: (e) => { say(e); setConfirm(null); } });
  const d = list.data;
  const rows = (d?.people ?? []).filter((p) => showInactive || p.status === "active");
  return (
    <div className={wide}>
      <PageHeader title="People" subtitle="Everyone at this school. Removing someone deactivates them: their work stays, they just can't sign in." right={d?.can_manage ? <Button className="h-11" onClick={() => setEdit("new")}><Plus className="mr-2 h-4 w-4" />Add person</Button> : undefined} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search people" placeholder="Search by name or username" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 pl-9" /></div>
        <Select aria-label="Filter by role" value={role} onChange={(e) => setRole(e.target.value)}><option value="">All roles</option>{Object.entries(ROLE_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />Show deactivated</label>
      </div>
      {!d ? <Skeleton className="h-64" /> : rows.length === 0 ? <Empty title="Nobody matches" text="Try a different name or role." /> : (
        <div className="rounded-xl border border-border bg-white card-soft">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Username</TableHead><TableHead>Role</TableHead><TableHead>Classes</TableHead><TableHead>Last sign-in</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>{rows.map((p) => {
              const mine = p.id === me.id;
              return (
                <TableRow key={p.id} className={p.status !== "active" ? "opacity-60" : ""}>
                  <TableCell className="font-medium text-primary">{p.name}{mine && <Pill tone="gray" className="ml-2">You</Pill>}{p.status !== "active" && <Pill tone="rose" className="ml-2">Deactivated</Pill>}</TableCell>
                  <TableCell className="font-mono text-[13px]">{p.username}</TableCell>
                  <TableCell><Pill tone={p.role === "student" ? "blue" : p.role === "teacher" ? "green" : "amber"}>{p.role_label}</Pill></TableCell>
                  <TableCell className="max-w-[220px] truncate text-muted-foreground">{p.classes.join(", ") || "None"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.last_login_at ? ago(p.last_login_at) : "Never"}</TableCell>
                  <TableCell className="text-right">{d.can_manage && !mine && (
                    <span className="inline-flex gap-1">
                      <Button size="sm" variant="ghost" aria-label={`Edit ${p.name}`} onClick={() => setEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" aria-label={`Reset password for ${p.name}`} onClick={() => reset.mutate({ p, kind: "password" })}><KeyRound className="h-4 w-4" /></Button>
                      {p.status === "active" ? <Button size="sm" variant="ghost" aria-label={`Deactivate ${p.name}`} onClick={() => setConfirm({ p, kind: "deactivate" })}><Power className="h-4 w-4" /></Button>
                        : <><Button size="sm" variant="ghost" aria-label={`Reactivate ${p.name}`} onClick={() => toggle.mutate({ p, act: "reactivate" })}><UserCheck className="h-4 w-4" /></Button>
                          {can(me, "data.delete") && p.role === "student" && <Button size="sm" variant="ghost" aria-label={`Permanently delete ${p.name}`} onClick={() => setConfirm({ p, kind: "delete" })}><Trash2 className="h-4 w-4 text-[#b42318]" /></Button>}</>}
                    </span>)}</TableCell>
                </TableRow>);
            })}</TableBody>
          </Table>
        </div>)}
      {edit && d && <PersonDialog data={d} person={edit === "new" ? null : edit} onClose={() => setEdit(null)} onDone={(c) => { setEdit(null); refresh(); if (c) setCreds([c]); }} />}
      {confirm?.kind === "deactivate" && (
        <Dialog open onOpenChange={() => setConfirm(null)}><DialogContent><DialogHeader><DialogTitle>Deactivate {confirm.p.name}?</DialogTitle><DialogDescription>They will be signed out and can't sign in again until you reactivate them. Their work and history stay.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setConfirm(null)}>Keep them</Button><Button onClick={() => toggle.mutate({ p: confirm.p, act: "deactivate" })}>Deactivate</Button></DialogFooter></DialogContent></Dialog>)}
      {confirm?.kind === "delete" && <DeleteDialog p={confirm.p} onClose={() => setConfirm(null)} onDone={() => { setConfirm(null); refresh(); }} />}
      <LoginCards open={!!creds} creds={creds ?? []} onClose={() => setCreds(null)} />
    </div>
  );
}

function PersonDialog({ data, person, onClose, onDone }: { data: PeopleRes; person: Person | null; onClose: () => void; onDone: (c?: Cred) => void }) {
  const [name, setName] = useState(person?.name ?? "");
  const [role, setRole] = useState(person?.role ?? (data.assignable_roles.includes("teacher") ? "teacher" : data.assignable_roles[0] ?? "student"));
  const [title, setTitle] = useState(person?.title ?? "");
  const [perms, setPerms] = useState<string[]>(person?.permissions ?? []);
  const [pin, setPin] = useState(false);
  const roles = person ? Array.from(new Set([person.role, ...data.assignable_roles])) : data.assignable_roles;
  const save = useMutation({
    mutationFn: () => person ? api<Person>(`/api/admin/people/${person.id}`, { method: "PATCH", json: { name, title, ...(role !== person.role ? { role } : {}), ...(role === "sub_admin" ? { permissions: perms } : {}) } })
      : post<Person & { credential: string }>("/api/admin/people", { name, role, title: title || undefined, permissions: role === "sub_admin" ? perms : [], credential: pin && role === "student" ? "pin" : "password" }),
    onSuccess: (r: any) => { toast.success(person ? "Saved" : "Person added"); onDone(!person ? { name: r.name, username: r.username, credential: r.credential, pin: r.pin_login } : undefined); },
    onError: (e) => say(e),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{person ? `Edit ${person.name}` : "Add a person"}</DialogTitle><DialogDescription>{person ? "Change their name, role or permissions." : "They get a temporary login you can print. Everyone but PIN students chooses a new password at first sign-in."}</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div><Label htmlFor="pn">Full name</Label><Input id="pn" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 h-11" autoFocus /></div>
          <div><Label htmlFor="pr">Role</Label><Select id="pr" value={role} onChange={(e) => setRole(e.target.value)} className="mt-1.5 h-11 w-full">{roles.map((r) => <option key={r} value={r}>{ROLE_NAMES[r]}</option>)}</Select></div>
          {role !== "student" && <div><Label htmlFor="pt">Title (optional)</Label><Input id="pt" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="For example: school counselor, Room 12" className="mt-1.5 h-11" /></div>}
          {role === "sub_admin" && (
            <fieldset className="rounded-lg border border-border p-3"><legend className="px-1 text-sm font-medium text-primary">What can this sub-admin do?</legend>
              {Object.entries(data.assignable_permissions).map(([k, label]) => { const ok = data.may_grant.includes(k); return (
                <label key={k} className={cn("flex items-start gap-2 py-1 text-[14px]", !ok && "opacity-50")}><input type="checkbox" disabled={!ok} checked={perms.includes(k)} onChange={(e) => setPerms(e.target.checked ? [...perms, k] : perms.filter((x) => x !== k))} className="mt-1" />{label}{!ok && <span className="text-xs text-muted-foreground"> (you don't have this yourself)</span>}</label>); })}
            </fieldset>)}
          {!person && role === "student" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} />Use a 4-digit PIN instead of a password (younger students)</label>}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>{person ? "Save changes" : "Add person"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ p, onClose, onDone }: { p: Person; onClose: () => void; onDone: () => void }) {
  const [typed, setTyped] = useState("");
  const exp = useMutation({ mutationFn: () => get<unknown>(`/api/admin/people/${p.id}/export`), onSuccess: (j) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(j, null, 2)], { type: "application/json" })); a.download = `${p.username}-export.json`; a.click(); }, onError: (e) => say(e) });
  const del = useMutation({ mutationFn: () => post<{ backup: string }>(`/api/admin/people/${p.id}/delete`, { confirm: typed }), onSuccess: (r) => { toast.success(`${p.name} was permanently deleted. Backup: ${r.backup}`); onDone(); }, onError: (e) => say(e) });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}><DialogContent>
      <DialogHeader><DialogTitle>Permanently delete {p.name}?</DialogTitle><DialogDescription>This removes the student and everything linked to them: progress, projects, chats and submissions. It can't be undone from the app. A database backup is taken first.</DialogDescription></DialogHeader>
      <Button variant="outline" onClick={() => exp.mutate()}><Download className="mr-2 h-4 w-4" />Download their data first</Button>
      <div><Label htmlFor="cf">Type <span className="font-mono">{p.username}</span> to confirm</Label><Input id="cf" value={typed} onChange={(e) => setTyped(e.target.value)} className="mt-1.5" autoComplete="off" /></div>
      <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="destructive" disabled={typed !== p.username || del.isPending} onClick={() => del.mutate()}>Delete permanently</Button></DialogFooter>
    </DialogContent></Dialog>
  );
}

/* ------------------------------------------------------------------------------------------------ Classes */
interface Cls { id: number; name: string; subject: string; term: string | null; age_band: string; teacher: { id: number; name: string } | null; students: number }
export function AdminClasses() {
  const qc = useQueryClient();
  const [dlg, setDlg] = useState<Cls | "new" | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const me = useUser();
  const d = useQuery({ queryKey: ["admin-classes"], queryFn: () => get<{ classes: Cls[]; teachers: { id: number; name: string }[] }>("/api/admin/classes") });
  const roster = useQuery({ queryKey: ["admin-class", open], queryFn: () => get<{ roster: { id: number; name: string; username: string }[] }>(`/api/admin/classes/${open}`), enabled: open !== null });
  const [f, setF] = useState({ name: "", subject: "", teacher_id: 0, age_band: "13-15" });
  const save = useMutation({ mutationFn: () => dlg === "new" || dlg === null ? post("/api/admin/classes", f) : api(`/api/admin/classes/${dlg.id}`, { method: "PATCH", json: f }),
    onSuccess: () => { toast.success("Saved"); setDlg(null); qc.invalidateQueries({ queryKey: ["admin-classes"] }); qc.invalidateQueries({ queryKey: ["admin-overview"] }); }, onError: (e) => say(e) });
  const startEdit = (c: Cls | "new") => { setDlg(c); setF(c === "new" ? { name: "", subject: "", teacher_id: d.data?.teachers[0]?.id ?? 0, age_band: "13-15" } : { name: c.name, subject: c.subject, teacher_id: c.teacher?.id ?? 0, age_band: c.age_band }); };
  return (
    <div className={wide}>
      <PageHeader title="Classes" subtitle="Each class has one teacher and its own roster." right={can(me, "classes.manage") ? <Button className="h-11" onClick={() => startEdit("new")}><Plus className="mr-2 h-4 w-4" />New class</Button> : undefined} />
      {!d.data ? <Skeleton className="h-48" /> : <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{d.data.classes.map((c) => (
        <section key={c.id} className="rounded-xl border border-border bg-white p-5 card-soft">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-[22px]">{c.name}</h2><p className="text-sm text-muted-foreground">{c.subject || "No subject"} · {c.students} students · reading level {c.age_band === "under13" ? "under 13" : c.age_band === "16plus" ? "16 and over" : "13 to 15"}</p><p className="mt-1 text-[14px]">Teacher: <strong>{c.teacher?.name ?? "None"}</strong></p></div>
            <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setOpen(open === c.id ? null : c.id)}>{open === c.id ? "Hide roster" : "Roster"}</Button>{can(me, "classes.manage") && <Button variant="outline" size="sm" onClick={() => startEdit(c)}>Edit</Button>}</div></div>
          {open === c.id && (roster.data ? <ul className="mt-3 max-h-60 divide-y divide-border overflow-y-auto rounded-lg border border-border text-[14px]">{roster.data.roster.map((r) => <li key={r.id} className="flex justify-between px-3 py-1.5"><span>{r.name}</span><span className="font-mono text-xs text-muted-foreground">{r.username}</span></li>)}</ul> : <Skeleton className="mt-3 h-24" />)}
        </section>))}</div>}
      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}><DialogContent>
        <DialogHeader><DialogTitle>{dlg === "new" ? "New class" : "Edit class"}</DialogTitle><DialogDescription>Students are added from the teacher's Classes page, or from People.</DialogDescription></DialogHeader>
        <div className="space-y-3"><div><Label htmlFor="cn">Class name</Label><Input id="cn" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="mt-1.5" /></div>
          <div><Label htmlFor="cs">Subject</Label><Input id="cs" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} className="mt-1.5" /></div>
          <div><Label htmlFor="ct">Teacher</Label><Select id="ct" value={f.teacher_id} onChange={(e) => setF({ ...f, teacher_id: Number(e.target.value) })} className="mt-1.5 w-full">{d.data?.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></div>
          <div><Label htmlFor="ca">Reading level for the tutor</Label><Select id="ca" value={f.age_band} onChange={(e) => setF({ ...f, age_band: e.target.value })} className="mt-1.5 w-full"><option value="under13">Under 13 (very simple words)</option><option value="13-15">13 to 15</option><option value="16plus">16 and over</option></Select></div></div>
        <DialogFooter><Button variant="outline" onClick={() => setDlg(null)}>Cancel</Button><Button disabled={!f.name.trim() || !f.teacher_id || save.isPending} onClick={() => save.mutate()}>Save class</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------ Safety contacts */
interface Contacts { contacts: { user_id: number; name: string; role_label: string; is_primary: boolean; location: string | null }[]; candidates: { id: number; name: string; role_label: string }[] }
export function AdminSafetyContacts() {
  const qc = useQueryClient();
  const d = useQuery({ queryKey: ["admin-contacts"], queryFn: () => get<Contacts>("/api/admin/safety-contacts") });
  const [pick, setPick] = useState(0);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-contacts"] });
  const set = useMutation({ mutationFn: (v: { user_id: number; is_primary: boolean }) => api("/api/admin/safety-contacts", { method: "PUT", json: v }), onSuccess: () => { refresh(); toast.success("Saved"); }, onError: (e) => say(e) });
  const del = useMutation({ mutationFn: (id: number) => api(`/api/admin/safety-contacts/${id}`, { method: "DELETE" }), onSuccess: () => { refresh(); toast.success("Removed"); }, onError: (e) => say(e) });
  return (
    <div className={wide}>
      <PageHeader title="Safety Contacts" subtitle="The trusted adults who receive safety alerts. A school always needs at least one, and one is the primary contact students are pointed to." />
      {!d.data ? <Skeleton className="h-48" /> : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <ul className="divide-y divide-border rounded-xl border border-border bg-white card-soft">{d.data.contacts.map((c) => (
            <li key={c.user_id} className="flex flex-wrap items-center gap-3 px-5 py-4"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#e4eefc] text-primary"><UserCheck className="h-5 w-5" /></span>
              <div className="flex-1"><p className="font-medium text-primary">{c.name}{c.is_primary && <Pill tone="green" className="ml-2">Primary</Pill>}</p><p className="text-sm text-muted-foreground">{c.role_label}{c.location ? ` · ${c.location}` : ""}</p></div>
              {!c.is_primary && <Button variant="outline" size="sm" onClick={() => set.mutate({ user_id: c.user_id, is_primary: true })}>Make primary</Button>}
              <Button variant="ghost" size="sm" onClick={() => del.mutate(c.user_id)} aria-label={`Remove ${c.name} as a safety contact`}>Remove</Button></li>))}</ul>
          <section className="rounded-xl border border-border bg-white p-5 card-soft"><h2 className="text-[20px]">Add a contact</h2><p className="mt-1 text-sm text-muted-foreground">Teachers, counselors and admins can be safety contacts.</p>
            <Select aria-label="Person to add" value={pick} onChange={(e) => setPick(Number(e.target.value))} className="mt-3 w-full"><option value={0}>Choose a person…</option>{d.data.candidates.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.role_label})</option>)}</Select>
            <Button className="mt-3 w-full" disabled={!pick} onClick={() => { set.mutate({ user_id: pick, is_primary: false }); setPick(0); }}>Add safety contact</Button></section>
        </div>)}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------ School settings */
export function AdminSettings() {
  const qc = useQueryClient();
  const d = useQuery({ queryKey: ["admin-settings"], queryFn: () => get<{ school_name: string; tutor_emoji: boolean; chat_retention_days: number; notes: { tutor_emoji: string } }>("/api/admin/settings") });
  const [f, setF] = useState<{ school_name: string; tutor_emoji: boolean; chat_retention_days: number } | null>(null);
  const v = f ?? (d.data ? { school_name: d.data.school_name, tutor_emoji: d.data.tutor_emoji, chat_retention_days: d.data.chat_retention_days } : null);
  const save = useMutation({ mutationFn: () => api("/api/admin/settings", { method: "PUT", json: v }), onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["admin-settings"] }); setF(null); }, onError: (e) => say(e) });
  if (!v || !d.data) return <Skeleton className="h-64" />;
  return (
    <div className={wide}>
      <PageHeader title="School Settings" subtitle="What students see and how long chats are kept." />
      <div className="max-w-2xl space-y-5 rounded-xl border border-border bg-white p-6 card-soft">
        <div><Label htmlFor="sn">School name</Label><Input id="sn" value={v.school_name} onChange={(e) => setF({ ...v, school_name: e.target.value })} className="mt-1.5 h-11" /></div>
        <label className="flex items-start gap-3"><input type="checkbox" checked={v.tutor_emoji} onChange={(e) => setF({ ...v, tutor_emoji: e.target.checked })} className="mt-1" /><span><span className="font-medium text-primary">Let the tutor use an occasional emoji</span><span className="block text-sm text-muted-foreground">{d.data.notes.tutor_emoji}</span></span></label>
        <div><Label htmlFor="rd">Keep student chats for (days)</Label><Input id="rd" type="number" min={7} max={365} value={v.chat_retention_days} onChange={(e) => setF({ ...v, chat_retention_days: Number(e.target.value) })} className="mt-1.5 h-11 w-40" /><p className="mt-1 text-sm text-muted-foreground">Between 7 and 365. Chats are deleted after this, and at the end of the school year.</p></div>
        <Button className="h-11" onClick={() => save.mutate()} disabled={save.isPending || !v.school_name.trim()}>Save settings</Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------ Services (engines) */
interface Engines { profiles: { id: string; label: string; text: string; ram_gb: number; state: string; can_start: boolean }[]; free_ram_gb: number | null; keep_free_gb: number; control_available: boolean; recent: { id: string; profile: string; action: string; ok: boolean; message: string; at: string }[] }
export function AdminServices() {
  const qc = useQueryClient();
  const d = useQuery({ queryKey: ["admin-engines"], queryFn: () => get<Engines>("/api/admin/engines"), refetchInterval: 6000 });
  const act = useMutation({ mutationFn: (v: { id: string; action: "start" | "stop" }) => post(`/api/admin/engines/${v.id}`, { action: v.action }), onSuccess: (_r, v) => { toast.success(`${v.action === "start" ? "Starting" : "Stopping"}… this can take a minute or two.`); qc.invalidateQueries({ queryKey: ["admin-engines"] }); }, onError: (e) => say(e) });
  if (!d.data) return <Skeleton className="h-64" />;
  return (
    <div className={wide}>
      <PageHeader title="Services" subtitle="Optional parts of the appliance. They start on demand so the tutor always has the memory it needs." />
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white px-5 py-3 card-soft"><span className="text-[15px]">Free memory: <strong>{d.data.free_ram_gb ?? "unknown"} GB</strong></span><span className="text-sm text-muted-foreground">{d.data.keep_free_gb} GB is always kept free for the tutor.</span>
        {!d.data.control_available && <Pill tone="amber" className="ml-auto">The helper that starts services isn't running</Pill>}</div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{d.data.profiles.map((p) => (
        <section key={p.id} className="rounded-xl border border-border bg-white p-5 card-soft">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-[20px]">{p.label}</h2><p className="text-sm text-muted-foreground">{p.text}</p><p className="mt-1 text-xs text-muted-foreground">Needs about {p.ram_gb} GB of memory</p></div>
            <Pill tone={p.state === "running" ? "green" : p.state === "stopped" ? "gray" : "amber"}>{p.state === "running" ? "Running" : p.state === "stopped" ? "Off" : p.state === "partly" ? "Partly running" : "Unknown"}</Pill></div>
          <div className="mt-4 flex items-center gap-2">
            {p.state !== "running" && <Button size="sm" disabled={!p.can_start || act.isPending || !d.data!.control_available} onClick={() => act.mutate({ id: p.id, action: "start" })}><Play className="mr-2 h-4 w-4" />Start</Button>}
            {p.state !== "stopped" && <Button size="sm" variant="outline" disabled={act.isPending || !d.data!.control_available} onClick={() => act.mutate({ id: p.id, action: "stop" })}><Square className="mr-2 h-4 w-4" />Stop</Button>}
            {!p.can_start && p.state !== "running" && <span className="text-xs text-[#8a1c2b]">Not enough free memory to start this safely.</span>}
          </div></section>))}</div>
      {d.data.recent.length > 0 && <section className="mt-5 rounded-xl border border-border bg-white p-5 card-soft"><h2 className="text-[18px]">Recent requests</h2><ul className="mt-2 divide-y divide-border text-[14px]">{d.data.recent.map((r) => <li key={r.id} className="flex items-center gap-2 py-2">{r.ok ? <CheckCircle2 className="h-4 w-4 text-okay" /> : <Square className="h-4 w-4 text-[#b42318]" />}<span className="capitalize">{r.action} {r.profile}</span><span className="text-muted-foreground">{r.ok ? "done" : r.message}</span><span className="ml-auto text-muted-foreground">{ago(r.at)}</span></li>)}</ul></section>}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------ Backups and export */
export function AdminBackups() {
  const qc = useQueryClient();
  const d = useQuery({ queryKey: ["admin-backups"], queryFn: () => get<{ backups: { name: string; size_mb: number; at: string }[]; note: string }>("/api/admin/backups") });
  const make = useMutation({ mutationFn: () => post<{ name: string; verified: boolean; people: number }>("/api/admin/backups"), onSuccess: (r) => { toast.success(`Backup made and checked (${r.people} people).`); qc.invalidateQueries({ queryKey: ["admin-backups"] }); }, onError: (e) => say(e) });
  return (
    <div className={wide}>
      <PageHeader title="Backups & Export" subtitle="Keep a copy of everything, and take your data with you." right={<Button className="h-11" disabled={make.isPending} onClick={() => make.mutate()}><Archive className="mr-2 h-4 w-4" />{make.isPending ? "Backing up…" : "Back up now"}</Button>} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-border bg-white p-5 card-soft"><h2 className="text-[20px]">Backups</h2><p className="text-sm text-muted-foreground">{d.data?.note}</p>
          {!d.data ? <Skeleton className="mt-3 h-24" /> : d.data.backups.length === 0 ? <p className="mt-3 text-[15px]">No backups yet. Press “Back up now”.</p> : <ul className="mt-3 divide-y divide-border text-[14px]">{d.data.backups.map((b) => <li key={b.name} className="flex items-center gap-3 py-2.5"><span className="font-mono">{b.name}</span><span className="text-muted-foreground">{b.size_mb} MB · {ago(b.at)}</span><a className="ml-auto text-primary hover:underline" href={`/api/admin/backups/${b.name}`}>Download</a></li>)}</ul>}</section>
        <section className="rounded-xl border border-border bg-white p-5 card-soft"><h2 className="text-[20px]">Export</h2><p className="text-sm text-muted-foreground">People and their classes as a spreadsheet. A single student's full data can be exported from People before deleting them.</p>
          <Button asChild variant="outline" className="mt-3"><a href="/api/admin/export/people.csv"><Download className="mr-2 h-4 w-4" />Download people (CSV)</a></Button></section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------ Audit log */
export function AdminAudit() {
  const [q, setQ] = useState("");
  const d = useQuery({ queryKey: ["admin-audit", q], queryFn: () => get<{ entries: { id: number; at: string; actor: string; action: string; target: string | null; reason: string | null }[] }>(`/api/admin/audit?q=${encodeURIComponent(q)}`) });
  return (
    <div className={wide}>
      <PageHeader title="Audit Log" subtitle="Who changed what, and when. Entries can't be edited." />
      <div className="relative mb-4 max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search the audit log" placeholder="Search actions and targets" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 pl-9" /></div>
      {!d.data ? <Skeleton className="h-64" /> : d.data.entries.length === 0 ? <Empty title="Nothing logged yet" /> : (
        <div className="rounded-xl border border-border bg-white card-soft"><Table><TableHeader><TableRow><TableHead>When</TableHead><TableHead>Who</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>Detail</TableHead></TableRow></TableHeader>
          <TableBody>{d.data.entries.map((e) => <TableRow key={e.id}><TableCell className="whitespace-nowrap text-muted-foreground">{new Date(e.at).toLocaleString()}</TableCell><TableCell>{e.actor}</TableCell><TableCell className="font-mono text-[13px]">{e.action}</TableCell><TableCell className="font-mono text-[13px] text-muted-foreground">{e.target ?? ""}</TableCell><TableCell className="text-muted-foreground">{e.reason ?? ""}</TableCell></TableRow>)}</TableBody></Table></div>)}
    </div>
  );
}
