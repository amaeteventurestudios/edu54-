"""Fixed, reviewed responses (docs/41). Not free model text. Versioned like curriculum."""
from __future__ import annotations

SUPPORT_RESPONSE_VERSION = "1.0-draft"  # written for counselor + safeguarding-lead review before any student pilot

# Resources are stored on the appliance so they show offline. US defaults; deployments configure their own.
RESOURCES_US = [
    {"name": "988 Suicide & Crisis Lifeline", "how": "Call or text 988"},
    {"name": "Crisis Text Line", "how": "Text HOME to 741741"},
    {"name": "Childhelp National Child Abuse Hotline", "how": "Call 1-800-422-4453"},
    {"name": "Emergency", "how": "If someone is in danger right now, call 911"},
]

# docs/41: resources are "configured for the deployment's country". Only verified, reviewed lists go here. A country without
# one gets the core guidance (talk to the named trusted adult now) and a plain pointer to the local emergency number, never
# another country's hotlines. Adding a country's list is a safeguarding-lead review item (docs/edu54/EDU54-DECISIONS.md).
RESOURCES_BY_COUNTRY = {"US": RESOURCES_US}
EMERGENCY_BY_COUNTRY = {"US": "call 911"}
GENERIC_RESOURCES = [{"name": "Emergency", "how": "If someone is in danger right now, call your local emergency number"}]


def _country() -> str:
    from ..config import get_settings
    return get_settings().safety_country.upper()


def resources() -> list[dict]:
    return RESOURCES_BY_COUNTRY.get(_country(), GENERIC_RESOURCES)


def support_response(category: str, contact_name: str | None, contact_title: str | None) -> str:
    who = f"{contact_name}{', ' + contact_title if contact_title else ''}" if contact_name else "a trusted adult at your school"
    lines = [
        "Thank you for telling me. You are not in trouble, and you did the right thing by saying something.",
        "",
        "What you shared matters, and you deserve support from a real person. Please talk to a trusted adult right now — "
        f"{who} is there to help.",
    ]
    if category == "medical_emergency":
        lines.insert(2, f"If someone might be hurt or needs medical help, tell an adult immediately or {EMERGENCY_BY_COUNTRY.get(_country(), 'call your local emergency number')}.")
    lines += [
        "",
        "If you need to talk to someone right away:",
        *[f"• {r['name']}: {r['how']}" for r in resources()],
        "",
        "I'm an AI, so I can't keep this private or solve it for you, and messages like this are shared with a trusted adult at your school so they can help.",
    ]
    return "\n".join(lines)


def distress_response(contact_name: str | None, contact_title: str | None) -> str:
    who = f"{contact_name}{', ' + contact_title if contact_title else ''}" if contact_name else "a teacher or your school counselor"
    return (
        "That sounds really hard, and it's okay to feel this way. You're not alone.\n\n"
        f"It can help to talk to someone you trust — {who} would want to hear from you. "
        "If you'd like, we can also take a short break from the lesson, or work on one small step together when you're ready."
    )


REDIRECTS = {
    "sexual": "That's not something I can help with here. I'm your school's learning tutor, so let's get back to learning. "
              "If you have a health question, your teacher or school nurse is the right person to ask.",
    "sexual_minor": "I can't help with that. If you're worried about someone's safety, please tell a trusted adult at your school.",
    "dangerous": "I can't help with that because it could hurt someone. If you're curious about how something works in science or computing, "
                 "ask me in a safe way and I'm happy to help — for example, \"how do chemical reactions release energy?\"",
    "hate_harassment": "Let's keep things respectful — I can't help with messages that put people down. If something is going on with a classmate, "
                       "your teacher can help. Want to get back to the lesson?",
    "personal_info": "Please don't share personal details like your address, phone number or passwords here. I haven't saved that. "
                     "Let's get back to what you were working on.",
}

UNAVAILABLE = "The AI tutor isn't available right now. Your lessons and work still are — please try again in a little while, or ask your teacher."
