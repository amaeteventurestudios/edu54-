/** Tutor messages as safe Markdown (docs/16): bold, italics, lists, headings, inline code, highlighted code blocks with copy, KaTeX maths.
 *  Model output is never treated as HTML: raw HTML is not parsed at all, the tree is sanitised, links and images are not rendered. */
import "katex/dist/katex.min.css";
import { Code2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { CodeBlock } from "@/components/common";

const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ["className", /^language-./, "math-inline", "math-display"]],
    span: [...(defaultSchema.attributes?.span ?? []), ["className", "math", "math-inline", "math-display"]],
    div: [...(defaultSchema.attributes?.div ?? []), ["className", "math", "math-display"]],
  },
} as typeof defaultSchema;

const LANG: Record<string, string> = { py: "Python", python: "Python", js: "JavaScript", javascript: "JavaScript", html: "HTML", css: "CSS", bash: "Shell", sh: "Shell", json: "JSON", text: "Text" };

function Fence({ lang, code }: { lang: string; code: string }) {
  const nav = useNavigate();
  const python = lang === "python" || lang === "py";
  return (
    <CodeBlock code={code} title={LANG[lang] ?? (lang ? lang : "Code")} className="my-3"
      actions={python ? <button onClick={() => nav("/build", { state: { code } })} className="flex items-center gap-1 text-primary hover:underline"><Code2 className="h-3.5 w-3.5" />Try it in Build</button> : undefined} />
  );
}

const components: Components = {
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children }) => {
    const m = /language-(\w+)/.exec(className ?? "");
    const text = String(children ?? "");
    if (className?.includes("math-")) return <code className={className}>{children}</code>;
    if (m || text.includes("\n")) return <Fence lang={(m?.[1] ?? "").toLowerCase()} code={text.replace(/\n$/, "")} />;
    return <code className="rounded bg-[#eef1f6] px-1 py-0.5 font-mono text-[0.9em] text-[#1f2937]">{children}</code>;
  },
  a: ({ children }) => <span className="text-primary underline decoration-dotted">{children}</span>,   // no links out of the tutor
  img: () => null,
  h1: ({ children }) => <h3 className="mb-1 mt-3 font-serif text-[19px] text-primary">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-1 mt-3 font-serif text-[18px] text-primary">{children}</h3>,
  h3: ({ children }) => <h4 className="mb-1 mt-3 font-serif text-[16px] text-primary">{children}</h4>,
  h4: ({ children }) => <h4 className="mb-1 mt-2 font-serif text-[15px] text-primary">{children}</h4>,
  p: ({ children }) => <p className="my-2 leading-relaxed first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
  blockquote: ({ children }) => <blockquote className="my-2 border-l-4 border-[#c7d7ee] pl-3 text-muted-foreground">{children}</blockquote>,
  table: ({ children }) => <div className="my-2 overflow-x-auto"><table className="w-full border-collapse text-[14px]">{children}</table></div>,
  th: ({ children }) => <th className="border border-border bg-muted px-2 py-1 text-left font-medium">{children}</th>,
  td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
};

export default function Markdown({ text }: { text: string }) {
  return (
    <div className="tutor-md">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeSanitize, schema], [rehypeKatex, { throwOnError: false, strict: "ignore", trust: false }]]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
