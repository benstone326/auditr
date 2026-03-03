import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const distIndexPath = join(process.cwd(), 'dist', 'index.html');

let html;
try {
  html = readFileSync(distIndexPath, 'utf8');
} catch (error) {
  console.error(`Could not read ${distIndexPath}. Run \`npm run build\` first.`);
  process.exit(1);
}

const hasRelativeAssets = /(?:src|href)="\.\/assets\//.test(html);

if (!hasRelativeAssets) {
  console.error('dist/index.html does not contain relative ./assets/ paths.');
  process.exit(1);
}

console.log('dist/index.html contains relative ./assets/ paths.');
