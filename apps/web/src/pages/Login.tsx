import { useQuery } from "@tanstack/react-query";
import { BookOpen, Box, GraduationCap, Lock, MessageSquare } from "lucide-react";
import { useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { useBrand } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, get, post } from "@/lib/api";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const points = (uni: boolean, privacy: string) => [
  { icon: <MessageSquare className="h-5 w-5" strokeWidth={1.5} />, title: "A tutor that helps, not one that does the work", text: uni ? "Hints in coursework, explanations in lessons, and rules set by lecturers." : "Hints in homework, explanations in lessons, and rules set by teachers." },
  { icon: <Box className="h-5 w-5" strokeWidth={1.5} />, title: "AI in a box.", text: uni ? "One box on campus serves the whole course, even with the internet unplugged." : "One box at school serves the whole class, even with the internet unplugged." },
  { icon: <Lock className="h-5 w-5" strokeWidth={1.5} />, title: uni ? "Conversations stay on campus" : "Conversations stay at school", text: privacy },
];

/** Brand backgrounds for the two halves of the sign-in page, cross-fading slowly with a soft heartbeat pulse (index.css). */
function Backdrop({ side, bgs }: { side: "left" | "right"; bgs: { left: string; right: string }[] }) {
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
    {bgs.map((b, i) => <div key={i} className="login-bg" style={{ backgroundImage: `url(${b[side]})`, backgroundPosition: side === "left" ? "right center" : "left center", animationDelay: `${i * 8 - 3}s, ${i * 8 - 3}s` }} />)}
  </div>;
}

export default function Login({ onDone }: { onDone: () => void }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { brand, edition, schoolDisplay } = useBrand();
  const uni = edition.id === "university";
  const toDiscover = typeof location !== "undefined" && location.pathname.startsWith("/discover");   // signing in to open Discovery Lab
  const bgs = brand.loginBackgrounds ?? [];
  const POINTS = points(uni, brand.privacyLine);
  const [who, setWho] = useState<"student" | "staff">("student");
  const school = useQuery({ queryKey: ["school-entry"], queryFn: () => get<{ name: string | null }>("/api/auth/school"), retry: false, staleTime: Infinity });
  const entryName = schoolDisplay || school.data?.name;      // the box's configured name first (per-institution setup), else the database's
  const demo = useQuery({ queryKey: ["demo-config"], queryFn: () => get<{ enabled: boolean; banner: string; limits: { tutor_messages_per_hour: number } }>("/api/demo/config"), retry: false, staleTime: Infinity });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy("login"); setErr(null);
    try { await post("/api/auth/login", { username: u, password: p }); onDone(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : "Couldn't sign in."); }
    finally { setBusy(null); }
  }
  async function tryDemo(role: "student" | "teacher") {
    setBusy(role); setErr(null);
    try { await post("/api/demo/start", { role }); onDone(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : "The demo couldn't start. Please try again."); setBusy(null); }
  }

  const who2 = { who, setWho: (w: "student" | "staff") => { setWho(w); setErr(null); } };
  const form = (
    <>
      <div role="radiogroup" aria-label={t("login.chooseWho")} className="kl-switch">
        {(["student", "staff"] as const).map((w) => (
          <button key={w} type="button" role="radio" aria-checked={who === w} onClick={() => who2.setWho(w)} className="press">{t(`login.${w}`)}</button>))}
      </div>
      <form onSubmit={submit} className="mt-5 space-y-4" aria-label={t("login.signIn")}>
        <div><Label htmlFor="u">{t("login.username")}</Label><Input id="u" autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} className="mt-1.5 h-12 bg-white" autoFocus /></div>
        <div><Label htmlFor="p">{who === "student" ? t("login.passwordOrPin") : t("login.password")}</Label><Input id="p" type="password" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} className="mt-1.5 h-12 bg-white" /></div>
        {err && <p role="alert" className="rounded-lg bg-alertbg px-3 py-2 text-sm text-[#8a1c2b]">{err}</p>}
        <Button type="submit" disabled={!!busy || !u || !p} className="h-12 w-full rounded-full text-[15px]">{busy === "login" ? t("login.signingIn") : t("login.signIn")}</Button>
        <p className="text-center text-xs text-muted-foreground">{who === "student" ? t("login.studentForgot") : t("login.staffForgot")}</p>
      </form>
    </>
  );

  // The kente sign-in (brands with cloth backgrounds, EDU54): the cloth fills the page with its heartbeat, warp strips weave
  // in, a gold thread crosses, and the sign-in card rises over it. Same sign-in and demo as the plain layout below.
  if (bgs.length > 0) {
    const home = typeof location !== "undefined" && /(^|\.)edu54\.com$/.test(location.hostname) ? "https://edu54.com/" : null;
    return (
      <div className="kl">
        <div className="kl-cloth" aria-hidden="true">{bgs.map((b, i) => <div key={i} className="login-bg" style={{ backgroundImage: `url(${b.left})`, backgroundPosition: "center", animationDelay: `${i * 8 - 3}s, ${i * 8 - 3}s` }} />)}</div>
        <div className="kl-warp" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <b key={i} style={{ animationDelay: `${0.05 + i * 0.07}s`, backgroundImage: `url(${bgs[i % bgs.length].left})`, backgroundPosition: `${(i * 100) / 6}% 0` }} />)}</div>
        <div className="kl-seam" aria-hidden="true" />
        <div className="kl-grid">
          <header className="kl-top">
            {home ? <a href={home} className="kl-brand"><BrandMark className="h-10 w-10" /><span>{brand.productName}</span></a>
              : <span className="kl-brand"><BrandMark className="h-10 w-10" /><span>{brand.productName}</span></span>}
          </header>
          <section className="kl-story" aria-label={`About ${brand.productName}`}>
            <h2>{uni ? "A campus-owned" : "A school-owned"}<span>AI learning lab.</span></h2>
            <p>{uni ? "Ask, Learn, Build, Explore and track Progress, on a box that lives on your campus." : "Ask, Learn, Build, Explore and track Progress, on a box that lives in your school."}</p>
            <ul>{POINTS.map((x) => <li key={x.title}><span>{x.icon}</span><div><strong>{x.title}</strong>{x.text}</div></li>)}</ul>
          </section>
          <main className="kl-card-wrap">
            <div className="kl-card">
              <div className="kl-card-seam" aria-hidden="true" />
              {entryName && <p className="kl-entry"><span>{t("login.schoolEntry")}</span>{entryName}</p>}
              <h1>{who === "student" ? t("login.studentTitle") : t("login.staffTitle")}</h1>
              <p className="kl-sub">{who === "student" ? t("login.studentText") : t("login.staffText")}</p>
              {toDiscover && <p className="kl-sub" data-testid="discover-note"><strong>Discovery Lab</strong> uses the same sign-in as {brand.productName}{edition.label ? ` ${edition.label.replace("-", "\u2011")}` : ""}. Sign in here and it opens.</p>}
              {form}
              {demo.data?.enabled && (
                <section className="kl-demo" aria-label="Try the demo">
                  <h2>Just looking? Try the demo</h2>
                  <p>No sign-up and no password. You get your own private copy of a sample {uni ? "university" : "school"} with made-up students.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button variant="outline" className="h-12 justify-center gap-2 rounded-full bg-white text-primary" disabled={!!busy} onClick={() => tryDemo("student")}><BookOpen className="h-5 w-5" strokeWidth={1.5} />{busy === "student" ? "Starting…" : "Try as a student"}</Button>
                    <Button variant="outline" className="h-12 justify-center gap-2 rounded-full bg-white text-primary" disabled={!!busy} onClick={() => tryDemo("teacher")}><GraduationCap className="h-5 w-5" strokeWidth={1.5} />{busy === "teacher" ? "Starting…" : uni ? "Try as a lecturer" : "Try as a teacher"}</Button>
                  </div>
                  <small>Sample data only. Up to {demo.data.limits.tutor_messages_per_hour} tutor questions an hour. Everything resets nightly.</small>
                </section>)}
            </div>
            <p className="kl-foot">{uni ? "Your institution runs this on its own network. Your conversations stay on campus." : "Your school runs this on its own network. Your conversations stay at your school."} No per-student AI subscription. <a href="/attributions">Attributions</a></p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <aside className="relative isolate hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-white lg:flex" aria-label={`About ${brand.productName}`}>
        <div className="flex items-center gap-3"><BrandMark className="h-11 w-11" /><span className="font-serif text-2xl text-white">{brand.productName}</span></div>
        <div className="max-w-3xl">
          <h2 className="whitespace-nowrap font-serif text-[clamp(24px,2.45vw,44px)] leading-tight text-white">{uni ? "A campus-owned AI learning lab." : "A school-owned AI learning lab."}</h2>
          <p className="mt-3 max-w-xl text-[17px] text-white/75">{uni ? "Ask, Learn, Build, Explore and track Progress, on a box that lives on your campus." : "Ask, Learn, Build, Explore and track Progress, on a box that lives in your school."}</p>
          <ul className="mt-10 max-w-xl space-y-6">{POINTS.map((x) => (
            <li key={x.title} className="flex items-start gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10">{x.icon}</span><div><p className="font-medium text-white">{x.title}</p><p className="text-balance text-[14.5px] text-white/70">{x.text}</p></div></li>))}</ul>
        </div>
        <p className="text-sm text-white/70">{brand.id === "umanah" ? "Built on open-source software. No per-student AI subscription." : <>No per-student AI subscription. <a className="underline" href="/attributions">Attributions</a></>}</p>
        {bgs.length > 0 && <Backdrop side="left" bgs={bgs} />}
        {bgs.length === 0 && <svg aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-24 h-[420px] w-[420px] opacity-[0.07]" viewBox="0 0 100 100" fill="none" stroke="white" strokeWidth="1.2">
          {[0, 45, 90, 135].map((a) => <ellipse key={a} cx="50" cy="50" rx="44" ry="17" transform={`rotate(${a} 50 50)`} />)}<circle cx="50" cy="50" r="6" /></svg>}
      </aside>

      <main className="relative isolate grid place-items-center px-5 py-10">
        {bgs.length > 0 && <div className="hidden lg:block"><Backdrop side="right" bgs={bgs} /></div>}
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-center gap-3 text-primary lg:hidden"><BrandMark className="h-11 w-11" /><span className="font-serif text-2xl">{brand.productName}</span></div>
          {entryName && (
            <p className="mb-4 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5 text-center lg:justify-start"><span className="eyebrow">{t("login.schoolEntry")}</span><span aria-hidden="true" className="text-muted-foreground">·</span><span className="font-serif text-[17px] text-primary">{entryName}</span></p>)}
          <h1 className="text-center text-[34px] leading-tight lg:text-left">{who === "student" ? t("login.studentTitle") : t("login.staffTitle")}</h1>
          <p className="mt-1 text-balance text-center text-[15px] text-muted-foreground lg:text-left">{who === "student" ? t("login.studentText") : t("login.staffText")}</p>
          {toDiscover && <p className="mt-2 text-balance text-center text-[14px] text-primary lg:text-left" data-testid="discover-note"><strong>Discovery Lab</strong> uses the same sign-in as {brand.productName}{edition.label ? ` ${edition.label.replace("-", "\u2011")}` : ""}. Sign in here and it opens.</p>}
          <div role="radiogroup" aria-label={t("login.chooseWho")} className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-border bg-white p-1 card-soft">
            {(["student", "staff"] as const).map((w) => (
              <button key={w} type="button" role="radio" aria-checked={who === w} onClick={() => { setWho(w); setErr(null); }}
                className={cn("press h-11 rounded-lg text-[15px]", who === w ? "bg-primary text-white" : "text-primary hover:bg-muted")}>{t(`login.${w}`)}</button>))}
          </div>
          <form onSubmit={submit} className="mt-4 space-y-4 rounded-2xl border border-border bg-white p-6 card-soft" aria-label={t("login.signIn")}>
            <div><Label htmlFor="u">{t("login.username")}</Label><Input id="u" autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} className="mt-1.5 h-11" autoFocus /></div>
            <div><Label htmlFor="p">{who === "student" ? t("login.passwordOrPin") : t("login.password")}</Label><Input id="p" type="password" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} className="mt-1.5 h-11" /></div>
            {err && <p role="alert" className="rounded-lg bg-alertbg px-3 py-2 text-sm text-[#8a1c2b]">{err}</p>}
            <Button type="submit" disabled={!!busy || !u || !p} className="h-11 w-full text-[15px]">{busy === "login" ? t("login.signingIn") : t("login.signIn")}</Button>
            <p className="text-center text-xs text-muted-foreground">{who === "student" ? t("login.studentForgot") : t("login.staffForgot")}</p>
          </form>

          {demo.data?.enabled && (
            <section className="mt-6 rounded-2xl border border-[#dfe3f5] bg-[#f3f2fc] p-6" aria-label="Try the demo">
              <h2 className="text-balance text-[22px]">Just looking? Try the demo</h2>
              <p className="mt-1 text-[14px] text-[#3c4656]">No sign-up and no password. You get your own private copy of a sample school with made-up students.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Button variant="outline" className="h-12 justify-start gap-2 bg-white text-primary" disabled={!!busy} onClick={() => tryDemo("student")}><BookOpen className="h-5 w-5" strokeWidth={1.5} />{busy === "student" ? "Starting…" : "Try as a student"}</Button>
                <Button variant="outline" className="h-12 justify-start gap-2 bg-white text-primary" disabled={!!busy} onClick={() => tryDemo("teacher")}><GraduationCap className="h-5 w-5" strokeWidth={1.5} />{busy === "teacher" ? "Starting…" : "Try as a teacher"}</Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Sample data only. Up to {demo.data.limits.tutor_messages_per_hour} tutor questions an hour. Everything resets nightly.</p>
            </section>)}
          <p className="mt-6 text-center text-xs text-muted-foreground">{uni ? "Your institution runs this on its own network. Your conversations stay on campus." : "Your school runs this on its own network. Your conversations stay at your school."}</p>
        </div>
      </main>
    </div>
  );
}
