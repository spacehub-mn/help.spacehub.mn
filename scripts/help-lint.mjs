#!/usr/bin/env node
// help-lint.mjs — docs/ доторх хуудсыг гарын авлагын загварт тулгана (help_architecture.md).
// Зөвхөн уншина. Алдаа (E) байвал exit 1 — build-д хаалт болгож болно; анхааруулга (W), мэдээлэл (I) exit-д нөлөөлөхгүй (--strict бол W ч унагана).
//
//   node scripts/help-lint.mjs                       # бүх шалгалт (хуучралт: --ref өгөөгүй бол локал deploy-log-ийн сүүлийн Blazor commit)
//   node scripts/help-lint.mjs --no-git              # Netlify build г.м. кодын репо байхгүй орчинд
//   node scripts/help-lint.mjs --repo <кодын репо> --ref origin/master   (анхдагч зам: scripts/local-paths.cjs)
//   node scripts/help-lint.mjs --json | --strict | --docs <хавтас>
//
// Дүрмүүд:
//   E-fm      frontmatter: type (зөвшөөрөгдсөн), roles (хоосон биш), updated (YYYY-MM-DD), verified_commit (hex 7+)
//   E-h1      H1 яг нэг (code block-ийн гадна)
//   W-steps   сургалт/заавар/асуудал хуудсанд дугаартай алхам (1. 2.) байх — дэд дугаарыг plugin тавина
//   E-h1first H1 нь frontmatter-ийн дараах эхний мөр (өмнө нь <!-- --> байвал гарчиг файлын нэрээр гарна)
//   W-aud     H1-ийн дараах «> …» мөрөнд хэнд зориулсан нь (🏢/🏠/👔/🧮)
//   W-rel     «## 🔗 Холбоотой» хэсэг (TYPES_NEED_REL төрөлд)
//   W-term    хуучирсан/буруу нэр томьёо (scripts/help-lint.terms.json)
//   W-q       ❔ (батлагдаагүй) MAX_Q-ээс олон
//   E-pii     харилцагчийн нэр (ЛОКАЛ (дотоод)); W-pii 6 оронтой гэрээний дугаар маягийн тоо
//   W-gray    товчны хэсэгт «харагдана/харагдахгүй» — код нь ихэвчлэн саарал болгодог
//   W-order   жагсаалтын хуудас: Энэ юу вэ → Хэзээ хэрэглэх → Товчнууд → Түгээмэл асуулт
//   E-imgmap  зураг дээрх тэмдэг доорх текстэд алга (W-imgmap: текстийн дугаар зураг дээр алга); E-img8 > 8 тэмдэг; W-imgcap «Зураг N.» алга
//   E-imgstep нэг хэсэгт жагсаалт дахин 1-ээс эхэлж ижил дугаар 2 удаа гарсан, зураг дээр тэр дугаар тэмдэгтэй (тэмдэггүй бол W-imgstep)
//   E-img     ![…](/img/…) файл static/-д алга (build-д мөн унана); W-img: alt хоосон, эсвэл заавар/асуудал/сургалт хуудсанд зураг огт алга (HELP_PLAN §11)
//   E-spell   ө/ү-г о/у болгож бичсэн үг («оорчлох», «толбор») — хэрэглэгчид харагдах бичвэрт
//   W-tech    өгүүлбэр доторх кодын/дотоод нэр томьёо (ListView, ObjectSpace, deploy…); W-long 20-оос урт өгүүлбэр
//   W-stale   verified_commit-оос хойш хуудасны иш татсан кодын файл өөрчлөгдсөн
//   W-group   гэрээний бүлгийн ▼ цэсэнд орсон товчийг тэр хэсэгт бүлгийн нэргүй бичсэн (кодын репо хэрэгтэй)
//   I-legacy  2023 оны загваргүй хуудас (frontmatter-гүй) — тоолно, алдаа биш
//   I-draft   ноорог хуудсыг REF-д ороогүй commit-оор тулгасан — W-stale-ийн оронд, алдаа биш
//   I-tur     imgmap_skip-ийн «ТҮР …» (том/жижиг үсэг хамаагүй) шалтгаантай алхам (түр алгасалт) — хуудас, алхмын тоог хураангуйд харуулна
//   E-internal нийтийн репод гарах ёсгүй: нууц, холболтын мөр, дотоод IP, кодын файл:мөр, дотоод зам, локал жагсаалтын нэр (тайлбар, changelog-д ч)
//   W-fmcomment frontmatter-ийн «# …» мөр (GitHub дээр уншигдана)
//   W-comment1 H1-ийн дараах эхний блок <!-- --> (meta description болно); W-comment бусад тайлбар — нотолгоо = --evidence локал хавтас
//   W-imgskip frontmatter imgmap_skip «<алхам> <шалтгаан> · …» — зурагт гарахгүй алхам (хадгалсны дараа, PII); шалтгаангүй бол анхааруулна
//   W-contact 8 оронтой утас (tel:-ээс бусад), имэйл (@spacehub.mn-ээс бусад), регистрийн дугаар
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { APP_MD, toAppMd } from "./app-md.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const NO_GIT = args.includes("--no-git");
const STRICT = args.includes("--strict");
const AS_JSON = args.includes("--json");
const localPath = createRequire(import.meta.url)("./local-paths.cjs");
const REPO = opt("--repo", localPath("codeRepo"));
// Анхдагч REF = продод байгаа commit (локал deploy-log-ийн сүүлийн амжилттай Blazor мөр); олдохгүй бол origin/master
function deployRef() {
  const f = process.env.HELP_DEPLOY_LOG || findUp(join(".claude", "agent-ops", "deploy-logs", "deploy-log.md"));
  if (!f) return "";
  const rows = readFileSync(f, "utf8").split(/\r?\n/).filter((l) => /\|\s*Blazor\s*\|\s*✅/.test(l));
  return (rows.at(-1)?.split("|")[2] ?? "").trim();
}
const REF = opt("--ref", "") || deployRef() || "origin/master";
const APP_REPO = opt("--app-repo", localPath("appRepo"));
const DOCS = opt("--docs", join(ROOT, "docs")); // тестэд өөр хавтас

const TYPES = ["nuur", "ehleh", "surgalt", "zaavar", "asuudal", "oilgolt", "lavlah", "hab"];
const TYPES_NEED_REL = ["surgalt", "zaavar", "asuudal", "oilgolt", "lavlah"];
const TYPES_NEED_IMG = ["surgalt", "zaavar", "asuudal"];
const STATIC = join(DOCS, "..", "static");
const AUDIENCE = /[🏢🏠👔🧮]/u;
const MAX_Q = 5;
// E-spell: ө/ү-г о/у болгож бичсэн түгээмэл үг (хайлтын хувилбар хэрэглэгчид харагдсан — 10-27)
const SPELL_RE = /(?<!\p{L})(оорчл\p{L}*|толбор\p{L}*|тулбур\p{L}*|турээс\p{L}*|хонгол\p{L}*|оноод\p{L}*|одроос|одрийн|оорийн|унэ|унийн|шуулт\p{L}*|омнох\p{L}*|уйлчилгээ\p{L}*|буртг\p{L}*|гуйлгээ\p{L}*|хуснэгт\p{L}*)(?!\p{L})/gu;
// W-tech: өгүүлбэр доторх кодын/дотоод нэр томьёо (дэлгэц дээрх цэс, таб, товчны нэр биш — 10-27 17:2x залруулга)
// 10-27 18:4x: өгүүлбэрийн «owner» → «байгууллага»; дэлгэцийн эрхийн нэр «Owner» (хашилттай), /owner/ зам зөвшөөрөгдөнө
const OWNER_RE = /(?<![\p{L}\w/.«-])owner(?![\w/»])/iu;
const techOf = (seen) => [
  ...TECH.filter((w) => new RegExp(`(?<![\\p{L}\\w])${w}(?![\\p{L}\\w])`, "iu").test(seen)),
  // «…» доторх дэлгэцийн бичвэр (мессеж, товчны нэр) — яг дэлгэц дээрхээрээ үлдэнэ
  ...(OWNER_RE.test(seen.replace(/«[^»\n]*»/g, " ")) ? ["owner → байгууллага"] : []),
];
const TECH = ["toolbar", "popup", "TargetObjectsCriteria", "ObjectSpace", "ListView", "DetailView", "nested", "PreBill", "FIFO", "refno", "hash", "migration", "deploy", "controller", "XAF", "XPO", "Hangfire", "cron", "commit", "null", "Oid", "enum", "SQL", "backend", "API"];
const termsFile = join(ROOT, "scripts", "help-lint.terms.json");
const TERMS = existsSync(termsFile) ? JSON.parse(readFileSync(termsFile, "utf8")) : [];

const walk = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : /\.mdx?$/.test(n) ? [p] : [];
});

const git = (...a) => execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const gitOk = !NO_GIT && existsSync(REPO) && (() => { try { git("rev-parse", "--verify", REF); return true; } catch { return false; } })();
const changedCache = new Map();
const changedSince = (sha) => {
  if (!changedCache.has(sha)) {
    try {
      changedCache.set(sha, new Set(git("diff", "--name-only", `${sha}..${REF}`).split("\n").filter(Boolean).map((f) => f.split("/").pop())));
    } catch {
      changedCache.set(sha, null); // commit олдсонгүй
    }
  }
  return changedCache.get(sha);
};

// W-group (11-02): гэрээний ихэнх товч 10-31-нээс 5 бүлгийн ▼ цэсэнд орсон — бүлэггүй бичвэл уншигч toolbar-аас олохгүй.
// Бүлэг, шинэ нэрийг кодын ContractActionGroups.cs-ээс, нэр солигдоогүй товчны нэрийг action-ы Caption-аас уншина.
// Прод дээр бүлэггүй харагдсан (11-01 дэлгэц) параметртэй товч — шалтгаан тодрох хүртэл алгасна.
// «Хаах» нь ихэвчлэн цонхны хаах товч тул нэрээр нь алгасна.
const GROUP_SKIP = new Set(["Contract.AddBeginBalance", "Contract.CollBeginBalanceManual", "Contract.ContactCodeChange"]);
const GROUP_SKIP_NAMES = new Set(["Хаах"]);
const groupedActions = (() => {
  if (!gitOk) return [];
  let src;
  try { src = git("show", `${REF}:Spacehub.Module/Helper/ContractActionGroups.cs`); } catch { return []; }
  const renames = new Map([...src.matchAll(/\["([^"]+)"\]\s*=\s*new\("([^"]+)"/g)].map((m) => [m[1], m[2]]));
  const groups = [...src.matchAll(/new\("\w+",\s*"([^"]+)",\s*"[^"]*",\s*new\[\]\s*\{([^}]*)\}/g)]
    .map((m) => ({ caption: m[1], ids: [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]).filter((id) => !GROUP_SKIP.has(id)) }));
  const need = groups.flatMap((g) => g.ids).filter((id) => !renames.has(id));
  const captions = new Map();
  let files = [];
  try { files = git("grep", "-l", "-F", ...need.flatMap((id) => ["-e", `"${id}"`, "-e", ` ${id.split(".").pop()}(`]), REF, "--", "*.cs").split("\n").filter(Boolean); } catch { /* олдоогүй */ }
  for (const f of files) {
    const t = git("show", f); // «REF:зам»
    for (const m of t.matchAll(/new\s+\w*Action\s*\(\s*this\s*,\s*"([^"]+)"/g)) {
      const c = t.slice(m.index, m.index + 900).match(/Caption\s*=\s*"([^"]+)"/);
      if (c && !captions.has(m[1])) captions.set(m[1], c[1]);
    }
    for (const m of t.matchAll(/this\.(\w+)\.Id\s*=\s*"([^"]+)"/g)) {
      const c = t.match(new RegExp(`this\\.${m[1]}\\.Caption\\s*=\\s*"([^"]+)"`));
      if (c && !captions.has(m[2])) captions.set(m[2], c[1]);
    }
    for (const m of t.matchAll(/^[ \t]*\[Action\(([\s\S]*?)\)\]\s*public\s+[\w<>]+\s+(\w+)\s*\(/gm)) {
      const c = m[1].match(/Caption\s*=\s*"([^"]+)"/), cls = [...t.slice(0, m.index).matchAll(/class\s+(\w+)/g)].pop();
      if (c && cls && !captions.has(`${cls[1]}.${m[2]}`)) captions.set(`${cls[1]}.${m[2]}`, c[1]);
    }
  }
  return groups.flatMap((g) => g.ids.map((id) => ({ name: renames.get(id) ?? captions.get(id), group: g.caption })).filter((a) => a.name && !GROUP_SKIP_NAMES.has(a.name)));
})();

// shots.json: зургийн id → тэмдгүүд (n = доорх текстийн дугаар)
const shotsFile = opt("--shots", join(ROOT, "scripts", "shots", "shots.json"));
// app-shots.json: гар утасны аппын зураг (annotate.cjs) — ижил дүрмээр шалгана
const appShotsFile = join(dirname(shotsFile), "app-shots.json");
const SHOTS = new Map([shotsFile, appShotsFile].filter(existsSync).flatMap((f) => JSON.parse(readFileSync(f, "utf8"))).map((s) => [s.id, s]));
const { META } = createRequire(import.meta.url)("../plugins/step-numbers.js");

/**
 * plugins/step-numbers.js-тэй ижил дугаарлалтаар зураг бүрийн доорх дугаарыг цуглуулна:
 * «Товчнууд» хэсэгт — дараагийн зураг/H2 хүртэлх товч, дэд товчны гарчиг (1, 1.1 …);
 * алхмын хэсэгт — дараагийн гарчиг хүртэлх дугаартай жагсаалт (1.1, 1.2 …).
 */
function imageSections(body, type) {
  if (!type || ["oilgolt", "nuur", "hab", "ehleh"].includes(type)) return [];
  const lines = body.replace(/```[\s\S]*?```/g, "").replace(/<!--[\s\S]*?-->/g, "").split("\n");
  const items = []; // { line, label, kind: "h" | "li" | "img", id }
  let step = "", h2 = 0, inButtons = false, btn = 0, sub = 0, li = 0, inList = false, listStart = 1, listIdx = 0;
  const isGroup = (i) => { const j = lines.findIndex((l, k) => k > i && /^#{1,4} /.test(l)); return j > 0 && /^#### /.test(lines[j]); };
  lines.forEach((l, i) => {
    const img = /^!\[[^\]]*\]\(\/img\/([^)\s]+)\.webp\)/.exec(l);
    if (img) return items.push({ line: i, kind: "img", id: img[1] });
    const h = /^(#{2,4}) (.+)$/.exec(l);
    if (h) {
      const t = h[2].trim(); li = 0; inList = false;
      if (h[1] === "##") { inButtons = /^Товчнууд/u.test(t); btn = 0; step = META.test(t) ? "" : String(++h2); if (step) items.push({ line: i, label: step, kind: "h2" }); return; }
      if (h[1] === "###" && inButtons) { if (/^Бусад/u.test(t) || !(t.startsWith("«") || isGroup(i))) { step = ""; return; } step = String(++btn); sub = 0; return items.push({ line: i, label: step, kind: "h" }); }
      if (h[1] === "####" && inButtons && btn) { step = `${btn}.${++sub}`; return items.push({ line: i, label: step, kind: "h" }); }
      return;
    }
    const num = /^(\d+)\. \S/.exec(l);
    // plugins/step-numbers.js-тэй ижил: жагсаалт бүр эхний мөрийн дугаараас (start) тоологдоно — data-n = алхам.(start + k)
    // CommonMark: 1-ээс бусад дугаартай мөр параграфыг тасалдаггүй — өмнөх мөр хоосон биш бол жагсаалт биш
    const paraNum = num && !inList && +num[1] !== 1 && i > 0 && lines[i - 1].trim() !== "";
    if (num && step && !inButtons && !paraNum) {
      if (!inList) { listStart = +num[1]; listIdx = 0; } else listIdx++;
      inList = true;
      items.push({ line: i, label: `${step}.${listStart + listIdx}`, kind: "li" });
    } else if (l.trim() && !/^\s/.test(l)) inList = false; // догол мөргүй бичвэр = жагсаалт дууссан
  });
  return items.filter((x) => x.kind === "img").map((img) => {
    const k = items.indexOf(img);
    const next = items.slice(k + 1);
    const end = next.findIndex((x) => x.kind === "img" || x.kind === "h2");
    const span = end < 0 ? next : next.slice(0, end);
    const want = span.some((x) => x.kind === "h") ? "h" : "li";
    // Бүлгийн гарчгийн (### 2.) доорх зураг = зөвхөн тэр бүлгийн товч (2.1, 2.2 …)
    // Бүлгийн дундах зураг (өмнөх нь 1.8) ч мөн тэр бүлэг (1.) — дараагийн бүлгийн гарчиг (2) орохгүй
    const prev = items[k - 1];
    const base = prev && prev.kind === "h" ? prev.label.split(".")[0] + "." : "";
    const group = base && span.some((x) => x.label.startsWith(base)) ? base : "";
    const caption = lines.slice(img.line + 1).find((l) => l.trim()) ?? "";
    // Тойм зураг: эхний ## бүлгээс өмнө, доор нь алхамгүй → тэмдэг = бүлгийн дугаар (1, 2 …)
    if (!span.length && !items.slice(0, k).some((x) => x.kind === "h2")) return { id: img.id, caption, labels: next.filter((x) => x.kind === "h2").map((x) => x.label) };
    return { id: img.id, caption, labels: span.filter((x) => x.kind === want && x.label.startsWith(group)).map((x) => x.label) };
  });
}

// Харилцагчийн нэрсийн ЛОКАЛ жагсаалт (репод байхгүй; CI-д файл алга бол шалгахгүй)
// Зам: --pii, эсвэл HELP_PII_FILE, эсвэл одоогийн хавтаснаас дээш «.claude/agent-ops/help_pii_names.txt»-ыг хайна
function findUp(rel) { let d = process.cwd(); for (let i = 0; i < 8; i++) { const f = join(d, rel); if (existsSync(f)) return f; const up = dirname(d); if (up === d) break; d = up; } return ""; }
const piiFile = opt("--pii", process.env.HELP_PII_FILE || findUp(join(".claude", "agent-ops", "help_pii_names.txt")));
const PII_NAMES = existsSync(piiFile) ? readFileSync(piiFile, "utf8").split(String.fromCharCode(10)).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")) : [];
// Жагсаалт олдохгүй бол нэрийн шалгалт дуугүй алгасагдахгүй — анхааруулна (CI/Netlify-д --no-git үед хэвлэхгүй)
if (!PII_NAMES.length && !process.argv.includes("--no-git")) console.error("⚠️ PII нэрийн жагсаалт олдсонгүй — нэрийн шалгалт хийгдээгүй (--pii <файл> эсвэл HELP_PII_FILE)");
// Кодын нотолгоо (хуудас бүрийн тайлбар) репод биш, ЛОКАЛ хавтаст: <хавтас>/docs/<зам>.md — W-stale эндээс иш татсан файлыг уншина
const EVID = opt("--evidence", process.env.HELP_EVIDENCE_DIR || findUp(join(".claude", "agent-ops", "help-evidence")));
if (!EVID && !NO_GIT) console.error("⚠️ Нотолгооны хавтас олдсонгүй — хуучралтыг зөвхөн хуудасны бичвэрээр шалгана (--evidence <хавтас> эсвэл HELP_EVIDENCE_DIR)");
// Нийтэд гаргахгүй нэрс (хаалттай репо, ажлын нэр) — ЛОКАЛ жагсаалт, нэг мөрөнд нэг
const privFile = opt("--private-terms", process.env.HELP_PRIVATE_TERMS || findUp(join(".claude", "agent-ops", "help_private_terms.txt")));
const PRIVATE_TERMS = existsSync(privFile) ? readFileSync(privFile, "utf8").split(String.fromCharCode(10)).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")) : [];
// E-internal: нийтийн репод гарах ёсгүй хэв маяг (тайлбар дотор ч) — нууц, холболт, дотоод IP, кодын мөр, дотоод зам
const INTERNAL = [
  [/\bAKIA[0-9A-Z]{12,}|\bgh[pousr]_[A-Za-z0-9]{20,}|\bsk-[A-Za-z0-9]{16,}|\bxox[abpr]-|\beyJ[\w-]{8,}\.[\w-]{8,}\.|BEGIN [A-Z ]*PRIVATE KEY/, "нууц түлхүүр"],
  [/\b(password|pwd|secret|token|apikey)\s*[:=]\s*["']?[^\s"']{6,}/i, "нууц үг/түлхүүр"],
  [/Data Source=|Initial Catalog=|User Id=/i, "холболтын мөр"],
  [/(?<![\d.])(192\.168|10\.\d{1,3}|172\.(1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}(?![\d.])/, "дотоод IP"],
  [/\.(cs|razor|dart):\d+|xafml:\d+/, "кодын файл:мөр"],
  [/agent-ops|\bresearch\/|\bmemory\/|claude\.ai\/code\/session/, "дотоод зам"],
  [/[CE]:[\\/](Users|Projects)/, "локал зам"],
  // «Дотоод 0» (11-07): ажлын session-ий нэр, дотоод даалгаврын код (T95), дотоод нотолгооны мөр
  [/\b(?:CEO|COACH|QA_Manager|Help_Spacehub|(?:Aud|Srv|Crm|Fix|Dev|Sh|NZ|Ks)_[A-Za-z]\w*)\b/, "session нэр"],
  [/\bT\d{2,3}\b/, "дотоод даалгаврын код"],
  [/Нотолгоо:|\baudit\//, "дотоод нотолгоо"],
];
// commit SHA (богино 7–12 эсвэл бүтэн 40 hex, үсэг ба цифр хоёулаа) — frontmatter verified_commit, UUID (Netlify сайтын id),
// 32 hex (Algolia-гийн нийтийн хайлтын түлхүүр, App Store badge hash) хамаарахгүй
const SHA_RE = /(?<![\w#/.-])(?=[0-9a-f]*[a-f])(?=[0-9a-f]*\d)(?:[0-9a-f]{40}|[0-9a-f]{7,12})(?!\w|-[0-9a-f])/; // «14829ae-ийн» (монгол нөхцөл) ч барина
const internalHits = (text) => {
  const t = text.replace(/^verified_commit:.*$/gm, "").replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "");
  return [...INTERNAL, [SHA_RE, "commit SHA"]].filter(([re]) => re.test(t)).map(([re, what]) => `${what}: «${t.match(re)[0].slice(0, 24)}»`);
};
const firstBlock = (b) => (b.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p && !/^# \S[^\n]*$/.test(p))[0] ?? "");
// --check-text <файл|->: commit мессеж, PR тайлбарыг E-internal-аар шалгана (commit-msg hook, PR үүсгэхийн өмнө)
if (args.includes("--check-text")) {
  const src = opt("--check-text", "-") || "-"; // сүүлийн аргумент бол stdin
  const text = readFileSync(src === "-" ? 0 : src, "utf8");
  const hits = [...internalHits(text), ...PRIVATE_TERMS.filter((t) => text.includes(t)).map((t) => `дотоод нэр «${t}»`)];
  for (const h of hits) console.log(`  ❌ E-internal: ${h} — нийтийн репод бүү бич`);
  console.log(hits.length ? `❌ ${hits.length}` : "✅ 0");
  process.exit(hits.length ? 1 : 0);
}
// --check-commits <range>: push/QA-аас өмнө шинэ commit мессеж бүрийг шалгана (жнь origin/main..HEAD). Түүхэн commit-ийг хөндөхгүй.
if (args.includes("--check-commits")) {
  const range = opt("--check-commits", "origin/main..HEAD") || "origin/main..HEAD";
  const gitRoot = opt("--git-root", ROOT); // анхдагч: help репо өөрөө; тестэд түр репо
  const log = execFileSync("git", ["-C", gitRoot, "log", "--format=%h%x00%B%x01", range], { encoding: "utf8" });
  let bad = 0;
  for (const rec of log.split("\x01").map((s) => s.trim()).filter(Boolean)) {
    const [h, msg = ""] = rec.split("\x00");
    const hits = [...internalHits(msg), ...PRIVATE_TERMS.filter((t) => msg.includes(t)).map((t) => `дотоод нэр «${t}»`)];
    if (hits.length) { bad++; console.log(h); for (const x of hits) console.log(`  ❌ E-internal: ${x} — commit мессежид бүү бич`); }
  }
  console.log(bad ? `❌ ${bad} commit` : "✅ 0");
  process.exit(bad ? 1 : 0);
}
const results = [];
for (const file of walk(DOCS)) {
  const rel = relative(join(DOCS, ".."), file).replace(/\\/g, "/");
  const raw = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const issues = [];
  const add = (level, rule, msg, extra) => issues.push({ level, rule, msg, ...extra });

  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  const fm = {};
  if (fmMatch) {
    for (const l of fmMatch[1].split("\n")) {
      const m = l.match(/^([a-z_]+):\s*(.*)$/);
      if (m) fm[m[1]] = m[2].trim();
    }
  }
  const legacy = !fm.type;
  // Code block болон HTML тайлбарыг хасаад бичвэрийг шалгана
  const body = raw.slice(fmMatch ? fmMatch[0].length : 0);
  const prose = body.replace(/```[\s\S]*?```/g, "").replace(/<!--[\s\S]*?-->/g, "");
  const evidFile = EVID ? join(EVID, rel) : "";
  const comments = [...raw.matchAll(/<!--([\s\S]*?)-->/g)].map((m) => m[1]).join("\n") + (evidFile && existsSync(evidFile) ? "\n" + readFileSync(evidFile, "utf8") : "");

  if (legacy) {
    add("I", "I-legacy", "2023 оны загваргүй хуудас (frontmatter type алга)");
  } else {
    if (!TYPES.includes(fm.type)) add("E", "E-fm", `type «${fm.type}» зөвшөөрөгдөөгүй (${TYPES.join("/")})`);
    if (!fm.roles || /^\[\s*\]$/.test(fm.roles)) add("E", "E-fm", "roles алга эсвэл хоосон");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fm.updated ?? "")) add("E", "E-fm", `updated «${fm.updated ?? ""}» YYYY-MM-DD биш`);
    if (!/^[0-9a-f]{7,40}$/.test(fm.verified_commit ?? "")) add("E", "E-fm", `verified_commit «${fm.verified_commit ?? ""}» hex биш`);
  }

  const h1 = prose.split("\n").filter((l) => /^# \S/.test(l));
  if (h1.length !== 1 && !(legacy && h1.length === 0 && fm.title)) add(legacy ? "W" : "E", "E-h1", `H1 ${h1.length} ширхэг (1 байх ёстой)`);
  // H1-ийн өмнө <!-- --> эсвэл бичвэр байвал Docusaurus гарчгийг файлын нэрээр («contract») гаргана
  const firstLine = body.split("\n").find((l) => l.trim() !== "");
  if (h1.length === 1 && !fm.title && !/^# \S/.test(firstLine ?? "")) add(legacy ? "W" : "E", "E-h1first", "H1 frontmatter-ийн дараах эхний мөр биш (гарчиг файлын нэрээр гарна)");

  if (!legacy) {
    const lines = prose.split("\n");
    const i = lines.findIndex((l) => /^# \S/.test(l));
    const next = lines.slice(i + 1).find((l) => l.trim() !== "");
    if (!next?.startsWith(">") || !AUDIENCE.test(next)) add("W", "W-aud", "H1-ийн дараа «> 🏢 …» (хэнд, хаана) мөр алга");
    if (TYPES_NEED_REL.includes(fm.type) && !/^## 🔗 Холбоотой/m.test(prose)) add("W", "W-rel", "«## 🔗 Холбоотой» хэсэг алга");
    // Алхмыг «1. 2.» жагсаалтаар бич — plugins/step-numbers.js 1.1, 1.2 болгоно (10-27 дэд дугаар)
    if (["surgalt", "zaavar", "asuudal"].includes(fm.type) && !/^\d+\. \S/m.test(prose)) add("W", "W-steps", "дугаартай алхам (1. 2. …) алга — алхмыг дугаартай жагсаалтаар бич");
  }

  for (const { bad, good, note, scope } of TERMS) {
    if (scope && !rel.includes(scope)) continue; // жишээ нь вэбийн нэр томьёо апп хуудсанд хамаарахгүй
    if (prose.includes(bad)) add("W", "W-term", `«${bad}» → «${good}»${note ? ` (${note})` : ""}`);
  }

  const imgs = [...prose.matchAll(/!\[([^\]]*)\]\((\/img\/[^)\s]+)\)/g)];
  for (const [, alt, url] of imgs) {
    if (!existsSync(join(STATIC, url))) add("E", "E-img", `${url} static/-д алга`);
    if (!alt.trim()) add("W", "W-img", `${url} alt текст хоосон`);
  }
  if (!legacy && TYPES_NEED_IMG.includes(fm.type) && !imgs.length) add("W", "W-img", "дэлгэцийн зураг алга (scripts/shots/shots.json-д нэм)");

  // Хуудасны тогтсон бүтэц (чартер §4): Энэ юу вэ → Хэзээ хэрэглэх → Товчнууд → … → Түгээмэл асуулт (жагсаалтын хуудас)
  if (rel.includes("/list/") && !legacy) {
    const h2s = [...prose.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
    const want = ["Энэ юу вэ", "Хэзээ хэрэглэх", "Товчнууд", "Түгээмэл асуулт"];
    const at = want.map((w) => h2s.findIndex((h) => h.startsWith(w)));
    if (at.includes(-1) || at.some((v, i) => i && v < at[i - 1]))
      add("W", "W-order", `бүтэц: ${want.join(" → ")} дарааллаар байх (одоо: ${want.filter((_, i) => at[i] < 0).map((w) => w + " алга").join(", ") || "дараалал буруу"})`);
  }

  // Нууцлал (хяналт 10-27: help репо PUBLIC — <!-- --> тайлбар ч GitHub дээр уншигдана): харилцагчийн нэр, гэрээний дугаар
  for (const n of PII_NAMES) if (raw.includes(n)) add("E", "E-pii", `харилцагчийн нэр «${n}» (тайлбарт ч бүү бич — «owner N» гэж бич)`);
  // тайлбар (<!-- -->) GitHub дээр уншигдана, эхний блок бол meta description болно → нотолгоог локал хавтаст бич
  for (const h of internalHits(raw)) add("E", "E-internal", `${h} — нийтийн репод бүү бич`);
  for (const t of PRIVATE_TERMS) if (raw.includes(t)) add("E", "E-internal", `дотоод нэр «${t}» — нийтийн репод бүү бич`);
  if (fmMatch && /^\s*#/m.test(fmMatch[1])) add("W", "W-fmcomment", "frontmatter-ийн # тайлбар GitHub дээр уншигдана — нотолгоог локал хавтаст (--evidence) бич");
  if (/^<!--/.test(firstBlock(body))) add("W", "W-comment1", "H1-ийн дараах эхний блок тайлбар — хуудасны тайлбар (meta description) болж гарна");
  else if (/<!--(?!\s*truncate\s*-->)/.test(body)) add("W", "W-comment", "HTML тайлбар GitHub дээр уншигдана — нотолгоог локал хавтаст (--evidence) бич");
  const phones = raw.replace(/tel:\+?\d+/g, "").match(/(?<![\d\w.#/-])[5-9]\d{7}(?![\d\w])/g); // гар утас 8/9, суурин 7, шинэ цуврал 5/6
  if (phones) add("W", "W-contact", `утас маягийн 8 оронтой тоо: ${phones.length}`);
  const mails = (raw.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? []).filter((m) => !/@spacehub\.mn$/i.test(m));
  if (mails.length) add("W", "W-contact", `имэйл: ${mails.length} (@spacehub.mn-ээс бусад)`);
  if (/(?<![\p{L}])[А-ЯӨҮ]{2}\d{8}(?!\d)/u.test(raw)) add("W", "W-contact", "регистрийн дугаар маягийн бичвэр");
  const cno = raw.replace(/^verified_commit:.*$/m, "").match(/(?<![\w.#/-])(60|10|12|27|28)\d{4}(?![\w.])/g);
  if (cno) add("W", "W-pii", `6 оронтой гэрээний дугаар маягийн тоо: ${[...new Set(cno)].slice(0, 3).join(", ")} — харилцагчийн гэрээ бол «нэг гэрээ» гэж бич`);
  // Товч нуугддаггүй, саарал болдог (TargetObjectsCriteria) — «харагдана/харагдахгүй» гэж бичих нь давтагдсан алдаа (хяналт 10-27)
  if (rel.includes("/list/")) {
    const btn = (prose.split(/^## Товчнууд.*$/m)[1] || "").split(/^## /m)[0];
    const bad = btn.split(String.fromCharCode(10)).filter((l) => /(харагдахгүй|л харагдана|дээр харагдана|үед харагдана)/.test(l) && /(Сонголт|Хэзээ|товч)/.test(l) && !/саарал|^Товчны нэр/.test(l.trim()));
    if (bad.length) add("W", "W-gray", `товч «харагдана/харагдахгүй» ${bad.length} мөр — ихэнх товч нуугддаггүй, «саарал (дарагдахгүй)» гэж бич: «${bad[0].trim().slice(0, 60)}…»`);
  }

  // Үг үсэг, найруулга (10-27, чартер «Үг үсгийн алдаа — суурь хяналт»): хэрэглэгчид харагдах бичвэр — inline код, холбоосын URL, зургийн замгүй
  // frontmatter title/sidebar_label/description нь цэс, хайлт, хуудасны толгойд харагдана; keywords харагдахгүй (хайлтын туслах) тул хамрахгүй
  const fmSeen = ["title", "sidebar_label", "description"].map((k) => fm[k]).filter(Boolean).join("\n");
  const seen = fmSeen + "\n" + prose.replace(/`[^`\n]*`/g, " ").replace(/\]\([^)]*\)/g, "]");
  const spell = [...new Set([...seen.toLowerCase().matchAll(SPELL_RE)].map((m) => m[1]))];
  if (spell.length) add("E", "E-spell", `ү/ө-гүй бичсэн үг: ${spell.slice(0, 5).join(", ")} — «ө», «ү»-гээр зас`);
  const tech = techOf(seen);
  if (tech.length) add("W", "W-tech", `дотоод/кодын нэр томьёо: ${tech.slice(0, 5).join(", ")} — дэлгэц дээрх нэрээр эсвэл энгийн үгээр бич`);
  const long = seen.split(/(?<=[.!?;])\s+|\n/).filter((s) => !/^\s*[|!<>#]/.test(s) && s.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length > 20);
  if (long.length) add("W", "W-long", `20-оос урт өгүүлбэр ${long.length}: «${long[0].trim().slice(0, 50)}…» — хуваа`);

  // Зураг ↔ текст 1:1 (10-27, чартер «Агуулгын ойлгомж»): тэмдэг бүр доорх дугаартай мөртэй, ≤ 8 тэмдэг, «Зураг N.» тайлбар
  const type = fm.type || (/(^|\/)owner\/[^/]+\.mdx?$/.test(rel) && !/index\.mdx?$/.test(rel) ? "zaavar" : undefined);
  // imgmap_skip: зурагт гарахгүй алхам (хадгалсны дараах дэлгэц, PII) — «2.5 хадгалсны дараа · 3.5 PII», шалтгаан заавал
  const skip = new Map();
  for (const part of (fm.imgmap_skip ?? "").replace(/^["']|["']$/g, "").split(/\s*·\s*/).filter(Boolean)) {
    const m = part.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
    if (m) skip.set(m[1], m[2]); else add("W", "W-imgskip", `imgmap_skip «${part}» — «<алхам> <шалтгаан>» хэлбэрээр бич`);
  }
  const seenLabels = new Set();
  for (const sec of imageSections(body, type)) {
    sec.labels.forEach((n) => seenLabels.add(n));
    const shot = SHOTS.get(sec.id);
    if (!shot) continue;
    const marks = [...new Set(shot.marks.map((m) => m.n).filter(Boolean))];
    if (shot.marks.length > 8) add("E", "E-img8", `${sec.id}: ${shot.marks.length} тэмдэг (≤ 8) — зургийг хуваа`);
    if (!/^\*Зураг \d+\. /.test(sec.caption)) add("W", "W-imgcap", `${sec.id}: доор нь «*Зураг N. …*» тайлбар алга`);
    const extra = marks.filter((n) => !sec.labels.includes(n));
    const missing = sec.labels.filter((n) => !marks.includes(n) && !skip.has(n));
    if (extra.length) add("E", "E-imgmap", `${sec.id}: зураг дээр ${extra.join(", ")} байгаа ч доорх текстэд алга`);
    if (missing.length) add("W", "W-imgmap", `${sec.id}: текстийн ${missing.join(", ")} зураг дээр тэмдэггүй (цонх доторх алхам бол тусдаа зураг)`);
    // E-imgstep (QA 10-31, batch48 1.7): нэг хэсэгт жагсаалт дахин 1-ээс эхэлбэл хуудсан дээр ижил дугаар 2 удаа гарна —
    // зураг дээрх тэмдэг аль алхам болох нь тодорхойгүй. Тэмдэгтэй давхардал = E, тэмдэггүй = W.
    const dup = [...new Set(sec.labels.filter((n, i) => sec.labels.indexOf(n) !== i))];
    const dupMarked = dup.filter((n) => marks.includes(n));
    if (dupMarked.length) add("E", "E-imgstep", `${sec.id}: зураг дээрх ${dupMarked.join(", ")} хуудсан дээр 2+ алхамд гарна (жагсаалт дахин 1-ээс эхэлсэн) — нэг жагсаалт болго эсвэл дэд жагсаалтыг «-» болго`);
    else if (dup.length) add("W", "W-imgstep", `${sec.id}: алхмын дугаар ${dup.join(", ")} давхардсан (жагсаалт дахин 1-ээс эхэлсэн) — нэг жагсаалт болго`);
  }
  const unused = [...skip.keys()].filter((n) => !seenLabels.has(n));
  if (unused.length) add("W", "W-imgskip", `imgmap_skip ${unused.join(", ")} — текстэд ийм алхам алга (хуучирсан тэмдэглэгээ)`);
  // I-tur (11-02): «ТҮР …» шалтгаантай алгасалт = зураг авах боломжгүй байсан түр үе (эмулятор алга г.м.) — мартагдахгүйн тулд тоолно
  // «түр»/«Түр» ч мөн түр (QA 🟡 11-02); алхмын тоо = steps талбар (мессежээс уншихгүй)
  const tur = [...skip].filter(([, why]) => /^түр(\s|$)/i.test(why)).map(([n]) => n);
  if (tur.length) add("I", "I-tur", `түр алгассан алхам ${tur.length}: ${tur.join(", ")} — шалтгаан арилмагц зураг авч imgmap_skip-ээс хас`, { steps: tur.length });

  // W-group: товчийг дурдсан хэсэгт (гарчиг + дээд гарчгууд) бүлгийн дүрс огт алга.
  // «Хуучин нэр» мөр, бүтэн тод асуултын мөр (**«Сунгах» дарсан ч …**), зургийн тэмдгийн дугаараар заасан мөр (- **2.3** «…»),
  // «X» цонх (товчийг биш, нээгдсэн цонхыг заасан) алгасна.
  if (groupedActions.length && rel.startsWith("docs/owner/")) {
    const noGroup = [], heads = [];
    const vs = (s) => s.replace(/️/g, "");
    const secs = [];
    for (const l of prose.split("\n")) {
      const h = l.match(/^(#{1,6}) /);
      if (h) { heads.splice(h[1].length - 1); heads[h[1].length - 1] = l; secs.push({ ctx: heads.filter(Boolean).join("\n"), lines: [] }); }
      else (secs.at(-1) ?? secs[secs.push({ ctx: "", lines: [] }) - 1]).lines.push(l);
    }
    for (const s of secs) {
      const text = vs(s.ctx + "\n" + s.lines.join("\n"));
      for (const { name, group } of groupedActions) {
        if (!text.includes(`«${name}»`) || text.includes(vs(group.split(" ")[0]))) continue;
        const bare = (l) => l.includes(`«${name}»`) && !l.includes(`«${name}» цонх`) && !/[Хх]уучин нэр/.test(l)
          && !/^\*\*[^*].*\*\*$/.test(l.trim()) && !/^[-*] \*\*\d+\.\d+\*\*/.test(l.trim());
        if (s.lines.some(bare)) noGroup.push(`«${name}» → ${group} ▼`);
      }
    }
    if (noGroup.length) add("W", "W-group", `бүлгийн ▼ цэсэнд орсон товчийг бүлэггүй бичсэн ${noGroup.length}: ${[...new Set(noGroup)].slice(0, 3).join("; ")} — «${noGroup[0].split(" → ")[1]} → ${noGroup[0].split(" → ")[0]}» гэж бич`);
  }

  const q = (prose.match(/❔/g) ?? []).length;
  if (q > MAX_Q) add("W", "W-q", `❔ ${q} (>${MAX_Q}) — батлах эсвэл хасах`);

  // Гар утасны аппын хуудас (verified_repo: spacehub): commit нь Flutter аппын repo-д байх ёстой; хуучралтыг кодын репогоор шалгахгүй
  if (fm.verified_repo === "spacehub") {
    if (!NO_GIT && existsSync(APP_REPO) && /^[0-9a-f]{7,40}$/.test(fm.verified_commit ?? "")) {
      try { execFileSync("git", ["-C", APP_REPO, "cat-file", "-e", `${fm.verified_commit}^{commit}`], { stdio: "ignore" }); }
      catch { add("E", "E-fm", `verified_commit ${fm.verified_commit} аппын repo (spacehub)-д олдсонгүй`); }
    }
  } else if (gitOk && fm.verified_commit && /^[0-9a-f]{7,40}$/.test(fm.verified_commit)) {
    const changed = changedSince(fm.verified_commit);
    // Олдохгүй commit = нотолгоо шалгагдах боломжгүй (хяналт) → алдаа
    if (changed === null) add("E", "E-fm", `verified_commit ${fm.verified_commit} кодын репод олдсонгүй`);
    else {
      const cited = [...new Set([...comments.matchAll(/\b([A-Z][A-Za-z0-9.]+\.(?:cs|razor))\b/g)].map((m) => m[1]))]; // xafml хэт олон хуудсанд иш татагддаг — ViewId түвшинд help_impact шалгана
      const hit = cited.filter((c) => changed.has(c));
      // Ноорог хуудас (draft) нь REF-д ороогүй PR-ийн commit-оор тулгагдсан бол хуучралт биш — deploy-г хүлээнэ
      let ahead = false;
      if (fm.draft === true || fm.draft === "true") {
        // exit 1 = өвөг биш (ороогүй); өөр алдаа (128 — sha алга г.м.) бол W-stale-ийг нуухгүй
        try { git("merge-base", "--is-ancestor", fm.verified_commit, REF); } catch (e) { ahead = e.status === 1; }
      }
      if (hit.length && ahead) add("I", "I-draft", `${fm.verified_commit} нь ${REF}-д ороогүй (ноорог) — deploy-ийн дараа тулгана`);
      else if (hit.length) add("W", "W-stale", `${fm.verified_commit}..${REF}-д өөрчлөгдсөн: ${hit.join(", ")} — хуудсыг дахин тулга`);
    }
  }

  results.push({ file: rel, type: fm.type ?? null, questions: q, issues });
}

// Цэсийн бүлгийн нэр, generated-index тайлбар (_category_.json) мөн хэрэглэгчид харагдана (QA 10-27)
for (const file of readdirSync(DOCS, { recursive: true }).filter((n) => /_category_\.json$/.test(n)).map((n) => join(DOCS, n))) {
  const c = JSON.parse(readFileSync(file, "utf8"));
  const seen = [c.label, c.link?.title, c.link?.description].filter(Boolean).join(" ");
  const tech = techOf(seen);
  if (tech.length) results.push({ file: relative(join(DOCS, ".."), file).replace(/\\/g, "/"), type: "category", questions: 0, issues: [{ level: "W", rule: "W-tech", msg: `дотоод/кодын нэр томьёо: ${tech.join(", ")} — дэлгэц дээрх нэрээр эсвэл энгийн үгээр бич` }] });
}

// 🆕 Шинэ боломж (changelog/*.md) мөн хэрэглэгчид харагдана — бичвэрийн нэр томьёо (QA 10-28: «toolbar» алдагдсан)
const CHANGELOG = join(DOCS, "..", "changelog");
for (const file of existsSync(CHANGELOG) ? walk(CHANGELOG) : []) {
  const src = readFileSync(file, "utf8");
  const title = (src.match(/^title:\s*(.+)$/m) || [])[1] || "";
  const body = src.replace(/^---[\s\S]*?\n---/, "").replace(/<!--[\s\S]*?-->/g, " ").replace(/`[^`]*`/g, " ").replace(/\]\([^)]*\)/g, "]");
  const tech = techOf(`${title} ${body}`);
  const issues = tech.length ? [{ level: "W", rule: "W-tech", msg: `дотоод/кодын нэр томьёо: ${tech.join(", ")} — дэлгэц дээрх нэрээр эсвэл энгийн үгээр бич` }] : [];
  // ноорог (draft) ч нийтийн репод уншигдана — тайлбар доторх дотоод мэдээлэл мөн адил хориотой
  for (const h of internalHits(src)) issues.push({ level: "E", rule: "E-internal", msg: `${h} — нийтийн репод бүү бич` });
  for (const t of PRIVATE_TERMS) if (src.includes(t)) issues.push({ level: "E", rule: "E-internal", msg: `дотоод нэр «${t}» — нийтийн репод бүү бич` });
  if (/<!--(?!\s*truncate\s*-->)/.test(src)) issues.push({ level: "W", rule: "W-comment", msg: "HTML тайлбар GitHub дээр уншигдана — локал хавтаст бич" });
  if (issues.length) results.push({ file: relative(join(DOCS, ".."), file).replace(/\\/g, "/"), type: "changelog", questions: 0, issues });
}

// E-internal: скрипт, src (нийтийн репод уншигдана) — «дотоод 0» (11-07). test/ хасна (санаатай тест өгөгдөл);
// help-lint.mjs (дүрмүүд өөрөө) ба local-paths.cjs (локал тохиргооны зам, CEO 11-07 «үлдээ») хасна.
const CODE_SKIP = /(?:^|[\\/])(?:help-lint\.mjs|local-paths\.cjs|node_modules)(?:$|[\\/])/;
const walkCode = (d) => (existsSync(d) ? readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  if (CODE_SKIP.test(p)) return [];
  return statSync(p).isDirectory() ? walkCode(p) : /\.(m?js|cjs|jsx?|tsx?|json|css)$/.test(n) ? [p] : [];
}) : []);
for (const file of ["scripts", "src"].flatMap((d) => walkCode(join(DOCS, "..", d)))) {
  const src = readFileSync(file, "utf8");
  const issues = [...internalHits(src).map((h) => ({ level: "E", rule: "E-internal", msg: `${h} — нийтийн репод бүү бич` })),
    ...PRIVATE_TERMS.filter((t) => src.includes(t)).map((t) => ({ level: "E", rule: "E-internal", msg: `дотоод нэр «${t}» — нийтийн репод бүү бич` }))];
  if (issues.length) results.push({ file: relative(join(DOCS, ".."), file).replace(/\\/g, "/"), type: "code", questions: 0, issues });
}

// Хуучин аппын «?» хуулбар (static/docs/<id>.md) эх хуудастайгаа ижил эсэх (QA 10-28) — засах: node scripts/app-md.mjs
for (const [id, page] of Object.entries(APP_MD)) {
  const copy = join(STATIC, "docs", `${id}.md`), srcPage = join(DOCS, page);
  if (!existsSync(srcPage)) continue;
  const rel = `static/docs/${id}.md`;
  if (!existsSync(copy) || readFileSync(copy, "utf8").replace(/\r\n/g, "\n") !== toAppMd(readFileSync(srcPage, "utf8")))
    results.push({ file: rel, type: "app-md", questions: 0, issues: [{ level: "E", rule: "E-appmd", msg: `аппын «?» хуулбар docs/${page}-тэй зөрж байна — node scripts/app-md.mjs` }] });
}

const count = (lvl) => results.reduce((n, r) => n + r.issues.filter((i) => i.level === lvl).length, 0);
const E = count("E"), W = count("W"), I = count("I");
const countRule = (rule) => results.reduce((n, r) => n + r.issues.filter((i) => i.rule === rule).length, 0);
const LEG = countRule("I-legacy"), DRAFT = countRule("I-draft");
const TUR = results.filter((r) => r.issues.some((i) => i.rule === "I-tur"));
const TUR_STEPS = TUR.reduce((n, r) => n + r.issues.filter((i) => i.rule === "I-tur").reduce((k, i) => k + i.steps, 0), 0);
if (AS_JSON) {
  console.log(JSON.stringify({ ref: gitOk ? REF : null, errors: E, warnings: W, info: I, results }, null, 2));
} else {
  for (const r of results.filter((r) => r.issues.some((i) => i.level !== "I"))) {
    console.log(r.file);
    for (const i of r.issues.filter((i) => i.level !== "I")) console.log(`  ${i.level === "E" ? "❌" : "⚠️"} ${i.rule}: ${i.msg}`);
  }
  const qTotal = results.reduce((n, r) => n + r.questions, 0);
  console.log(`\n${results.length} хуудас · ❌ ${E} · ⚠️ ${W} · legacy ${LEG}${DRAFT ? ` · ноорог (deploy хүлээж) ${DRAFT}` : ""}${TUR.length ? ` · ТҮР алгассан ${TUR_STEPS} алхам / ${TUR.length} хуудас` : ""} · ❔ нийт ${qTotal}${gitOk ? ` · хуучралт: ${REF}` : " · хуучралт шалгаагүй (--no-git эсвэл repo алга)"}`);
}
process.exit(E > 0 || (STRICT && W > 0) ? 1 : 0);
