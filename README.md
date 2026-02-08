# OllamaPilot

Complete CLI for managing your local [Ollama](https://ollama.com) models — browse, benchmark, pull, remove, annotate, and manage VRAM.

```
$ om

  ◆ om · Ollama Models
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   1  qwen3-coder:30b-64k  17.3 GB  [Q4_K_M] ●
      MoE coding model, 64k context. Tuned for Claude Code.
      MoE · 30.5B (3.3B active) · ⚡ 55 tok/s
  ────────────────────────────────────────────
   2  qwen3:14b  8.6 GB  [Q4_K_M]
      General-purpose model with thinking mode. Lighter weight.
      Dense · 14B · ⚡ 40 tok/s

  ▸ om <number>  or  om <name>  to run
```

## Install

Requires [Node.js](https://nodejs.org) 18+ and [Ollama](https://ollama.com).

```bash
npm install -g ollama-pilot
```

Or clone and link locally:

```bash
git clone https://github.com/GhazTools/OllamaPilot.git
cd OllamaPilot
npm link
```

Tab completion for bash/zsh is installed automatically. Run `source ~/.zshrc` (or open a new terminal) to activate.

## Commands

### Browse

```bash
om                    # List all models with quant, notes, live metadata
om 1                  # Run model by number
om qwen3-coder        # Run model by name (partial match)
om --ps               # Show loaded models + VRAM + expiry
om info 1             # Model details (family, params, quant, template, license)
```

### Manage

```bash
om pull qwen3:8b      # Pull model with progress bar
om rm 4               # Remove model (with confirmation)
om unload             # Free all VRAM
om unload 1           # Unload specific model from VRAM
```

### Tools

```bash
om bench 1            # Benchmark tok/s, prompt eval, load time
om note 1 "daily driver"  # Set a personal note
om note 1             # View note
om note 1 --clear     # Clear note
```

## Model Catalog

OllamaPilot ships with a built-in catalog (`lib/models.json`) that provides descriptions and performance data for known models. Unknown models still appear in the list with live metadata from the Ollama API (family, parameter size, quantization).

To add or update model info, edit `lib/models.json`:

```json
{
  "model-name:tag": {
    "description": "What this model is good at.",
    "tokPerSec": 50,
    "type": "Dense",
    "params": "7B"
  }
}
```

## Configuration

OllamaPilot respects the `OLLAMA_HOST` environment variable. If not set, it defaults to `127.0.0.1:11434`.

```bash
export OLLAMA_HOST="192.168.1.100:11434"
om
```

Personal notes are stored at `~/.config/om/notes.json`.

## License

MIT
