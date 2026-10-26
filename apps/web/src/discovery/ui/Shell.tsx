/** Discovery Lab's own frame: a lab, not a class, so no school navigation and no teacher tools. The same sign-in as K-12 or
 *  University (it is part of the same app), a way back, local search and the account menu. */
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, FlaskConical, LogOut } from "lucide-react";
import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DemoBanner } from "@/features/DemoBanner";
import { post } from "@/lib/api";
import { useBrand } from "@/lib/brand";
import { homePath, useUser } from "@/lib/session";
import { SearchBox } from "./SearchBox";

export function DiscoveryShell() {
  const user = useUser();
  const qc = useQueryClient();
  const { brand, edition } = useBrand();
  const path = useLocation().pathname;
  const home = path === "/discover" || path === "/discover/";
  useEffect(() => { window.scrollTo(0, 0); }, [path]);
  const back = `Back to ${edition.label ? `${brand.shortName} ${edition.label}` : brand.productName}`;

  async function signOut() {
    await post("/api/auth/logout");
    qc.clear();
    window.location.assign("/discover");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-white focus:p-2">Skip to content</a>
      <div className="sticky top-0 z-30">
        <DemoBanner />
        <header className="relative bg-sidebar text-white">
          <div className="mx-auto flex h-[62px] max-w-[1400px] items-center gap-3 px-4 md:gap-5 md:px-6">
            <Link to="/discover" className="flex shrink-0 items-center gap-2.5" aria-label="Discovery Lab home">
              <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--brand-accent)] text-[var(--brand-accent)]"><FlaskConical className="h-[18px] w-[18px]" strokeWidth={1.8} /></span>
              <span className="font-serif text-[19px] leading-none" style={{ color: "#fff" }}>Discovery Lab</span>
            </Link>
            {!home && <SearchBox className="hidden max-w-md flex-1 md:block" />}
            <div className="ml-auto flex items-center gap-1 md:gap-3">
              <Link to={homePath(user)} className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13.5px] text-white/85 hover:bg-white/10 hover:text-white sm:flex"><ArrowLeft className="h-4 w-4" />{back}</Link>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 text-sm hover:bg-white/10" aria-label="Account menu">
                  <Avatar className="h-9 w-9"><AvatarFallback className="bg-white/15 text-sm font-medium text-white">{user.initials}</AvatarFallback></Avatar>
                  <ChevronDown className="h-4 w-4 text-white/70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">{user.name}{user.title ? ` · ${user.title}` : ""}</div>
                  <DropdownMenuItem asChild><Link to={homePath(user)}><ArrowLeft className="mr-2 h-4 w-4" />{back}</Link></DropdownMenuItem>
                  <DropdownMenuItem onSelect={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {!home && <div className="px-4 pb-3 md:hidden"><SearchBox /></div>}
          {brand.id === "edu54" && <div className="kl-seam !top-auto !bottom-0 !h-[5px]" aria-hidden="true" />}
        </header>
      </div>
      <main id="main" className="mx-auto w-full min-w-0 max-w-[1400px] flex-1 px-4 py-6 md:px-6 md:py-8"><Outlet /></main>
      <footer className="border-t border-border px-4 py-5 text-center text-[12.5px] text-muted-foreground">
        Experiments run in your browser and keep working without the internet. The AI Guide runs on an open model on our own hardware, not a paid online AI service.
      </footer>
    </div>
  );
}
