import { useQuery } from "@tanstack/react-query";
import { BrandMark } from "@/components/BrandMark";
import { useBrand } from "@/lib/brand";

interface Item { id: string; title: string; kind?: string; edition?: string; license: string; attribution: string; source_url: string; checked_on: string; share_alike_pack?: boolean }

/** Attributions (docs/edu54/CLAUDE.md §2): every content item and tool on this device with its license and credit, generated
 *  from the import catalog. Sources' names appear here as credits only, never as our branding. Open without signing in. */
export default function Attributions() {
  const { brand, edition } = useBrand();
  const q = useQuery({ queryKey: ["attributions"], queryFn: async () => (await fetch("/api/config/attributions")).json() as Promise<{ items: Item[]; platformCredit: string }> });
  const items = (q.data?.items ?? []).filter((i) => !i.edition || i.edition === "both" || i.edition === edition.id);
  const groups = [...new Set(items.map((i) => i.kind || "content"))];
  return (
    <main className="mx-auto w-full max-w-[1000px] px-5 py-10">
      <a href="/" className="mb-6 flex items-center gap-3 text-primary"><BrandMark className="h-10 w-10" /><span className="font-serif text-2xl">{brand.productName}</span></a>
      <h1 className="text-[34px] leading-tight">Attributions</h1>
      <p className="mt-2 text-muted-foreground">The open content and software on this device, with the license each one is shared under. {brand.platformCredit ? `${brand.productName}, ${brand.platformCredit.charAt(0).toLowerCase() + brand.platformCredit.slice(1)}.` : ""}</p>
      {q.isLoading ? <p className="mt-6">Loading…</p> : items.length === 0 ? <p className="mt-6">Nothing has been imported on this device yet.</p> :
        groups.map((g) => (
          <section key={g} className="mt-8">
            <h2 className="text-[22px] capitalize">{g}</h2>
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-white card-soft">
              {items.filter((i) => (i.kind || "content") === g).map((i) => (
                <li key={i.id} className="px-5 py-3 text-[14.5px]">
                  <p className="font-medium text-primary">{i.title}</p>
                  <p className="text-muted-foreground">{i.attribution} · {i.license}{i.share_alike_pack ? " (ShareAlike pack)" : ""} · <span className="break-all">{i.source_url}</span> · license checked {i.checked_on}</p>
                </li>))}
            </ul>
          </section>))}
    </main>
  );
}
