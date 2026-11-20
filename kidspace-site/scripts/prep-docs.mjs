// ../docs/kidspace/**/*.md → ./docs/**/*.md (gitignore-д). Нэг эх сурвалж: help.spacehub.mn/kidspace хуудас ба
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

// Дэд хавтас (concepts/, list/, asuult/ …) дахь .md болон _category_.json-ийг бүтцээр нь хуулна.
function walk(dir, rel = "") {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walk(path.join(dir, e.name), r));
    else if (e.name.endsWith(".md") || e.name === "_category_.json") out.push(r);
  }
  return out;
}

// Хуудасны хаяг = frontmatter-ийн slug («/kidspace/concepts/x» → «concepts/x»); slug-гүй бол файлын зам.
export function localSlugOf(text, rel) {
  const m = text.match(/^slug:\s*\/kidspace\/?(.*)$/m);
  return (m ? m[1] : rel.replace(/\.md$/, "")).trim();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const files = walk(src);
  const texts = new Map(files.map((f) => [f, fs.readFileSync(path.join(src, f), "utf8")]));
  const localSlugs = new Set(
    files.filter((f) => f.endsWith(".md")).map((f) => localSlugOf(texts.get(f), f)).filter((s) => s !== "" && s !== "index"),
  );
  fs.rmSync(out, { recursive: true, force: true });
  for (const f of files) {
    const dst = path.join(out, f);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, f.endsWith(".md") ? transform(texts.get(f), localSlugs) : texts.get(f));
  }
  console.log(`kidspace-site/docs: ${files.filter((f) => f.endsWith(".md")).length} хуудас`);
}
