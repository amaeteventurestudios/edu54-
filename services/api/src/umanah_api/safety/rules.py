"""Layer 1 — high-recall rules (docs/41). Cheap, runs first, never the only check.

English lists for v1; each language gets its own list. Patterns are deliberately broad: a false
alarm costs a kind message, a miss costs far more. Educational questions (a history lesson about
war, a health lesson about drugs) must still pass — the evals in evals/safety.jsonl guard both sides.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

I = re.IGNORECASE

# category -> (severity, compiled patterns)
_P = lambda *pats: [re.compile(p, I) for p in pats]  # noqa: E731

SELF_HARM = _P(
    r"\b(crash\w*|burn\w*|scratch\w*|starv\w*|hit\w*|cut\w*|bang\w*)\b.{0,25}\b(on purpose|deliberately|so (it|i) hurts?)\b",
    r"\b(goodbye|good-?bye|farewell|final|last) (message|note|text|letter|post|words)\b.{0,60}\b(stopped|won'?t|not|isn'?t|no longer)\b.{0,15}\b(answer\w*|repl\w*|respond\w*|reach\w*)\b|\bsent (me )?a (goodbye|farewell|final|last) (message|note|text)\b",
    r"\b(wish|wished|wishing)\b.{0,20}\b(never (been|was|were) born|wasn'?t born|didn'?t exist|not alive|never existed)\b",
    r"\b(want|wanna|wish|need|going|trying) to (stop existing|not exist|not be alive|be gone forever|sleep forever|never wake up)\b",
    r"\b(don'?t|do not|didn'?t) want to be alive\b|\b(want|wish) (to )?(disappear|vanish)\b.{0,20}\b(forever|for good|permanently)\b",
    r"\b(jump|jumping|leap|leaping|throw myself|step) (off|from|in front of)\b.{0,30}\b(bridge|building|roof|cliff|train|car|window|balcony|school)\b",
    r"\bhow (many|much)\b.{0,25}\b(pills?|tylenol|advil|aspirin|ibuprofen|tablets?|medicine|medication|paracetamol|acetaminophen)\b.{0,25}\b(to|will|does it|would)\b.{0,15}\b(die|kill|overdose|end)\b",
    r"\bwhat (pills?|medicine|medication|drugs?|poison|chemicals?)\b.{0,25}\b(kill|would kill|will kill|could kill)\b",
    r"\b(sleep forever|not wake up|never wake up)\b.{0,30}\b(die|dead|end)\b|\bi want to die\b",
    r"\btried to (kill|hurt|harm) myself\b|\battempt(ed)? suicide\b",
    r"\b(kill(ing)?|hurt(ing)?|harm(ing)?|cut(ting)?|hang(ing)?|drown(ing)?|poison(ing)?)\s+(my\s?self|myself)\b",
    r"\b(want|wanna|wish|going|plan(ning)?|thinking of|thought about|need)\s+(to\s+)?(die|end it|end my life|disappear forever|kill myself)\b",
    r"\b(end|take)\s+(it all|my own life|my life)\b",
    r"\bsuicid(e|al)\b.*\b(i|me|my)\b|\b(i|me|my)\b.*\bsuicid(e|al)\b",
    r"\bself[- ]?harm\w*\b.*\b(i|me|my)\b|\b(i|me|my)\b.*\bself[- ]?harm\w*\b",
    r"\b(don'?t|do not|didn'?t) want to (be here|live|exist|wake up)\b",
    r"\b(better off|world.{0,15}better) (dead|without me)\b",
    r"\b(no reason|nothing) (to|left to) live( for)?\b",
    r"\bi (wish|want) i (was|were) (dead|never born)\b",
    r"\b(hate|hating) my (life|self)\b.*\b(die|dead|end)\b",
    r"\bi('?m| am) (going|gonna) to (kill|hurt) myself\b",
    r"\bwhat('?s| is) the (easiest|best|fastest|painless) way to (die|kill myself|end it)\b",
)
ABUSE = _P(
    r"\b(get|gets|got|getting) (hit|beaten|slapped|whipped|punched|kicked|spanked|hurt)\b.{0,20}\b(with|by|if|when|for)\b",
    r"\b(keeps?|kept|keep) (coming|walking|barging) into (the |my )?(bathroom|bedroom|room)\b.{0,40}\b(shower|bath|changing|night|undress\w*)\b",
    r"\b(says?|said|tells?|told) (me )?(not to|to not|i (can'?t|shouldn'?t|mustn'?t)) tell (anyone|anybody|mom|dad|my parents|the teacher)\b",
    r"\b(touch\w*|watch\w*|look\w*) (at )?me\b.{0,40}\b(shower|bath|changing|undress\w*|naked)\b",
    r"\bmakes? me (do|take off|show|touch|undress|strip|send|keep)\b.{0,40}\b(things|clothes|secret|pictures?|photos?|videos?|touch|him|her|private)\b",
    r"\b(am|is|being|been|getting) (being )?(abused|molested|assaulted|raped|trafficked)\b",
    r"\b(abuse|abused|abusing)\b.{0,20}\b(at home|me|us)\b|\bbeing abused\b",
    r"\bhurts? (my )?(little |baby |younger |older )?(sister|brother|siblings?|me)\b(?!.{0,15}\b(feelings|my head|when i)\b)",
    r"\b(don'?t|do not|doesn'?t|never) feel safe (in|at|around|with)\b",
    r"\b(ask|asks|asked|asking|keeps asking|keeps? on asking|wants|wanted)( me)? (me )?for (pictures?|photos?|nudes?|naked|videos?|private)\b|\bmade me (send|take|show|give)\b.{0,25}\b(pictures?|photos?|nudes?|videos?)\b",
    r"\btake off my (clothes|shirt|pants|underwear)\b|\bmakes? me (take off|undress)\b",
    r"\bi'?m (scared|afraid|terrified) (of|to) (my|him|her|them|going)\b.{0,30}\b(home|house|dad|mom|stepdad|uncle|parent)\b",
    r"\b(hits?|hit|beats?|beat|hurts?|kicks?|slaps?|chokes?|punch\w*) me\b",
    r"\b(touch(es|ed)?|molest\w*|grop\w*|rap(e|ed|es)|forc(es|ed)) me\b",
    r"\b(abus(e|es|ed|ing)|hurting) me\b",
    r"\b(afraid|scared|terrified) (to go|of going|to be) (home|alone with)\b",
    r"\b(not safe|unsafe) (at|in) (home|my house)\b",
    r"\b(someone|somebody|he|she|they|(my )?(dad|mom|mum|step\w*|uncle|aunt|brother|sister|coach|teacher|babysitter|neighbou?r|boyfriend|girlfriend))\b.{0,40}\b(makes? me|forces? me|made me) .{0,30}\b(sex|touch|undress|naked|pictures?|photos?)\b",
    r"\bsecret (touching|game).{0,30}\b(adult|dad|uncle|coach)\b",
    r"\b(my (dad|mom|mum|stepdad|stepmom|uncle|aunt|parent\w*|foster \w+))\b.{0,30}\b(hits?|hurts?|beats?|touch\w*|abus\w*)\b.{0,10}\b(me|us)\b",
    r"\bnobody feeds me\b|\bthey (don'?t|won'?t) feed me\b",
)
VIOLENCE = _P(
    r"\b(bring|brings|bringing|brought|take|takes|taking|carry|carries|carrying|smuggle\w*|has|have|got|found)\b.{0,30}\b(rifle|gun|pistol|handgun|firearm|shotgun|knife|weapon|bomb|explosives?)\b.{0,30}\b(school|class|classroom|campus|to school|on friday|tomorrow|next week)\b",
    r"\b(he|she|they|someone|somebody|a kid|kid|student)\b.{0,25}\b(said|says|told|posted|wrote|threatened)\b.{0,40}\b(shoot|kill|hurt|stab|bomb|blow up|bring a (gun|knife))\b",
    r"\b(list|lists)\b.{0,20}\b(of )?(people|kids|students|classmates)\b.{0,20}\b(hurt|kill|shoot|revenge)\b|\b(someone|somebody|people|kids?) (is|are) (going|gonna) to (get )?(hurt|killed|shot)\b",
    r"\b(make|making|made) (them|him|her|everyone|everybody|those kids|the kids) (all )?(pay|suffer|regret)\b.{0,30}\b(gun|knife|weapon|violence|hurt)\b|\bwith a (gun|knife|weapon)\b.{0,20}\b(pay|hurt|kill|shoot)\b",
    r"\b(planning|plan|plans|planned) (a |an |the |to )?(school )?(shooting|attack|massacre|bombing|stabbing)\b",
    r"\b(want|going|gonna|planning|plan|will|about|decided)( to)?( to)? (kill|hurt|harm|shoot|stab|beat up|attack|murder|jump)\b.{0,25}\b(my|the|that|those|some|a|an|all)\b.{0,15}\b(bully|bullies|classmates?|girl|boy|kid|kids|teacher|principal|brother|sister|dad|mom|step\w*|people|guy|man|woman|students?)\b",
    r"\bblow up (my|the|our) school\b|\bbomb (my|the|our) school\b",
    r"\bbeat (him|her|them|that \w+) up until\b|\b(until|so) (he|she|they) can'?t (move|walk|breathe)\b",
    r"\bi will (kill|hurt|shoot|stab) (that|the|this|those) \w+\b",
    r"\b(kill|shoot|stab|hurt|murder|blow up|beat up)\s+(him|her|them|everyone|everybody|my (teacher|classmate|class|friend|brother|sister|dad|mom|stepdad)|the (teacher|class|school|kids))\b",
    r"\b(bring|brought|take|took|smuggle)\s+(a\s+|the\s+)?(gun|knife|weapon|pistol|rifle)\s+(to|into)\s+(school|class)\b",
    r"\b(shoot up|attack) (the|my) school\b",
    r"\bi('?m| am)? ?(going|gonna|will|plan to|want to) (to )?(kill|shoot|stab|hurt) (\w+ )?(him|her|them|someone|people|a (teacher|kid|classmate))\b",
    r"\bwho should i (kill|shoot|stab|hurt)\b",
    # asking how to harm a person, or how to get away with it, is planning: alert the safety contact, not only block
    r"\bhow (can|do|could|would|should|to) (i |we )?(kill|hurt|harm|stab|shoot|poison|attack|beat up|murder)\s+(someone|somebody|people|a (person|kid|student|classmate|teacher|boy|girl)|him|her|them|my \w+|the (teacher|kids?|students?|class|bully))\b",
    r"\b(kill|hurt|harm|stab|shoot|poison|attack|beat up|murder)\b.{0,40}\b(without|and not|not) (get|getting) caught\b|\bget away with (killing|hurting|stabbing|shooting|poisoning|murder\w*)\b",
    r"\bschool shooting\b.{0,30}\b(plan|going to|will)\b",
)
MEDICAL = _P(
    r"\b(swallowed|ate|drank|chewed|inhaled)\b.{0,20}\b(battery|batteries|cleaning|liquid|chemicals?|detergent|magnet|poison|bleach|pills?|medicine|coin|button)\b",
    r"\b(passed out|collapsed|fainted|is (lying|on the floor))\b.{0,30}\b(isn'?t|is not|not|won'?t|doesn'?t|can'?t) (responding|moving|breathing|waking|wake up|answer)\b",
    r"\b(isn'?t|is not|not|won'?t|doesn'?t|stopped)\b.{0,8}\b(responding|moving|breathing|waking up)\b",
    r"\bmy (friend|brother|sister|mom|dad|grandma|grandpa|baby|teacher|classmate)\b.{0,25}\b(collapsed|fainted|turned blue|is unconscious|is dying|choking|drowning|on fire)\b",
    r"\b(took|taken|swallowed|drank|ate) (a lot of |too many |all (the|of the) |some )?(pills|tablets|medicine|medication|bleach|cleaner|poison)\b",
    r"\bmy (friend|brother|sister|mom|dad|classmate)\b.{0,30}\b(took|swallowed|drank|is not breathing|isn'?t breathing|won'?t wake up|passed out|is bleeding|is dying|overdosed?)\b",
    r"\b(overdos(e|ed|ing)|not breathing|isn'?t breathing|won'?t wake up|unconscious|can'?t breathe|bleeding (a lot|badly|heavily)|having a seizure|choking)\b",
    r"\bi (can'?t|cannot) breathe\b|\bchest (hurts|pain)\b.{0,20}\b(bad|really)\b",
)
SEXUAL_MINOR = _P(
    r"\b(sex|sexual|naked|nude|porn\w*|erotic\w*|undress\w*)\b.{0,40}\b(child|children|kid|kids|minor|minors|underage|under-age|preteen|toddler|boy|girl|\d{1,2}[- ]?year[- ]?old)\b",
    r"\b(child|children|kid|kids|minor|minors|underage|under-age|preteen|toddler|\d{1,2}[- ]?year[- ]?old)\b.{0,40}\b(sex|sexual|naked|nude|porn\w*|erotic\w*|undress\w*)\b",
    r"\bchild (porn|abuse material)\b|\bcsam\b",
)
SEXUAL = _P(
    r"\b(sexy|dirty|steamy|naughty|erotic|hot) (story|stories|pictures?|photos?|pics?|scene|roleplay|role-play|chat)\b",
    r"\b(porn\w*|pornhub|xxx|nsfw|blowjob|handjob|orgasm|erotic\w*|sex ?(scene|story|chat|position|video|act)|nudes?|naked (pics?|pictures?|photos?)|send nudes|hentai|dick pic|boobs?|penis (pic|picture))\b",
    r"\bwrite (me )?(a )?(sexy|dirty|steamy) (story|scene|poem)\b",
    r"\b(sext\w*|make out with me|be my girlfriend|be my boyfriend|have sex with me)\b",
)
DANGEROUS = _P(
    r"\bhow (do|to|can|would|could)\s+((i|you|we|someone|one)\s+)?(make|build|create|cook|brew|synthesi[sz]e|assemble|get|buy|steal)\s+(a\s+|an\s+|some\s+)?(bomb|explosive|pipe bomb|molotov|napalm|thermite|nerve agent|sarin|ricin|meth\w*|cocaine|heroin|fentanyl|ghost gun|untraceable gun|silencer|poison)\b",
    r"\b(recipe|instructions?|steps|tutorial|guide) (for|to) (making|make|building|build|cooking) (a )?(bomb|explosive|meth\w*|napalm|poison|weapon)\b",
    r"\bhow (do|to|can) ((i|you) )?(hack|break into|get into|spy on|track|stalk|dox|swat) (my |a |an |the |someone'?s? )?(classmate|friend|girlfriend|boyfriend|teacher|ex|neighbou?r|school (network|computer|wifi|grades)|account|phone|instagram|snapchat|tiktok|email)\b",
    r"\b(steal|crack|guess|phish|get) (someone'?s?|my (friend|classmate|teacher)'?s?|a) password\b",
    r"\b(ddos|dox+|swat)\w*\b.{0,20}\b(someone|him|her|them|classmate|teacher|school)\b",
    r"\bhow (do|to|can) (i|you) (buy|get|find|order) (drugs|weed|cocaine|heroin|molly|xanax|pills|a gun|a knife|vape|alcohol) (without|secretly|illegally|online|at school)\b",
    r"\bhow (do|can) (i|you) (hide|sneak|smuggle) (a )?(knife|gun|weapon|drugs|vape|alcohol)\b",
)
HATE = _P(
    r"\bn[- ]?word\b|\bsay (the )?(n-?word|slur)\b",
    r"\b(help me|how (do|can|could|to)( i| we)?|i want to|i wanna|teach me( how)? to|ways to|best way to)\s+(bully|humiliate|cyberbully|make fun of|make (a )?(kid|girl|boy|him|her|someone) cry|embarrass|insult|harass|torment)\b",
    r"\b(insults?|mean (things|words)|nasty (things|words|message)|cruel (things|words))\b.{0,30}\b(for|about|to|against)\b.{0,20}\b(kid|classmate|girl|boy|friend|teacher|someone|fat|ugly|disabled|him|her)\b",
    r"\bwrite (something|a message|a post|a comment) (mean|nasty|cruel|hateful)\b|\bwrite something (mean|nasty|cruel|hateful)\b",
    r"\b(n[i1!]gg(a|er)s?|f[a4@]gg?(ot)?s?|k[i1]ke|sp[i1]c|ch[i1]nk|tr[a4]nny|retard(ed)?s?|towelhead|wetback|beaner|paki)\b",
    r"\b(kill|hate|hurt|get rid of|exterminate|deport) (all |the )?(jews|muslims|christians|blacks|whites|asians|mexicans|gays|lesbians|trans people|immigrants|girls|women|boys)\b",
    r"\b(i hate|we hate|nobody likes|everyone hates) (\w+ )?(jews|muslims|blacks|gays|immigrants|girls|women|him|her|[A-Z][a-z]+)\b.{0,20}\b(so much|die|kill|ugly|stupid|fat)\b",
    r"\b(help me|how (do|can) i) (bully|insult|harass|humiliate|embarrass|make fun of|cyberbully|spread rumou?rs? about) (a |my |the )?(kid|classmate|girl|boy|friend|teacher|student|someone|him|her|them)\b",
    r"\bwrite (a |an )?(mean|nasty|hateful|insulting|racist|sexist) (message|post|comment|note|text|rant)\b.{0,30}\b(about|to|for)\b",
)
PERSONAL = _P(
    r"\bmy (home |house |street )?address is\b",
    r"\bi live (at|on) \d+\b",
    r"\bmy (phone|cell|mobile)( number)? is\b.{0,6}\d",
    r"\b\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b",
    r"\bmy (personal |school |home )?e-?mail( address)? is\b\s*\S+@\S+",
    r"\b\S+@\S+\.(com|org|net|edu|io)\b",
    r"\bmy (full |last )?name is [A-Z][a-z]+ [A-Z][a-z]+\b.{0,40}\b(live|go to|school|from)\b",
    r"\bmy (social security|ssn|passport|credit card|bank account)\b",
    r"\bmy password is\b",
)
DISTRESS = _P(
    r"\b(feel|feeling|am|i'?m|felt) (like )?(a )?(failure|loser|burden|waste|disappointment)\b",
    r"\b(everyone|everybody|they all|the kids|people at school) (picks? on|make fun of|makes? fun of|laughs? at|hates?|ignores?|excludes?) me\b",
    r"\bworried about my (parents|mom|dad|family|grades)\b|\bparents (are )?fighting\b",
    r"\b(so |really |very |super |extremely )?(stressed|stressed out|anxious|overwhelmed|depressed|lonely|hopeless|worthless|miserable|exhausted and sad|burn(ed|t) out)\b",
    r"\bi('?m| am| feel| feeling)( so| really| very| super)? (sad|down|scared|afraid|worried|panick\w*|upset|crying|alone|nervous|terrified|a failure|stupid|dumb|useless)\b",
    r"\b(can'?t|cannot|couldn'?t) (cope|handle (it|this|everything)|take (it|this) anymore|sleep|stop crying|stop worrying)\b",
    r"\bpanic attack\b|\banxiety attack\b",
    r"\b(nobody|no one) (likes|likes me|cares|talks to me|wants me|listens)\b|\bi have no friends\b",
    r"\b(i'?m|am|being|get|got|getting) (being )?(bullied|picked on|made fun of|teased|excluded|harassed)\b",
    r"\bfailing (everything|all my classes)\b.{0,20}\b(parents will|so scared|so stressed)\b",
    r"\bi (hate|can'?t stand) (school|myself|my life)\b",
)

# order matters only for tie-breaking; severity decides the winner
CATEGORIES: list[tuple[str, str, list[re.Pattern]]] = [
    ("self_harm", "high", SELF_HARM),
    ("abuse_disclosure", "high", ABUSE),
    ("violence_threat", "high", VIOLENCE),
    ("medical_emergency", "high", MEDICAL),
    ("sexual_minor", "high", SEXUAL_MINOR),
    ("sexual", "medium", SEXUAL),
    ("dangerous", "medium", DANGEROUS),
    ("hate_harassment", "low", HATE),
    ("personal_info", "low", PERSONAL),
    ("distress", "low", DISTRESS),
]
_SEV = {"none": 0, "low": 1, "medium": 2, "high": 3}


@dataclass(frozen=True)
class RuleHit:
    category: str
    severity: str
    pattern: str


_FIRST_PERSON = re.compile(r"\b(i|i'?m|im|i'?ve|ive|me|my|myself|we|our)\b", I)
_ABOUT_OTHERS = re.compile(r"^\s*(why|what|how|when|explain|describe|tell me about|write|is|are|do|does)\b.{0,40}\b(people|teenagers?|students?|kids|children|adults|humans|everyone|someone|classmate|friends?)\b", I)


def scan(text: str) -> RuleHit | None:
    """Most severe rule hit, or None."""
    best: RuleHit | None = None
    for cat, sev, pats in CATEGORIES:
        for p in pats:
            if p.search(text):
                if cat == "distress" and (not _FIRST_PERSON.search(text) or _ABOUT_OTHERS.search(text)):
                    continue
                if best is None or _SEV[sev] > _SEV[best.severity]:
                    best = RuleHit(cat, sev, p.pattern[:60])
                break
    return best
