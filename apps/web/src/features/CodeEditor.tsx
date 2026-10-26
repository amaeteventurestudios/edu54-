import { python } from "@codemirror/lang-python";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { HighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { useEffect, useRef } from "react";

const highlight = HighlightStyle.define([
  { tag: t.keyword, color: "#4338ca" },
  { tag: [t.string, t.special(t.string)], color: "#b42318" },
  { tag: [t.number, t.bool, t.null], color: "#0e7490" },
  { tag: t.comment, color: "#525a68", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.definition(t.variableName)], color: "#1e3a8a" },
]);

const theme = EditorView.theme({
  "&": { fontSize: "14px", backgroundColor: "#fdfdfe", borderRadius: "8px" },
  ".cm-content": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", padding: "10px 0" },
  ".cm-gutters": { backgroundColor: "#f6f6f9", color: "#9aa3b2", border: "none", borderRadius: "8px 0 0 8px" },
  "&.cm-focused": { outline: "2px solid #163b62" },
  ".cm-activeLine": { backgroundColor: "#f3f6fb" },
  ".cm-activeLineGutter": { backgroundColor: "#eaeff7" },
  ".cm-scroller": { minHeight: "110px" },
});

/** CodeMirror 6 Python editor (docs/12). Controlled by `value`; edits are reported through `onChange`. */
export function CodeEditor({ value, onChange, readOnly = false, label = "Python code editor", minHeight = 110 }: { value: string; onChange?: (v: string) => void; readOnly?: boolean; label?: string; minHeight?: number }) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(), history(), highlightActiveLine(), indentOnInput(), bracketMatching(), python(), syntaxHighlighting(highlight), theme,
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly),
          EditorView.contentAttributes.of({ "aria-label": label }),
          EditorView.updateListener.of((u) => { if (u.docChanged) cb.current?.(u.state.doc.toString()); }),
          EditorView.theme({ ".cm-scroller": { minHeight: `${minHeight}px` } }),
        ],
      }),
    });
    view.current = v;
    return () => v.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly]);

  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
  }, [value]);

  return <div ref={host} className="overflow-hidden rounded-lg border border-border" />;
}
