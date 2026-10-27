import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const plugin = createRequire(import.meta.url)("../plugins/step-numbers.js");
const file = (type) => {
  const p = join(mkdtempSync(join(tmpdir(), "steps-")), "a.md");
  writeFileSync(p, type ? `---\ntype: ${type}\n---\n` : "# x\n");
  return { path: p };
};
const h = (depth, value) => ({ type: "heading", depth, children: [{ type: "text", value }] });
const ol = (n) => ({ type: "list", ordered: true, children: Array.from({ length: n }, () => ({ type: "listItem", children: [] })) });
const text = (n) => n.children.map((c) => c.value).join("");
const run = (tree, type = "zaavar") => (plugin()(tree, file(type)), tree);

test("алхмын H2 → 1., 2.; гар угтвар («Алхам 3 —», «5.») солигдоно; мета хэсэг дугааргүй", () => {
  const t = run({ children: [h(2, "Энэ юунд хэрэгтэй"), h(2, "Алхам 3 — Бүртгэл"), h(2, "5. Гэрээ"), h(2, "Түгээмэл асуулт"), h(2, "🔗 Холбоотой")] });
  assert.deepEqual(t.children.map(text), ["Энэ юунд хэрэгтэй", "1. Бүртгэл", "2. Гэрээ", "Түгээмэл асуулт", "🔗 Холбоотой"]);
});

test("алхмын доорх дугаартай жагсаалт → substeps + data-step; мета доорх жагсаалт хөндөгдөхгүй", () => {
  const a = ol(2), b = ol(2);
  run({ children: [h(2, "Нэвтрэх"), a, h(2, "Түгээмэл асуулт"), b] });
  assert.deepEqual(a.data.hProperties.className, ["substeps"]);
  assert.equal(a.children[1].data.hProperties["data-step"], "1");
  assert.equal(b.data, undefined);
});

test("«Товчнууд» доторх ### → 1., 2.; «Бусад товч» дугааргүй; доорх жагсаалт 2.x", () => {
  const l = ol(1);
  const t = run({ children: [h(2, "Товчнууд"), h(3, "«Шинэ»"), h(3, "«Цуцлах»"), l, h(3, "Бусад товч")] }, "lavlah");
  assert.deepEqual([0, 1, 2, 4].map((i) => text(t.children[i])), ["Товчнууд", "1. «Шинэ»", "2. «Цуцлах»", "Бусад товч"]);
  assert.equal(l.children[0].data.hProperties["data-step"], "2");
});

test("ойлголт, legacy хуудас хөндөгдөхгүй", () => {
  for (const type of ["oilgolt", null]) {
    const t = run({ children: [h(2, "Гэрээ")] }, type);
    assert.equal(text(t.children[0]), "Гэрээ");
  }
});

test("Товчнууд: бүлэг ### (доороо ####) → 1., #### → 1.1; зөвлөгөөний ### дугааргүй", () => {
  const t = run({ children: [h(2, "Товчнууд"), h(3, "Аль товчийг сонгох"), h(3, "Гэрээ хаах"), h(4, "«Сунгах»"), h(4, "«Хаах»"), h(3, "«Төлбөр+»")] }, "lavlah");
  assert.deepEqual(t.children.slice(1).map(text), ["Аль товчийг сонгох", "1. Гэрээ хаах", "1.1 «Сунгах»", "1.2 «Хаах»", "2. «Төлбөр+»"]);
});
