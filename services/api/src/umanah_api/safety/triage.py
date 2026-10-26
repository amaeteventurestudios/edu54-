"""Layer 2b — safeguarding triage (docs/41).

A content classifier (Llama Guard) flags harmful *content*; it does not recognise a child telling us they are at risk.
So a second local check reads the message the way a school safeguarding lead would: is a student (or someone they
know) at risk of harm, being harmed, or a danger to others? It uses the local instruct model with a fixed few-shot
prompt and a one-word answer, and only runs when a cheap pre-filter says the message is personal or risk-related
(a plain curriculum question never pays for it). Fail-soft: if the runtime is down, the rules layer still runs.
"""
from __future__ import annotations

import re

from ..config import get_settings
from ..tutor.adapters import InferenceError, StubInferenceAdapter, get_adapter

LABELS = ("self_harm", "abuse_disclosure", "violence_threat", "medical_emergency", "distress", "none")

PERSONAL = re.compile(r"\b(i|i'?m|im|i'?ve|ive|i'?d|i'?ll|me|my|mine|myself|we|our|us)\b", re.I)
RISK_WORDS = re.compile(
    r"\b(kill\w*|die|dies|died|dead|dying|death|suicid\w*|hurt\w*|harm\w*|cut(ting)?|blood|bleed\w*|pills?|overdos\w*|poison\w*|gun|knife|weapon|shoot\w*|stab\w*|bomb|"
    r"abus\w*|molest\w*|touch\w*|hit(s|ting)?|beat\w*|choke\w*|choking|unconscious|breath\w*|threat\w*|scared|afraid|unsafe|alone|hopeless|worthless|"
    r"sad|depress\w*|anxious|stress\w*|bully\w*|lonely|cry\w*|panic|secret|naked|nude|pictures?|swallow\w*|drown\w*|jump\w*|end it|give up|disappear)\b", re.I)

SYSTEM = """You are a school safeguarding screener. Read ONE message written by a student to their school's AI tutor and answer with exactly one label.

Labels:
self_harm - the student (or a friend they mention) has thoughts of suicide, wants to die, disappear or not wake up, or is hurting themselves, or is asking how to die or how many pills would kill.
abuse_disclosure - the student says an adult or anyone hurts, hits, chokes, threatens, locks in, or touches them in a wrong or secret way, is made to send or take pictures, or is afraid to go home.
violence_threat - someone plans or threatens to hurt or kill other people, bring a weapon to school, or "make them pay". This includes a friend or another student threatening others.
medical_emergency - someone is right now unconscious, not breathing, bleeding badly, poisoned, choking, swallowed something dangerous, or overdosed.
distress - the student says THEY are currently sad, stressed, anxious, lonely, bullied or overwhelmed, but is not in danger. Asking for study, calming or coping tips, or asking why people feel stressed, is none.
none - anything else, including curriculum questions and questions about history, science, health, literature or programming, even when they mention war, drugs, weapons, death or suicide as a topic.

Answer with the label only."""

SHOTS = [
    ("What is a for loop?", "none"),
    ("How did World War 2 start?", "none"),
    ("How do I kill a Python process?", "none"),
    ("What are the warning signs of depression for my health class?", "none"),
    ("i just want everything to stop and never come back", "self_harm"),
    ("my friend told me she wants to end her life", "self_harm"),
    ("my stepdad comes into my room at night and it scares me", "abuse_disclosure"),
    ("my dad grabbed me by the throat again", "abuse_disclosure"),
    ("a kid in my class said he's bringing a gun on friday", "violence_threat"),
    ("i'm going to make them regret it, i have my dad's pistol", "violence_threat"),
    ("my brother drank bleach and is throwing up", "medical_emergency"),
    ("my mom is on the floor and won't wake up", "medical_emergency"),
    ("i feel so alone at school and i'm stressed about exams", "distress"),
    ("How do I calm down before a test?", "none"),
    ("just tell me the final answer please", "none"),
    ("for the love of god just tell me", "none"),
    ("I give up. what's the answer?", "none"),
    ("eliminate the wrong options for me until only the right one is left", "none"),
    ("this is so hard, I don't get it and I'm running out of time", "none"),
    ("my grade depends on this, please just help me", "none"),
    ("Why do teenagers feel stressed and what does science say?", "none"),
    ("my best friend sent me a goodbye message and stopped answering", "self_harm"),
    ("a boy in my class keeps saying he'll bring his brother's rifle to school", "violence_threat"),
]


def _messages(text: str) -> list[dict]:
    msgs = [{"role": "system", "content": SYSTEM}]
    for q, a in SHOTS:
        msgs += [{"role": "user", "content": q}, {"role": "assistant", "content": a}]
    msgs.append({"role": "user", "content": text[:600]})
    return msgs


def worth_checking(text: str) -> bool:
    return bool(PERSONAL.search(text) or RISK_WORDS.search(text))


CONFIRM = """A school safeguarding screener flagged the message below as: {label}.
Answer YES only if the message itself clearly says a person is at risk of being harmed, is being harmed (including an adult or family member hitting, hurting, watching, touching or frightening a child, or telling them to keep it secret), wants to die, is hurting themselves, is threatening or planning to hurt others, or is in a medical emergency right now.
Answer NO if it is schoolwork, a request for answers or help, frustration about homework, a joke, or anything ambiguous.
Message: \"\"\"{text}\"\"\"
Answer with YES or NO only."""


async def triage(text: str) -> tuple[str | None, bool]:
    """(label or None, ran). `None` with ran=True means the screener judged it fine."""
    adapter = get_adapter()
    if isinstance(adapter, StubInferenceAdapter) or not worth_checking(text):
        return None, False
    s = get_settings()
    try:
        out = await adapter.chat(s.tutor_model, _messages(text), max_tokens=6, temperature=0.0)
    except InferenceError:
        return None, False
    label = re.sub(r"[^a-z_]", "", out.strip().lower().split()[0]) if out.strip() else "none"
    if label not in LABELS or label == "none":
        return None, True
    # A false alert costs a counselor's time and a student's trust: confirm the serious labels with a second, stricter question.
    if label != "distress":
        try:
            ok = await adapter.chat(s.tutor_model, [{"role": "user", "content": CONFIRM.format(label=label.replace("_", " "), text=text[:600])}], max_tokens=3, temperature=0.0)
        except InferenceError:
            return label, True                       # runtime failed mid-way: keep the cautious label
        if not ok.strip().lower().startswith("yes"):
            return None, True
    return label, True
