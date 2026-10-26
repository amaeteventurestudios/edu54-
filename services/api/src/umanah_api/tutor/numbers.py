"""Rule 5 (docs/42): let code do the math. Arithmetic, percentages, unit conversions and comparisons of well-known quantities are
computed here, handed to the model as verified numbers, and checked again in the reply. The model explains; it does not guess numbers.

  solve(message)        -> list of verified lines to add to the prompt (empty when the message has nothing to compute)
  verify(reply, message) -> (text, notes): equations in the reply are recomputed, and "N times" claims about known quantities are checked
"""
from __future__ import annotations

import ast
import math
import operator
import re
from fractions import Fraction

# ----------------------------------------------------------------------------------------------------- safe arithmetic
_OPS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv, ast.Pow: operator.pow,
        ast.Mod: operator.mod, ast.FloorDiv: operator.floordiv, ast.USub: operator.neg, ast.UAdd: operator.pos}


def _eval(node: ast.AST) -> Fraction:
    if isinstance(node, ast.Expression):
        return _eval(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return Fraction(str(node.value))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _OPS:
        return _OPS[type(node.op)](_eval(node.operand))
    if isinstance(node, ast.BinOp) and type(node.op) in _OPS:
        a, b = _eval(node.left), _eval(node.right)
        if isinstance(node.op, ast.Pow):
            if b.denominator != 1 or abs(b) > 64 or abs(a) > 10**9:
                raise ValueError("power too large")
            return Fraction(a) ** int(b)
        if isinstance(node.op, (ast.Div, ast.Mod, ast.FloorDiv)) and b == 0:
            raise ZeroDivisionError
        return _OPS[type(node.op)](a, b)
    raise ValueError("not arithmetic")


def compute(expr: str) -> Fraction:
    """Exact value of a plain arithmetic expression (+ - * / ** % //, brackets). Never runs anything else."""
    return _eval(ast.parse(expr.strip(), mode="eval"))


def fmt(x: Fraction | float | int, sig: int = 6) -> str:
    v = float(x)
    if abs(v) >= 1e12:
        mant, exp = f"{v:.4e}".split("e")
        return f"{float(mant):g} x 10^{int(exp)}"
    if isinstance(x, Fraction) and x.denominator == 1 or (isinstance(x, int)):
        return f"{int(x):,}"
    if v == int(v) and abs(v) < 1e15:
        return f"{int(v):,}"
    if abs(v) >= 100:
        return f"{v:,.{max(0, sig - len(str(int(abs(v)))))}f}".rstrip("0").rstrip(".")
    return f"{v:.{sig}g}"


_WORD_OPS = [(r"\bmultiplied by\b", "*"), (r"\bdivided by\b", "/"), (r"\btimes\b", "*"), (r"\bplus\b", "+"), (r"\bminus\b", "-"), (r"\bover\b", "/"),
             (r"\bto the power of\b", "**"), (r"\bmod(ulo)?\b", "%")]
NUM = r"\d[\d,]*(?:\.\d+)?"
_TERM = rf"\(*\s*-?{NUM}\)*"
_OP = r"(?:\s*(?:[+*/^×÷x]|\*\*|multiplied by|divided by|times|plus|minus|over|to the power of)\s*|\s+-\s+)"
_EXPR = re.compile(rf"(?<![\w.])({_TERM}(?:{_OP}{_TERM})+)(?!\w|\.\d)", re.I)
_PCT = re.compile(rf"({NUM})\s*(?:%|percent)\s*of\s*({NUM})", re.I)
_SQRT = re.compile(rf"(?:square root of|sqrt\(?)\s*({NUM})", re.I)
_SQ = re.compile(rf"({NUM})\s*(squared|cubed)", re.I)


def _norm(expr: str) -> str:
    e = expr
    for pat, rep in _WORD_OPS:
        e = re.sub(pat, f" {rep} ", e, flags=re.I)
    e = e.replace("×", "*").replace("÷", "/").replace("^", "**")
    e = re.sub(rf"(?<=\d)\s*x\s*(?=\(?\d)", " * ", e, flags=re.I)
    e = re.sub(r"(?<=\d),(?=\d{3}\b)", "", e)
    return e


def arithmetic_lines(text: str) -> list[str]:
    out: list[str] = []
    for m in _PCT.finditer(text):
        p, n = Fraction(m.group(1).replace(",", "")), Fraction(m.group(2).replace(",", ""))
        out.append(f"{fmt(p)}% of {fmt(n)} = {fmt(p * n / 100)}")
    for m in _SQRT.finditer(text):
        n = float(m.group(1).replace(",", ""))
        out.append(f"the square root of {fmt(n)} = {fmt(math.sqrt(n))}")
    for m in _SQ.finditer(text):
        n = Fraction(m.group(1).replace(",", ""))
        out.append(f"{fmt(n)} {m.group(2).lower()} = {fmt(n ** (2 if m.group(2).lower() == 'squared' else 3))}")
    covered = [m.span() for m in _PCT.finditer(text)]
    for m in _EXPR.finditer(text):
        if any(a <= m.start() < b for a, b in covered):
            continue
        raw = m.group(1).strip()
        if re.fullmatch(rf"{NUM}", raw):
            continue
        try:
            e = _norm(raw)
            v = compute(e)
        except (ValueError, SyntaxError, ZeroDivisionError, OverflowError, RecursionError):
            continue
        shown = re.sub(r"\s+", " ", raw)
        out.append(f"{shown} = {fmt(v)}" + (f" (exactly {v.numerator}/{v.denominator})" if v.denominator != 1 and v.denominator <= 1000 else ""))
    return out[:6]


# ----------------------------------------------------------------------------------------------------- unit conversions
_UNITS: dict[str, tuple[str, float]] = {   # unit -> (dimension, size in the base unit)
    "mm": ("length", 0.001), "millimeter": ("length", 0.001), "millimeters": ("length", 0.001), "cm": ("length", 0.01), "centimeter": ("length", 0.01), "centimeters": ("length", 0.01),
    "m": ("length", 1), "meter": ("length", 1), "meters": ("length", 1), "metre": ("length", 1), "metres": ("length", 1), "km": ("length", 1000), "kilometer": ("length", 1000), "kilometers": ("length", 1000),
    "inch": ("length", 0.0254), "inches": ("length", 0.0254), "foot": ("length", 0.3048), "feet": ("length", 0.3048), "ft": ("length", 0.3048), "yard": ("length", 0.9144), "yards": ("length", 0.9144),
    "mile": ("length", 1609.344), "miles": ("length", 1609.344),
    "g": ("mass", 0.001), "gram": ("mass", 0.001), "grams": ("mass", 0.001), "kg": ("mass", 1), "kilogram": ("mass", 1), "kilograms": ("mass", 1), "pound": ("mass", 0.45359237), "pounds": ("mass", 0.45359237), "lb": ("mass", 0.45359237), "lbs": ("mass", 0.45359237),
    "ml": ("volume", 0.001), "milliliter": ("volume", 0.001), "milliliters": ("volume", 0.001), "l": ("volume", 1), "liter": ("volume", 1), "liters": ("volume", 1), "litre": ("volume", 1), "litres": ("volume", 1),
    "second": ("time", 1), "seconds": ("time", 1), "minute": ("time", 60), "minutes": ("time", 60), "hour": ("time", 3600), "hours": ("time", 3600), "day": ("time", 86400), "days": ("time", 86400), "week": ("time", 604800), "weeks": ("time", 604800),
}
_CONV = re.compile(rf"({NUM})\s*({'|'.join(sorted(_UNITS, key=len, reverse=True))})\b\s*(?:to|in|into|as)\s*(?:how many\s*)?({'|'.join(sorted(_UNITS, key=len, reverse=True))})\b", re.I)
_HOWMANY = re.compile(rf"how many\s+({'|'.join(sorted(_UNITS, key=len, reverse=True))})\b.{{0,20}}?\bin\s+(?:a |an |one |)({NUM})?\s*({'|'.join(sorted(_UNITS, key=len, reverse=True))})\b", re.I)
_TEMP = re.compile(rf"(-?{NUM})\s*(?:°|degrees?\s*)?\s*(celsius|fahrenheit|c|f)\s*(?:to|in|into)\s*(celsius|fahrenheit|c|f)\b", re.I)


def unit_lines(text: str) -> list[str]:
    out = []
    for m in _CONV.finditer(text):
        n, a, b = float(m.group(1).replace(",", "")), m.group(2).lower(), m.group(3).lower()
        if _UNITS[a][0] == _UNITS[b][0]:
            out.append(f"{fmt(n)} {a} = {fmt(n * _UNITS[a][1] / _UNITS[b][1])} {b}")
    for m in _HOWMANY.finditer(text):
        small, n, big = m.group(1).lower(), float(m.group(2).replace(",", "")) if m.group(2) else 1.0, m.group(3).lower()
        if _UNITS[small][0] == _UNITS[big][0]:
            out.append(f"{fmt(n)} {big} = {fmt(n * _UNITS[big][1] / _UNITS[small][1])} {small}")
    for m in _TEMP.finditer(text):
        v, a, b = float(m.group(1)), m.group(2).lower()[0], m.group(3).lower()[0]
        if a != b:
            r = v * 9 / 5 + 32 if a == "c" else (v - 32) * 5 / 9
            out.append(f"{fmt(v)} degrees {'Celsius' if a == 'c' else 'Fahrenheit'} = {fmt(r, 4)} degrees {'Fahrenheit' if a == 'c' else 'Celsius'}")
    return out[:4]


# ----------------------------------------------------------------------------------------------------- well-known quantities
# (name, pattern, {quantity: (value, unit)}) values are round-number reference figures used in school science.
FACTS: list[tuple[str, str, dict[str, tuple[float, str]]]] = [
    ("Earth", r"\bearths?\b", {"diameter": (12742, "km"), "mass": (5.972e24, "kg"), "distance from the Sun": (149.6e6, "km")}),
    ("the Moon", r"\bmoons?\b", {"diameter": (3474.8, "km"), "mass": (7.342e22, "kg"), "distance from Earth": (384400, "km")}),
    ("the Sun", r"\bsun\b", {"diameter": (1391400, "km"), "mass": (1.989e30, "kg"), "distance from Earth": (149.6e6, "km")}),
    ("Mercury", r"\bmercury\b", {"diameter": (4879, "km"), "mass": (3.301e23, "kg")}),
    ("Venus", r"\bvenus\b", {"diameter": (12104, "km"), "mass": (4.867e24, "kg")}),
    ("Mars", r"\bmars\b", {"diameter": (6779, "km"), "mass": (6.417e23, "kg")}),
    ("Jupiter", r"\bjupiter\b", {"diameter": (139820, "km"), "mass": (1.898e27, "kg")}),
    ("Saturn", r"\bsaturn\b", {"diameter": (116460, "km"), "mass": (5.683e26, "kg")}),
    ("Mount Everest", r"\beverest\b", {"height": (8849, "m")}),
    ("the Burj Khalifa", r"\bburj khalifa\b", {"height": (828, "m")}),
    ("the Eiffel Tower", r"\beiffel tower\b", {"height": (330, "m")}),
    ("a blue whale", r"\bblue whales?\b", {"length": (30, "m"), "mass": (150000, "kg")}),
    ("an African elephant", r"\belephants?\b", {"mass": (6000, "kg"), "height": (3.3, "m")}),
    ("the Nile", r"\bnile\b", {"length": (6650, "km")}),
    ("the speed of light", r"\bspeed of light\b|\blight speed\b", {"speed": (299792.458, "km/s")}),
    ("the speed of sound in air", r"\bspeed of sound\b", {"speed": (343, "m/s")}),
]
_SIZE = re.compile(r"\b(big(ger)?|large|larger|small(er)?|wide|wider|width|across|size|diameter|tall(er)?|height|long(er)?|length)\b", re.I)
_MASS = re.compile(r"\b(heav(y|ier)|mass|weigh(s|t)?)\b", re.I)
_FAR = re.compile(r"\b(far|distance|away|between|apart|travel)\b", re.I)
_COMPARE = re.compile(r"\b(times|bigger|larger|smaller|wider|taller|longer|heavier|compare|compared|fit|fits|ratio|how many|how much|vs|versus|than|far|distance|between)\b", re.I)
_TALK = {"diameter": _SIZE, "height": _SIZE, "length": _SIZE, "mass": _MASS}


def entities(text: str) -> list[tuple[str, dict[str, tuple[float, str]]]]:
    seen, out = set(), []
    for name, pat, q in FACTS:
        if re.search(pat, text, re.I) and name not in seen:
            seen.add(name)
            out.append((name, q))
    return out


def ratio_words(r: float) -> str:
    return fmt(r, 3)


def fact_lines(text: str) -> list[str]:
    ents = entities(text)
    if not ents or not _COMPARE.search(text):
        return []
    lines: list[str] = []
    want_far = bool(_FAR.search(text))
    for name, q in ents:
        for k, (v, u) in q.items():
            if k in ("diameter", "height", "length") and not _SIZE.search(text) and not want_far and len(ents) < 2:
                continue
            if k == "mass" and not _MASS.search(text):
                continue
            if k.startswith("distance") and (not want_far or not any(k == f"distance from {n2}" for n2, _ in ents)):
                continue
            lines.append(f"{name}: {k} = {fmt(v)} {u}")
    for i, (a, qa) in enumerate(ents):
        for b, qb in ents[i + 1:]:
            for k in ("diameter", "height", "length", "mass"):
                if k in qa and k in qb and _TALK[k].search(text) or (k == "diameter" and k in qa and k in qb and not _MASS.search(text)):
                    x, y = qa[k][0], qb[k][0]
                    big, small, (bn, sn) = (x, y, (a, b)) if x >= y else (y, x, (b, a))
                    lines.append(f"{bn} has {ratio_words(big / small)} times the {k} of {sn} ({ratio_words(small / big)} times the other way round)")
    if want_far:
        for a, qa in ents:
            for k, (dist, u) in qa.items():
                if not k.startswith("distance") or not any(k == f"distance from {n2}" for n2, _ in ents):
                    continue
                for b, qb in ents:
                    if b != a and "diameter" in qb and qb["diameter"][1] == u:
                        lines.append(f"{a}'s {k} ({fmt(dist)} {u}) is {ratio_words(dist / qb['diameter'][0])} times the diameter of {b} ({fmt(qb['diameter'][0])} {u})")
    return lines[:10]


def solve(message: str) -> list[str]:
    """Verified numbers for the prompt. Empty when there is nothing to compute."""
    return arithmetic_lines(message) + unit_lines(message) + fact_lines(message)


PROMPT_HEAD = ("Verified numbers, computed by code. Use these exactly as written, in the same units. Do not invent, round differently or replace any number; "
               "if you need a number that is not listed and you are not sure of it, say you are not sure:")

# ----------------------------------------------------------------------------------------------------- checking the reply
_EQ = re.compile(rf"(?<![\w.])({_TERM}(?:{_OP.replace('|multiplied by|divided by|times|plus|minus|over|to the power of', '').replace('^', '')}{_TERM})+)\s*=\s*(-?{NUM})(?!\w|\.\d)")
_CLAIM = re.compile(r"(\d[\d,]*(?:\.\d+)?)\s*(million|billion|thousand)?\s*times", re.I)
_MULT = {"thousand": 1e3, "million": 1e6, "billion": 1e9}


def _num(s: str, mult: str | None = None) -> float:
    return float(s.replace(",", "")) * (_MULT.get((mult or "").lower(), 1))


def _decimals(s: str) -> int:
    return len(s.split(".")[1]) if "." in s else 0


def verify(reply: str, message: str = "") -> tuple[str, list[str]]:
    """Recompute equations written in the reply and check 'N times' claims about known quantities. Returns (text, what was fixed)."""
    notes: list[str] = []

    def fix_eq(m: re.Match) -> str:
        try:
            v = compute(_norm(m.group(1)))
        except (ValueError, SyntaxError, ZeroDivisionError, OverflowError):
            return m.group(0)
        said = _num(m.group(2))
        places = _decimals(m.group(2))
        if abs(float(v) - said) <= 0.5 * 10 ** (-places) + 1e-9:
            return m.group(0)
        notes.append(f"{m.group(1).strip()} = {fmt(v)}, not {m.group(2)}")
        shown = f"{float(v):.{places}f}" if places or v.denominator == 1 else fmt(v)
        return f"{m.group(1)} = {shown}"

    text = _EQ.sub(fix_eq, reply)

    # "the Moon is 1.3 million times ..." : compare with the computed ratios of the quantities named in the same sentence
    parts = re.split(r"(?<=[.!?])\s+", text)
    for i, sent in enumerate(parts):
        ents = entities(sent)
        claims = [_num(m.group(1), m.group(2)) for m in _CLAIM.finditer(sent)]
        if len(ents) < 2 or not claims:
            continue
        truths: list[float] = []
        for a, qa in ents:
            for b, qb in ents:
                if a == b:
                    continue
                for k in ("diameter", "height", "length", "mass"):
                    if k in qa and k in qb:
                        truths += [qa[k][0] / qb[k][0], qb[k][0] / qa[k][0]]
                for k, (d, u) in qa.items():
                    if k.startswith("distance") and "diameter" in qb and qb["diameter"][1] == u:
                        truths.append(d / qb["diameter"][0])
        if not truths:
            continue
        for c in claims:
            if c > 1.5 and not any(abs(c - t) <= 0.06 * t for t in truths):
                lines = fact_lines(sent + " compare how many times bigger and how far")
                lines = [l for l in lines if "times" in l] or lines
                notes.append(f"'{sent.strip()[:80]}' does not match the known figures")
                parts[i] = "Checking the figures: " + (lines[0][0].lower() + lines[0][1:] if lines else "that number was not right") + "."
                break
    return " ".join(parts) if notes and len(parts) > 1 else (parts[0] if notes and parts else text), notes
