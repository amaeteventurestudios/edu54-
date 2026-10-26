import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ago } from "@/lib/format";
import { get, post } from "@/lib/api";
import { cn } from "@/lib/utils";

interface N { unread: number; items: { id: number; title: string; body: string; link: string | null; read: boolean; at: string }[] }

/** The bell in the top bar: short notices for this person only, for example "Loops Practice was graded". */
export function NotificationBell() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const n = useQuery({ queryKey: ["notifications"], queryFn: () => get<N>("/api/notifications"), refetchInterval: 30000 });
  const read = useMutation({ mutationFn: (ids?: number[]) => post("/api/notifications/read", { ids }), onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }) });
  const unread = n.data?.unread ?? 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-black/5 hover:text-primary" aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}>
        <Bell className="h-5 w-5" strokeWidth={1.6} />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">{unread}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px]">
        <div className="flex items-center justify-between px-2 py-1.5"><span className="text-sm font-medium text-primary">Notifications</span>
          {unread > 0 && <button className="text-xs text-primary hover:underline" onClick={() => read.mutate(undefined)}>Mark all as read</button>}</div>
        {(n.data?.items ?? []).length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground">Nothing new. When your work is graded, you'll see it here.</p>}
        {(n.data?.items ?? []).slice(0, 8).map((i) => (
          <DropdownMenuItem key={i.id} className="flex-col items-start gap-0.5 py-2" onSelect={() => { read.mutate([i.id]); if (i.link) nav(i.link); }}>
            <span className={cn("text-[14px]", !i.read && "font-semibold text-primary")}>{i.title}</span>
            {i.body && <span className="text-xs text-muted-foreground">{i.body}</span>}
            <span className="text-[11px] text-muted-foreground">{ago(i.at)}</span>
          </DropdownMenuItem>))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
