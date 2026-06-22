# Roadmap

## Stage 0: Skeleton

Deliverables:

- Repository docs.
- Agent guide.
- CLI contract.
- Login-state design.
- Skill integration design.

Exit criteria:

- A new contributor can understand the project direction without relying on prior chat context.

## Stage 1: CLI Foundation

Deliverables:

- `szu doctor --json`.
- Version output.
- JSON envelope helpers.
- Structured error helpers.
- Basic test setup.

Exit criteria:

- CLI can report environment readiness in a stable schema.

Status:

- Minimal `--version`, `doctor --json`, and structured unsupported-command handling are implemented.

## Stage 2: Browser Login Profile

Deliverables:

- Playwright dependency.
- Persistent profile path.
- `szu auth login`.
- `szu auth status --json`.

Exit criteria:

- User can log in manually once and reuse that browser profile.

Status:

- `auth status --json` and `auth login` command shape are implemented.
- `auth login` launches a Playwright persistent profile when Playwright is installed.

## Stage 3: Notice MVP

Deliverables:

- `szu notice list --limit <n> --json`.
- `szu notice search <keyword> --json`.
- `szu notice view <id|url> --json`.
- `szu notice download <id|url> --dir <path> --json`.
- Redacted fixtures.
- Parser tests.

Exit criteria:

- A local agent can query campus notices without knowing browser details.

Status:

- `notice list --json`, `notice search <keyword> --json`, `notice view <id|url> --json`, and `notice download <id|url> --json` are implemented.
- The first version parses visible homepage notices only.

## Stage 4: More Read-Only Services

Deliverables:

- Course schedule.
- Grades.
- Electricity balance.
- WebVPN gateway support.

Exit criteria:

- Common read-only campus tasks are available through stable commands.

## Stage 5: Controlled Actions

Candidate:

- Gym availability.
- Gym reservation dry-run.
- Gym reservation confirmed submission.

Exit criteria:

- State-changing commands have dry-run, confirmation, and audit output.

## Stage 6: Packaging

Deliverables:

- npm package.
- Skill package.
- Installation docs.
- CI tests.

Exit criteria:

- CLI and skill can update independently.
