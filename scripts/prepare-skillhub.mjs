import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = resolve('skills/szu-cli-skill');
const target = resolve('scratch/skillhub-szu-cli-skill');
const metadata = JSON.parse(await readFile('scripts/skillhub-metadata.json', 'utf8'));

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });

const skillPath = resolve(target, 'SKILL.md');
const skillText = await readFile(skillPath, 'utf8');
const lines = Object.entries(metadata).map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
await writeFile(skillPath, skillText.replace(/^---\r?\n/, `---\n${lines.join('\n')}\n`), 'utf8');

console.log(target);
