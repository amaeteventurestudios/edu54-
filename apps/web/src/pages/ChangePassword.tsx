import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BrandMark } from "@/components/BrandMark";
import { productName } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, post } from "@/lib/api";

/** Shown before anything else when an account still has the temporary password an admin or teacher printed for it. */
export function ChangePasswordForm({ forced = false, onDone }: { forced?: boolean; onDone?: () => void }) {
  const qc = useQueryClient();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const short = next.length > 0 && next.length < 8;
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true);
    try { await post("/api/auth/change-password", { current: cur, new: next }); toast.success("Your password was changed"); setCur(""); setNext(""); setAgain(""); await qc.invalidateQueries({ queryKey: ["me"] }); onDone?.(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : "Couldn't change the password."); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-4" aria-label="Change password">
      <div><Label htmlFor="cp0">{forced ? "Temporary password from your card" : "Current password"}</Label><Input id="cp0" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} className="mt-1.5 h-11" /></div>
      <div><Label htmlFor="cp1">New password</Label><Input id="cp1" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className="mt-1.5 h-11" aria-describedby="cp-hint" /><p id="cp-hint" className={`mt-1 text-xs ${short ? "text-[#8a1c2b]" : "text-muted-foreground"}`}>At least 8 characters. A few words with a number is easy to remember and hard to guess.</p></div>
      <div><Label htmlFor="cp2">Type it again</Label><Input id="cp2" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className="mt-1.5 h-11" /></div>
      {again && again !== next && <p role="alert" className="text-sm text-[#8a1c2b]">The two passwords don't match.</p>}
      {err && <p role="alert" className="rounded-lg bg-alertbg px-3 py-2 text-sm text-[#8a1c2b]">{err}</p>}
      <Button type="submit" className="h-11 w-full" disabled={busy || !cur || next.length < 8 || next !== again}>{busy ? "Saving…" : "Save new password"}</Button>
    </form>
  );
}

export default function ForceChangePassword() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4"><div className="w-full max-w-md">
      <div className="mb-6 flex items-center justify-center gap-3 text-primary"><BrandMark className="h-11 w-11" /><span className="font-serif text-2xl">{productName()}</span></div>
      <div className="rounded-2xl border border-border bg-white p-7 card-soft"><h1 className="text-3xl">Choose your password</h1><p className="mt-1 mb-5 text-sm text-muted-foreground">Your account has a temporary password. Pick your own now. Only you will know it.</p><ChangePasswordForm forced /></div></div></div>
  );
}
