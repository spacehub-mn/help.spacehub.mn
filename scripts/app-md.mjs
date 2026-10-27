#!/usr/bin/env node
// app-md.mjs — хуучин аппын «?» товч (AppSupport.dart → help.spacehub.mn/docs/<id>.md) энгийн markdown татдаг.
// docs/<хуудас>.md-ээс тайлбар, MDX, зураггүй, бүтэн хаягтай холбоостой хуулбар үүсгэнэ. help-lint нь хуулбар хуучирсныг ❌ гэж барина.
//   node scripts/app-md.mjs     # бүх хуулбарыг шинэчилнэ
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// аппын id (static/docs/<id>.md) → эх хуудас (docs/ доторх)
export const APP_MD = { "tenant/payment": "payment.md" };

export const toAppMd = (src) =>
  src
    .slice(src.indexOf("\n# ") + 1)
    .replace(/<!--[\s\S]*?-->\n*/g, "")
    .replace(/:::caution[\s\S]*?:::\n*/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)\n*/g, "")
    .replace(/^\*Зураг \d+\..*\n*/gm, "")
    .replace(/\]\((\/[^)]*)\)/g, "](https://help.spacehub.mn$1)")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  for (const [id, page] of Object.entries(APP_MD)) {
    const out = join(root, "static", "docs", `${id}.md`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, toAppMd(readFileSync(join(root, "docs", page), "utf8")));
    console.log(`✅ static/docs/${id}.md ← docs/${page}`);
  }
}
