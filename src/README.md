# Source Layout

Runtime code will live here.

Planned structure:

- `cli/`: argument parsing and output rendering.
- `commands/`: feature modules such as `doctor`, `auth`, `notice`, and `course`.
- `browser/`: Playwright persistent-profile backend.
- `gateway/`: direct campus and WebVPN URL resolution.
- `schemas/`: shared JSON result and error schemas.
- `adapters/`: campus page parsers.
