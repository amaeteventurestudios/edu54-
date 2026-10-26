import { ArrowRight, Copy } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { tr } from "@/lib/brand";

export function PageHeader({ title, subtitle, right }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-center gap-4 md:justify-between">
      <div className="min-w-0 text-center md:text-left">
        <h1 className="text-[34px] leading-tight md:text-[42px]">{typeof title === "string" ? tr(title) : title}</h1>
        {subtitle && <div className="mx-auto mt-1 max-w-3xl text-balance text-base md:text-wrap text-muted-foreground md:mx-0">{typeof subtitle === "string" ? tr(subtitle) : subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

/** Round icon badge (48–56px) in a slightly stronger tint of the card's hue. */
export function IconBadge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-full text-primary", className)}>{children}</div>;
}

export function ArrowButton({ className = "" }: { className?: string }) {
  return <span className={cn("grid h-8 w-8 place-items-center rounded-full", className)} aria-hidden="true"><ArrowRight className="h-4 w-4 text-primary" /></span>;
}

export type Accent = "ask" | "learn" | "build" | "explore" | "progress";
export const ACCENT: Record<Accent, { bg: string; icon: string }> = {
  ask: { bg: "bg-ask-bg", icon: "bg-ask-icon" },
  learn: { bg: "bg-learn-bg", icon: "bg-learn-icon" },
  build: { bg: "bg-build-bg", icon: "bg-build-icon" },
  explore: { bg: "bg-explore-bg", icon: "bg-explore-icon" },
  progress: { bg: "bg-progress-bg", icon: "bg-progress-icon" },
};

export function FeatureCard({ to, accent, icon, title, text, className, style }: { to: string; accent: Accent; icon: ReactNode; title: string; text: string; className?: string; style?: CSSProperties }) {
  const a = ACCENT[accent];
  return (
    <Link to={to} style={style} className={cn("card-press group relative flex min-h-[190px] flex-col items-center rounded-[14px] border border-border p-4 text-center card-soft md:min-h-[220px] md:items-start md:p-5 md:text-left", a.bg, className)}>
      <IconBadge className={a.icon}>{icon}</IconBadge>
      <h3 className="mt-3 text-[22px] md:mt-5">{title}</h3>
      <p className="mt-1 max-w-[16ch] text-balance text-[15px] md:text-wrap leading-snug text-[#3c4656]">{text}</p>
      <ArrowButton className={cn("mt-auto self-center md:absolute md:bottom-4 md:right-4 md:mt-0 md:self-auto", a.icon)} />
    </Link>
  );
}

/** Pill / Badge with soft tinted fill and darker text of the same hue. */
const PILL: Record<string, string> = {
  green: "bg-[var(--pill-green)] text-[var(--pill-green-fg)]",
  blue: "bg-[var(--pill-blue)] text-[var(--pill-blue-fg)]",
  amber: "bg-[var(--pill-amber)] text-[var(--pill-amber-fg)]",
  rose: "bg-[var(--pill-rose)] text-[var(--pill-rose-fg)]",
  gray: "bg-muted text-muted-foreground",
};
export function Pill({ tone = "blue", children, className = "" }: { tone?: "green" | "blue" | "amber" | "rose" | "gray"; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", PILL[tone], className)}>{children}</span>;
}

/** Navy bar on a light track, 6–8px, fully rounded. Never colour alone: the number is always shown by the caller. */
export function Bar({ value, className = "", label }: { value: number; className?: string; label?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-track", className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} aria-label={label}>
      <div className="h-full w-full rounded-full transition-transform duration-300 ease-out-strong" style={{ transform: `translateX(-${100 - Math.min(100, Math.max(0, value))}%)`, background: "var(--progress)" }} />
    </div>
  );
}

/** Code with continuous line numbers (docs/05 change 9). */
export function CodeBlock({ code, title, className = "", actions }: { code: string; title?: string; className?: string; actions?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const lines = code.split("\n");
  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-[#f9f9fb]", className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-border bg-[#f3f3f7] px-3 py-1.5 text-xs text-muted-foreground">
          <span>{title}</span>
          <span className="flex items-center gap-3">
            {actions}
            <button onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1200); }} aria-label="Copy code" className="flex items-center gap-1 hover:text-primary">
              {copied ? "Copied" : <><Copy className="h-3.5 w-3.5" />Copy</>}
            </button>
          </span>
        </div>
      )}
      <pre className="code-block flex overflow-x-auto py-3 text-[#1f2937]">
        <span className="select-none pl-3 pr-3 text-right text-[#9aa3b2]" aria-hidden="true">{lines.map((_, i) => <span key={i} className="block">{i + 1}</span>)}</span>
        <code className="pr-4">{lines.map((l, i) => <span key={i} className="block whitespace-pre">{highlight(l)}</span>)}</code>
      </pre>
    </div>
  );
}

const KW = /\b(for|in|if|else|elif|while|def|return|print|range|import|from|True|False|None|and|or|not)\b/g;
function highlight(line: string): ReactNode {
  if (line.trim().startsWith("#")) return <span className="text-[#6b7280]">{line || " "}</span>;
  const parts: ReactNode[] = [];
  const tokenRe = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|f"(?:[^"\\]|\\.)*")|(\b\d+\b)|(\b(?:for|in|if|else|elif|while|def|return|import|from|and|or|not)\b)|(\b(?:print|range|len|int|str|input)\b)/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = tokenRe.exec(line))) {
    if (m.index > last) parts.push(line.slice(last, m.index));
    const cls = m[1] ? "text-[#b42318]" : m[2] ? "text-[#0e7490]" : m[3] ? "text-[#4338ca]" : "text-[#0e7490]";
    parts.push(<span key={k++} className={cls}>{m[0]}</span>);
    last = m.index + m[0].length;
  }
  parts.push(line.slice(last) || " ");
  void KW;
  return parts;
}

export function Empty({ title, text }: { title: string; text?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-white/60 p-8 text-center">
      <p className="font-serif text-lg text-primary">{title}</p>
      {text && <p className="mt-1 text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}
