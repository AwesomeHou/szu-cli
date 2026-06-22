# Source Layout

Runtime code lives here.

Current structure:

- `cli.js`: executable entrypoint.
- `main.js`: command parsing and routing.
- `modules/`: feature modules, browser-profile helpers, output helpers, and page parsers.

The first implemented campus module is `notice`, covering homepage list/search and detail-page view.
