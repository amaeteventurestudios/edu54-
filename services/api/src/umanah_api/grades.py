"""Grade bands (K-12 UI spec): one app, four learner experiences. A student's grade comes from enrollment (set by a teacher or
admin, never by the student); the band follows from it. Grade 0 is Kindergarten."""
from __future__ import annotations

BANDS = [  # id, first grade, last grade, name, school stage
    ("discover", 0, 2, "Discover", "Early Years"),
    ("explore", 3, 5, "Explore", "Elementary"),
    ("build", 6, 8, "Build", "Middle School"),
    ("launch", 9, 12, "Launch", "High School"),
]
BAND_IDS = [b[0] for b in BANDS]


def enabled() -> bool:
    """Grade bands exist in the AI Lab (no edition) and in an edition that lists bands (EDU54 K-12); not in University."""
    from .branding import edition
    e = edition()
    return not e["id"] or bool(e.get("bands"))


def _levels() -> list[str] | None:
    """An edition's own names for grades 0-12 (EDU54 K-12: Kindergarten, Primary 1-6, JSS 1-3, SSS 1-3), else None."""
    from .branding import edition
    lv = edition().get("levels") or []
    return lv if len(lv) == 13 and edition().get("bands") else None


def grade_for_level(level: str | None) -> int | None:
    """The grade (0-12) behind an edition's level name, for classes that carry a level (EDU54 K-12)."""
    lv = _levels()
    return lv.index(level) if lv and level in lv else None


def band_of(grade: int | None) -> str | None:
    if grade is None:
        return None
    return next(b[0] for b in BANDS if b[1] <= grade <= b[2]) if 0 <= grade <= 12 else None


def grade_label(grade: int | None) -> str | None:
    if grade is None:
        return None
    if (lv := _levels()) and 0 <= grade <= 12:
        return lv[grade]
    return "Kindergarten" if grade == 0 else f"Grade {grade}"


def stage_label(grade: int | None) -> str | None:
    if (lv := _levels()) and grade is not None and 0 <= grade <= 12:
        from .branding import edition
        return next((v for k, v in (edition().get("stages") or {}).items() if lv[grade].startswith(k)), None)
    band = band_of(grade)
    return next(b[4] for b in BANDS if b[0] == band) if band else None


def grade_json(grade: int | None) -> dict:
    band = band_of(grade)
    return {"grade": grade, "grade_label": grade_label(grade), "band": band, "band_name": next((b[3] for b in BANDS if b[0] == band), None),
            "stage": stage_label(grade)}


def content_bands(grade: int | None, extra: list | None) -> list[str]:
    """The bands whose courses, games and shelves a student sees: their own (no grade yet: middle school) plus any a teacher
    opened up for them. Widening only adds content; the tutor's rules and the safety checks are the same in every band."""
    own = band_of(grade) or "build"
    return [b for b in BAND_IDS if b == own or b in (extra or [])]
