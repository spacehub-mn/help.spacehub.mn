// copy-docs.mjs — docs/-ийг build/docs руу хуулна (аппын «?» энгийн markdown татдаг). Ноорог (draft: true) хуудсыг хуулахгүй.
import fs from 'node:fs';
import path from 'node:path';
import { isDraft } from './help-index-lib.mjs';

fs.cpSync('docs', 'build/docs', {
  recursive: true,
  filter: (src) => !/\.mdx?$/.test(src) || fs.statSync(src).isDirectory() || !isDraft(fs.readFileSync(src, 'utf8')),
});
console.log('build/docs: ноорог хуудсыг алгасав');
