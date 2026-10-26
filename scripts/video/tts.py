# Монгол дуу (Azure Speech, mn-MN Yesui/Bataa) — эзний шийдвэр 10-26. REST API, нэмэлт сангүй.
#   python scripts/video/tts.py <name>.voice.json <гаралт> [--voice yesui|bataa]   → <гаралт>/cue-01.wav … + manifest.json
#   python scripts/video/tts.py --test tts-test.txt <гаралт>                        → мөр бүр түүхий/хувиргасан × 2 дуу
#   --dry: Azure руу илгээхгүй, хувиргасан бичвэр ба тэмдэгтийн тоог (F0 = сард 0.5 сая) хэвлэнэ
#
# Түлхүүр зөвхөн Windows Credential Manager-т (кодонд/файлд/чатад ХЭЗЭЭ Ч бичихгүй). Эзэн нэг удаа:
#   cmdkey /generic:spacehub-help/azure-speech /user:<region, ж: eastasia> /pass
#   (/pass-ийг утгагүй бичвэл нууц үгийг асууж авна — shell-ийн түүхэнд үлдэхгүй)
import ctypes, hashlib, json, os, re, sys, urllib.request, wave
from ctypes import wintypes
from xml.sax.saxutils import escape

sys.stdout.reconfigure(encoding="utf-8")
CRED_TARGET = "spacehub-help/azure-speech"
VOICES = {"yesui": "mn-MN-YesuiNeural", "bataa": "mn-MN-BataaNeural"}

# Хадмал дээр тэмдэгтээрээ үлдэнэ, зөвхөн дуунд хувирна. Тест сонсоод шаардлагагүй мөрийг хасна.
LEXICON = [
    (r"(?<=\d) (?=\d{3}\b)", ""),                 # 1 250 000 → 1250000 (зайтай тоог нэг тоо гэж уншуулах)
    (r"\s*₮", " төгрөг"),
    (r"№\s*", "дугаар "),
    (r"\b[ЕИ]-[Бб]аримт", "и баримт"),
    (r"«Next Auto Job \+»", "«Некст авто жоб нэмэх»"),
    (r"Job Create", "Жоб криэйт"),
    (r"Job start", "Жоб старт"),
    (r"\bQPay", "кью пэй"),
    (r"\bSMS\b", "эс эм эс"),
    (r"[«»]", ""),
]


def norm(text):
    for pat, rep in LEXICON:
        text = re.sub(pat, rep, text)
    return re.sub(r"\s+", " ", text).strip()


class CREDENTIAL(ctypes.Structure):
    _fields_ = [("Flags", wintypes.DWORD), ("Type", wintypes.DWORD), ("TargetName", wintypes.LPWSTR),
                ("Comment", wintypes.LPWSTR), ("LastWritten", wintypes.FILETIME), ("CredentialBlobSize", wintypes.DWORD),
                ("CredentialBlob", ctypes.POINTER(ctypes.c_ubyte)), ("Persist", wintypes.DWORD),
                ("AttributeCount", wintypes.DWORD), ("Attributes", ctypes.c_void_p),
                ("TargetAlias", wintypes.LPWSTR), ("UserName", wintypes.LPWSTR)]


def credential():
    """(region, key) — Windows Credential Manager-аас; байхгүй бол заавар хэвлээд гарна."""
    adv = ctypes.WinDLL("advapi32", use_last_error=True)
    p = ctypes.POINTER(CREDENTIAL)()
    if not adv.CredReadW(CRED_TARGET, 1, 0, ctypes.byref(p)):  # 1 = CRED_TYPE_GENERIC
        sys.exit(f"Түлхүүр алга: Windows Credential «{CRED_TARGET}». Эзэн: cmdkey /generic:{CRED_TARGET} /user:<region> /pass")
    try:
        c = p.contents
        key = ctypes.string_at(c.CredentialBlob, c.CredentialBlobSize).decode("utf-16-le")
        return c.UserName, key
    finally:
        adv.CredFree(p)


def synth(text, voice, out, cred):
    region, key = cred
    ssml = (f"<speak version='1.0' xml:lang='mn-MN'><voice name='{VOICES[voice]}'>{escape(text)}</voice></speak>").encode("utf-8")
    req = urllib.request.Request(f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1", data=ssml, headers={
        "Ocp-Apim-Subscription-Key": key, "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "riff-24khz-16bit-mono-pcm", "User-Agent": "spacehub-help"})
    with urllib.request.urlopen(req, timeout=60) as r:
        open(out, "wb").write(r.read())


def seconds(path):
    with wave.open(path) as w:
        return w.getnframes() / w.getframerate()


def main(argv):
    dry = "--dry" in argv
    voice = argv[argv.index("--voice") + 1] if "--voice" in argv else "yesui"
    args = [a for i, a in enumerate(argv) if not a.startswith("--") and (i == 0 or argv[i - 1] != "--voice")]
    if "--test" in argv:
        lines = [l.strip() for l in open(args[0], encoding="utf-8") if l.strip() and not l.startswith("#")]
        jobs = [(f"test-{v}-{i:02}-{kind}.wav", txt, v) for i, l in enumerate(lines, 1)
                for kind, txt in (("raw", l), ("norm", norm(l))) for v in VOICES]
        say = None
    else:
        say = json.load(open(args[0], encoding="utf-8"))["cues"]
        jobs = [(f"cue-{i:02}.wav", norm(s), voice) for i, s in enumerate(say, 1)]
    out = args[1]
    chars = sum(len(t) for _, t, _ in jobs)
    print(f"{len(jobs)} файл, {chars} тэмдэгт (F0 сард 500000)")
    if dry:
        for f, t, v in jobs:
            print(f"  {f}: {t}")
        return
    os.makedirs(out, exist_ok=True)
    # Ижил бичвэр + дууг дахин илгээхгүй (F0 тэмдэгт хэмнэнэ)
    mp = os.path.join(out, "manifest.json")
    old = json.load(open(mp, encoding="utf-8")) if os.path.exists(mp) else {}
    cred, files = None, {}
    for f, t, v in jobs:
        h = hashlib.sha1(f"{v}|{t}".encode()).hexdigest()[:12]
        path = os.path.join(out, f)
        if old.get("files", {}).get(f, {}).get("hash") != h or not os.path.exists(path):
            cred = cred or credential()
            synth(t, v, path, cred)
        files[f] = {"hash": h, "voice": v, "spoken": t, "sec": round(seconds(path), 3)}
        print(f"  {f} {files[f]['sec']:.1f}с")
    json.dump({"say": say, "files": files}, open(mp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(sys.argv[1:])
