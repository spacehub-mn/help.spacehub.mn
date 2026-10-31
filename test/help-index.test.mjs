import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageOf, slugify, frontMatter, isDraft } from '../scripts/help-index-lib.mjs';

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

test('pageOf: «Гарчиг {#id}» — тусгай anchor ашиглана, текстээс хасна', () => {
  const src = '# Толь\n\n## Гэрээ {#geree}\nТайлбар.\n\n### «Хуваарилах...» {#huvaarilah}\n\n## Энгийн гарчиг\n';
  const p = pageOf('owner/glossary.md', src);
  assert.deepEqual(p.headings, [
    { text: 'Гэрээ', anchor: 'geree' },
    { text: '«Хуваарилах...»', anchor: 'huvaarilah' },
    { text: 'Энгийн гарчиг', anchor: 'энгийн-гарчиг' },
  ]);
  assert.ok(!p.text.includes('{#'));
});

test('isDraft: «draft: true» ноорог — хайлт, docs хуулбарт орохгүй', () => {
  assert.equal(isDraft('---\ntype: zaavar\ndraft: true\n---\n# A\n'), true);
  assert.equal(isDraft('---\r\ndraft: "true"\r\n---\r\n# A\r\n'), true);
  assert.equal(isDraft('---\ntype: zaavar\n---\n# A\n'), false);
  assert.equal(isDraft('# frontmatter-гүй\n'), false);
});
