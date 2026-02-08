# OllamaPilot — Development Guide

## Project Overview

`om` is a zero-dependency Node.js CLI for managing local Ollama models. It wraps the Ollama REST API with a polished terminal UI.

## Architecture

```
bin/om.js              Command router, help screen, tab completion, model launcher
lib/ollama.js          All Ollama API calls (fetch-based, no deps)
lib/ui.js              ANSI colors, Unicode symbols, box drawing, formatters
lib/resolve.js         Model number/name resolution (shared by all commands)
lib/notes.js           Notes CRUD → ~/.config/om/notes.json
lib/models.json        Static catalog with descriptions + perf data for known models
lib/commands/
  list.js              Default command — parallel /api/show, quant tags, notes
  ps.js                Loaded models table (--ps)
  info.js              Model details via /api/show
  bench.js             Benchmark via /api/generate (stream: false)
  pull.js              Pull with streaming progress via /api/pull
  rm.js                Delete with confirmation via DELETE /api/delete
  unload.js            Unload via /api/generate with keep_alive: 0
  note.js              Personal notes CRUD
scripts/postinstall.js Auto-install shell tab completion
```

## Key Patterns

- **Zero dependencies** — only Node.js built-ins and `fetch()`. No chalk, no commander, no inquirer.
- **Lazy dynamic imports** — `bin/om.js` uses `await import()` so only the invoked command module loads.
- **Model resolution** — all commands that take `<n|name>` use `lib/resolve.js`. Supports 1-indexed numbers, exact name match, and `startsWith` prefix match.
- **Parallel fetches** — `list.js` uses `Promise.all` to call `/api/show` for every model concurrently.
- **Streaming NDJSON** — `pullModel()` reads the response body as a stream, parsing newline-delimited JSON chunks for progress updates.
- **ANSI via raw codes** — `lib/ui.js` exports constants (`BOLD`, `DIM`, `GREEN`, etc.) and helper functions (`header()`, `separator()`, `kvRow()`, `box()`, `tag()`, `progressBar()`). Always use these instead of hardcoding escape sequences.
- **Symbols** — use `SYM.check`, `SYM.cross`, `SYM.bolt`, etc. from `lib/ui.js` instead of emoji.

## Ollama API Endpoints

| Function | Method | Endpoint | Notes |
|----------|--------|----------|-------|
| `listModels()` | GET | `/api/tags` | Returns `{ models: [...] }` |
| `getLoaded()` | GET | `/api/ps` | Running models with VRAM info |
| `showModel(name)` | POST | `/api/show` | Metadata: family, params, quant, template, license |
| `generate(name, prompt)` | POST | `/api/generate` | `stream: false` returns eval stats in nanoseconds |
| `unloadModel(name)` | POST | `/api/generate` | `keep_alive: 0` + empty prompt |
| `pullModel(name, cb)` | POST | `/api/pull` | Streaming NDJSON with `{ status, total, completed }` |
| `deleteModel(name)` | DELETE | `/api/delete` | Permanent removal |

All API calls go through `lib/ollama.js`. The base URL comes from `OLLAMA_HOST` env var (default `127.0.0.1:11434`).

## Adding a New Command

1. Create `lib/commands/mycommand.js` exporting `default async function mycommand(args)`.
2. Register it in the `COMMANDS` object in `bin/om.js`.
3. If it takes a model argument, add it to the `MODEL_CMDS` set (for tab completion).
4. Add it to `SUBCMDS` array (for tab completion).
5. Add a line in `showHelp()`.
6. Use `resolveModel(args[0])` for model resolution.
7. Use UI helpers from `lib/ui.js` — `header()`, `kvRow()`, `separator()`, `SYM`, colors.

## Adding a New API Method

1. Add the function to `lib/ollama.js`.
2. Follow the existing pattern: construct URL from `BASE`, use `fetch()`, throw on `!res.ok`.

## User Data Locations

- `~/.config/om/notes.json` — personal notes per model
- `~/.config/om/completions.sh` — auto-generated shell completion script

## Testing

No test framework — verify manually:

```bash
node --check bin/om.js                    # Syntax check
node --check lib/ui.js
for f in lib/commands/*.js; do node --check "$f"; done

om                          # Enhanced list
om 1                        # Run by number
om info 1                   # Model details
om bench 1                  # Benchmark
om --ps                     # Loaded models
om pull qwen3:8b            # Pull with progress
om rm 4                     # Delete with confirm
om unload                   # Free VRAM
om note 1 "test note"       # Set note
om note 1                   # View note
om note 1 --clear           # Clear note
om --help                   # Help screen
om --completions            # Raw completion output
```

## Style Conventions

- ES modules (`"type": "module"` in package.json)
- No semicolons at end of `import`/`export` — actually, semicolons are used everywhere. Be consistent.
- 2-space indent
- Single default export per command file
- Colors/symbols always from `lib/ui.js`, never hardcoded ANSI in commands
- Exit via `process.exit()` only in `bin/om.js` or for fatal errors in commands
