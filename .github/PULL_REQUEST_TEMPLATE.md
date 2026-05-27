<!-- Thanks for contributing! Please keep PRs to one topic. -->

## What & why

<!-- What does this change and why? Link any related issue. -->

## Checklist

- [ ] One topic per PR.
- [ ] Public API unchanged (`FV.open` / `FV.on` / `FV.close` + event names), or the break is called out above and justified.
- [ ] No new runtime dependencies in `embed.js`; no syntax that breaks older browsers (ES5 / `var`).
- [ ] Local checks pass: `node --check embed.js`, `node --check examples/express/server.js`, `python3 -m py_compile examples/fastapi/app.py`.
- [ ] `CHANGELOG.md` updated under `## [Unreleased]` (if user-facing).
