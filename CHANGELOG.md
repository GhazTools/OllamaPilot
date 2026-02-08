# Changelog

## 1.1.0

Full model management CLI with tab completion.

### New Commands

- **`om info <n|name>`** — Detailed model metadata: family, parameters, quantization, format, disk size, template, license
- **`om bench <n|name>`** — Quick benchmark: actual tok/s, prompt eval speed, load time, wall time
- **`om pull <model>`** — Pull a model with a streaming colored progress bar
- **`om rm <n|name>`** — Remove a model with y/N confirmation prompt
- **`om unload [n|name]`** — Unload a specific model (or all models) from VRAM
- **`om note <n|name> [text]`** — Set, view, or clear personal notes per model (stored in `~/.config/om/notes.json`)

### Enhanced List

- Parallel `/api/show` calls via `Promise.all` for live metadata (~250ms for 5 models)
- Quantization level shown as `[Q4_K_M]` tag next to each model
- Personal notes displayed inline with `✎` icon
- Fallback to API metadata (family, parameter_size) when no catalog entry exists

### Architecture

- Refactored from monolithic `bin/om.js` to command router pattern with lazy dynamic `import()`
- New shared modules: `lib/ui.js`, `lib/resolve.js`, `lib/notes.js`
- 8 command modules under `lib/commands/`
- 5 new API methods in `lib/ollama.js`: `showModel()`, `deleteModel()`, `generate()`, `unloadModel()`, `pullModel()`

### UI Polish

- Branded header with `◆` diamond and `━` thick underline
- Unicode symbols: `●` loaded, `⚡` tok/s, `✎` notes, `✔` success, `✖` delete confirm, `▸` hint arrow
- Thin `─` separators between models in the list
- Colored green `█` progress bar for pull
- Grouped help screen (Browse / Manage / Tools / Setup)
- Table layout for `--ps` with aligned columns and expiry time
- `kvRow()`, `header()`, `separator()`, `box()`, `tag()` helpers in `lib/ui.js`

### Tab Completion

- `--completions` hidden flag outputs completable words for shell integration
- `--setup-completions` prints the bash/zsh completion script
- `scripts/postinstall.js` auto-installs tab completion into `~/.zshrc` or `~/.bashrc` on `npm link` / `npm install -g`
- Context-aware: first position completes subcommands + model names; after `info`/`bench`/`rm`/`unload`/`note` completes only model names

### Other

- Bumped version to 1.1.0
- Updated README with all new commands and install instructions
- `lib/ollama.js` still exports legacy `formatSize()` for backward compatibility

## 1.0.0

Initial release — interactive Ollama model picker CLI.

- List installed models with descriptions, type, params, tok/s from built-in catalog
- Run models by number or name (partial match)
- `--ps` to show loaded models with VRAM usage
- Green `●` indicator for models currently in memory
- Respects `OLLAMA_HOST` environment variable
- Zero dependencies
