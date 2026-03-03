import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const nodeModulesPath = join(process.cwd(), 'node_modules');

if (existsSync(nodeModulesPath)) {
  process.exit(0);
}

console.log('node_modules not found. Installing dependencies with `npm install`...');
const result = spawnSync('npm', ['install'], { stdio: 'inherit', shell: process.platform === 'win32' });

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
