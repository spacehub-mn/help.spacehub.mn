#!/usr/bin/env node
// Олон видеог нэг дор бичнэ (нэг heavy_lock-д): node scripts/video/batch.cjs <гаралтын үндсэн хавтас> <spec1> [spec2 …]
// Spec бүрд run.cjs-ийг тусдаа процессоор ажиллуулна — нэг нь унавал бусад нь үргэлжилнэ.
const { spawnSync } = require("child_process");
const path = require("path");
const [root, ...specs] = process.argv.slice(2);
let bad = 0;
for (const s of specs) {
  const name = path.basename(s, ".json");
  const r = spawnSync(process.execPath, [path.join(__dirname, "run.cjs"), s, path.join(root, name)], { encoding: "utf8" });
  const out = ((r.stdout || "") + (r.stderr || "")).trim().split("\n").slice(-3).join(" | ");
  console.log(`${r.status === 0 ? "✅" : "❌"} ${name}: ${out}`);
  if (r.status !== 0) bad++;
}
process.exit(bad ? 1 : 0);
