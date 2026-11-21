import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transform } from '../kidspace-site/scripts/prep-docs.mjs';

const local = new Set(['honglolt', 'tolbor-nehemjleh']);

test('kidspace-prep: slug-ийн /kidspace угтвар хасагдана', () => {
  assert.match(transform('---\nslug: /kidspace\n---'), /^---\nslug: \/\n---$/);
  assert.match(transform('---\nslug: /kidspace/honglolt\n---'), /slug: \/honglolt\n/);
});

test('kidspace-prep: дотоод холбоос угтваргүй, анкор хэвээр', () => {
  assert.equal(transform('[a](/kidspace/honglolt#tsutslah) [b](/kidspace)', local), '[a](/honglolt#tsutslah) [b](/)');
});

test('kidspace-prep: Spacehub-ийн хуудас руу заасан холбоос help.spacehub.mn руу', () => {
  assert.equal(transform('[x](/owner/glossary)', local), '[x](https://help.spacehub.mn/owner/glossary)');
});

test('kidspace-prep: «Spacehub багт» → «KidSpace-ийн багт»', () => {
  assert.equal(transform('Spacehub багт хандаарай.'), 'KidSpace-ийн багт хандаарай.');
});

test('kidspace-prep: дэд хавтасны хуудасны дотоод хаяг slug-аас', async () => {
  const { localSlugOf } = await import('../kidspace-site/scripts/prep-docs.mjs');
  assert.equal(localSlugOf('---\nslug: /kidspace/concepts/elselt\n---', 'concepts/elselt.md'), 'concepts/elselt');
  assert.equal(localSlugOf('---\nslug: /kidspace\n---', 'index.md'), '');
  assert.equal(localSlugOf('---\ntitle: x\n---', 'asuult/tolbor.md'), 'asuult/tolbor');
  assert.equal(transform('[g](/kidspace/concepts/elselt#a)', new Set(['concepts/elselt'])), '[g](/concepts/elselt#a)');
});

test('kidspace-prep: хайлтын индексийн мөр — гарчиг, цэсний нэр, keywords, анкортой гарчиг', async () => {
  const { searchEntry } = await import('../kidspace-site/scripts/prep-docs.mjs');
  const md = '---\nslug: /kidspace/asuult/tolbor\nsidebar_label: Төлбөр\nkeywords:\n  - "төлбөр дахин бодох"\n---\n# Асуулт: төлбөр\n\n## Сар 0 ₮ {#algassan}\nx\n';
  const e = searchEntry(md, 'asuult/tolbor.md');
  assert.equal(e.url, '/asuult/tolbor');
  assert.equal(e.title, 'Асуулт: төлбөр');
  assert.equal(e.label, 'Төлбөр');
  assert.deepEqual(e.keywords, ['төлбөр дахин бодох']);
  assert.deepEqual(e.headings, [{ text: 'Сар 0 ₮', id: 'algassan' }]);
});
