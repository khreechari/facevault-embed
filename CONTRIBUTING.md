# Contributing

Thanks for taking the time to contribute! `embed.js` is tiny but load-bearing —
it runs inside arbitrary customer pages — so we ask for a bit of rigour to keep
it stable and safe.

## Repo layout

- `embed.js` — the drop-in loader. Vanilla ES5, no build step, no runtime
  dependencies. This is the file served at `app.facevault.id/embed.js`.
- `examples/html/` — minimal static markup + event listeners.
- `examples/fastapi/` — Python server that mints a `widget_token` server-side.
- `examples/express/` — Node 18+ server that does the same.
- `README.md` — integration guide and JavaScript API reference.

## Local development

`embed.js` needs no build — open `examples/html/index.html` after pasting a real
`widget_token` into the button, or run a server example end to end:

```bash
# FastAPI
cd examples/fastapi
pip install -r requirements.txt
cp ../../.env.example .env   # fill in FACEVAULT_API_KEY + FACEVAULT_SITE_ID
uvicorn app:app --reload

# Express (Node 18+)
cd examples/express
npm install
node server.js
```

CI syntax-checks `embed.js` and the examples on every push and pull request;
run the same checks locally before opening a PR:

```bash
node --check embed.js
node --check examples/express/server.js
python3 -m py_compile examples/fastapi/app.py
```

## Pull requests

- One topic per PR.
- **Keep the public API stable.** `FV.open` / `FV.on` / `FV.close` and the event
  names (`ready` / `progress` / `complete` / `error` / `cancel`) are a contract —
  renaming or removing them breaks every integrator in the wild. Adding new
  events or optional `opts` is fine.
- **Don't add runtime dependencies to `embed.js`,** and don't introduce modern
  syntax that breaks older browsers. The loader is injected into arbitrary
  exchange/merchant pages; every byte and every imported module increases the
  blast radius if something goes bad. The current ES5 / zero-deps setup is
  intentional.
- Add a `CHANGELOG.md` entry under `## [Unreleased]`. Bump nothing else —
  cutting a release (moving `[Unreleased]` to a version + tagging) is a
  maintainer step.
- The release workflow publishes the matching `CHANGELOG.md` section verbatim
  as the GitHub release body. Keep a blank line after each `###` heading and
  between bullets, and never wrap the section in a code fence.

## Code style

- `embed.js`: 4-space indent, single quotes, semicolons, `var` (ES5). Match the
  surrounding style — see the header comment in `embed.js` for tone.
- Comments explain *why*, not *what*.
- Examples are illustrative: keep them minimal and dependency-light.

## Reporting a security issue

See [SECURITY.md](SECURITY.md). Please do not open public issues for
security-relevant bugs.

## License

By contributing you agree your contribution will be licensed under the
[MIT License](LICENSE) — the same as the rest of the project.
