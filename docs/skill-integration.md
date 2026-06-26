# Skill Integration

The CLI and skill are shipped in the same npm package, but they remain separate at runtime.

## Division of Responsibility

```text
CLI
  -> performs campus operations
  -> owns browser automation
  -> owns parsing and JSON schemas

Skill
  -> teaches agents when and how to call the CLI
  -> documents safety boundaries
  -> explains error handling
```

The skill should not duplicate browser automation logic. Agents should call `szu-cli`.

## Installation Model

Recommended:

```bash
npm install -g szu-cli@alpha
szu-cli setup codex
```

`npm install` makes the `szu-cli` command available. `szu-cli setup codex` explicitly copies the bundled `skills/szu-campus` folder into the Codex-visible skill directory.

This keeps installation explicit while still giving users a one-command setup step after the CLI is installed:

```bash
npm update -g szu-cli
szu-cli setup codex
```

The skill can declare a minimum CLI version:

```text
Requires: szu-cli >= 0.1.0
```

## Can a Skill Install a CLI?

A skill can include installation instructions or a helper script, but it should not silently install executables. Installing a CLI changes the user's PATH and executes code, so it should be explicit.

Good:

```text
If `szu-cli` is missing, ask the user to install it with `npm install -g szu-cli@alpha`, then run `szu-cli setup codex`.
```

Avoid:

```text
Automatically install a global CLI when the skill is loaded.
```

## Agent Workflow

Agents should start with:

```bash
szu-cli doctor --json
szu-cli skill path --json
szu-cli auth status --json
```

If login is required:

```bash
szu-cli auth login
```

Then call read-only commands:

```bash
szu-cli notice search 奖学金 --json
szu-cli course today --json
szu-cli program list --limit 5 --json
szu-cli timetable classes --limit 5 --json
```

Agents must not loop aggressively or submit state-changing commands without confirmation.
