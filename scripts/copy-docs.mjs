// copy-docs.mjs — docs/-ийг build/docs руу хуулна (аппын «?» энгийн markdown татдаг). Ноорог (draft: true) хуудсыг хуулахгүй.
import fs from 'node:fs';
import path from 'node:path';
import { isDraft } from './help-index-lib.mjs';

fs.cpSync('docs', 'build/docs', {
  recursive: true,
  // docs/kidspace = help.kidspace.mn-ийнх (тусдаа сайт), Spacehub аппын «?»-д хэрэггүй
  filter: (src) =>
    path.relative('docs', src).split(path.sep)[0] !== 'kidspace' &&
    (!/\.mdx?$/.test(src) || fs.statSync(src).isDirectory() || !isDraft(fs.readFileSync(src, 'utf8'))),
});
console.log('build/docs: ноорог хуудсыг алгасав');
