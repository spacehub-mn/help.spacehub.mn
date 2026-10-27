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
const good = `${fm()}# Гарчиг\n\n> 🏢 Owner · Вэб\n\nБичвэр.\n\n1. Алхам.\n\n![Жагсаалт](/img/x.webp)\n\n## 🔗 Холбоотой\n- [x](/x)\n`;
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
  const bad = `${fm()}<!-- нотолгоо -->\n\n# Гарчиг\n\n> 🏢 Owner · Вэб\n\n## 🔗 Холбоотой\n- [x](/x)\n`;
  const { code, out } = run(fixture({ "c.md": bad, "a.md": good }));
  assert.equal(code, 1);
  assert.ok(rules(out, "c.md").includes("E-h1first"));
  assert.ok(!rules(out, "a.md").includes("E-h1first"));
});

test("зураг ↔ текст 1:1: илүү тэмдэг E-imgmap, дутуу W-imgmap, > 8 E-img8, «Зураг N.» алга W-imgcap", () => {
  const docs = fixture({
    "z.md": `${fm()}# Гарчиг\n\n> 🏢 Owner · Вэб\n\n## Хуулга харах\n\n![x](/img/x.webp)\n\n*Зураг 1. Хуулга.*\n\n1. Цэс.\n2. Данс.\n3. Огноо.\n\n## 🔗 Холбоотой\n- [x](/x)\n`,
    "y.md": `${fm()}# Гарчиг\n\n> 🏢 Owner · Вэб\n\n## Алхам\n\n![x](/img/x.webp)\n\nТайлбаргүй.\n\n1. Нэг.\n\n## 🔗 Холбоотой\n- [x](/x)\n`,
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
  const body = (line) => `${fm()}# Гарчиг\n\n> 🏢 Owner · Вэб\n\n## Товчнууд\nТовчны нэр апп дээр яг ингэж харагдана.\n\n### «Цуцлах»\n- **Сонголт:** ${line}\n\n## 🔗 Холбоотой\n- [x](/x)\n`;
  const docs = fixture({ "list/a.md": body("цуцлаагүй төлбөр дээр л харагдана."), "list/b.md": body("цуцлаагүй үед идэвхтэй, бусад үед **саарал**.") });
  const { out } = run(docs);
  assert.ok(rules(out, "list/a.md").includes("W-gray"));
  assert.ok(!rules(out, "list/b.md").includes("W-gray"));
});

test("E-pii: локал жагсаалтын харилцагчийн нэр <!-- --> тайлбарт ч барина; W-pii 6 оронтой гэрээний дугаар", () => {
  const docs = fixture({ "a.md": `${fm()}# Гарчиг\n\n<!-- Тестийн Нэр ХХК-ийн 601050 гэрээ -->\n\n> 🏢 Owner · Вэб\n\n1. Алхам.\n\n## 🔗 Холбоотой\n- [x](/x)\n`, "b.md": good });
  const pii = join(docs, "..", "pii.txt");
  writeFileSync(pii, "# тайлбар\nТестийн Нэр\n");
  const { code, out } = run(docs, "--pii", pii);
  assert.equal(code, 1);
  assert.ok(rules(out, "a.md").includes("E-pii") && rules(out, "a.md").includes("W-pii"));
  assert.ok(!rules(out, "b.md").includes("E-pii"));
});
