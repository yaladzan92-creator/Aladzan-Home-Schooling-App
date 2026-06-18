import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = process.cwd();
const indexPath = resolve(root, 'docs', 'index.html');
const fallbackPath = resolve(root, 'docs', '404.html');

await mkdir(dirname(fallbackPath), { recursive: true });
await copyFile(indexPath, fallbackPath);
