// help.spacehub.mn-ийн бодит хайлт (Algolia DocSearch) — 14 асуулт; хүлээгдэх хуудас эхний 5 үр дүнд байх ёстой.
// Netlify deploy + Algolia crawler дууссаны ДАРАА ажиллуулна: `npm run test:search`. Сүлжээ шаардлагатай.
// Түлхүүр нь зөвхөн хайх эрхтэй нийтийн түлхүүр (docusaurus.config.js-тэй ижил).
const APP = '8DVP8D0IC2';
const INDEX = 'netlify_f748018c-10b7-485c-a27c-3fe997fb2032_main_all';
const KEY = '154dfc27f26a114116e6c31d66b4218c';

// [асуулт, хүлээгдэх замын эхлэл]
export const CASES = [
  ['шүүлт', '/owner/jagsaalt-hooson-shuult'],
  ['шуулт', '/owner/jagsaalt-hooson-shuult'],          // ү → у (2 үсэг)
  ['айл харагдахгүй', '/owner/jagsaalt-hooson-shuult'],
  ['гэрээ устсан', '/owner/jagsaalt-hooson-shuult'],    // харилцагчийн хэллэг (keywords)
  ['хугацаа', '/owner/hugatsaa-songoh'],
  ['омнох сар', '/owner/'],                             // ө → о
  ['эрхгүй', '/owner/erhgui-nevtreh'],
  ['эрхгуй', '/owner/erhgui-nevtreh'],                  // ү → у
  ['нэвтэрч чадахгүй', '/owner/erhgui-nevtreh'],
  ['төлбөр', '/'],
  ['толбор', '/'],                                      // ө → о (2 үсэг) — түрээслэгчийн хэсэгт хувилбаргүй тул ❌ байж болно
  ['тоолуурын заалт', '/lessor/'],
  ['нэхэмжлэх', '/lessor/contract/'],
  ['хөрш', '/workspace/view-neighbour-information'],
];

async function search(q) {
  const res = await fetch(`https://${APP}-dsn.algolia.net/1/indexes/${INDEX}/query`, {
    method: 'POST',
    headers: { 'X-Algolia-Application-Id': APP, 'X-Algolia-API-Key': KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ query: q, hitsPerPage: 5 }),
  });
  const d = await res.json();
  return (d.hits ?? []).map((h) => decodeURI(new URL(h.url, "https://help.spacehub.mn").pathname));
}

let fail = 0;
for (const [q, want] of CASES) {
  const paths = await search(q);
  const ok = paths.some((p) => (want === '/' ? p === '/' : p.startsWith(want)));
  if (!ok) fail++;
  console.log(`${ok ? '✅' : '❌'} ${q.padEnd(18)} → ${paths.join(', ') || '(хоосон)'}`);
}
console.log(`${CASES.length - fail}/${CASES.length} тэнцэв`);
process.exit(fail ? 1 : 0);
