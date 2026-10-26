# timing.json + raw .webm → <name>.mp4 (бичлэгийн хэмжээгээр, ачааллын хүлээлтийг тайрсан) + <name>.srt (YouTube-д хадмал)
#   python scripts/video/build.py <хавтас (timing.json-тай)> <name> [--voice <tts.py-ийн гаралт>]
# --voice: cue бүрийн эхэнд дуу тавина; дуу cue-ээс урт бол cue-ийн сүүлийн кадрыг зогсоож сунгана.
#          .srt-ийн бичвэр = дууны скрипт (manifest.json «say») — хадмал ба дуу нэг эхтэй.
import json, os, subprocess, sys

VOICE_DELAY = 0.2   # cue эхэлснээс дуу эхлэх хүртэл
VOICE_TAIL = 0.5    # дуу дууссаны дараа дараагийн cue хүртэлх зай


def plan(t, voice_sec=None):
    """cue бүр: тайрсны дараах хэсгүүд, үргэлжлэх хугацаа, дуунд зориулж сунгах хугацаа, гаралтын эхлэх цаг."""
    lead, end = t["tLead"], t["tEnd"]
    keep, a = [], lead
    for c1, c2 in sorted(t.get("cuts", [])):
        keep.append((a, c1)); a = c2
    keep.append((a, end))
    cues = t["cues"]
    bounds = [lead] + [c["start"] for c in cues[1:]] + [end]
    out, at = [], 0.0
    for i, c in enumerate(cues):
        lo, hi = bounds[i], bounds[i + 1]
        pieces = [(max(s, lo), min(e, hi)) for s, e in keep if min(e, hi) > max(s, lo)]
        slot = sum(e - s for s, e in pieces)
        v = (voice_sec or [None] * len(cues))[i]
        extra = max(0.0, VOICE_DELAY + v + VOICE_TAIL - slot) if v else 0.0
        out.append({"pieces": pieces, "slot": slot, "extra": extra, "start": at, "voice": v})
        at += slot + extra
    return out


def ts(x):
    ms = int(round(max(0.0, x) * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def srt(segs, texts):
    lines = []
    for i, (g, txt) in enumerate(zip(segs, texts), 1):
        lines += [str(i), f"{ts(g['start'])} --> {ts(g['start'] + g['slot'] + g['extra'])}", txt, ""]
    return "\n".join(lines)


def filters(segs, wav_inputs):
    """ffmpeg filter_complex: видео cue-ээр тайрч/сунгаж нийлүүлнэ; дуу cue бүрийн эхэнд (VOICE_DELAY), чимээгүйгээр дүүргэнэ."""
    fc, vs, as_ = "", "", ""
    for i, g in enumerate(segs):
        for j, (s, e) in enumerate(g["pieces"]):
            fc += f"[0:v]trim={s:.3f}:{e:.3f},setpts=PTS-STARTPTS[p{i}_{j}];"
        fc += "".join(f"[p{i}_{j}]" for j in range(len(g["pieces"]))) + f"concat=n={len(g['pieces'])}:v=1[c{i}];"
        if g["extra"]:
            fc += f"[c{i}]tpad=stop_mode=clone:stop_duration={g['extra']:.3f}[c{i}x];"
        vs += f"[c{i}x]" if g["extra"] else f"[c{i}]"
        if wav_inputs is not None:
            dur = g["slot"] + g["extra"]
            k = wav_inputs[i]
            if k is None:
                fc += f"anullsrc=r=48000:cl=mono,atrim=0:{dur:.3f}[a{i}];"
            else:
                fc += f"[{k}:a]aresample=48000,adelay={int(VOICE_DELAY * 1000)},apad=whole_dur={dur:.3f},atrim=0:{dur:.3f}[a{i}];"
            as_ += f"[a{i}]"
    fc += vs + f"concat=n={len(segs)}:v=1[cv];[cv]fps=30[v]"
    if wav_inputs is not None:
        fc += ";" + as_ + f"concat=n={len(segs)}:v=0:a=1[a]"
    return fc


def main(argv):
    import imageio_ffmpeg
    sys.stdout.reconfigure(encoding="utf-8")
    src, name = argv[0], argv[1]
    vdir = argv[argv.index("--voice") + 1] if "--voice" in argv else None
    t = json.load(open(os.path.join(src, "timing.json"), encoding="utf-8"))
    texts = [c["text"] for c in t["cues"]]
    wavs, wav_inputs, voice_sec = [], None, None
    if vdir:
        m = json.load(open(os.path.join(vdir, "manifest.json"), encoding="utf-8"))
        if len(m["say"]) != len(t["cues"]):
            sys.exit(f"Дууны скрипт {len(m['say'])} мөр, бичлэг {len(t['cues'])} cue — тэнцүү байх ёстой")
        texts, wav_inputs, voice_sec = m["say"], [], []
        for i in range(len(t["cues"])):
            f = m["files"].get(f"cue-{i + 1:02}.wav")
            voice_sec.append(f and f["sec"])
            if f:
                wavs.append(os.path.join(vdir, f"cue-{i + 1:02}.wav"))
            wav_inputs.append(len(wavs) if f else None)
    segs = plan(t, voice_sec)
    mp4 = os.path.join(src, name + ".mp4")
    cmd = [imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error", "-i", t["video"]]
    for w in wavs:
        cmd += ["-i", w]
    cmd += ["-filter_complex", filters(segs, wav_inputs), "-map", "[v]"]
    cmd += ["-map", "[a]", "-c:a", "aac", "-b:a", "128k"] if vdir else ["-an"]
    cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-movflags", "+faststart", mp4]
    subprocess.run(cmd, check=True)
    open(os.path.join(src, name + ".srt"), "w", encoding="utf-8").write(srt(segs, texts))
    dur = sum(g["slot"] + g["extra"] for g in segs)
    cut = t["tEnd"] - t["tLead"] - sum(g["slot"] for g in segs)
    ext = sum(g["extra"] for g in segs)
    print(f"{name}.mp4 {dur:.1f}с {os.path.getsize(mp4) / 1e6:.2f} MB, хадмал {len(segs)} мөр, тайрсан {cut:.1f}с"
          + (f", дуунд сунгасан {ext:.1f}с" if vdir else ""))


if __name__ == "__main__":
    main(sys.argv[1:])
