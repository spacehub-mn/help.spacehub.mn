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
//   W-aud     H1-ийн дараах «> …» мөрөнд хэнд зориулсан нь (🏢/🏠/👔/🧮)
//   W-rel     «## 🔗 Холбоотой» хэсэг (TYPES_NEED_REL төрөлд)
//   W-term    хуучирсан/буруу нэр томьёо (scripts/help-lint.terms.json)
//   W-q       ❔ (батлагдаагүй) MAX_Q-ээс олон
//   E-img     ![…](/img/…) файл static/-д алга (build-д мөн унана); W-img: alt хоосон, эсвэл заавар/асуудал/сургалт хуудсанд зураг огт алга (HELP_PLAN §11)
//   W-stale   verified_commit-оос хойш хуудасны иш татсан Spacehub23 файл өөрчлөгдсөн
//   I-legacy  2023 оны загваргүй хуудас (frontmatter-гүй) — тоолно, алдаа биш
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

  if (!legacy) {
    const lines = prose.split("\n");
    const i = lines.findIndex((l) => /^# \S/.test(l));
    const next = lines.slice(i + 1).find((l) => l.trim() !== "");
    if (!next?.startsWith(">") || !AUDIENCE.test(next)) add("W", "W-aud", "H1-ийн дараа «> 🏢 …» (хэнд, хаана) мөр алга");
    if (TYPES_NEED_REL.includes(fm.type) && !/^## 🔗 Холбоотой/m.test(prose)) add("W", "W-rel", "«## 🔗 Холбоотой» хэсэг алга");
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
