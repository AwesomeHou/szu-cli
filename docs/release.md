# Release Checklist

The package publishes the CLI and the bundled `szu-campus` skill together. Skill installation is explicit through `szu setup codex`; the npm install step does not write agent configuration directories.

## Pre-Release Checks

Run:

```bash
npm test
npm run docs:check
npm pack --dry-run
```

Confirm the dry-run package includes:

- `src/cli.js`
- `src/main.js`
- `src/modules/`
- `skills/szu-campus/SKILL.md`
- `docs/`
- `README.md`
- `LICENSE`
- `AGENTS.md`

## Local Tarball Install Test

Create and install the tarball:

```bash
npm pack
npm install -g ./szu-cli-0.1.0-alpha.1.tgz
```

Verify:

```bash
szu --version
szu doctor --json
szu skill path --json
szu setup codex --json
```

Then initialize login manually:

```bash
szu auth login
szu auth status --json
```

## Publish Alpha

Use npm's alpha dist-tag:

```bash
npm publish --tag alpha
```

Users install with:

```bash
npm install -g szu-cli@alpha
szu setup codex
```

## Publish Stable

After alpha validation:

```bash
npm version 0.1.0
npm publish
```

Users install with:

```bash
npm install -g szu-cli
szu setup codex
```

## Safety Boundary

Do not publish a release that stores passwords, exports cookies, bypasses CAPTCHA, performs bulk academic downloads, or requires hidden provider URLs. Browser-backed commands must keep using normal user-visible flows.
