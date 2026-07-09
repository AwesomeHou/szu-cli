# Privacy And Safety

This skill handles user-account campus data. Prefer the least data that answers the task.

## Credentials And Session State

- Do not ask for the user's password.
- Do not request cookies, tokens, browser profile files, traces, screenshots, or HAR files.
- Use the persistent browser profile through `szu-cli`; do not manage login state in the skill.

## Private Data

- Treat grades, GPA, professional ranking, student identity, completion status, lecture progress, sports reservations, and OPAC history as private.
- Do not expose student name, student number, internal IDs, or raw user profiles unless the user explicitly asks and the CLI returns them.
- Summarize only the fields needed for the user's task.
- Avoid pasting complete records when a count, status, remaining value, or filtered subset answers the question.

## Downloads

- Do not batch download academic database PDFs, CAJ files, original full text, or notice attachments.
- Do not construct hidden direct links or bypass provider controls.
- Use only supported CLI download commands for a single user-requested item or attachment.
- Keep downloaded files in a user-requested directory; do not move them into Git-tracked docs unless asked.

## Actions

- Prefer read-only commands.
- Do not submit state-changing campus actions unless the user explicitly confirms.
- Any state-changing command must support `--dry-run`; use it first.
- For `sports reserve` and `sports cancel`, do not run `--confirm` unless the user explicitly asks for one exact reservation or order. Do not cancel payments, pay automatically, or retry repeatedly.
