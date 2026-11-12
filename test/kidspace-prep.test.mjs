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
