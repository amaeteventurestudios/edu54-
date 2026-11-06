/** The way into EDU54 Workbench (docs/edu54-build) from Learn and the student Home: one card, EDU54 only, not for the
 *  youngest learners (K-2 and 3-5 bands). */
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Box } from "lucide-react";
import { Link } from "react-router-dom";
import { Bar } from "@/components/common";
import { get } from "@/lib/api";
import { useBrand } from "@/lib/brand";

export function AiBuildCard({ band, className = "" }: { band?: string | null; className?: string }) {
  const { brand } = useBrand();
  const on = brand.id === "edu54" && band !== "discover" && band !== "explore";
  const p = useQuery({ queryKey: ["ai-build-progress"], queryFn: () => get<{ lessons: string[]; total: number }>("/api/ai-build/progress"), enabled: on });
  if (!on || (p.data && p.data.total === 0)) return null;
  const done = p.data?.lessons.length ?? 0, total = p.data?.total ?? 0;
  return (
    <Link to="/ai-build" aria-label="EDU54 Workbench: hands-on 3D AI lessons" className={`card-press relative flex flex-col gap-4 overflow-hidden rounded-xl border border-border bg-white p-5 card-soft sm:flex-row sm:items-center ${className}`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(rgba(164,70,42,.16) 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
      <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white" style={{ background: "linear-gradient(135deg,#A4462A,#E3A72F)" }}><Box className="h-7 w-7" strokeWidth={1.6} /></span>
      <div className="relative min-w-0 flex-1">
        <p className="font-serif text-[22px] leading-tight text-primary">EDU54 Workbench</p>
        <p className="mt-0.5 text-[14.5px] text-[#3c4656]">{total ? `${total} hands-on 3D AI lessons` : "Hands-on 3D AI lessons"}. Turn it, break it, fix it, from one neuron to agents.</p>
        {total > 0 && <div className="mt-2 flex max-w-sm items-center gap-3"><Bar value={(100 * done) / total} label="EDU54 Workbench lessons finished" /><span className="shrink-0 text-xs text-muted-foreground">{done} of {total}</span></div>}
      </div>
      <span className="relative inline-flex items-center gap-1.5 self-start rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground sm:self-center">{done ? "Continue" : "Open"}<ArrowRight className="h-4 w-4" /></span>
    </Link>
  );
}
