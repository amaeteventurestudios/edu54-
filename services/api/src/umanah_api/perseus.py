"""Khan Academy practice exercises (Perseus format) from the School Library, checked on the server.

An exercise is a zip of question items. We send students the question and the widget layout only: which radio option is
right, the numeric answer, the accepted expressions are never sent (same rule as our own homework, docs/42). Supported
widgets cover about 94% of items (measured on a 400-exercise sample, 2026-10-01); items with other widgets are skipped.
"""
from __future__ import annotations

import ast
import json
import math
import random
import re
import zipfile
from fractions import Fraction
from functools import lru_cache
from pathlib import Path

ANSWER_WIDGETS = {"radio", "numeric-input", "input-number", "expression", "dropdown"}
SHOW_WIDGETS = {"image", "explanation", "definition"}
SUPPORTED = ANSWER_WIDGETS | SHOW_WIDGETS
_LOCAL = re.compile(r"\$\{\u2623 LOCALPATH\}/")                          # ${☣ LOCALPATH}/images/x.png
_GRAPHIE = re.compile(r"web\+graphie://[^\s)]*/([0-9a-f]{40})")            # line drawings: an SVG in images/


@lru_cache(maxsize=64)
def _zip(path: str) -> zipfile.ZipFile:
    return zipfile.ZipFile(path)


def item(zpath: Path, item_id: str) -> dict:
    return json.loads(_zip(str(zpath)).read(f"{item_id}.json").decode("utf-8-sig"))


def file_bytes(zpath: Path, name: str) -> bytes:
    return _zip(str(zpath)).read(name)


_GRAPHIE_LOCAL = re.compile(r"web\+graphie:(/api/[^\s)]*/images/[0-9a-f]{40})")


def _urls(text: str, base: str) -> str:
    text = _LOCAL.sub(f"{base}/", text)
    text = _GRAPHIE_LOCAL.sub(r"\1.svg", text)              # Kolibri's copies: web+graphie:${LOCALPATH}/images/<hash> -> the SVG beside it
    return _GRAPHIE.sub(lambda m: f"{base}/images/{m.group(1)}.svg", text)


def supported(d: dict) -> bool:
    ws = d.get("question", {}).get("widgets", {})
    types = {w.get("type") for w in ws.values()}
    return bool(types & ANSWER_WIDGETS) and types <= SUPPORTED


def public(d: dict, base: str) -> dict:
    """The question as students see it: content and widget layout, with no answers."""
    q = d["question"]
    widgets = {}
    for wid, w in q.get("widgets", {}).items():
        t, o = w.get("type"), w.get("options", {})
        if t == "radio":
            widgets[wid] = {"type": t, "multiple": bool(o.get("multipleSelect")), "choices": [_urls(c.get("content", ""), base) for c in o.get("choices", [])]}
        elif t == "dropdown":
            widgets[wid] = {"type": t, "choices": [c.get("content", "") for c in o.get("choices", [])]}
        elif t in ("numeric-input", "input-number"):
            widgets[wid] = {"type": "number", "label": o.get("labelText") or ""}
        elif t == "expression":
            widgets[wid] = {"type": "expression"}
        elif t == "image":
            bg = o.get("backgroundImage") or {}
            widgets[wid] = {"type": "image", "url": _urls(bg.get("url") or "", base), "alt": o.get("alt") or "", "caption": _urls(o.get("caption") or "", base)}
        elif t in ("explanation", "definition"):
            widgets[wid] = {"type": "note", "label": o.get("showPrompt") or o.get("togglePrompt") or "", "text": _urls(o.get("explanation") or o.get("definition") or "", base)}
    return {"content": _urls(q.get("content", ""), base), "widgets": widgets, "hints": len(d.get("hints", []))}


def hint(d: dict, n: int, base: str) -> str | None:
    hs = d.get("hints", [])
    return _urls(hs[n].get("content", ""), base) if 0 <= n < len(hs) else None


# ---------------------------------------------------------------- checking
def parse_number(s: str) -> float | None:
    """3, -2.5, 3/4, 1 1/2, 1,000, 25% (as 25), 0.5. None when it isn't a number."""
    t = (s or "").strip().replace(",", "").replace("\u2212", "-").rstrip("%").strip()
    if not t:
        return None
    try:
        if m := re.fullmatch(r"(-?)(\d+)\s+(\d+)/(\d+)", t):
            v = int(m.group(2)) + Fraction(int(m.group(3)), int(m.group(4)))
            return float(-v if m.group(1) else v)
        return float(Fraction(t))
    except (ValueError, ZeroDivisionError):
        return None


def _close(a: float, b: float, err: float | None) -> bool:
    return abs(a - b) <= (err if err else 1e-9 * max(1, abs(b)))


_FUN = {"sqrt": math.sqrt, "ln": math.log, "log": math.log10, "sin": math.sin, "cos": math.cos, "tan": math.tan, "abs": abs, "exp": math.exp}


def _group(s: str, i: int) -> tuple[str, int]:
    """The {...} group starting at s[i] (balanced braces) and the index after it."""
    depth, j = 0, i
    while j < len(s):
        depth += {"{": 1, "}": -1}.get(s[j], 0)
        if depth == 0:
            return s[i + 1:j], j + 1
        j += 1
    raise ValueError("unbalanced")


def _fracs(s: str) -> str:
    """\\frac{a}{b}, \\dfrac, \\tfrac and \\sqrt{a}, with any nesting, into ((a)/(b)) and sqrt(a)."""
    out, i = "", 0
    while i < len(s):
        m = re.match(r"\\[dt]?frac\s*", s[i:])
        r = re.match(r"\\sqrt\s*", s[i:])
        if m and i + m.end() < len(s) and s[i + m.end()] == "{":
            a, j = _group(s, i + m.end())
            j += len(s[j:]) - len(s[j:].lstrip())
            b, k = _group(s, j)
            out += f"(({_fracs(a)})/({_fracs(b)}))"
            i = k
        elif r and i + r.end() < len(s) and s[i + r.end()] == "{":
            a, j = _group(s, i + r.end())
            out += f"sqrt({_fracs(a)})"
            i = j
        else:
            out += s[i]
            i += 1
    return out


def _tex_to_py(s: str) -> str:
    s = _fracs(s)
    s = s.replace("\\left", "").replace("\\right", "").replace("\\cdot", "*").replace("\\times", "*").replace("\\div", "/")
    s = s.replace("\\pi", "(pi)").replace("\u03c0", "(pi)").replace("{", "(").replace("}", ")")
    for _ in range(4):
        s = re.sub(r"\\[dt]?frac\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)", r"((\1)/(\2))", s)
        s = re.sub(r"\\sqrt\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)", r"sqrt(\1)", s)
    s = re.sub(r"\\(ln|log|sin|cos|tan|sqrt)", r"\1", s).replace("\\", "")
    s = s.replace("^", "**")
    s = re.sub(r"(\d)\s*([a-zA-Z(])", r"\1*\2", s)                         # 2x, 3(…)
    s = re.sub(r"\)\s*([\w(])", r")*\1", s)                                   # )(  )x
    s = re.sub(r"\b([a-zA-Z])\s*\(", lambda m: m.group(0) if m.group(1) in "" else f"{m.group(1)}*(", s)   # x( -> x*(
    s = re.sub(r"\b(ln|log|sin|cos|tan|sqrt|abs|exp)\*\(", r"\1(", s)
    s = re.sub(r"\b([a-z])([a-z])\b", lambda m: m.group(0) if m.group(0) in ("ln", "pi") else f"{m.group(1)}*{m.group(2)}", s)   # xy -> x*y
    return s


def _eval(expr: str, env: dict[str, float]) -> float:
    node = ast.parse(expr, mode="eval")

    def ev(n):
        if isinstance(n, ast.Expression):
            return ev(n.body)
        if isinstance(n, ast.Constant) and isinstance(n.value, (int, float)):
            return float(n.value)
        if isinstance(n, ast.Name):
            if n.id == "pi":
                return math.pi
            if n.id == "e" and "e" not in env:
                return math.e
            return env[n.id]
        if isinstance(n, ast.UnaryOp) and isinstance(n.op, (ast.USub, ast.UAdd)):
            v = ev(n.operand)
            return -v if isinstance(n.op, ast.USub) else v
        if isinstance(n, ast.BinOp) and isinstance(n.op, (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow)):
            a, b = ev(n.left), ev(n.right)
            if isinstance(n.op, ast.Pow) and abs(b) > 50:
                raise ValueError("too big")
            if isinstance(n.op, ast.Add):
                return a + b
            if isinstance(n.op, ast.Sub):
                return a - b
            if isinstance(n.op, ast.Mult):
                return a * b
            if isinstance(n.op, ast.Div):
                return a / b if b else math.inf
            return a ** b if not (a < 0 and b != int(b)) else math.nan
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id in _FUN and len(n.args) == 1:
            return _FUN[n.func.id](ev(n.args[0]))
        raise ValueError("not allowed")
    return ev(node)


def same_expression(student: str, key: str) -> bool:
    """Equal at several random points (variables from both sides). Format rules ('simplify', 'form') are not enforced."""
    try:
        if rel := _relation(key):
            mine = _relation(student)
            if not mine or mine[0] != rel[0]:
                return False
            return _same(mine[1], rel[1], ratio=True, positive=True)
        if "=" in key:
            if student.count("=") != 1 or key.count("=") != 1:
                return False
            (sl, sr), (kl, kr) = student.split("="), key.split("=")
            return _same(f"({_tex_to_py(sl)})-({_tex_to_py(sr)})", f"({_tex_to_py(kl)})-({_tex_to_py(kr)})", ratio=True)
        return _same(_tex_to_py(student), _tex_to_py(key))
    except (ValueError, KeyError, SyntaxError, ZeroDivisionError, OverflowError, TypeError):
        return False


_REL = [("\\le", "<="), ("\\leq", "<="), ("\\ge", ">="), ("\\geq", ">="), ("≤", "<="), ("≥", ">="), ("<=", "<="), (">=", ">="), ("<", "<"), (">", ">")]


def _relation(s: str) -> tuple[str, str] | None:
    """An inequality as (kind, 'lhs - rhs') with kind '<' or '<=' (a > b is turned around into b < a)."""
    t = re.sub(r"\\(left|right)(?![a-z])", "", s).replace("\\leq", "\\le").replace("\\geq", "\\ge")   # "\\left" must not read as "\\le"
    for tok, rel in _REL:
        if tok in t and t.count(tok) == 1:
            lhs, rhs = t.split(tok)
            if rel.startswith(">"):
                lhs, rhs, rel = rhs, lhs, rel.replace(">", "<")
            return rel, f"({_tex_to_py(lhs)})-({_tex_to_py(rhs)})"
    return None


def _same(a: str, b: str, ratio: bool = False, positive: bool = False) -> bool:
    """Equal at several random points; with ratio, equal up to a constant factor (the same equation rearranged)."""
    try:
        names = {n.id for x in (a, b) for n in ast.walk(ast.parse(x, mode="eval")) if isinstance(n, ast.Name) and n.id not in ("pi", *_FUN)}
        rng = random.Random(7)
        k = None
        for _ in range(6):
            env = {v: rng.uniform(0.5, 3.0) for v in names}
            x, y = _eval(a, env), _eval(b, env)
            if not (math.isfinite(x) and math.isfinite(y)):
                return False
            if ratio:
                if abs(y) < 1e-12:
                    if abs(x) > 1e-9:
                        return False
                    continue
                k = x / y if k is None else k
                if abs(x / y - k) > 1e-6 * max(1, abs(k)) or abs(k) < 1e-12 or (positive and k < 0):
                    return False
            elif abs(x - y) > 1e-6 * max(1, abs(y)):
                return False
        return True
    except (ValueError, KeyError, SyntaxError, ZeroDivisionError, OverflowError, TypeError):
        return False


def check(d: dict, answers: dict) -> tuple[bool, dict[str, bool]]:
    """answers: {widget_id: value}. radio: list of chosen indexes; dropdown: chosen index (1-based, 0 = none); others: text."""
    per: dict[str, bool] = {}
    for wid, w in d["question"].get("widgets", {}).items():
        t, o, a = w.get("type"), w.get("options", {}), answers.get(wid)
        if t not in ANSWER_WIDGETS or not w.get("graded", True):
            continue
        ok = False
        if t == "radio":
            right = {i for i, c in enumerate(o.get("choices", [])) if c.get("correct")}
            ok = isinstance(a, list) and set(a) == right
        elif t == "dropdown":
            right = [i + 1 for i, c in enumerate(o.get("choices", [])) if c.get("correct")]
            ok = isinstance(a, int) and a in right
        elif t == "numeric-input":
            got = parse_number(str(a or ""))
            ok = got is not None and any(x.get("status") == "correct" and x.get("value") is not None and _close(got, float(x["value"]), x.get("maxError")) for x in o.get("answers", []))
        elif t == "input-number":
            got = parse_number(str(a or ""))
            ok = got is not None and o.get("value") is not None and _close(got, float(o["value"]), o.get("maxError") if o.get("inexact") else None)
        elif t == "expression":
            forms = o.get("answerForms") or ([{"considered": "correct", "value": o["value"]}] if o.get("value") else [])   # older items keep one answer in "value"
            ok = bool(str(a or "").strip()) and any(f.get("considered") == "correct" and same_expression(str(a), f.get("value", "")) for f in forms)
        per[wid] = ok
    return bool(per) and all(per.values()), per


def _plain(tex: str) -> str:
    t = re.sub(r"\\(blue|green|red|gold|purple|teal|maroon|gray|pink|orange)[A-F]?", "", tex)
    t = re.sub(r"\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}", r"\1/\2", t)
    t = t.replace("\\pi", "\u03c0").replace("\\cdot", "\u00b7").replace("\\times", "\u00d7").replace("\\degree", "\u00b0").replace("^\\circ", "\u00b0")
    t = re.sub(r"\\text\{([^{}]*)\}", r"\1", t)
    return re.sub(r"[{}$\\]", "", t).strip()


def svg_with_labels(zpath: Path, name: str) -> bytes:
    """A line drawing with its text labels drawn in (Khan keeps them in a separate -data.json the browser would overlay)."""
    svg = file_bytes(zpath, name)
    try:
        raw = file_bytes(zpath, name[:-4] + "-data.json").decode("utf-8")
        data = json.loads(raw[raw.index("(") + 1: raw.rindex(")")])
        m = re.search(rb'width="([\d.]+)" height="([\d.]+)"', svg)
        w, h = float(m.group(1)), float(m.group(2))
        (x0, x1), (y0, y1) = data["range"]
    except (KeyError, ValueError, AttributeError, TypeError):
        return svg
    from html import escape
    out = []
    for lab in data.get("labels", []):
        try:
            x, y = lab["coordinates"]
        except (KeyError, ValueError, TypeError):
            continue
        px, py = (x - x0) * w / (x1 - x0), (y1 - y) * h / (y1 - y0)
        al = lab.get("alignment") or "center"
        anchor = "start" if "right" in al else "end" if "left" in al else "middle"
        dx = 6 if "right" in al else -6 if "left" in al else 0
        dy = -8 if "above" in al else 16 if "below" in al else 5
        out.append(f'<text x="{px + dx:.1f}" y="{py + dy:.1f}" text-anchor="{anchor}" font-family="sans-serif" font-size="14" fill="#1f2937">{escape(_plain(str(lab.get("content", ""))))}</text>')
    return svg.replace(b"</svg>", "".join(out).encode() + b"</svg>") if out else svg
