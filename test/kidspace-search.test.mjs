import { test } from 'node:test';
import assert from 'node:assert/strict';
import { norm, search } from '../kidspace-site/src/search-core.mjs';

const index = [
  { url: '/tolboriin-huvaar', title: 'Төлбөрийн хуваарь', label: 'Хуваарь', keywords: ['алгассан'], headings: [{ text: 'Бүтэн өвчтэй сарын дараа', id: 'ene-saraar' }] },
  { url: '/ger-bul', title: 'Гэр бүл', label: 'Гэр бүл', keywords: ['асран хамгаалагч'], headings: [] },
];

test('kidspace-search: ө/ү үсгийг тэгшитгэнэ', () => {
  assert.equal(norm('Өвчтэй Үүсгэх'), 'овчтэй уусгэх');
});

test('kidspace-search: гарчгаар олдоно, дэд гарчгаар анкор руу', () => {
  assert.equal(search(index, 'гэр бүл')[0].url, '/ger-bul');
  assert.equal(search(index, 'бутэн овчтэй')[0].url, '/tolboriin-huvaar#ene-saraar');
  assert.equal(search(index, 'асран')[0].url, '/ger-bul');
});

test('kidspace-search: бүх үг таарах ёстой, 2-оос богино үг тоологдохгүй', () => {
  assert.deepEqual(search(index, 'гэр хуваарь'), []);
  assert.deepEqual(search(index, 'а'), []);
});
