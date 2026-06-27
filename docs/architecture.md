# Architecture

szu-cli CLI should be designed as a stable command surface with replaceable execution internals.

## Layers

```text
Human or agent
  -> szu-cli CLI
  -> command module
  -> gateway resolver
  -> browser backend
  -> campus web system
```

## CLI Layer

Responsibilities:

- Parse commands and flags.
- Route to feature modules.
- Render human-readable output by default.
- Render stable JSON when `--json` is passed.
- Map internal failures to stable error codes and exit codes.

Agents should depend only on this layer.

## Command Modules

Each campus capability should live in its own module.

Planned modules:

- `doctor`: local environment checks.
- `auth`: login status and login flow.
- `notice`: campus notice list and search.
- `course`: schedule lookup.
- `program`: all-school training program lookup.
- `timetable`: all-school class timetable lookup.
- `grade`: grade lookup.
- `growth`: Growth Record GPA, credit, and ranking lookup.
- `ideology`: ideological education and social-practice credit lookup.
- `completion`: training-plan calculation, module completion, and module course lookup.
- `electricity`: electricity balance lookup.
- `gym`: availability and reservation flows.

Modules should not print directly. They should return structured results.

## Gateway Resolver

Some services are available only on campus network or through WebVPN.

The gateway resolver decides:

- direct campus URL,
- WebVPN URL,
- or a structured error if neither path is available.

Initial implementation can support direct URLs only. WebVPN should be added behind the same resolver interface.

## Browser Backend

The preferred backend is Playwright with a persistent browser profile:

```text
~/.szu-cli/browser-profile/
```

The user logs in through the normal browser UI. The CLI reuses that local profile for later commands.

Backend responsibilities:

- Open pages.
- Detect login pages.
- Wait for meaningful page state.
- Extract visible DOM or stable network responses.
- Avoid high-frequency polling.

## Adapter Strategy

Each campus page should have a small adapter that describes:

- entry URL,
- login-required signals,
- selectors or response shapes,
- parsing rules,
- normalized output schema,
- known failure modes.

For the first notice adapter, the expected source is the rendered board page:

```text
https://www1.szu.edu.cn/board/
```

The adapter should parse visible notice sections and links before relying on undocumented internal endpoints.

## Skill Layer

Skills are optional guidance for agents. They should explain how to call `szu-cli`, how to interpret errors, and what not to do.

Skills must not duplicate core browser automation logic.
