import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// Picture books from the School Library (EPUB). The book is fetched from this device and shown one page at a time; its own
// scripts never run (the reader keeps them off).
export function EpubReader({ url, title }: { url: string; title: string }) {
  const box = useRef<HTMLDivElement>(null);
  const rendition = useRef<{ next: () => void; prev: () => void; destroy?: () => void } | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let cancelled = false;
    let book: { destroy: () => void } | null = null;
    setState("loading");
    (async () => {
      try {
        const [{ default: ePub }, res] = await Promise.all([import("epubjs"), fetch(url, { credentials: "same-origin" })]);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.arrayBuffer();
        if (cancelled || !box.current) return;
        const b = ePub(data);
        book = b;
        const r = b.renderTo(box.current, { width: "100%", height: "100%", spread: "none", flow: "paginated" });
        rendition.current = r;
        await r.display();
        if (!cancelled) setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => { cancelled = true; rendition.current = null; book?.destroy(); };
  }, [url]);
  return (
    <div className="flex w-full flex-1 flex-col">
      <div ref={box} aria-label={`Book: ${title}`} className="relative h-[min(68vh,620px)] min-h-[420px] overflow-hidden bg-white px-2" />
      {state === "loading" && <p className="p-3 text-center text-sm text-muted-foreground">Opening the book…</p>}
      {state === "error" && <p className="p-3 text-center text-sm text-muted-foreground">This book could not be opened here.</p>}
      <div className="flex items-center justify-center gap-3 border-t border-border py-2">
        <Button variant="outline" onClick={() => rendition.current?.prev()} disabled={state !== "ready"}><ChevronLeft className="mr-1 h-4 w-4" />Previous page</Button>
        <Button variant="outline" onClick={() => rendition.current?.next()} disabled={state !== "ready"}>Next page<ChevronRight className="ml-1 h-4 w-4" /></Button>
      </div>
    </div>
  );
}
