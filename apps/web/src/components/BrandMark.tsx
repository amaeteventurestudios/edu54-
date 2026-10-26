import { Rosette } from "./Rosette";
import { useBrand } from "@/lib/brand";

/** The brand's mark beside its name: the Umanah rosette, or a lettered roundel for a wordmark brand (no logo chosen yet). */
export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  const { brand } = useBrand();
  if (brand.logo.type === "rosette") return <Rosette className={className} />;
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="none" stroke="var(--brand-accent, currentColor)" strokeWidth="2" />
      <text x="24" y="32" textAnchor="middle" fontFamily="Libre Baskerville, Georgia, serif" fontSize="23" fontWeight="700" fill="var(--brand-accent, currentColor)">{brand.productName[0]}</text>
    </svg>
  );
}
