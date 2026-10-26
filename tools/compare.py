"""Puts each built screen next to its reference image (design/reference/README.md "Verification").

    uv run --with pillow python tools/compare.py

The reference PNGs are slides: a title, a marble background and a fake browser window. Only the window's inside is the
target, so it is cropped out before the two are placed side by side. Output: design/compare/NN-name.png
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
REF, OURS, OUT = ROOT / "design/reference", ROOT / "design/compare/ours", ROOT / "design/compare"
PAIRS = {"01-home": "01-home-student-dashboard", "02-ask": "02-ask-ai-tutor", "03-learn": "03-learn-learning-hub", "04-lesson": "04-lesson",
         "05-homework": "05-homework-assignment", "07-build": "07-build-lab", "09-progress": "09-progress-achievements", "10-teacher": "10-teacher-center"}
W = 1100
for ours, ref in PAIRS.items():
    o, r = OURS / f"{ours}.png", REF / f"{ref}.png"
    if not o.exists():
        continue
    a = Image.open(r).convert("RGB")
    # the app window inside the slide (measured on the 1672x941 slides)
    sx, sy = a.width / 1672, a.height / 941
    a = a.crop((int(186 * sx), int(232 * sy), int(1528 * sx), int(915 * sy)))
    b = Image.open(o).convert("RGB")
    a = a.resize((W, int(a.height * W / a.width)))
    b = b.resize((W, int(b.height * W / b.width)))
    h = max(a.height, b.height)
    canvas = Image.new("RGB", (W * 2 + 30, h + 40), "#ffffff")
    canvas.paste(a, (0, 40)); canvas.paste(b, (W + 30, 40))
    d = ImageDraw.Draw(canvas)
    d.text((10, 12), f"REFERENCE  {ref}", fill="#0b1f3b"); d.text((W + 40, 12), f"BUILT  {ours}  (1440x900)", fill="#0b1f3b")
    canvas.save(OUT / f"{ours}.png")
    print("wrote", OUT / f"{ours}.png")
