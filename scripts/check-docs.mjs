import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['README.md', 'README_EN.md', 'AGENTS.md', 'docs', 'skills'];
const forbidden = [/\bTBD\b/i, /\bTODO\b/i];
const files = [];

function collect(path) {
  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(path)) {
      collect(join(path, entry));
    }
    return;
  }

  if (path.endsWith('.md')) {
    files.push(path);
  }
}

for (const root of roots) {
  collect(root);
}

let failed = false;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(text)) {
      console.error(`${file}: contains forbidden placeholder pattern ${pattern}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Checked ${files.length} markdown files.`);
