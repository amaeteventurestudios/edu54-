"""Sponsor video: mix voiceover + original music under the recorded footage.

    uv run --with numpy --with scipy --with soundfile python tools/sponsor-video/mix.py
    in:  docs/media/sponsor-video.webm, docs/media/raw-sponsor/timeline.json, docs/media/raw-sponsor-audio/*.wav
    out: docs/media/sponsor-video.mp4 (H.264 + AAC)

The music is composed here in code (I-V-vi-IV pad, bass, soft arpeggio, reverb), so there is no third-party licence.
It ducks under the voice and fades in and out.
"""
import json
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import fftconvolve, resample_poly

ROOT = Path(__file__).resolve().parents[2]
MEDIA = ROOT / "docs/media"
SR = 48000
LEAD = 0.25  # voice starts just after its caption appears
rng = np.random.default_rng(7)

video = MEDIA / "sponsor-video.webm"
dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(video)]))
n = int(dur * SR)
t = np.arange(n) / SR



def find_cues(timeline):
    """When each line really appears on screen. The browser recorder drops frames while the tutor model works,
    so video time drifts behind the script's clock (about 2.4 s by the end). Search forward from the logged time
    (plus the drift so far) for the caption box changing, or for the screen going dark for a title card."""
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(video), "-vf", "fps=20,scale=360:225,format=gray", "-f", "rawvideo", "-"])
    f = np.frombuffer(raw, np.uint8).reshape(-1, 225, 360).astype(float)
    probe = f[:, 196:218, 150:210]  # always inside the caption box
    change = np.r_[0, np.abs(np.diff(probe, axis=0)).mean(axis=(1, 2))]
    dark = f.mean(axis=(1, 2)) < 25
    off, prev, found = 0.0, 0.0, []
    for c in timeline:
        lo = int(max(prev + 0.3, c["t"] + off - 0.3) * 20)
        hi = min(len(f), int((c["t"] + off + 5) * 20))
        if c["big"]:
            hits = [i for i in range(max(lo, 1), hi) if dark[i] and not dark[i - 1]]
        else:
            hits = [i for i in range(lo, hi) if change[i] > 12 and probe[i].mean() < 90]
        if not hits:
            raise SystemExit(f"could not find '{c['id']}' in the video near {c['t'] + off:.1f} s")
        prev = hits[0] / 20
        off = prev - c["t"]
        found.append({**c, "video_t": prev})
        print(f"  {c['id']:12} script {c['t']:6.2f} s  video {prev:6.2f} s  ({off:+.2f})")
    return found


# --- voice track (mono) and a mask of where it speaks
voice = np.zeros(n)
speaking = np.zeros(n)
cues = find_cues(json.loads((MEDIA / "raw-sponsor/timeline.json").read_text()))
(MEDIA / "raw-sponsor/cues.json").write_text(json.dumps(cues, indent=2) + "\n")
for c in cues:
    clip, sr = sf.read(MEDIA / f"raw-sponsor-audio/{c['id']}.wav")
    clip = resample_poly(clip, SR, sr)
    a = int((c["video_t"] + LEAD) * SR)
    b = min(n, a + len(clip))
    voice[a:b] += clip[: b - a]
    speaking[a:b] = 1
voice *= 0.89 / max(1e-9, np.abs(voice).max())  # about -1 dBFS peak


# --- music
def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


bpm = 72
beat = 60 / bpm
bar = 4 * beat
chords = [[48, 55, 60, 64, 67], [43, 55, 59, 62, 67], [45, 57, 60, 64, 69], [41, 53, 57, 60, 65]]  # C, G, Am, F
music = np.zeros((n, 2))


def env(length, attack, release):
    e = np.ones(length)
    a, r = int(attack * SR), int(release * SR)
    e[:a] = np.linspace(0, 1, a)
    e[-r:] *= np.linspace(1, 0, r)
    return e


bars = int(np.ceil(dur / bar))
for i in range(bars):
    chord = chords[i % 4]
    s = int(i * bar * SR)
    length = min(n - s, int((bar + 1.2) * SR))  # overlap into the next bar
    if length <= 0:
        break
    tt = np.arange(length) / SR
    e = env(length, 1.0, 1.4)
    for note in chord[1:]:  # pad: two slightly detuned soft partial stacks per note, panned apart
        for det, pan in ((-0.12, 0.3), (0.12, 0.7)):
            f = hz(note + det)
            w = np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(4 * np.pi * f * tt) + 0.12 * np.sin(6 * np.pi * f * tt)
            music[s : s + length, 0] += 0.045 * e * w * (1 - pan)
            music[s : s + length, 1] += 0.045 * e * w * pan
    f = hz(chord[0])  # bass
    bass = 0.16 * env(length, 0.08, 1.2) * np.sin(2 * np.pi * f * tt) * np.exp(-tt * 0.25)
    music[s : s + length] += bass[:, None]
    for k in range(8):  # arpeggio, eighth notes, from bar 2 on
        if i == 0:
            break
        note = chord[[1, 2, 3, 4, 3, 2, 4, 3][k]] + 12
        a = s + int(k * beat / 2 * SR)
        L = min(n - a, int(1.6 * SR))
        if L <= 0:
            continue
        tt2 = np.arange(L) / SR
        f = hz(note)
        pl = (np.sin(2 * np.pi * f * tt2) + 0.25 * np.sin(4 * np.pi * f * tt2)) * np.exp(-tt2 * 3.2)
        pl[: int(0.005 * SR)] *= np.linspace(0, 1, int(0.005 * SR))
        pan = 0.35 + 0.3 * (k % 2)
        music[a : a + L, 0] += 0.05 * pl * (1 - pan)
        music[a : a + L, 1] += 0.05 * pl * pan

# reverb: decaying noise impulse per channel
ir_len = int(2.4 * SR)
decay = np.exp(-np.arange(ir_len) / SR * 2.8)
for ch in range(2):
    ir = rng.standard_normal(ir_len) * decay
    ir /= np.sqrt((ir**2).sum())
    music[:, ch] = 0.75 * music[:, ch] + 0.45 * fftconvolve(music[:, ch], ir)[:n]
music /= max(1e-9, np.abs(music).max())

# duck under the voice (smooth 0.35 s ramps), fade in/out
k = int(0.35 * SR)
duck = np.convolve(speaking, np.ones(k) / k, mode="same")
duck = np.convolve(np.clip(duck * 3, 0, 1), np.ones(k) / k, mode="same")
gain = 0.30 * (1 - 0.6 * duck)  # music about -10.5 dBFS alone, about -18.5 dBFS under the voice
gain *= np.clip(t / 2.0, 0, 1) * np.clip((dur - t) / 3.0, 0, 1)
mix = music * gain[:, None] + voice[:, None]
mix /= max(1.0, np.abs(mix).max() / 0.97)

wav = MEDIA / "raw-sponsor-audio/mix.wav"
sf.write(wav, mix, SR)
out = MEDIA / "sponsor-video.mp4"
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(video), "-i", str(wav), "-map", "0:v", "-map", "1:a",
                "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-pix_fmt", "yuv420p",
                "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", str(out)], check=True)
print(f"saved {out.relative_to(ROOT)} ({dur:.1f} s)")
