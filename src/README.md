# Source Layout

Runtime code lives here.

Current structure:

- `cli.js`: executable entrypoint.
- `main.js`: command parsing and routing.
- `modules/`: feature modules, browser-profile helpers, output helpers, and page parsers.

The implemented campus modules are:

- `notice`: homepage list, paged full-list queries, site-backed search, detail-page view, and attachment download.
- `course`: eHall timetable status, current term list, and today's courses.
- `grade`: eHall grade status, list, and term filtering.
- `electricity`: direct intranet electricity status, campus/building discovery, and room usage query.
