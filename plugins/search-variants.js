// Монголчууд ү/ө-г у/о-гоор бичих нь түгээмэл («төлбөр» → «толбор»). Algolia нэг үсгийн алдааг уучилдаг ч
// 2+ ү/ө-тэй үгийг олдоггүй (2026-10-23 бодит шалгалт: «толбор», «тулбур» → 0). Тиймээс owner хэсгийн
// хуудас бүрийн төгсгөлд хураалттай «Хайлтын түлхүүр үг» хэсэг нэмнэ: ү/ө-тэй үгийн у/о хувилбар +
// frontmatter keywords (харилцагчийн хэллэг). Crawler харагдах DOM текстийг индекслэдэг тул <details> дотор байрлуулна.
// Хамрах хүрээ: зөвхөн docs/owner/ — түрээслэгчийн хэсгийг хөндөхгүй.
const fs = require('fs');

const MAP = { 'ү': 'у', 'Ү': 'У', 'ө': 'о', 'Ө': 'О' };

/** «шүүлт» → «шуулт»; ү/ө-гүй үг → null. */
function variantOf(word) {
  if (!/[үҮөӨ]/.test(word)) return null;
  return word.replace(/[үҮөӨ]/g, (c) => MAP[c]);
}

/** Текстийн ү/ө-тэй үг бүрийн у/о хувилбар (давхардалгүй, жижиг үсгээр). */
function variantsOf(text) {
  const out = new Set();
  for (const w of text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []) {
    const v = variantOf(w);
    if (v) out.add(v);
  }
  return [...out];
}

/** Frontmatter-ийн `keywords:` жагсаалт (docusaurus vfile-д frontmatter дамжуулдаггүй тул файлаас уншина). */
function keywordsOf(source) {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
  if (!fm) return [];
  const block = /^keywords:\r?\n((?:\s+-\s.*\r?\n?)*)/m.exec(fm[1]);
  if (!block) return [];
  return block[1].split(/\r?\n/).map((l) => l.replace(/^\s+-\s*/, '').replace(/^["']|["']$/g, '').trim()).filter(Boolean);
}

function textOf(node) {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value;
  return (node.children || []).map(textOf).join(' ');
}

const clean = (s) => s.replace(/[{}<>`\\]/g, ' ').replace(/\s+/g, ' ').trim();

const isOwnerDoc = (p) => /[\\/]docs[\\/]owner[\\/]/.test(p || '');

function plugin() {
  return (tree, file) => {
    const path = file.path || file.history?.[0];
    if (!isOwnerDoc(path)) return;
    let keywords = [];
    try { keywords = keywordsOf(fs.readFileSync(path, 'utf8')); } catch { /* файлгүй (тест) */ }
    const words = [...keywords, ...variantsOf([textOf(tree), ...keywords].join(' '))].map(clean).filter(Boolean);
    if (!words.length) return;
    tree.children.push({
      type: 'jsx',
      value: `<details className="search-keywords"><summary>Хайлтын түлхүүр үг</summary><p>${words.join(' · ')}</p></details>`,
    });
  };
}

module.exports = plugin;
module.exports.variantOf = variantOf;
module.exports.variantsOf = variantsOf;
module.exports.keywordsOf = keywordsOf;
module.exports.isOwnerDoc = isOwnerDoc;
