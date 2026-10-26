/** A short first-sign-in tour (once per person per browser). Reopen it any time from the account menu. */
import { BarChart3, BookOpen, ClipboardList, Code2, Database, GraduationCap, MessageSquare, Users } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { User } from "@/lib/api";

const STUDENT: { icon: ReactNode; title: string; text: string }[] = [
  { icon: <MessageSquare />, title: "Ask", text: "Get help from a tutor that runs right here at school. In homework it gives hints, not answers." },
  { icon: <BookOpen />, title: "Learn", text: "Courses, lessons, homework and a Revision page with practice questions and a ten-minute sprint." },
  { icon: <Code2 />, title: "Build", text: "Write and run Python in your browser. The helper explains errors and gives hints." },
  { icon: <Database />, title: "Explore", text: "Search a library that works even when the internet is off." },
  { icon: <BarChart3 />, title: "Progress", text: "Earn XP, badges and streaks for learning. There are no public rankings." },
];
const TEACHER: typeof STUDENT = [
  { icon: <ClipboardList />, title: "Your class at a glance", text: "See who has finished, who is in progress, and which students may need help." },
  { icon: <Users />, title: "Classes and students", text: "Add students one by one or from a spreadsheet, reset logins, and print cards." },
  { icon: <GraduationCap />, title: "Assignments and grading", text: "Set how much help the tutor may give, then grade work with a score and a comment." },
];
const key = (u: User) => `umanah.tour.${u.id}`;
const seen = (u: User) => { try { return localStorage.getItem(key(u)) === "1" || localStorage.getItem("umanah.tour.off") === "1"; } catch { return true; } };
const mark = (u: User) => { try { localStorage.setItem(key(u), "1"); } catch { /* private window */ } };

export function useTour(u: User) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if ((u.role === "student" || u.role === "teacher") && !seen(u)) setOpen(true); }, [u]);
  return { open, show: () => setOpen(true), close: () => { mark(u); setOpen(false); } };
}

export function Tour({ user, open, onClose }: { user: User; open: boolean; onClose: () => void }) {
  const steps = user.role === "student" ? STUDENT : TEACHER;
  const [i, setI] = useState(0);
  useEffect(() => { if (open) setI(0); }, [open]);
  const s = steps[i];
  if (!s) return null;
  const last = i === steps.length - 1;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <span className="mb-1 grid h-14 w-14 place-items-center rounded-full bg-[#e4eefc] text-primary [&>svg]:h-7 [&>svg]:w-7" aria-hidden="true">{s.icon}</span>
          <DialogTitle className="text-[24px]">{i === 0 ? `Welcome, ${user.name.split(" ")[0]}` : s.title}</DialogTitle>
          <DialogDescription className="text-[15px] text-[#374151]">{i === 0 ? <><strong>{s.title}.</strong> {s.text}</> : s.text}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-1.5" aria-label={`Step ${i + 1} of ${steps.length}`}>{steps.map((_, k) => <span key={k} className={`h-1.5 w-6 rounded-full ${k === i ? "bg-primary" : "bg-track"}`} />)}</div>
        <DialogFooter className="sm:justify-between"><Button variant="ghost" onClick={onClose}>Skip the tour</Button><Button onClick={() => (last ? onClose() : setI(i + 1))}>{last ? "Let's go" : "Next"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
