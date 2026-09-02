import { copyFile, cp, mkdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const connectorSource = resolve('connectors/workbuddy');
const skillSource = resolve('skills/szu-cli-skill');
const target = resolve('scratch/workbuddy-connector');
const skillTarget = join(target, 'skills', 'szu-cli-skill');

await rm(target, { recursive: true, force: true });
await mkdir(skillTarget, { recursive: true });

for (const file of ['connector-meta.json', 'cli.json', 'icon.svg']) {
  await copyFile(join(connectorSource, file), join(target, file));
}

await copyFile(join(skillSource, 'SKILL.md'), join(skillTarget, 'SKILL.md'));
await cp(join(skillSource, 'references'), join(skillTarget, 'references'), { recursive: true });

console.log(target);
