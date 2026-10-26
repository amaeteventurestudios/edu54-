import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ApiError, get, post, type User } from "@/lib/api";
import { useUser } from "@/lib/session";

/** Shown on every screen of a demo visit (docs/46): the data is made up, and the visitor can switch view or start over. */
export function DemoBanner() {
  const qc = useQueryClient();
  const user = useUser();
  const me = useQuery({ queryKey: ["me"], queryFn: () => get<{ user: User; demo?: boolean }>("/api/auth/me") });
  if (!me.data?.demo) return null;
  const views = ([["student", "See the student view"], ["teacher", "See the teacher view"], ["counselor", "See the counselor view"]] as const)
    .filter(([role]) => role !== (user.is_safety_contact ? "counselor" : user.role));
  async function go(path: "/api/demo/start" | "/api/demo/restart", role?: string) {
    try { await post(path, role ? { role } : undefined); qc.clear(); window.location.assign(window.location.pathname.startsWith("/discover") ? "/discover" : "/"); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : "That didn't work."); }
  }
  return (
    <div role="region" aria-label="Demo notice" className="flex flex-col items-center gap-x-4 gap-y-1 bg-[#fff4d6] px-4 py-2 text-center text-[13.5px] text-[#5a4210] md:flex-row md:flex-wrap md:text-left md:px-6">
      <FlaskConical className="hidden h-4 w-4 shrink-0 md:block" aria-hidden="true" />
      <span className="flex-1 text-balance"><strong>Demo with sample data.</strong> Real deployments run on-site at the school, and nothing here is real.</span>
      <div className="flex items-center justify-center gap-x-5">{views.map(([role, label]) => <button key={role} className="font-medium underline underline-offset-2 hover:no-underline" onClick={() => go("/api/demo/start", role)}>{label}</button>)}
      <button className="inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:no-underline" onClick={() => go("/api/demo/restart")}><RotateCcw className="h-3.5 w-3.5" />Start over</button></div>
    </div>
  );
}
