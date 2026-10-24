const { test } = require('node:test');
const assert = require('node:assert/strict');
const plugin = require('../plugins/search-variants');

test('variantOf: ү→у, ө→о; ү/ө-гүй үг → null', () => {
  assert.equal(plugin.variantOf('төлбөр'), 'толбор');
  assert.equal(plugin.variantOf('шүүлт'), 'шуулт');
  assert.equal(plugin.variantOf('гэрээ'), null);
});

test('variantsOf: давхардалгүй, жижиг үсгээр', () => {
  assert.deepEqual(plugin.variantsOf('Шүүлт шүүлт, Өмнөх гэрээ'), ['шуулт', 'омнох']);
});

test('keywordsOf: frontmatter keywords жагсаалт', () => {
  const src = '---\nsidebar_position: 1\nkeywords:\n  - "Гэрээ устсан"\n  - "Хуулга харагдахгүй"\n---\n# Т';
  assert.deepEqual(plugin.keywordsOf(src), ['Гэрээ устсан', 'Хуулга харагдахгүй']);
  assert.deepEqual(plugin.keywordsOf('# гарчиг'), []);
});

test('plugin: зөвхөн docs/owner/ — түрээслэгчийн хуудсыг хөндөхгүй', () => {
  const tree = () => ({ type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Төлбөр {x} шүүлт' }] }] });
  const tenant = tree();
  plugin()(tenant, { path: 'E:\site\docs\account\change-number.md' });
  assert.equal(tenant.children.length, 1);
  const owner = tree();
  plugin()(owner, { path: '/site/docs/owner/none.md' });
  const jsx = owner.children.at(-1);
  assert.equal(jsx.type, 'jsx');
  assert.match(jsx.value, /^<details className="search-keywords"><summary>Хайлтын түлхүүр үг<\/summary><p>толбор · шуулт<\/p><\/details>$/);
});
