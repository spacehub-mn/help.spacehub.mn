# timing.json + raw .webm → <name>.mp4 (1280×720, ачааллын хүлээлтийг тайрсан) + <name>.srt (YouTube-д хадмал)
#   python scripts/video/build.py <хавтас (timing.json-тай)> <name>
import json, os, subprocess, sys
import imageio_ffmpeg

sys.stdout.reconfigure(encoding="utf-8")
FF = imageio_ffmpeg.get_ffmpeg_exe()
src, name = sys.argv[1], sys.argv[2]
t = json.load(open(os.path.join(src, "timing.json"), encoding="utf-8"))
lead, end = t["tLead"], t["tEnd"]
# Үлдээх хэсгүүд = [lead, end] − ачааллын хүлээлтүүд (cuts)
keep, a = [], lead
for c1, c2 in sorted(t.get("cuts", [])):
    keep.append((a, c1)); a = c2
keep.append((a, end))

def mapped(x):  # эх бичлэгийн цаг → тайрсны дараах цаг
    out = 0.0
    for s, e in keep:
        if x >= e: out += e - s
        elif x > s: return out + x - s
        else: return out
    return out

parts = "".join(f"[0:v]trim={s:.3f}:{e:.3f},setpts=PTS-STARTPTS[p{i}];" for i, (s, e) in enumerate(keep))
fc = parts + "".join(f"[p{i}]" for i in range(len(keep))) + f"concat=n={len(keep)}:v=1[c];[c]scale=1280:720,fps=30[v]"
mp4 = os.path.join(src, name + ".mp4")
subprocess.run([FF, "-y", "-loglevel", "error", "-i", t["video"], "-filter_complex", fc, "-map", "[v]", "-an",
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-movflags", "+faststart", mp4], check=True)

def ts(x):
    ms = int(round(max(0.0, x) * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"

lines = []
for i, c in enumerate(t["cues"], 1):
    lines += [str(i), f"{ts(mapped(c['start']))} --> {ts(mapped(c['end'] or end))}", c["text"], ""]
open(os.path.join(src, name + ".srt"), "w", encoding="utf-8").write("\n".join(lines))
dur = sum(e - s for s, e in keep)
print(f"{name}.mp4 {dur:.1f}с {os.path.getsize(mp4) / 1e6:.2f} MB, хадмал {len(t['cues'])} мөр, тайрсан {end - lead - dur:.1f}с")
