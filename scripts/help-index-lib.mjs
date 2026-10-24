// help-index.json-ийн цэвэр функцүүд (scripts/help-index.mjs болон тест ашиглана).

/** Docusaurus (github-slugger)-тай ижил анхор: жижиг үсэг, үсэг/тоо/зай/зураас үлдээж, зайг «-» болгоно. */
export function slugify(text) {
  return text.trim().toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '').replace(/ /g, '-');
}

export function frontMatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  if (!m) return { data: {}, body: src };
  const data = {};
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([\w-]+):\s*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    if (kv[2] === '') {
      const list = [];
      while (i + 1 < lines.length && /^\s+-\s/.test(lines[i + 1])) list.push(lines[++i].replace(/^\s+-\s*/, '').replace(/^["']|["']$/g, ''));
      data[kv[1]] = list;
    } else data[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  }
  return { data, body: src.slice(m[0].length) };
}

/** Нэг md файл → индексийн мөр. rel = docs/-оос харьцангуй зам. */
export function pageOf(rel, src) {
  const { data, body } = frontMatter(src);
  const route = data.slug ?? '/' + rel.replace(/\\/g, '/').replace(/\.mdx?$/, '').replace(/\/index$/, '');
  const h1 = /^#\s+(.+)$/m.exec(body);
  const headings = [...body.matchAll(/^#{2,3}\s+(.+)$/gm)].map((m) => ({ text: m[1].trim(), anchor: slugify(m[1]) }));
  const text = body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')          // зураг
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')         // холбоос → текст
    .replace(/^#{1,6}\s+/gm, '').replace(/[*_`>|]/g, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return { title: data.title ?? h1?.[1].trim() ?? rel, url: encodeURI(route), headings, text, keywords: data.keywords ?? [] };
}

