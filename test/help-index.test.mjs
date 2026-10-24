import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageOf, slugify, frontMatter } from '../scripts/help-index-lib.mjs';

test('slugify: Docusaurus-тай ижил кирилл анхор', () => {
  assert.equal(slugify('Түгээмэл алдаа'), 'түгээмэл-алдаа');
  assert.equal(slugify('Энэ юунд хэрэгтэй?'), 'энэ-юунд-хэрэгтэй');
});

test('pageOf: зам, гарчиг, дэд гарчиг, текст (зураг/холбоосгүй), түлхүүр үг', () => {
  const src = '---\nsidebar_position: 2\nkeywords:\n  - "Гэрээ устсан"\n---\n\n# Жагсаалт хоосон\n\n![](<img/a b.gif>)\n\n## Алхам\n1. **Шүүлт** [цэвэрлэх](./x.md)\n';
  const p = pageOf(String.raw`owner\jagsaalt.md`, src); // Windows-ийн зам
  assert.equal(p.url, '/owner/jagsaalt');
  assert.equal(p.title, 'Жагсаалт хоосон');
  assert.deepEqual(p.headings, [{ text: 'Алхам', anchor: 'алхам' }]);
  assert.equal(p.text, 'Жагсаалт хоосон Алхам 1. Шүүлт цэвэрлэх');
  assert.deepEqual(p.keywords, ['Гэрээ устсан']);
});

test('pageOf: slug frontmatter (нүүр хуудас) ба зайтай файлын нэр', () => {
  assert.equal(pageOf('payment.md', '---\nslug: /\n---\n# Төлбөр').url, '/');
  assert.equal(pageOf('workspace/reguest-obect copy.md', '# Санал').url, '/workspace/reguest-obect%20copy');
  assert.deepEqual(frontMatter('# x').data, {});
});
