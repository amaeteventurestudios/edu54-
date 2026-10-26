"""The safety pipeline (docs/41): rules layer + local classifier, routed to an action.

    student message -> input screen -> route (allow | redirect | support | alert | block)
    tutor reply     -> output screen (same layers) -> deliver or replace

The client can neither skip nor configure any of this: it runs inside the server's chat path.
"""
from __future__ import annotations

import asyncio
import re
from dataclasses import dataclass, field

from ..config import get_settings
from ..tutor.adapters import InferenceError, StubInferenceAdapter, get_adapter
from . import rules, triage

# Llama Guard 3 hazard codes -> Umanah category. Anything not listed is not acted on by the classifier alone.
_GUARD_CODES = {
    "S1": "violence_threat", "S2": "dangerous", "S3": "sexual_minor", "S4": "sexual_minor",
    "S9": "dangerous", "S10": "hate_harassment", "S11": "self_harm", "S12": "sexual", "S7": "personal_info",
}
_SEV = {"none": 0, "low": 1, "medium": 2, "high": 3}
TECH_CONTEXT = re.compile(r"\b(python|process(es)?|thread|script|code|coding|program|programming|terminal|shell|linux|command|function|loop|variable|list|string|"
                          r"photo|photoshop|image|game|minecraft|egg|zombie|bug|pixel|spreadsheet|server|app|browser|tab|puzzle|level|boss|character|story|book|"
                          r"chapter|poem|history|war|battle|revolution|chemistry|physics|biology|science|math)\b", re.I)
# Stated intent, and also asking how to harm someone, hiding it, or revenge: a classifier violence finding with any of these alerts.
INTENT = re.compile(r"\b(i|i'?m|im|i am|we)\b.{0,20}\b(going to|gonna|will|plan(ning)? to|want to|wanna|about to|decided to|planning)\b|\bplanning\b|"
                    r"\bhow (can|do|could|would|should|to) (i|we)\b.{0,10}\b(hurt|kill|harm|stab|shoot|poison|attack|beat|murder)\b|"
                    r"\b(not|without|never) (get|getting|be|being) caught\b|\b(offend\w*|revenge|get back at|pay (him|her|them) back)\b", re.I)

# category -> (severity, action)  (docs/41 table)
ROUTING: dict[str, tuple[str, str]] = {
    "self_harm": ("high", "alert"),
    "abuse_disclosure": ("high", "alert"),
    "violence_threat": ("high", "alert"),
    "medical_emergency": ("high", "alert"),
    "sexual_minor": ("high", "block"),
    "sexual": ("medium", "block"),
    "dangerous": ("medium", "block"),
    "hate_harassment": ("low", "redirect"),
    "personal_info": ("low", "redirect"),
    "distress": ("low", "support"),
}


@dataclass
class Decision:
    action: str = "allow"           # allow | redirect | support | alert | block
    category: str | None = None
    severity: str = "none"
    source: str = "none"            # rules | classifier | both
    classifier_ran: bool = False
    detail: dict = field(default_factory=dict)

    @property
    def allowed(self) -> bool:
        return self.action == "allow"

    def as_json(self) -> dict:
        return {"action": self.action, "category": self.category, "severity": self.severity,
                "source": self.source, "classifier_ran": self.classifier_ran}


def _route(category: str, source: str, classifier_ran: bool) -> Decision:
    sev, action = ROUTING[category]
    return Decision(action=action, category=category, severity=sev, source=source, classifier_ran=classifier_ran)


def _parse_guard(text: str) -> str | None:
    """Llama Guard: 'safe' | 'unsafe\\nS11'.  Qwen3Guard: 'Safety: Unsafe\\nCategories: Self-Harm'."""
    t = text.strip()
    low = t.lower()
    if low.startswith("safe") or re.search(r"safety:\s*safe", low):
        return None
    m = re.search(r"\bS(1[0-4]|[1-9])\b", t)
    if m:
        return _GUARD_CODES.get(m.group(0))
    q = {"self-harm": "self_harm", "violent": "violence_threat", "sexual": "sexual", "non-violent illegal": "dangerous",
         "pii": "personal_info", "suicide": "self_harm"}
    for k, v in q.items():
        if k in low:
            return v
    return None


async def classify(text: str, *, direction: str = "input", prompt: str | None = None) -> tuple[str | None, bool]:
    """Layer 2 classifier. Returns (category or None, ran). Fails soft: the rules layer still protects."""
    s = get_settings()
    adapter = get_adapter()
    if isinstance(adapter, StubInferenceAdapter):
        return None, False
    msgs = [{"role": "user", "content": text}] if direction == "input" else [
        {"role": "user", "content": prompt or "Help me with my schoolwork."}, {"role": "assistant", "content": text}]
    try:
        out = await adapter.chat(s.safety_model, msgs, max_tokens=24, temperature=0.0)
    except InferenceError:
        return None, False
    return _parse_guard(out), True


async def screen(text: str, *, direction: str = "input", prompt: str | None = None, use_classifier: bool = True) -> Decision:
    hit = rules.scan(text)
    # A high-severity rule hit never waits for the classifier.
    if hit and hit.severity == "high":
        return _route(hit.category, "rules", False)
    cat, ran = (None, False)
    tri: str | None = None
    if use_classifier:
        if direction == "input":
            # content classifier and safeguarding triage run together; neither waits for the other
            (cat, ran), (tri, tri_ran) = await asyncio.gather(classify(text, direction=direction, prompt=prompt), triage.triage(text))
            ran = ran or tri_ran
        else:
            cat, ran = await classify(text, direction=direction, prompt=prompt)
    if tri and (not hit or _SEV[ROUTING[tri][0]] > _SEV[hit.severity]) and (not cat or _SEV[ROUTING[tri][0]] >= _SEV[ROUTING[cat][0]] or cat not in ("self_harm", "sexual_minor")):
        # the triage found a student at risk that the rules missed (or a more serious reading than the rules had)
        return _route(tri, "triage" if not hit else "both", ran)
    # A 1B classifier is trustworthy on self-harm and sexual content involving minors; on violence/crime it is noisy
    # ("how do I kill a Python process"). Alone, its violence/crime findings are vetoed in a technical or everyday
    # context, become a threat (alert) when the student states intent, and otherwise a plain block.
    if cat in ("violence_threat", "dangerous") and not (hit and hit.category == cat):
        if TECH_CONTEXT.search(text):
            cat = None
        else:
            cat = "violence_threat" if INTENT.search(text) else "dangerous"
    if hit and cat and hit.category != cat:
        # rules are authoritative unless the classifier found something more severe than the rule did
        winner = cat if _SEV[ROUTING[cat][0]] > _SEV[hit.severity] and cat in ("self_harm", "sexual_minor", "violence_threat") else hit.category
        return _route(winner, "both", ran)
    if hit:
        return _route(hit.category, "both" if cat == hit.category else "rules", ran)
    if cat:
        return _route(cat, "classifier", ran)
    return Decision(classifier_ran=ran)
