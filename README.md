# OllamaPilot

Interactive CLI for browsing and running your local [Ollama](https://ollama.com) models. See model specs, expected performance, and launch with a single command.

```
$ om

  Ollama Models

   1) qwen3-coder:30b-64k  ●  17.3 GB
      MoE coding model, 64k context. Tuned for Claude Code.
      MoE · 30.5B (3.3B active) · ~55 tok/s

   2) qwen3:14b  8.6 GB
      General-purpose model with thinking mode. Lighter weight.
      Dense · 14B · ~40 tok/s

   3) qwen2.5-coder:32b  18.5 GB
      Dense coding model. Slower but higher quality for complex tasks.
      Dense · 32B · ~11 tok/s

  Run: om <number> or om <name>
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

## Usage

### List models

```bash
om
```

Shows all installed Ollama models with descriptions, architecture type, parameter count, and expected tokens/second. A green `●` marks models currently loaded in memory.

### Run a model by number

```bash
om 1
```

Picks model #1 from the list and starts an interactive `ollama run` session.

### Run a model by name

```bash
om qwen3-coder
```

Fuzzy-matches installed model names — you don't need the full tag.

### Check loaded models

```bash
om --ps
```

Shows which models are currently loaded in VRAM/memory, their context length, and memory usage.

## Model Catalog

OllamaPilot ships with a built-in catalog (`lib/models.json`) that provides descriptions and performance data for known models. Unknown models still appear in the list — they just won't have extra metadata.

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

## License

MIT
