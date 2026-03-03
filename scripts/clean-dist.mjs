import { rmSync } from 'node:fs';
import { join } from 'node:path';

const distPath = join(process.cwd(), 'dist');
rmSync(distPath, { recursive: true, force: true });
console.log('Removed dist directory (if it existed).');
