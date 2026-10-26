/** Printable login cards (docs/45): the one-time credentials are shown once, on screen and on paper. Nothing here is stored. */
import { productName } from "@/lib/brand";
import { Printer } from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface Cred { name: string; username: string; credential: string; pin?: boolean }

export function LoginCards({ open, onClose, creds, className, school }: { open: boolean; onClose: () => void; creds: Cred[]; className?: string; school?: string }) {
  const url = window.location.origin;
  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>New logins{className ? ` for ${className}` : ""}</DialogTitle>
            <DialogDescription>These are shown once. Print the cards now and hand them out; a password can always be reset later, but not looked up.</DialogDescription></DialogHeader>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="New logins">{creds.map((c) => (
            <li key={c.username} className="rounded-lg border border-border bg-white p-3 text-[14px]"><p className="font-serif text-[16px] text-primary">{c.name}</p>
              <p className="mt-1 text-muted-foreground">Username <span className="ml-1 font-mono text-[#111827]">{c.username}</span></p>
              <p className="text-muted-foreground">{c.pin ? "PIN" : "Password"} <span className="ml-1 font-mono text-[#111827]">{c.credential}</span></p></li>))}</ul>
          <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button><Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print login cards</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {open && createPortal(
        <div className="print-cards" aria-hidden="true">{creds.map((c) => (
          <div key={c.username} className="print-card"><p className="pc-brand">{school ?? productName()}</p><p className="pc-name">{c.name}</p>
            <p>Go to <b>{url}</b></p><p>Username: <b>{c.username}</b></p><p>{c.pin ? "PIN" : "Password"}: <b>{c.credential}</b></p>
            <p className="pc-note">{c.pin ? "Keep your PIN secret." : "You will choose your own password the first time you sign in."}</p></div>))}</div>, document.body)}
    </>
  );
}
