# Skill Integration

The CLI and skill should be separate but complementary.

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

The skill should not duplicate browser automation logic. Agents should call `szu`.

## Installation Model

Recommended:

```bash
npm install -g szu-cli
```

Then install the skill into the agent's skill directory.

This keeps the CLI independently updateable:

```bash
npm update -g szu-cli
```

The skill can declare a minimum CLI version:

```text
Requires: szu-cli >= 0.1.0
```

## Can a Skill Install a CLI?

A skill can include installation instructions or a helper script, but it should not silently install executables. Installing a CLI changes the user's PATH and executes code, so it should be explicit.

Good:

```text
If `szu` is missing, ask the user to install it with `npm install -g szu-cli`.
```

Avoid:

```text
Automatically install a global CLI when the skill is loaded.
```

## Agent Workflow

Agents should start with:

```bash
szu doctor --json
szu auth status --json
```

If login is required:

```bash
szu auth login
```

Then call read-only commands:

```bash
szu notice search 奖学金 --json
szu course today --json
```

Agents must not loop aggressively or submit state-changing commands without confirmation.
