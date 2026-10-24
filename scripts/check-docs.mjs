import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const roots = ['README.md', 'README_EN.md', 'AGENTS.md', 'docs', 'skills'];
const forbidden = [/\bTBD\b/i, /\bTODO\b/i, /\\\x60/];
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

const packageInfo = JSON.parse(readFileSync('package.json', 'utf8'));
const skillText = readFileSync('skills/szu-cli-skill/SKILL.md', 'utf8');
const frontmatter = skillText.match(/^---\r?\n([\s\S]*?)\r?\n---/);
assert(frontmatter, 'SKILL.md frontmatter is required');
for (const field of ['description', 'description_zh', 'description_en', 'version', 'author']) {
  assert(new RegExp(`^${field}:\\s*\\S`, 'm').test(frontmatter[1]), `${field} is required in SKILL.md`);
}
assert(new RegExp(`^version:\\s*${packageInfo.version.replaceAll('.', '\\.')}$`, 'm').test(frontmatter[1]), 'Skill version must match package.json');
assert(/^name:\s*szu-cli-skill$/m.test(frontmatter[1]), 'skill name is out of sync');
assert(skillText.includes('@references/'), 'SKILL.md must use @references/xxx.md references');

console.log(`Checked ${files.length} markdown files.`);
