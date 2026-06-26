# Installation

This project is distributed as one npm package that contains both the `szu-cli` CLI and the optional `szu-campus` agent skill.

## Install The CLI

For the alpha channel:

```bash
npm install -g szu-cli@alpha
```

For a local package tarball:

```bash
npm install -g ./szu-cli-0.1.0-alpha.1.tgz
```

Verify the CLI:

```bash
szu-cli --version
szu-cli doctor --json
```

## Install The Codex Skill

The npm package includes `skills/szu-campus`, but it is not copied into an agent directory during `npm install`. Install it explicitly:

```bash
szu-cli setup codex
```

This copies the bundled skill to the Codex-visible personal skill directory:

```text
~/.agents/skills/szu-campus
```

You can inspect the bundled skill path without installing:

```bash
szu-cli skill path --json
```

You can also install only the skill:

```bash
szu-cli skill install --target codex --json
```

For tests or custom agent directories, override the target directory:

```bash
szu-cli skill install --target codex --dir ./tmp/skills --json
szu-cli setup codex --skill-dir ./tmp/skills --json
```

## First Login

The CLI does not store passwords. Open a persistent browser profile and complete login in the browser:

```bash
szu-cli auth login
szu-cli auth status --json
```

On Windows, the default browser channel is Chrome. To use Edge:

```powershell
$env:SZU_BROWSER_CHANNEL='msedge'
szu-cli auth login
```

## Network Notes

- Direct campus-network access is supported first.
- Some commands require a logged-in browser profile.
- Electricity queries currently require campus intranet access.
- WebVPN support is not implemented yet.
- Academic database commands require `--headed`.
