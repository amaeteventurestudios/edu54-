import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, FlaskConical, Sparkles, Star, Archive, BarChart3, BookOpen, ChevronDown, Code2, Database, FileText, FolderOpen, GraduationCap, Home, LayoutDashboard, ListChecks, LogOut, Menu, MessageSquare, MonitorCheck, School, ScrollText, Search, Server, Settings, ShieldAlert, ShieldCheck, SlidersHorizontal, Users, Wand2, ClipboardList } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AskSidebarExtras } from "@/features/AskSidebar";
import { NotificationBell } from "@/features/Bell";
import { DemoBanner } from "@/features/DemoBanner";
import { Tour, useTour } from "@/features/Tour";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { get, post, type User } from "@/lib/api";
import { K2_TILES, sayAloud } from "@/lib/bands";
import { can, useUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { BrandMark } from "./BrandMark";
import { get as getJson } from "@/lib/api";
import { productName, tr, useBrand } from "@/lib/brand";

const TITLES: [string, string][] = [["/ask", "Ask"], ["/learn/lessons", "Lesson"], ["/learn", "Learn"], ["/revision", "Practice"], ["/build", "Build"], ["/preview", "Learner preview"], ["/school/students", "Learner"], ["/school", "School by Grade"], ["/explore", "Explore"], ["/progress", "Progress"],
  ["/assignments", "Assignment"], ["/status", "Lab Status"], ["/settings", "Settings"], ["/safety", "Safety Alerts"], ["/teacher/classes", "Classes"], ["/teacher/students", "Students"], ["/teacher/school", "School"], ["/teacher/view-as", "View as Student"], ["/teacher/resources", "Resources"], ["/teacher/practice", "Practice"], ["/teacher/builder", "AI Lesson Builder"],
  ["/teacher/assignments", "Assignments"], ["/teacher/submissions", "Review work"], ["/teacher/curriculum", "Curriculum"], ["/teacher", "Teacher Center"], ["/admin/people", "People"],
  ["/admin/classes", "Classes"], ["/admin/safety-contacts", "Safety Contacts"], ["/admin/settings", "School Settings"], ["/admin/services", "Services"], ["/admin/backups", "Backups & Export"],
  ["/admin/audit", "Audit Log"], ["/admin", "Overview"]];
// EDU54 student navigation (owner, 2026-09-30): Home, AI Tutor, Learn, Practice, Create, Explore, Progress.
const EDU54_LABELS: Record<string, string> = { "/ask": "AI Tutor", "/learn?tab=practice": "Practice", "/build": "Create" };
const pageTitle = (p: string) => (p === "/" ? "Home" : tr(TITLES.find(([k]) => p === k || p.startsWith(k + "/"))?.[1] ?? productName()));

interface NavItem { to: string; label: string; icon: ReactNode; end?: boolean; soon?: boolean }

const icon = "h-5 w-5 shrink-0";
const STUDENT_NAV: NavItem[] = [
  { to: "/", label: "Home", icon: <Home className={icon} strokeWidth={1.6} />, end: true },
  { to: "/ask", label: "Ask", icon: <MessageSquare className={icon} strokeWidth={1.6} /> },
  { to: "/learn", label: "Learn", icon: <BookOpen className={icon} strokeWidth={1.6} /> },
  { to: "/build", label: "Build", icon: <Code2 className={icon} strokeWidth={1.6} /> },
  { to: "/explore", label: "Explore", icon: <Database className={icon} strokeWidth={1.6} /> },
  { to: "/progress", label: "Progress", icon: <BarChart3 className={icon} strokeWidth={1.6} /> },
];
// EDU54 keeps Practice in the student navigation (owner, 2026-09-30); it opens the Practice tab in Learn
const EDU54_STUDENT_NAV: NavItem[] = [...STUDENT_NAV.slice(0, 3), { to: "/learn?tab=practice", label: "Practice", icon: <GraduationCap className={icon} strokeWidth={1.6} /> }, ...STUDENT_NAV.slice(3)];
const soon = (label: string) => `${label}`;
function navFor(u: User, schoolPath: string | null): NavItem[] {  // schoolPath: School by Grade, where the edition has grade bands
  const I = (C: typeof Home) => <C className={icon} strokeWidth={1.6} />;
  const grades: NavItem[] = schoolPath ? [{ to: schoolPath, label: "School by Grade", icon: I(School) }, { to: "/teacher/view-as", label: "View as Student", icon: I(Eye) }] : [];
  const out: NavItem[] = [];
  const has = (p: string) => u.permissions.includes(p);
  if (has("admin.access")) {
    out.push({ to: "/admin", label: "Overview", icon: I(LayoutDashboard), end: true });
    if (has("people.manage")) out.push({ to: "/admin/people", label: "People", icon: I(Users) });
    if (has("classes.manage")) out.push({ to: "/admin/classes", label: "Classes", icon: I(School) });
    if (schoolPath && !has("teaching")) out.push({ to: schoolPath, label: "School by Grade", icon: I(GraduationCap) });
    if (has("safety.contacts")) out.push({ to: "/admin/safety-contacts", label: "Safety Contacts", icon: I(ShieldCheck) });
    if (has("school.settings")) out.push({ to: "/admin/settings", label: "School Settings", icon: I(SlidersHorizontal) });
    if (has("engines.manage")) out.push({ to: "/admin/services", label: "Services", icon: I(Server) });
    if (has("backups.manage")) out.push({ to: "/admin/backups", label: "Backups & Export", icon: I(Archive) });
    if (has("audit.view")) out.push({ to: "/admin/audit", label: "Audit Log", icon: I(ScrollText) });
  }
  if (has("teaching") && u.role !== "teacher") out.push({ to: "/teacher", label: "Teacher Center", icon: I(Home), end: true }, ...grades);
  if (u.role === "teacher") {
    out.push({ to: "/teacher", label: "Teacher Center", icon: I(Home), end: true }, { to: "/teacher/classes", label: "Classes", icon: I(ClipboardList) },
      { to: "/teacher/curriculum", label: "Curriculum", icon: I(BookOpen) }, { to: "/teacher/assignments", label: "Assignments", icon: I(FileText) }, { to: "/teacher/students", label: "Students", icon: I(Users) }, ...grades,
      { to: "/teacher/practice", label: "Practice", icon: I(GraduationCap) }, { to: "/teacher/assignments?kind=assessment", label: "Assessments", icon: I(ListChecks) },
      { to: "/teacher/resources", label: "Resources", icon: I(FolderOpen) }, { to: "/teacher/builder", label: "AI Lesson Builder", icon: I(Wand2) },
      { to: "/explore", label: "Knowledge Library", icon: I(Database) });
  }
  if (u.is_safety_contact) out.push({ to: "/safety", label: "Safety Alerts", icon: I(ShieldAlert) });
  void soon;
  return out;
}

// Lab Status is for staff; students reach it from Settings (K-12 UI spec).
const bottomNav = (student: boolean): NavItem[] => [
  ...(student ? [] : [{ to: "/status", label: "Lab Status", icon: <MonitorCheck className={icon} strokeWidth={1.6} /> }]),
  { to: "/settings", label: "Settings", icon: <Settings className={icon} strokeWidth={1.6} /> },
];

/** Under the logo, on every screen: the learner's grade, from enrollment. */
function LearnerBadge({ user }: { user: User }) {
  if (user.role !== "student" || user.grade == null) return null;
  return (
    <div className="mx-2 mb-4 rounded-lg bg-white/8 px-3 py-2 text-white" aria-label={`${user.grade_label}, ${user.stage}`}>
      <p className="text-[12px] font-semibold uppercase tracking-[0.12em]">{user.grade === 0 ? "Kindergarten" : `Grade ${user.grade}`}</p>
      <p className="text-[13px] text-white/75">{user.stage}</p>
    </div>
  );
}

/** K-2: four big picture buttons instead of the list (read aloud on hover or with the speaker button). */
function K2Nav({ onPick }: { onPick?: () => void }) {
  const ICON: Record<string, ReactNode> = { read: <BookOpen className="h-8 w-8" strokeWidth={1.4} />, play: <Sparkles className="h-8 w-8" strokeWidth={1.4} />,
    ask: <MessageSquare className="h-8 w-8" strokeWidth={1.4} />, stars: <Star className="h-8 w-8" strokeWidth={1.4} /> };
  return (
    <nav className="grid grid-cols-1 gap-2" aria-label="Main">
      <NavLink to="/" end onClick={onPick} className={({ isActive }) => cn("flex h-14 items-center gap-3 rounded-xl px-4 text-[18px] text-white/90 hover:bg-white/5", isActive && "bg-sidebar-accent text-white")}><Home className="h-7 w-7" strokeWidth={1.4} />Home</NavLink>
      {K2_TILES.map((t) => (
        <NavLink key={t.id} to={t.to} onClick={onPick} onMouseEnter={() => sayAloud(t.say)} className={({ isActive }) => cn("flex h-16 items-center gap-3 rounded-xl px-4 text-[20px] text-white/90 hover:bg-white/5", isActive && "bg-sidebar-accent text-white")}>
          {ICON[t.id]}{t.label}
        </NavLink>))}
    </nav>
  );
}

/** A row is active on its own page; a link with a query ("/learn?tab=practice") only on that tab, and then its plain
 *  sibling ("/learn") is not highlighted as well. */
function NavRow({ item, badge, dense, siblings = [] }: { item: NavItem; badge?: number; dense?: boolean; siblings?: NavItem[] }) {
  const { search } = useLocation();
  const [, query] = item.to.split("?");
  const shadowed = siblings.some((o) => o.to.startsWith(item.to + "?") && search.includes(o.to.split("?")[1]));
  return (
    <NavLink to={item.to} end={item.end}
      className={({ isActive }) => cn("flex items-center gap-3 rounded-lg px-3 text-[15px]", dense ? "h-10" : "h-12", " press text-white/85 hover:bg-white/5",
        isActive && (query ? search.includes(query) : !shadowed) && "bg-sidebar-accent text-white")}>
      {item.icon}<span className="flex-1">{item.label}</span>
      {item.soon && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/70">Soon</span>}
      {badge ? <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white" aria-label={`${badge} new`}>{badge}</span> : null}
    </NavLink>
  );
}

/** The persistent learner badge ("JSS 2 · Junior Secondary") comes from the student's class, never from the student. */
function useLearnerBadge(on: boolean) {
  const q = useQuery({ queryKey: ["learner", "me"], queryFn: () => getJson<{ level: string; stage: string; band: { id: string } | null }>("/api/learner/me"), enabled: on, staleTime: 60_000 });
  return on && q.data?.level ? q.data : null;
}

export function AppShell() {
  const user = useUser();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(false);
  const isStudent = user.role === "student";
  const tour = useTour(user);
  const path = useLocation().pathname;
  const { brand, edition, schoolDisplay } = useBrand();
  useEffect(() => { const t = pageTitle(path); document.title = t === brand.productName ? t : `${t} · ${brand.productName}`; }, [path, brand.productName]);
  const onAsk = isStudent && path === "/ask";
  const alerts = useQuery({ queryKey: ["safety-alerts"], queryFn: () => get<{ new_count: number }>("/api/safety/alerts"), enabled: user.is_safety_contact, refetchInterval: 15000 });

  const renamed = brand.id !== "umanah";
  // School by Grade and View as exist where there are grade bands: the AI Lab and EDU54 K-12 (EDU54's own pages), not University
  const bands = !renamed || Object.keys(edition.bands ?? {}).length > 0;
  const items: NavItem[] = (isStudent ? (renamed ? EDU54_STUDENT_NAV : STUDENT_NAV) : navFor(user, bands ? (renamed ? "/school" : "/teacher/school") : null))
    .map((i) => ({ ...i, label: tr(isStudent && renamed ? EDU54_LABELS[i.to] ?? i.label : i.label) }));
  // Discovery Lab, the third environment (EDU54): for students and for staff who teach, after the school's own pages
  if (renamed && (isStudent || can(user, "teaching"))) items.push({ to: "/discover", label: "Discovery Lab", icon: <FlaskConical className={icon} strokeWidth={1.6} /> });
  const learner = useLearnerBadge(isStudent && renamed);
  const k2 = isStudent && !renamed && user.band === "discover";        // the AI Lab's K-2 picture navigation
  // EDU54 K-2 (Discover): no dense navigation, only what a young child uses
  const shown = learner?.band?.id === "discover" ? items.filter((i) => ["/", "/ask", "/explore", "/progress"].includes(i.to)) : items;
  const BOTTOM_NAV = bottomNav(isStudent);

  async function signOut() {
    await post("/api/auth/logout");
    qc.clear();
    window.location.assign("/");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-white focus:p-2">Skip to content</a>
      <aside className="sticky top-0 hidden h-screen w-[250px] shrink-0 flex-col bg-sidebar px-3 py-5 text-sidebar-foreground md:flex" aria-label="Main navigation">
        <div className="mb-5 flex shrink-0 items-center gap-3 px-2 text-white">
          <BrandMark className="h-9 w-9" />
          <span className="font-serif text-[20px] text-white" style={{ color: "#fff" }}>{brand.productName}</span>
        </div>
        {learner ? <div className="mb-4 ml-2 w-fit rounded-lg bg-white/10 px-3 py-1.5" aria-label="Your level"><p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white">{learner.level}</p>{learner.stage && <p className="text-[12px] text-white/75">{learner.stage}</p>}</div>
          : !renamed && <LearnerBadge user={user} />}
        <div className="sidebar-scroll -mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
          {k2 ? <K2Nav /> : <nav className="flex flex-col gap-1">
            {shown.map((i) => <NavRow key={i.to} item={i} siblings={shown} dense={onAsk} badge={i.to === "/safety" ? alerts.data?.new_count : undefined} />)}
          </nav>}
          {onAsk && <AskSidebarExtras />}
        </div>
        <div className="shrink-0">
          <div className="mx-2 my-3 h-px bg-white/12" />
          <nav className="flex flex-col gap-1">{BOTTOM_NAV.map((i) => <NavRow key={i.to} item={i} dense={onAsk} />)}</nav>
        </div>
      </aside>

      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left" className="w-[280px] border-0 bg-sidebar p-4 text-white [&>button]:text-white">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="mb-5 flex items-center gap-3 px-2"><BrandMark className="h-9 w-9" /><span className="font-serif text-[20px]" style={{ color: "#fff" }}>{brand.productName}</span></div>
          {learner ? <div className="mb-4 ml-2 w-fit rounded-lg bg-white/10 px-3 py-1.5"><p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white">{learner.level}</p>{learner.stage && <p className="text-[12px] text-white/75">{learner.stage}</p>}</div>
            : !renamed && <LearnerBadge user={user} />}
          {k2 ? <K2Nav onPick={() => setMenu(false)} /> : <nav className="flex flex-col gap-1" onClick={() => setMenu(false)}>{shown.map((i) => <NavRow key={i.to} item={i} siblings={shown} badge={i.to === "/safety" ? alerts.data?.new_count : undefined} />)}
            <div className="my-3 h-px bg-white/12" />{BOTTOM_NAV.map((i) => <NavRow key={i.to} item={i} />)}</nav>}
          {onAsk && <div className="mt-3"><AskSidebarExtras /></div>}
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30">
        <DemoBanner />
        <header className="flex h-[60px] items-center gap-3 border-b border-topbar-border bg-topbar px-4 md:gap-4 md:px-6">
          <button className="grid h-10 w-10 place-items-center rounded-lg text-primary hover:bg-black/5 md:hidden" aria-label="Open the menu" onClick={() => setMenu(true)}><Menu className="h-6 w-6" /></button>
          <form className="relative max-w-3xl flex-1" onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav(`/ask?q=${encodeURIComponent(q.trim())}`); }} role="search">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Ask a question or start a new conversation"
              placeholder={isStudent ? "Ask a question or start a new conversation…" : "Ask a question or search resources…"}
              className="h-10 w-full rounded-[10px] border border-input bg-[#fcfaf8] pl-9 pr-3 text-sm placeholder:text-muted-foreground" />
          </form>
          <div className="ml-auto flex items-center gap-3">
            {schoolDisplay && <span className="hidden text-sm text-muted-foreground lg:inline">{schoolDisplay}</span>}
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 text-sm hover:bg-black/5" aria-label="Account menu">
                <Avatar className="h-9 w-9"><AvatarFallback className="bg-[#d9e1ec] text-sm font-medium text-primary">{user.initials}</AvatarFallback></Avatar>
                <span className="hidden sm:inline">{isStudent ? user.name.split(" ")[0] : user.name}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-xs text-muted-foreground">{user.name}{user.title ? ` · ${user.title}` : ""}</div>
                <DropdownMenuItem onSelect={() => nav("/settings")}><Settings className="mr-2 h-4 w-4" />Settings</DropdownMenuItem>
                {(isStudent || user.role === "teacher") && <DropdownMenuItem onSelect={tour.show}><GraduationCap className="mr-2 h-4 w-4" />Take the tour</DropdownMenuItem>}
                <DropdownMenuItem onSelect={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        </div>
        <Tour user={user} open={tour.open} onClose={tour.close} />
        <main id="main" className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8"><Outlet /></main>
      </div>
    </div>
  );
}
