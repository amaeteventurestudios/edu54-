import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Empty, Pill } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { get, post } from "@/lib/api";
import { ago } from "@/lib/format";

interface Row { id: number; student: string; category_label: string; severity: string; status: string; created_at: string }
interface Detail extends Row { message: string; reply: string; notes: string | null; acknowledged_by: string | null }
const tone = (s: string) => (s === "new" ? "rose" : s === "acknowledged" ? "amber" : "green") as "rose" | "amber" | "green";

/** Safety Alerts — designated safety contacts only; works on the school network with the internet unplugged (docs/41). */
export default function Safety() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["safety-alerts-list"], queryFn: () => get<{ alerts: Row[]; new_count: number }>("/api/safety/alerts"), refetchInterval: 10000 });
  const [open, setOpen] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const detail = useQuery({ queryKey: ["safety-alert", open], queryFn: () => get<Detail>(`/api/safety/alerts/${open}`), enabled: open !== null });
  const ack = useMutation({
    mutationFn: (status: "acknowledged" | "closed") => post(`/api/safety/alerts/${open}/acknowledge`, { notes, status }),
    onSuccess: () => { setNotes(""); qc.invalidateQueries({ queryKey: ["safety-alerts-list"] }); qc.invalidateQueries({ queryKey: ["safety-alerts"] }); qc.invalidateQueries({ queryKey: ["safety-alert", open] }); },
  });
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="mb-1 text-[38px]">Safety Alerts</h1>
      <p className="mb-5 text-muted-foreground">Messages that suggest a student may be in danger. Only designated safety contacts can see this page. These never leave this school's device.</p>
      {!list.data ? <Skeleton className="h-48" /> : list.data.alerts.length === 0 ? <Empty title="No alerts" text="When a message suggests someone may be in danger, it will appear here." /> : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-white card-soft">
          {list.data.alerts.map((a) => (
            <li key={a.id}><button onClick={() => setOpen(a.id)} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-muted/50">
              <ShieldAlert className="h-5 w-5 text-[#b4234b]" /><div className="min-w-0 flex-1"><p className="font-medium text-primary">{a.student}</p><p className="text-sm text-muted-foreground">{a.category_label} · {ago(a.created_at)}</p></div>
              <Pill tone={tone(a.status)}>{a.status === "new" ? "New" : a.status === "acknowledged" ? "Acknowledged" : "Closed"}</Pill></button></li>))}
        </ul>)}
      <Sheet open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>{detail.data?.student ?? "Alert"}</SheetTitle><SheetDescription>{detail.data?.category_label} · {detail.data ? ago(detail.data.created_at) : ""}</SheetDescription></SheetHeader>
          {detail.data && (
            <div className="space-y-4 px-4 pb-6">
              <div><p className="eyebrow mb-1">What the student wrote</p><p className="rounded-lg bg-muted p-3 text-[15px]">{detail.data.message}</p></div>
              <div><p className="eyebrow mb-1">What the tutor showed</p><p className="whitespace-pre-wrap rounded-lg border border-border bg-white p-3 text-[14px] text-[#374151]">{detail.data.reply}</p></div>
              {detail.data.notes && <div><p className="eyebrow mb-1">Notes</p><p className="whitespace-pre-wrap text-[14px]">{detail.data.notes}</p></div>}
              <div className="space-y-2"><label htmlFor="n" className="eyebrow">Add a note</label><Textarea id="n" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="What you did or plan to do" />
                <div className="flex gap-2"><Button disabled={ack.isPending} onClick={() => ack.mutate("acknowledged")}>Acknowledge</Button><Button variant="outline" disabled={ack.isPending} onClick={() => ack.mutate("closed")}>Close alert</Button></div>
                {detail.data.acknowledged_by && <p className="text-xs text-muted-foreground">Handled by {detail.data.acknowledged_by} — status: {detail.data.status}</p>}</div>
              <p className="text-xs text-muted-foreground">Calling parents and any mandated reporting follow your school's own procedures.</p>
            </div>)}
        </SheetContent>
      </Sheet>
    </div>
  );
}
