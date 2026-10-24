// build/help-index.json — Spacehub апп-ын Chatbot `search_help`-д (гарчиг, URL, дэд гарчгийн анхор, текст, түлхүүр үг).
// docs/**/*.md-ээс уншина (routeBasePath "/", trailingSlash false). `npm run build`-ийн төгсгөлд ажиллана.
import fs from 'node:fs';
import path from 'node:path';
import { pageOf } from './help-index-lib.mjs';

const DOCS = 'docs';

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.mdx?$/.test(e.name) && !e.name.startsWith('_')) out.push(p);
  }
  return out;
}

const pages = walk(DOCS).map((f) => pageOf(path.relative(DOCS, f), fs.readFileSync(f, 'utf8')));
fs.mkdirSync('build', { recursive: true });
fs.writeFileSync('build/help-index.json', JSON.stringify(pages));
console.log(`help-index.json: ${pages.length} хуудас`);
