#!/usr/bin/env node
// help-lint.mjs — docs/ доторх хуудсыг гарын авлагын загварт тулгана (help_architecture.md).
// Зөвхөн уншина. Алдаа (E) байвал exit 1 — build-д хаалт болгож болно; анхааруулга (W), мэдээлэл (I) exit-д нөлөөлөхгүй (--strict бол W ч унагана).
//
//   node scripts/help-lint.mjs                       # бүх шалгалт (verified_commit-ийн хуучралтыг Spacehub23-аар)
//   node scripts/help-lint.mjs --no-git              # Netlify build г.м. Spacehub23 repo байхгүй орчинд
//   node scripts/help-lint.mjs --repo <Spacehub23> --ref origin/master
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
//   E-pii     харилцагчийн нэр (ЛОКАЛ agent-ops/help_pii_names.txt); W-pii 6 оронтой гэрээний дугаар маягийн тоо
//   W-gray    товчны хэсэгт «харагдана/харагдахгүй» — код нь ихэвчлэн саарал болгодог
//   W-order   жагсаалтын хуудас: Энэ юу вэ → Хэзээ хэрэглэх → Товчнууд → Түгээмэл асуулт
//   E-imgmap  зураг дээрх тэмдэг доорх текстэд алга (W-imgmap: текстийн дугаар зураг дээр алга); E-img8 > 8 тэмдэг; W-imgcap «Зураг N.» алга
//   E-img     ![…](/img/…) файл static/-д алга (build-д мөн унана); W-img: alt хоосон, эсвэл заавар/асуудал/сургалт хуудсанд зураг огт алга (HELP_PLAN §11)
//   E-spell   ө/ү-г о/у болгож бичсэн үг («оорчлох», «толбор») — хэрэглэгчид харагдах бичвэрт
//   W-tech    өгүүлбэр доторх кодын/дотоод нэр томьёо (ListView, ObjectSpace, deploy…); W-long 20-оос урт өгүүлбэр
//   W-stale   verified_commit-оос хойш хуудасны иш татсан Spacehub23 файл өөрчлөгдсөн
//   I-legacy  2023 оны загваргүй хуудас (frontmatter-гүй) — тоолно, алдаа биш
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const NO_GIT = args.includes("--no-git");
const STRICT = args.includes("--strict");
const AS_JSON = args.includes("--json");
const REPO = opt("--repo", "E:/Projects/spacehub-mn/Spacehub23");
const REF = opt("--ref", "origin/master");
const DOCS = opt("--docs", join(ROOT, "docs")); // тестэд өөр хавтас

const TYPES = ["nuur", "ehleh", "surgalt", "zaavar", "asuudal", "oilgolt", "lavlah", "hab"];
const TYPES_NEED_REL = ["surgalt", "zaavar", "asuudal", "oilgolt", "lavlah"];
const TYPES_NEED_IMG = ["surgalt", "zaavar", "asuudal"];
const STATIC = join(DOCS, "..", "static");
const AUDIENCE = /[🏢🏠👔🧮]/u;
const MAX_Q = 5;
// E-spell: ө/ү-г о/у болгож бичсэн түгээмэл үг (хайлтын хувилбар хэрэглэгчид харагдсан — эзэн 10-27)
const SPELL_RE = /(?<!\p{L})(оорчл\p{L}*|толбор\p{L}*|тулбур\p{L}*|турээс\p{L}*|хонгол\p{L}*|оноод\p{L}*|одроос|одрийн|оорийн|унэ|унийн|шуулт\p{L}*|омнох\p{L}*|уйлчилгээ\p{L}*|буртг\p{L}*|гуйлгээ\p{L}*|хуснэгт\p{L}*)(?!\p{L})/gu;
// W-tech: өгүүлбэр доторх кодын/дотоод нэр томьёо (дэлгэц дээрх цэс, таб, товчны нэр биш — CEO 10-27 17:2x залруулга)
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

// shots.json: зургийн id → тэмдгүүд (n = доорх текстийн дугаар)
const shotsFile = opt("--shots", join(ROOT, "scripts", "shots", "shots.json"));
const SHOTS = new Map(existsSync(shotsFile) ? JSON.parse(readFileSync(shotsFile, "utf8")).map((s) => [s.id, s]) : []);
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
  let step = "", h2 = 0, inButtons = false, btn = 0, sub = 0, li = 0;
  const isGroup = (i) => { const j = lines.findIndex((l, k) => k > i && /^#{1,4} /.test(l)); return j > 0 && /^#### /.test(lines[j]); };
  lines.forEach((l, i) => {
    const img = /^!\[[^\]]*\]\(\/img\/([^)\s]+)\.webp\)/.exec(l);
    if (img) return items.push({ line: i, kind: "img", id: img[1] });
    const h = /^(#{2,4}) (.+)$/.exec(l);
    if (h) {
      const t = h[2].trim(); li = 0;
      if (h[1] === "##") { inButtons = /^Товчнууд/u.test(t); btn = 0; step = META.test(t) ? "" : String(++h2); if (step) items.push({ line: i, label: step, kind: "h2" }); return; }
      if (h[1] === "###" && inButtons) { if (/^Бусад/u.test(t) || !(t.startsWith("«") || isGroup(i))) { step = ""; return; } step = String(++btn); sub = 0; return items.push({ line: i, label: step, kind: "h" }); }
      if (h[1] === "####" && inButtons && btn) { step = `${btn}.${++sub}`; return items.push({ line: i, label: step, kind: "h" }); }
      return;
    }
    const num = /^(\d+)\. \S/.exec(l);
    if (num && step && !inButtons) { li = li && +num[1] === 1 ? li + 1 : +num[1] > li ? +num[1] : li + 1; items.push({ line: i, label: `${step}.${li}`, kind: "li" }); }
  });
  return items.filter((x) => x.kind === "img").map((img) => {
    const k = items.indexOf(img);
    const next = items.slice(k + 1);
    const end = next.findIndex((x) => x.kind === "img" || x.kind === "h2");
    const span = end < 0 ? next : next.slice(0, end);
    const want = span.some((x) => x.kind === "h") ? "h" : "li";
    // Бүлгийн гарчгийн (### 2.) доорх зураг = зөвхөн тэр бүлгийн товч (2.1, 2.2 …)
    const prev = items[k - 1];
    const group = prev && prev.kind === "h" && !prev.label.includes(".") && span.some((x) => x.label.startsWith(prev.label + ".")) ? prev.label + "." : "";
    const caption = lines.slice(img.line + 1).find((l) => l.trim()) ?? "";
    return { id: img.id, caption, labels: span.filter((x) => x.kind === want && x.label.startsWith(group)).map((x) => x.label) };
  });
}

// Харилцагчийн нэрсийн ЛОКАЛ жагсаалт (репод байхгүй; CI-д файл алга бол шалгахгүй)
const piiFile = opt("--pii", "E:/Projects/spacehub-mn/.claude/agent-ops/help_pii_names.txt");
const PII_NAMES = existsSync(piiFile) ? readFileSync(piiFile, "utf8").split(String.fromCharCode(10)).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")) : [];
const results = [];
for (const file of walk(DOCS)) {
  const rel = relative(join(DOCS, ".."), file).replace(/\\/g, "/");
  const raw = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const issues = [];
  const add = (level, rule, msg) => issues.push({ level, rule, msg });

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
  const comments = [...raw.matchAll(/<!--([\s\S]*?)-->/g)].map((m) => m[1]).join("\n");

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
    // Алхмыг «1. 2.» жагсаалтаар бич — plugins/step-numbers.js 1.1, 1.2 болгоно (эзэн 10-27 дэд дугаар)
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

  // Нууцлал (Dev_Research 10-27: help репо PUBLIC — <!-- --> тайлбар ч GitHub дээр уншигдана): харилцагчийн нэр, гэрээний дугаар
  for (const n of PII_NAMES) if (raw.includes(n)) add("E", "E-pii", `харилцагчийн нэр «${n}» (тайлбарт ч бүү бич — «owner N» гэж бич)`);
  const cno = raw.replace(/^verified_commit:.*$/m, "").match(/(?<![\w.#/-])(60|10|12|27|28)\d{4}(?![\w.])/g);
  if (cno) add("W", "W-pii", `6 оронтой гэрээний дугаар маягийн тоо: ${[...new Set(cno)].slice(0, 3).join(", ")} — харилцагчийн гэрээ бол «нэг гэрээ» гэж бич`);
  // Товч нуугддаггүй, саарал болдог (TargetObjectsCriteria) — «харагдана/харагдахгүй» гэж бичих нь давтагдсан алдаа (Dev_Research 10-27)
  if (rel.includes("/list/")) {
    const btn = (prose.split(/^## Товчнууд.*$/m)[1] || "").split(/^## /m)[0];
    const bad = btn.split(String.fromCharCode(10)).filter((l) => /(харагдахгүй|л харагдана|дээр харагдана|үед харагдана)/.test(l) && /(Сонголт|Хэзээ|товч)/.test(l) && !/саарал|^Товчны нэр/.test(l.trim()));
    if (bad.length) add("W", "W-gray", `товч «харагдана/харагдахгүй» ${bad.length} мөр — ихэнх товч нуугддаггүй, «саарал (дарагдахгүй)» гэж бич: «${bad[0].trim().slice(0, 60)}…»`);
  }

  // Үг үсэг, найруулга (эзэн 10-27, чартер «Үг үсгийн алдаа — суурь хяналт»): хэрэглэгчид харагдах бичвэр — inline код, холбоосын URL, зургийн замгүй
  const seen = prose.replace(/`[^`\n]*`/g, " ").replace(/\]\([^)]*\)/g, "]").replace(/^(slug|keywords):.*$/gm, "");
  const spell = [...new Set([...seen.toLowerCase().matchAll(SPELL_RE)].map((m) => m[1]))];
  if (spell.length) add("E", "E-spell", `ү/ө-гүй бичсэн үг: ${spell.slice(0, 5).join(", ")} — «ө», «ү»-гээр зас`);
  const tech = TECH.filter((w) => new RegExp(`(?<![\\p{L}\\w])${w}(?![\\p{L}\\w])`, "iu").test(seen));
  // Эзэн 10-27 18:4x: өгүүлбэрийн «owner» → «байгууллага»; дэлгэцийн эрхийн нэр «Owner» (хашилттай), /owner/ зам зөвшөөрөгдөнө
  if (/(?<![\p{L}\w/.«-])owner(?![\w/»])/iu.test(seen)) tech.push("owner → байгууллага");
  if (tech.length) add("W", "W-tech", `дотоод/кодын нэр томьёо: ${tech.slice(0, 5).join(", ")} — дэлгэц дээрх нэрээр эсвэл энгийн үгээр бич`);
  const long = seen.split(/(?<=[.!?;])\s+|\n/).filter((s) => !/^\s*[|!<>#]/.test(s) && s.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length > 20);
  if (long.length) add("W", "W-long", `20-оос урт өгүүлбэр ${long.length}: «${long[0].trim().slice(0, 50)}…» — хуваа`);

  // Зураг ↔ текст 1:1 (эзэн 10-27, чартер «Агуулгын ойлгомж»): тэмдэг бүр доорх дугаартай мөртэй, ≤ 8 тэмдэг, «Зураг N.» тайлбар
  const type = fm.type || (/(^|\/)owner\/[^/]+\.mdx?$/.test(rel) && !/index\.mdx?$/.test(rel) ? "zaavar" : undefined);
  for (const sec of imageSections(body, type)) {
    const shot = SHOTS.get(sec.id);
    if (!shot) continue;
    const marks = [...new Set(shot.marks.map((m) => m.n).filter(Boolean))];
    if (shot.marks.length > 8) add("E", "E-img8", `${sec.id}: ${shot.marks.length} тэмдэг (≤ 8) — зургийг хуваа`);
    if (!/^\*Зураг \d+\. /.test(sec.caption)) add("W", "W-imgcap", `${sec.id}: доор нь «*Зураг N. …*» тайлбар алга`);
    const extra = marks.filter((n) => !sec.labels.includes(n));
    const missing = sec.labels.filter((n) => !marks.includes(n));
    if (extra.length) add("E", "E-imgmap", `${sec.id}: зураг дээр ${extra.join(", ")} байгаа ч доорх текстэд алга`);
    if (missing.length) add("W", "W-imgmap", `${sec.id}: текстийн ${missing.join(", ")} зураг дээр тэмдэггүй (цонх доторх алхам бол тусдаа зураг)`);
  }

  const q = (prose.match(/❔/g) ?? []).length;
  if (q > MAX_Q) add("W", "W-q", `❔ ${q} (>${MAX_Q}) — батлах эсвэл хасах`);

  if (gitOk && fm.verified_commit && /^[0-9a-f]{7,40}$/.test(fm.verified_commit)) {
    const changed = changedSince(fm.verified_commit);
    // Олдохгүй commit = нотолгоо шалгагдах боломжгүй (Dev_Research) → алдаа
    if (changed === null) add("E", "E-fm", `verified_commit ${fm.verified_commit} Spacehub23-д олдсонгүй`);
    else {
      const cited = [...new Set([...comments.matchAll(/\b([A-Z][A-Za-z0-9.]+\.(?:cs|razor))\b/g)].map((m) => m[1]))]; // xafml хэт олон хуудсанд иш татагддаг — ViewId түвшинд help_impact шалгана
      const hit = cited.filter((c) => changed.has(c));
      if (hit.length) add("W", "W-stale", `${fm.verified_commit}..${REF}-д өөрчлөгдсөн: ${hit.join(", ")} — хуудсыг дахин тулга`);
    }
  }

  results.push({ file: rel, type: fm.type ?? null, questions: q, issues });
}

const count = (lvl) => results.reduce((n, r) => n + r.issues.filter((i) => i.level === lvl).length, 0);
const E = count("E"), W = count("W"), I = count("I");
if (AS_JSON) {
  console.log(JSON.stringify({ ref: gitOk ? REF : null, errors: E, warnings: W, info: I, results }, null, 2));
} else {
  for (const r of results.filter((r) => r.issues.some((i) => i.level !== "I"))) {
    console.log(r.file);
    for (const i of r.issues.filter((i) => i.level !== "I")) console.log(`  ${i.level === "E" ? "❌" : "⚠️"} ${i.rule}: ${i.msg}`);
  }
  const qTotal = results.reduce((n, r) => n + r.questions, 0);
  console.log(`\n${results.length} хуудас · ❌ ${E} · ⚠️ ${W} · legacy ${I} · ❔ нийт ${qTotal}${gitOk ? ` · хуучралт: ${REF}` : " · хуучралт шалгаагүй (--no-git эсвэл repo алга)"}`);
}
process.exit(E > 0 || (STRICT && W > 0) ? 1 : 0);
