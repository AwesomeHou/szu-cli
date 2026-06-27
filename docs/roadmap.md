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

- `szu-cli doctor --json`.
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
- `szu-cli auth login`.
- `szu-cli auth status --json`.

Exit criteria:

- User can log in manually once and reuse that browser profile.

Status:

- `auth status --json` and `auth login` command shape are implemented.
- `auth login` launches a Playwright persistent profile when Playwright is installed.

## Stage 3: Notice MVP

Deliverables:

- `szu-cli notice list --limit <n> --json`.
- `szu-cli notice list --page <n> --pages <n> --json`.
- `szu-cli notice search <keyword> --json`.
- Site search through the board search form.
- `szu-cli notice view <id|url> --json`.
- `szu-cli notice download <id|url> --dir <path> --json`.
- Redacted fixtures.
- Parser tests.

Exit criteria:

- A local agent can query campus notices without knowing browser details.

Status:

- `notice list --json`, paged list queries, site-backed `notice search <keyword> --json`, `notice view <id|url> --json`, and `notice download <id|url> --json` are implemented.

## Stage 4: More Read-Only Services

Deliverables:

- `szu-cli course status --json`.
- `szu-cli course list --json`.
- `szu-cli course today --json`.
- `szu-cli program status --json`.
- `szu-cli program list --json`.
- `szu-cli program item <id-or-planCode> --json`.
- `szu-cli timetable status --json`.
- `szu-cli timetable classes --json`.
- `szu-cli timetable view <classCode> --json`.
- `szu-cli grade status/list --json`.
- `szu-cli growth status/summary/list --json`.
- `szu-cli ideology status/summary --json`.
- Electricity balance.
- WebVPN gateway support.

Exit criteria:

- Common read-only campus tasks are available through stable commands.

Status:

- Course status, current timetable list, and today's timetable are implemented for direct campus/eHall access.
- Grade status and grade list are implemented for direct campus/eHall access, with `--term` filtering and student identity fields removed from normal output.
- Growth Record status, cumulative summary, and term/academic-year GPA and professional-ranking queries are implemented for direct eHall access.
- Ideology and Social Practice status and credit summary are implemented for direct eHall access.
- Electricity status, campus/building discovery, and room usage query are implemented for direct campus-network access. Payment is intentionally out of scope.
- Library OPAC status and catalog search are implemented with persistent-profile login reuse for search-history recording.
- CNKI and Wanfang headed-browser metadata search are implemented for direct campus/library access. CNKI and Wanfang support single-item visible-button PDF/full-text download MVPs; batch download, CAJ download, and hidden direct-link construction remain out of scope.

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
- Bundled `szu-campus` skill.
- `szu-cli skill path --json`.
- `szu-cli skill install --target codex --json`.
- `szu-cli setup codex --json`.
- Installation docs.
- Release checklist.

Exit criteria:

- A user can install the npm package, run `szu-cli setup codex`, and verify package contents with `npm pack --dry-run`.
