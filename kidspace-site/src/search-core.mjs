// help.kidspace.mn хайлтын цөм (SearchBar ба test/kidspace-search.test.mjs). Монгол үсэг тэгшитгэнэ: ө→о, ү→у, ё→е.
export const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/ө/g, "о")
    .replace(/ү/g, "у")
    .replace(/ё/g, "е")
    .replace(/[«»"'.,:;!?()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Үг бүр (2+ тэмдэгт) гарчиг/нэр/keyword/дэд гарчгийн аль нэгэнд байх ёстой. Оноо: гарчиг 3 · keyword 2 · дэд гарчиг 1.
export function search(index, query, limit = 8) {
  const words = norm(query).split(" ").filter((w) => w.length >= 2);
  if (!words.length) return [];
  const out = [];
  for (const p of index) {
    const title = norm(`${p.title} ${p.label}`);
    const kw = norm((p.keywords || []).join(" "));
    const all = `${title} ${kw} ${norm((p.headings || []).map((h) => h.text).join(" "))}`;
    if (!words.every((w) => all.includes(w))) continue;
    let score = 0;
    for (const w of words) score += title.includes(w) ? 3 : kw.includes(w) ? 2 : 1;
    const head = (p.headings || []).find((h) => words.some((w) => norm(h.text).includes(w)) && !words.every((w) => title.includes(w)));
    out.push({ url: head?.id ? `${p.url}#${head.id}` : p.url, title: p.label || p.title, sub: head?.text, score });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
