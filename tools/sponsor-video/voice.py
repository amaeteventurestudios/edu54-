"""Sponsor video voiceover: one WAV per narration line, spoken offline by Kokoro (Apache-2.0).

    uv run --with kokoro-onnx --with soundfile python tools/sponsor-video/voice.py
    -> docs/media/raw-sponsor-audio/<id>.wav and durations.json (seconds per line; sponsor.mjs holds each caption at least that long)

Model files (downloaded once): ~/.cache/umanah-tts/kokoro-v1.0.onnx, voices-v1.0.bin
from https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
"""
import json
import os
from pathlib import Path

import soundfile as sf
from kokoro_onnx import Kokoro

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[1] / "docs/media/raw-sponsor-audio"
CACHE = Path(os.path.expanduser("~/.cache/umanah-tts"))

cfg = json.loads((HERE / "narration.json").read_text())
OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(str(CACHE / "kokoro-v1.0.onnx"), str(CACHE / "voices-v1.0.bin"))
durations = {}
for line in cfg["lines"]:
    ph = k.tokenizer.phonemize(line.get("say", line["text"]), "en-us")
    for word, fix in cfg["pronounce"].items():
        ph = ph.replace(k.tokenizer.phonemize(word, "en-us"), fix)
    samples, sr = k.create(ph, voice=cfg["voice"], speed=cfg["speed"], is_phonemes=True)
    sf.write(OUT / f"{line['id']}.wav", samples, sr)
    durations[line["id"]] = round(len(samples) / sr, 3)
    print(f"{line['id']}: {durations[line['id']]} s  {ph}")
(OUT / "durations.json").write_text(json.dumps(durations, indent=2) + "\n")
