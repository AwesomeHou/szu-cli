import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const connectorRoot = resolve('connectors/workbuddy');
const skillRoot = resolve('skills/szu-cli-skill');
const requiredConnectorFiles = ['connector-meta.json', 'cli.json', 'icon.svg'];
const packageInfo = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
const canonicalDescription = '通过自然语言完成公文通、课表、成绩、电费、图书馆文献查询，健身房预约，知网论文下载......能力涵盖公文通、深圳大学网上办事大厅、深圳大学图书馆内的10+个模块。（深大学生自行制作，非官方，如有任何问题可在github.com/AwesomeHou/szu-cli 上进行反馈或通过电子邮件与我取得联系）';

for (const file of requiredConnectorFiles) {
  await readFile(join(connectorRoot, file));
}

const meta = JSON.parse(await readFile(join(connectorRoot, 'connector-meta.json'), 'utf8'));
assert(meta.name === '深圳大学校园事务', 'connector name is out of sync');
assert(meta.name_en === 'Shenzhen University Campus Services', 'connector English name is out of sync');
assert(meta.description && meta.description_zh && meta.description_en, 'connector descriptions are required');
assert(meta.description === canonicalDescription && meta.description_zh === canonicalDescription, 'connector Chinese description is out of sync');
assert(meta.description_en.includes('github.com/AwesomeHou/szu-cli'), 'connector English feedback link is missing');
assert(meta.source === 'szu-cli', 'connector source must be szu-cli');
assert(/^[a-z0-9-]+$/.test(meta.source), 'connector source must use kebab-case');
assert(meta.type === 'cli', 'connector type must be cli');
assert(meta.version === packageInfo.version, 'connector version must match package.json');
assert(Array.isArray(meta.examples_zh) && meta.examples_zh.length >= 2, 'Chinese examples are required');
assert(Array.isArray(meta.examples_en) && meta.examples_en.length >= 2, 'English examples are required');

const icon = await readFile(join(connectorRoot, 'icon.svg'), 'utf8');
assert(icon.includes('<svg') && icon.includes('</svg>'), 'connector icon must be a valid SVG');

const cli = JSON.parse(await readFile(join(connectorRoot, 'cli.json'), 'utf8'));
assert(cli.runtime?.type === 'node' && cli.runtime?.version, 'Node runtime is required');
for (const platform of ['darwin', 'linux', 'win32']) {
  assert(cli.init?.[platform], `init.${platform} is required`);
  assert(cli.status?.[platform], `status.${platform} is required`);
  assert(cli.unAuth?.[platform], `unAuth.${platform} is required`);
  assert(cli.init[platform].includes(`szu-cli@${packageInfo.version}`), `init.${platform} is out of sync`);
}
assert(cli.auth?.includes('auth login'), 'auth login command is required');
assert(Object.values(cli.status).every((command) => command.includes('auth status')), 'status commands are out of sync');
assert(Object.values(cli.unAuth).every((command) => command.includes('auth logout')), 'unAuth commands are out of sync');
assert(cli.statusMatch || cli.statusMatchJson, 'statusMatch or statusMatchJson is required');

const skillText = await readFile(join(skillRoot, 'SKILL.md'), 'utf8');
const frontmatter = skillText.match(/^---\r?\n([\s\S]*?)\r?\n---/);
assert(frontmatter, 'SKILL.md frontmatter is required');
for (const field of ['description', 'description_zh', 'description_en', 'version', 'author']) {
  assert(new RegExp(`^${field}:\\s*\\S`, 'm').test(frontmatter[1]), `${field} is required in SKILL.md`);
}
assert(new RegExp(`^version:\\s*${packageInfo.version.replaceAll('.', '\\.')}$`, 'm').test(frontmatter[1]), 'Skill version must match package.json');
assert(/^name:\s*szu-cli-skill$/m.test(frontmatter[1]), 'skill name is out of sync');
assert(skillText.includes('@references/'), 'SKILL.md must use @references/xxx.md references');

console.log('WorkBuddy connector metadata, CLI config, and Skill metadata are valid.');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
