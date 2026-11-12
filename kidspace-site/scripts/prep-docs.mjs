// ../docs/kidspace/*.md → ./docs/*.md (gitignore-д). Нэг эх сурвалж: help.spacehub.mn/kidspace хуудас ба
// help.kidspace.mn хуудас ижил файлаас үүснэ. Хувиргалт:
//   slug «/kidspace/x» → «/x», «/kidspace» → «/»; дотоод холбоос «](/kidspace…» → «](/…».
//   «Spacehub багт» → «KidSpace-ийн багт» (тусдаа сайтад Spacehub-ийн нэр гарахгүй).
//   KidSpace-ээс гадуурх «](/owner…» гэх мэт Spacehub-ийн холбоос → https://help.spacehub.mn (одоогоор 0).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "../../docs/kidspace");
const out = path.resolve(here, "../docs");

export function transform(text, localSlugs = new Set()) {
  const isLocal = (p) => localSlugs.has(p.split("#")[0]);
  return text
    .replace(/Spacehub багт/g, "KidSpace-ийн багт")
    .replace(/^slug:\s*\/kidspace\/?$/m, "slug: /")
    .replace(/^slug:\s*\/kidspace\//m, "slug: /")
    .replace(/\]\(\/kidspace\/?(?=[)#])/g, "](/")
    .replace(/\]\(\/kidspace\//g, "](/")
    .replace(/\]\(\/(?!img\/|fonts\/)([^)]*)\)/g, (m, p) =>
      p === "" || p.startsWith("#") || isLocal(p) ? m : `](https://help.spacehub.mn/${p})`,
    );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const files = fs.readdirSync(src).filter((f) => f.endsWith(".md"));
  const localSlugs = new Set(files.map((f) => f.replace(/\.md$/, "")).filter((s) => s !== "index"));
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const f of files) fs.writeFileSync(path.join(out, f), transform(fs.readFileSync(path.join(src, f), "utf8"), localSlugs));
  console.log(`kidspace-site/docs: ${files.length} хуудас`);
}
