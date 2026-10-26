import { Link } from "react-router-dom";
import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import { Empty, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { post } from "@/lib/api";
import { useStatus } from "@/lib/queries";
import { useUser } from "@/lib/session";
import { productName, tr } from "@/lib/brand";
import { ChangePasswordForm } from "@/pages/ChangePassword";

export function Settings() {
  const u = useUser();
  return (
    <div className="w-full max-w-[1100px]">
      <PageHeader title="Settings" subtitle={`Your account on this school's ${productName()}.`} />
      <div className="space-y-4 rounded-xl border border-border bg-white p-6 card-soft">
        <dl className="grid grid-cols-[140px_1fr] gap-y-3 text-[15px]"><dt className="text-muted-foreground">Name</dt><dd>{u.name}</dd><dt className="text-muted-foreground">Username</dt><dd>{u.username}</dd><dt className="text-muted-foreground">Role</dt><dd>{u.role_label}</dd>{u.grade_label && <><dt className="text-muted-foreground">Grade</dt><dd>{u.grade_label} · {u.stage} <span className="text-sm text-muted-foreground">(set by your school)</span></dd></>}</dl>
        {u.role === "student"
          ? <p className="text-sm text-muted-foreground">{tr("Your school sets the tutor's rules for each lesson and assignment; you can't change them here. Your conversations stay on this school's device.")}</p>
          : <p className="text-sm text-muted-foreground">{u.permissions.includes("admin.access") ? tr(`You manage this school's ${productName()}: people, classes and school settings are on the Admin pages.`) : u.role === "counselor" ? "You see safety alerts for students who may need support. Only designated safety contacts receive them." : "You set the tutor's help level for each assignment you create. Students can't change it. Student chats linked to your assignments are visible to you."}</p>}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={async () => { await post("/api/auth/logout"); window.location.href = "/"; }}>Sign out</Button>
          {u.role === "student" && <Button variant="outline" asChild><Link to="/status">Lab Status</Link></Button>}
        </div>
      </div>
      {!u.pin_login ? <section className="mt-5 max-w-md rounded-xl border border-border bg-white p-6 card-soft"><h2 className="text-[20px]">Change your password</h2><div className="mt-4"><ChangePasswordForm /></div></section> : null}
    </div>
  );
}

export function LabStatus() {
  const s = useStatus();
  return (
    <div className="w-full max-w-[1200px]">
      <PageHeader title="Lab Status" subtitle={`How this ${productName()} is doing, in plain language.`} />
      {!s.data ? <Skeleton className="h-64" /> : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-white card-soft">
          {s.data.items.map((i) => (
            <li key={i.id} className="flex items-center gap-4 px-5 py-4">
              {i.state === "ready" || i.state === "healthy" ? <CheckCircle2 className="h-5 w-5 text-okay" /> : i.state === "unavailable" || i.state === "degraded" ? <XCircle className="h-5 w-5 text-rose-500" /> : <MinusCircle className="h-5 w-5 text-muted-foreground" />}
              <span className="flex-1 font-medium text-primary">{i.label}</span><span className="text-[15px] text-[#374151]">{i.text}</span>
            </li>))}
          {s.data.internet_connected !== null && <li className="flex items-center gap-4 px-5 py-4"><MinusCircle className="h-5 w-5 text-muted-foreground" /><span className="flex-1 font-medium text-primary">Internet right now</span><span className="text-[15px] text-[#374151]">{s.data.internet_connected ? "Connected (optional)" : "Not connected — everything still works"}</span></li>}
        </ul>
      )}
    </div>
  );
}

export function NotFound() { return <Empty title="We couldn't find that page" text="Use the menu on the left to get back to your work." />; }
