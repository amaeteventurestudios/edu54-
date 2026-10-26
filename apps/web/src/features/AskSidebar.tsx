/** The Ask page's extras live in the navy sidebar under the main items (design/reference/02): New Conversation, Recent chats, My courses, Class resources. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Folder, GraduationCap, MessageSquare, MoreHorizontal, Pencil, PlusCircle, Search, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { api, ApiError, get } from "@/lib/api";
import { useCourses } from "@/lib/queries";
import { cn } from "@/lib/utils";

interface Chat { id: number; title: string; mode: string; deletable: boolean }
export const CHATS_KEY = "chats";

function useDebounced<T>(v: T, ms = 250) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

function Eyebrow({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return <p className="mb-1.5 mt-5 flex items-center gap-2 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/60">{icon}{children}</p>;
}

export function AskSidebarExtras() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const active = Number(params.get("c")) || null;
  const [term, setTerm] = useState("");
  const dq = useDebounced(term.trim());
  const [renaming, setRenaming] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<Chat | null>(null);
  const chats = useQuery({ queryKey: [CHATS_KEY, dq], queryFn: () => get<{ conversations: Chat[] }>(`/api/ai/conversations${dq ? `?q=${encodeURIComponent(dq)}` : ""}`) });
  const courses = useCourses();
  const refresh = () => qc.invalidateQueries({ queryKey: [CHATS_KEY] });
  const rename = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) => api(`/api/ai/conversations/${id}`, { method: "PATCH", json: { title } }),
    onSuccess: () => { refresh(); toast.success("Chat renamed"); }, onError: () => toast.error("Couldn't rename that chat."),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/ai/conversations/${id}`, { method: "DELETE" }),
    onSuccess: (_r, id) => { refresh(); toast.success("Chat deleted"); if (active === id) nav("/ask"); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't delete that chat."),
  });
  const list = chats.data?.conversations ?? [];

  return (
    <div className="mt-1" aria-label="Chats and courses">
      <div className="mx-2 my-3 h-px bg-white/12" />
      <button onClick={() => nav("/ask")} className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[14.5px] font-medium text-white hover:bg-white/5"><PlusCircle className="h-5 w-5" strokeWidth={1.6} />New Conversation</button>

      <Eyebrow>Recent chats</Eyebrow>
      <div className="relative mx-2 mb-1.5">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/50" />
        <input value={term} onChange={(e) => setTerm(e.target.value)} aria-label="Search your chats" placeholder="Search chats"
          className="h-8 w-full rounded-md border border-white/15 bg-white/5 pl-8 pr-2 text-[13px] text-white placeholder:text-white/70 focus:border-white/40 focus:outline-none" />
      </div>
      <ul className="space-y-0.5">
        {list.slice(0, dq ? 20 : 5).map((c) => (
          <li key={c.id} className={cn("group relative rounded-md", active === c.id ? "bg-white/10" : "hover:bg-white/5")}>
            {renaming === c.id ? (
              <RenameBox initial={c.title} onDone={(t) => { setRenaming(null); if (t && t !== c.title) rename.mutate({ id: c.id, title: t }); }} />
            ) : (
              <>
                <Link to={`/ask?c=${c.id}`} className="flex h-8 items-center gap-2.5 pl-3 pr-8 text-[13.5px] text-white/85" aria-current={active === c.id ? "page" : undefined}>
                  <MessageSquare className="h-4 w-4 shrink-0 text-white/60" strokeWidth={1.6} /><span className="truncate">{c.title}</span>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger aria-label={`Options for ${c.title}`} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded text-white/60 opacity-0 hover:bg-white/10 hover:text-white focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onSelect={() => setRenaming(c.id)}><Pencil className="mr-2 h-4 w-4" />Rename</DropdownMenuItem>
                    <DropdownMenuItem disabled={!c.deletable} onSelect={() => setConfirm(c)}><Trash2 className="mr-2 h-4 w-4" />{c.deletable ? "Delete" : "Stays with the assignment"}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </li>
        ))}
        {chats.data && list.length === 0 && <li className="px-3 py-1 text-[13px] text-white/60">{dq ? "No chats match." : "No chats yet. Ask something!"}</li>}
      </ul>

      <div className="mx-2 my-4 h-px bg-white/12" />
      <p className="mb-1.5 flex items-center gap-2 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/60"><GraduationCap className="h-4 w-4" />My courses</p>
      <ul className="space-y-0.5">{(courses.data?.courses ?? []).map((c) => <li key={c.id}><Link to="/learn" className="flex h-8 items-center gap-2.5 rounded-md pl-8 pr-2 text-[13.5px] text-white/85 hover:bg-white/5"><span className="h-1.5 w-1.5 rounded-full bg-white/60" />{c.title}</Link></li>)}</ul>
      <Eyebrow icon={<Folder className="h-4 w-4" />}>Class resources</Eyebrow>
      <p className="px-3 pl-9 text-[13px] text-white/60">None shared yet.</p>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this chat?</AlertDialogTitle><AlertDialogDescription>“{confirm?.title}” will be removed from your chat list. This can't be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Keep it</AlertDialogCancel><AlertDialogAction onClick={() => confirm && remove.mutate(confirm.id)}>Delete chat</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RenameBox({ initial, onDone }: { initial: string; onDone: (t: string) => void }) {
  const [v, setV] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.select(); }, []);
  return <input ref={ref} value={v} maxLength={80} aria-label="Chat name" onChange={(e) => setV(e.target.value)} onBlur={() => onDone(v.trim())}
    onKeyDown={(e) => { if (e.key === "Enter") onDone(v.trim()); if (e.key === "Escape") onDone(initial); }}
    className="h-8 w-full rounded-md border border-white/40 bg-white/10 px-2.5 text-[13.5px] text-white focus:outline-none" />;
}
