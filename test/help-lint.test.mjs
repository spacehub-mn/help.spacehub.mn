import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const run = (docs, ...extra) => {
  try {
    return { code: 0, out: JSON.parse(execFileSync("node", ["scripts/help-lint.mjs", "--no-git", "--json", "--docs", docs, ...extra], { encoding: "utf8" })) };
  } catch (e) {
    return { code: e.status, out: JSON.parse(e.stdout) };
  }
};
const fixture = (files) => {
  const d = join(mkdtempSync(join(tmpdir(), "help-lint-")), "docs");
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(join(d, name, ".."), { recursive: true });
    writeFileSync(join(d, name), body);
  }
  mkdirSync(join(d, "..", "static", "img"), { recursive: true });
  writeFileSync(join(d, "..", "static", "img", "x.webp"), "");
  return d;
};
const fm = (extra = "") => `---\ntype: zaavar\nroles: [owner]\nupdated: 2026-10-26\nverified_commit: c68c602\n${extra}---\n`;
const good = `${fm()}# Гарчиг\n\n> 🏢 Байгууллага · Вэб\n\nБичвэр.\n\n1. Алхам.\n\n![Жагсаалт](/img/x.webp)\n\n## 🔗 Холбоотой\n- [x](/x)\n`;
const rules = (out, file) => out.results.find((r) => r.file.endsWith(file)).issues.map((i) => i.rule);

test("загварт нийцсэн хуудас — алдаагүй, exit 0", () => {
  const { code, out } = run(fixture({ "a.md": good }));
  assert.equal(code, 0);
  assert.deepEqual(rules(out, "a.md"), []);
});

test("frontmatter дутуу, H1 2 → E, exit 1", () => {
  const bad = `---\ntype: busad\nroles: []\nupdated: 26-10\n---\n# Нэг\n\n> 🏢 x\n\n# Хоёр\n`;
  const { code, out } = run(fixture({ "b.md": bad }));
  assert.equal(code, 1);
  const r = rules(out, "b.md");
  assert.equal(r.filter((x) => x === "E-fm").length, 4); // type, roles, updated, verified_commit
  assert.ok(r.includes("E-h1"));
});

test("code block доторх «# » H1 гэж тоологдохгүй; «хэнд» мөр, Холбоотой дутуу → W", () => {
  const body = `${fm()}# Гарчиг\n\nШууд бичвэр.\n\n\`\`\`\n# энэ тайлбар\n\`\`\`\n`;
  const { code, out } = run(fixture({ "c.md": body }));
  assert.equal(code, 0);
  assert.deepEqual(rules(out, "c.md").sort(), ["W-aud", "W-img", "W-rel", "W-steps"]);
  assert.equal(run(fixture({ "c.md": body }), "--strict").code, 1);
});

test("хуучирсан нэр томьёо, ❔ олон → W", () => {
  const body = good.replace("Бичвэр.", "Хоногоор тооцох ❔ ❔ ❔ ❔ ❔ ❔");
  const r = rules(run(fixture({ "d.md": body })).out, "d.md");
  assert.ok(r.includes("W-term"));
  assert.ok(r.includes("W-q"));
});

test("frontmatter-гүй 2023 хуудас — зөвхөн I-legacy", () => {
  const r = rules(run(fixture({ "e.md": "# Хуучин\n\n1. алхам\n" })).out, "e.md");
  assert.deepEqual(r, ["I-legacy"]);
});

test("terms scope — owner-ийн дүрэм апп хуудсанд үйлчлэхгүй", () => {
  const body = good.replace("Бичвэр.", "нэхэмжлэл үүсгэх");
  const out = run(fixture({ "owner/f.md": body, "lessor/g.md": body })).out;
  assert.ok(rules(out, "owner/f.md").includes("W-term"));
  assert.ok(!rules(out, "lessor/g.md").includes("W-term"));
});

test("зургийн файл алга → E-img (exit 1); alt хоосон, зураггүй заавар → W-img", () => {
  const body = good.replace("![Жагсаалт](/img/x.webp)", "![](/img/x.webp)\n\n![Алга](/img/baihgui.webp)");
  const { code, out } = run(fixture({ "f.md": body }));
  assert.equal(code, 1);
  assert.deepEqual(rules(out, "f.md").sort(), ["E-img", "W-img"]);
  const noImg = good.replace("![Жагсаалт](/img/x.webp)", "");
  assert.deepEqual(rules(run(fixture({ "g.md": noImg })).out, "g.md"), ["W-img"]);
});

test("H1-ийн өмнө <!-- --> → E-h1first (гарчиг файлын нэрээр гарна)", () => {
  const bad = `${fm()}<!-- нотолгоо -->\n\n# Гарчиг\n\n> 🏢 Байгууллага · Вэб\n\n## 🔗 Холбоотой\n- [x](/x)\n`;
  const { code, out } = run(fixture({ "c.md": bad, "a.md": good }));
  assert.equal(code, 1);
  assert.ok(rules(out, "c.md").includes("E-h1first"));
  assert.ok(!rules(out, "a.md").includes("E-h1first"));
});

test("зураг ↔ текст 1:1: илүү тэмдэг E-imgmap, дутуу W-imgmap, > 8 E-img8, «Зураг N.» алга W-imgcap", () => {
  const docs = fixture({
    "z.md": `${fm()}# Гарчиг\n\n> 🏢 Байгууллага · Вэб\n\n## Хуулга харах\n\n![x](/img/x.webp)\n\n*Зураг 1. Хуулга.*\n\n1. Цэс.\n2. Данс.\n3. Огноо.\n\n## 🔗 Холбоотой\n- [x](/x)\n`,
    "y.md": `${fm()}# Гарчиг\n\n> 🏢 Байгууллага · Вэб\n\n## Алхам\n\n![x](/img/x.webp)\n\nТайлбаргүй.\n\n1. Нэг.\n\n## 🔗 Холбоотой\n- [x](/x)\n`,
  });
  const shots = join(docs, "..", "shots.json");
  const m = (n) => ({ n, btn: "x" });
  writeFileSync(shots, JSON.stringify([{ id: "x", marks: [m("1.1"), m("1.2"), m("1.9"), ...Array(6).fill(m("1.1"))] }]));
  const { code, out } = run(docs, "--shots", shots);
  assert.equal(code, 1);
  const z = rules(out, "z.md"), y = rules(out, "y.md");
  assert.ok(z.includes("E-imgmap") && z.includes("W-imgmap") && z.includes("E-img8")); // 1.9 илүү, 1.3 дутуу, 9 тэмдэг
  assert.ok(!z.includes("W-imgcap"));
  assert.ok(y.includes("W-imgcap"));
});

test("W-gray: жагсаалтын «Товчнууд»-д «… дээр л харагдана» → анхааруулга; «Товчны нэр … харагдана» биш", () => {
  const body = (line) => `${fm()}# Гарчиг\n\n> 🏢 Байгууллага · Вэб\n\n## Товчнууд\nТовчны нэр апп дээр яг ингэж харагдана.\n\n### «Цуцлах»\n- **Сонголт:** ${line}\n\n## 🔗 Холбоотой\n- [x](/x)\n`;
  const docs = fixture({ "list/a.md": body("цуцлаагүй төлбөр дээр л харагдана."), "list/b.md": body("цуцлаагүй үед идэвхтэй, бусад үед **саарал**.") });
  const { out } = run(docs);
  assert.ok(rules(out, "list/a.md").includes("W-gray"));
  assert.ok(!rules(out, "list/b.md").includes("W-gray"));
});

test("E-pii: локал жагсаалтын харилцагчийн нэр <!-- --> тайлбарт ч барина; W-pii 6 оронтой гэрээний дугаар", () => {
  const docs = fixture({ "a.md": `${fm()}# Гарчиг\n\n<!-- Тестийн Нэр ХХК-ийн 601050 гэрээ -->\n\n> 🏢 Байгууллага · Вэб\n\n1. Алхам.\n\n## 🔗 Холбоотой\n- [x](/x)\n`, "b.md": good });
  const pii = join(docs, "..", "pii.txt");
  writeFileSync(pii, "# тайлбар\nТестийн Нэр\n");
  const { code, out } = run(docs, "--pii", pii);
  assert.equal(code, 1);
  assert.ok(rules(out, "a.md").includes("E-pii") && rules(out, "a.md").includes("W-pii"));
  assert.ok(!rules(out, "b.md").includes("E-pii"));
});

test("E-spell: ө/ү-гүй үг (тайлбар, inline кодод тооцохгүй); W-tech; W-long", () => {
  const body = good.replace("Бичвэр.", "Үнэ оорчлох, толбор шалга. `толбор` <!-- турээс --> ListView-ээс нээ.\n\nНэг хоёр гурав дөрөв тав зургаа долоо найм ес арав нэг хоёр гурав дөрөв тав зургаа долоо найм ес арав нэг.");
  const { code, out } = run(fixture({ "s.md": body }));
  assert.equal(code, 1);
  const r = rules(out, "s.md");
  assert.ok(r.includes("E-spell") && r.includes("W-tech") && r.includes("W-long"));
  const msg = out.results[0].issues.find((i) => i.rule === "E-spell").msg;
  assert.match(msg, /оорчлох, толбор/);
  assert.doesNotMatch(msg, /турээс/);
  assert.deepEqual(rules(run(fixture({ "a.md": good })).out, "a.md"), []);
});

test("W-tech: changelog бичвэр (тайлбар, холбоосын хаягийг тооцохгүй)", () => {
  const d = fixture({ "a.md": good, "../changelog/2026-10-24-x.md": "---\ntitle: 10-24\n---\n<!-- toolbar -->\nЖагсаалтын toolbar дээр гарав. [x](/owner/toolbar)\n", "../changelog/2026-10-25-x.md": "---\ntitle: 10-25\n---\nТовчны мөрөнд гарав.\n" });
  const out = run(d).out;
  assert.deepEqual(rules(out, "2026-10-24-x.md"), ["W-tech", "W-comment"]); // тайлбар нийтийн репод уншигдана
  assert.ok(!out.results.some((r) => r.file.endsWith("2026-10-25-x.md")));
});

test("E-appmd: аппын «?» хуулбар эх хуудастайгаа зөрвөл ❌, ижил бол цэвэр", () => {
  const page = `${fm()}# Төлбөр\n\n<!-- нотолгоо -->\n> 🏠 Түрээслэгч · Апп\n\n1. Алхам.\n\n![x](/img/x.webp)\n\n## 🔗 Холбоотой\n- [x](/x)\n`;
  const d = fixture({ "payment.md": page, "../static/docs/tenant/payment.md": "# Хуучин\n" });
  assert.deepEqual(rules(run(d).out, "static/docs/tenant/payment.md"), ["E-appmd"]);
  writeFileSync(join(d, "..", "static", "docs", "tenant", "payment.md"), "# Төлбөр\n\n> 🏠 Түрээслэгч · Апп\n\n1. Алхам.\n\n## 🔗 Холбоотой\n- [x](https://help.spacehub.mn/x)\n");
  assert.ok(!run(d).out.results.some((r) => r.file.endsWith("static/docs/tenant/payment.md")));
});

test("W-tech: өгүүлбэрийн owner; «Owner» эрхийн нэр, /owner/ зам зөвшөөрөгдөнө", () => {
  const ok = good.replace("Бичвэр.", "Эрхийн нэр нь «Owner». [Холбоос](/owner/tohirgoo) <img src='/img/owner/a.webp' />");
  assert.ok(!rules(run(fixture({ "a.md": ok })).out, "a.md").includes("W-tech"));
  const out = run(fixture({ "o.md": good.replace("Бичвэр.", "Owner-ийн тохиргоог нээ.") })).out;
  assert.match(out.results[0].issues.find((i) => i.rule === "W-tech").msg, /owner → байгууллага/);
});

test("тойм зураг: эхний бүлгийн өмнөх зураг — тэмдэг = бүлгийн дугаар (1, 2)", () => {
  const docs = fixture({
    "t.md": `${fm()}# Гарчиг\n\n> 🏢 Байгууллага · Вэб\n\n![x](/img/x.webp)\n\n*Зураг 1. Тойм.*\n\n## 1. Цэс\nБичвэр.\n\n## 2. Жагсаалт\nБичвэр.\n\n## 🔗 Холбоотой\n- [x](/x)\n`,
  });
  const shots = join(docs, "..", "shots.json");
  writeFileSync(shots, JSON.stringify([{ id: "x", marks: [{ n: "1", btn: "x" }, { n: "2", btn: "x" }] }]));
  const ok = rules(run(docs, "--shots", shots).out, "t.md");
  assert.ok(!ok.includes("E-imgmap") && !ok.includes("W-imgmap"));
  writeFileSync(shots, JSON.stringify([{ id: "x", marks: [{ n: "1", btn: "x" }, { n: "3", btn: "x" }] }]));
  const bad = rules(run(docs, "--shots", shots).out, "t.md");
  assert.ok(bad.includes("E-imgmap") && bad.includes("W-imgmap")); // 3 илүү, 2 дутуу
});

test("verified_repo: spacehub — commit аппын repo-д шалгагдана, кодын репогоор биш", () => {
  const repo = mkdtempSync(join(tmpdir(), "help-lint-app-"));
  const g = (...a) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8" }).trim();
  g("init", "-q"); writeFileSync(join(repo, "a.txt"), "a"); g("add", "a.txt");
  g("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "a");
  const sha = g("rev-parse", "--short=8", "HEAD");
  const page = (c) => good.replace("verified_commit: c68c602\n", `verified_commit: ${c}\nverified_repo: spacehub\n`);
  const docs = fixture({ "ok.md": page(sha), "bad.md": page("deadbeef") });
  const lint = () => { try { return JSON.parse(execFileSync("node", ["scripts/help-lint.mjs", "--json", "--docs", docs, "--repo", repo, "--ref", "HEAD", "--app-repo", repo], { encoding: "utf8" })); } catch (e) { return JSON.parse(e.stdout); } };
  const out = lint();
  assert.ok(!rules(out, "ok.md").includes("E-fm"));
  assert.ok(out.results.find((r) => r.file.endsWith("bad.md")).issues.some((i) => i.rule === "E-fm" && /аппын repo/.test(i.msg)));
});

test("тайлбар дахь кодын мөр, дотоод зам, нууц, дотоод IP → E-internal", () => {
  const leak = good.replace("Бичвэр.", "Бичвэр.\n\n<!-- Bill.cs:12 · agent-ops/x · token=abcdef123 · 192.168.1.5 · Data Source=x -->");
  const { code, out } = run(fixture({ "c.md": leak }));
  assert.equal(code, 1);
  const msgs = out.results.find((r) => r.file.endsWith("c.md")).issues.filter((i) => i.rule === "E-internal").map((i) => i.msg.split(":")[0]);
  for (const w of ["кодын файл", "дотоод зам", "нууц үг/түлхүүр", "дотоод IP", "холболтын мөр"]) assert.ok(msgs.some((m) => m.startsWith(w)), w);
});

test("H1-ийн дараах эхний блок тайлбар → W-comment1; доор бол W-comment", () => {
  const first = good.replace("# Гарчиг\n", "# Гарчиг\n\n<!-- тэмдэглэл -->\n");
  const later = good.replace("Бичвэр.", "Бичвэр.\n\n<!-- тэмдэглэл -->");
  assert.ok(rules(run(fixture({ "d.md": first })).out, "d.md").includes("W-comment1"));
  assert.ok(rules(run(fixture({ "e.md": later })).out, "e.md").includes("W-comment"));
});

test("tel:, @spacehub.mn, 10.00% хуурамч дохио гаргахгүй; бусад имэйл, утас → W-contact", () => {
  const ok = good.replace("Бичвэр.", "Бичвэр [утас](tel:+97677777777), [имэйл](mailto:info@spacehub.mn), хувь 10.00%.");
  assert.deepEqual(rules(run(fixture({ "f.md": ok })).out, "f.md"), []);
  const bad = good.replace("Бичвэр.", "Бичвэр 99112233, a.b@gmail.com.");
  assert.equal(rules(run(fixture({ "g.md": bad })).out, "g.md").filter((x) => x === "W-contact").length, 2);
});

test("W-contact: tel: доторх 8 оронтой дугаар хуурамч дохио биш; 5x/6x цуврал баригдана", () => {
  const tel = good.replace("Бичвэр.", "Бичвэр [утас](tel:99112233).");
  assert.ok(!rules(run(fixture({ "t1.md": tel })).out, "t1.md").includes("W-contact"));
  const plain = good.replace("Бичвэр.", "Бичвэр 99112233.");
  assert.ok(rules(run(fixture({ "t2.md": plain })).out, "t2.md").includes("W-contact"));
  const six = good.replace("Бичвэр.", "Бичвэр 60112233.");
  assert.ok(rules(run(fixture({ "t3.md": six })).out, "t3.md").includes("W-contact"));
});

test("changelog: тайлбар доторх кодын мөр → E-internal, exit 1", () => {
  const d = fixture({ "a.md": good, "../changelog/2026-10-24-x.md": "---\ntitle: 10-24\n---\n<!-- Bill.cs:12 -->\nТовчны мөрөнд гарав.\n" });
  const { code, out } = run(d);
  assert.equal(code, 1);
  assert.ok(rules(out, "2026-10-24-x.md").includes("E-internal"));
});

test("--evidence: нотолгооны хавтаст иш татсан файл өөрчлөгдвөл W-stale; хавтасгүй бол үгүй", () => {
  const repo = mkdtempSync(join(tmpdir(), "help-lint-code-"));
  const g = (...a) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8" }).trim();
  g("init", "-q"); writeFileSync(join(repo, "Bill.cs"), "a"); g("add", "Bill.cs");
  g("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "a");
  const old = g("rev-parse", "--short=8", "HEAD");
  writeFileSync(join(repo, "Bill.cs"), "b"); g("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qam", "b");
  const d = fixture({ "h.md": good.replace("verified_commit: c68c602", `verified_commit: ${old}`) });
  const evid = join(d, "..", "evid"), empty = join(d, "..", "empty");
  mkdirSync(join(evid, "docs"), { recursive: true }); mkdirSync(empty);
  writeFileSync(join(evid, "docs", "h.md"), "Bill.cs:1");
  const lint = (ev) => { try { return JSON.parse(execFileSync("node", ["scripts/help-lint.mjs", "--json", "--docs", d, "--repo", repo, "--ref", "HEAD", "--evidence", ev], { encoding: "utf8" })); } catch (e) { return JSON.parse(e.stdout); } };
  assert.ok(rules(lint(evid), "h.md").includes("W-stale"));
  assert.ok(!rules(lint(empty), "h.md").includes("W-stale"));
});

test("W-fmcomment: frontmatter-ийн # мөр GitHub дээр уншигдана", () => {
  const page = good.replace("verified_commit: c68c602\n", "verified_commit: c68c602\n# дотоод тэмдэглэл\n");
  assert.ok(rules(run(fixture({ "fc.md": page })).out, "fc.md").includes("W-fmcomment"));
  assert.ok(!rules(run(fixture({ "fd.md": good })).out, "fd.md").includes("W-fmcomment"));
});

test("--check-text: commit мессеж/PR тайлбарт session холбоос, кодын мөр → exit 1; цэвэр бол 0", () => {
  const d = mkdtempSync(join(tmpdir(), "help-msg-"));
  const chk = (t) => { writeFileSync(join(d, "m.txt"), t); try { execFileSync("node", ["scripts/help-lint.mjs", "--check-text", join(d, "m.txt")], { encoding: "utf8" }); return 0; } catch (e) { return e.status; } };
  assert.equal(chk("help: нууц үгийн хуудас\n\nClaude-Session: https://claude.ai/code/session_x"), 1);
  assert.equal(chk("help: Bill.cs:12 засав"), 1);
  assert.equal(chk("help: нууц үгийн хуудас шинэчлэв"), 0);
});

test("--check-text сүүлийн аргумент бол stdin уншина (унахгүй)", () => {
  let code = 0;
  try { execFileSync("node", ["scripts/help-lint.mjs", "--check-text"], { input: "help: Bill.cs:3", encoding: "utf8" }); } catch (e) { code = e.status; }
  assert.equal(code, 1);
});

test("imgmap_skip: шалтгаантай алхам W-imgmap-аас хасагдана; шалтгаангүй бол W-imgskip", () => {
  const page = (skip) => `${fm(skip)}# Гарчиг\n\n> 🏢 Байгууллага · Вэб\n\n## Алхам\n\n![x](/img/x.webp)\n\n*Зураг 1. Хуулга.*\n\n1. Цэс.\n2. Хадгалсны дараах дэлгэц.\n\n## 🔗 Холбоотой\n- [x](/x)\n`;
  const docs = fixture({ "s.md": page('imgmap_skip: "1.2 хадгалсны дараа"\n'), "t.md": page(""), "u.md": page('imgmap_skip: "1.2"\n') });
  const shots = join(docs, "..", "shots.json");
  writeFileSync(shots, JSON.stringify([{ id: "x", marks: [{ n: "1.1", btn: "x" }] }]));
  const out = run(docs, "--shots", shots).out;
  assert.ok(!rules(out, "s.md").includes("W-imgmap"));
  assert.ok(rules(out, "t.md").includes("W-imgmap"));
  assert.ok(rules(out, "u.md").includes("W-imgskip") && rules(out, "u.md").includes("W-imgmap"));
});

test("imgmap_skip: текстэд алга алхам → W-imgskip (хуучирсан тэмдэглэгээ)", () => {
  const page = `${fm('imgmap_skip: "1.9 хадгалсны дараа"\n')}# Гарчиг\n\n> 🏢 Байгууллага · Вэб\n\n## Алхам\n\n![x](/img/x.webp)\n\n*Зураг 1. Хуулга.*\n\n1. Цэс.\n\n## 🔗 Холбоотой\n- [x](/x)\n`;
  const docs = fixture({ "v.md": page });
  const shots = join(docs, "..", "shots.json");
  writeFileSync(shots, JSON.stringify([{ id: "x", marks: [{ n: "1.1", btn: "x" }] }]));
  assert.ok(rules(run(docs, "--shots", shots).out, "v.md").includes("W-imgskip"));
});

test("жагсаалтын дугаар plugin-тэй ижил: 1-ээс дахин эхэлсэн жагсаалтад 1.7 тэмдэг → E-imgmap", () => {
  const page = `${fm()}# Гарчиг\n\n> 🏢 Байгууллага · Вэб\n\n## Алхам\n\n![x](/img/x.webp)\n\n*Зураг 1. Х.*\n\n1. А.\n2. Б.\n\nДахин нээх бол:\n1. В.\n2. Г.\n\n## 🔗 Холбоотой\n- [x](/x)\n`;
  const ok6 = page.replace("Дахин нээх бол:\n1. В.\n2. Г.", "Дахин нээх бол:\n\n3. В.\n4. Г.");
  const docs = fixture({ "r.md": page, "s.md": ok6 });
  const shots = join(docs, "..", "shots.json");
  writeFileSync(shots, JSON.stringify([{ id: "x", marks: [{ n: "1.1", btn: "x" }, { n: "1.2", btn: "x" }, { n: "1.4", btn: "x" }] }]));
  const out = run(docs, "--shots", shots).out;
  assert.ok(rules(out, "r.md").includes("E-imgmap")); // дахин 1, 2 → 1.4 алга
  assert.ok(!rules(out, "s.md").includes("E-imgmap")); // хоосон мөр + 3., 4. → 1.3, 1.4
});

test("CommonMark: хоосон мөргүй «3.» нь параграфын үргэлжлэл — жагсаалт биш (1.3 тэмдэг → E-imgmap)", () => {
  const page = `${fm()}# Гарчиг\n\n> 🏢 Байгууллага · Вэб\n\n## Алхам\n\n![x](/img/x.webp)\n\n*Зураг 1. Х.*\n\n1. А.\n2. Б.\n\nДахин нээх бол:\n3. В.\n\n## 🔗 Холбоотой\n- [x](/x)\n`;
  const docs = fixture({ "p.md": page });
  const shots = join(docs, "..", "shots.json");
  writeFileSync(shots, JSON.stringify([{ id: "x", marks: [{ n: "1.1", btn: "x" }, { n: "1.2", btn: "x" }, { n: "1.3", btn: "x" }] }]));
  assert.ok(rules(run(docs, "--shots", shots).out, "p.md").includes("E-imgmap"));
});

test("анхдагч --ref = deploy-log-ийн сүүлийн амжилттай Blazor commit (HELP_DEPLOY_LOG)", () => {
  const repo = mkdtempSync(join(tmpdir(), "help-lint-ref-"));
  const g = (...a) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8" }).trim();
  g("init", "-q"); writeFileSync(join(repo, "a.txt"), "a"); g("add", "a.txt");
  g("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "a");
  const sha = g("rev-parse", "--short=8", "HEAD");
  const docs = fixture({ "a.md": good });
  const log = join(docs, "..", "deploy-log.md");
  writeFileSync(log, `| 10-29 | deadbee0 | Blazor | ✅ |\n| 10-30 | ${sha} | Blazor | ✅ HTTP 200 |\n| 10-30 | ${sha} | Api | ✅ |\n| 10-31 | badbadba | Blazor | ❌ |\n`);
  let out;
  try { out = JSON.parse(execFileSync("node", ["scripts/help-lint.mjs", "--json", "--docs", docs, "--repo", repo], { encoding: "utf8", env: { ...process.env, HELP_DEPLOY_LOG: log } })); }
  catch (e) { out = JSON.parse(e.stdout); }
  assert.equal(out.ref, sha);
});
