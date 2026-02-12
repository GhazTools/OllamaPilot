# OllamaPilot

Complete CLI for managing your local [Ollama](https://ollama.com) models — browse, benchmark, pull, remove, annotate, and manage VRAM.

```
$ om

  ◆ om · Ollama Models
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   1  qwen3-coder:30b-64k  17.3 GB  [Q4_K_M] ●
      MoE coding model, 64k context. Tuned for Claude Code.
      MoE · 30.5B (3.3B active) · ⚡ 120→55 tok/s
  ────────────────────────────────────────────
   2  qwen3:14b  8.6 GB  [Q4_K_M]
      General-purpose model with thinking mode. Lighter weight.
      Dense · 14B · ⚡ 58→23 tok/s

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
om launch claude      # Launch model explicitly (same as om <model>)
om launch --model claude  # Alternative syntax for launching
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
om bench devstral --ctx 2048  # Benchmark with specific context size
om bench 1 --temp 0.3 # Benchmark with custom temperature
om optimize claude fast  # Quick preset for maximum speed
om optimize 1 balanced   # Balanced speed/quality preset
om optimize --list    # Show all available presets
om note 1 "daily driver"  # Set a personal note
om note 1             # View note
om note 1 --clear     # Clear note
om set 1 num_ctx 2048 # Set context window size
om set 1 temperature 0.7  # Set temperature
om set --list         # Show all available parameters
om set 1 --clear      # Clear all custom parameters
```

Benchmarking automatically saves prompt processing and generation speeds to `lib/models.json`, displaying them as `⚡ 120→55 tok/s` (prompt→generation).

### Speed Optimization

Make models run faster with performance presets:

```bash
om optimize claude fast      # Maximum speed (2K context, 512 max tokens)
om optimize gpt-oss balanced # Balanced (4K context, 2K max tokens)
om optimize qwen3 quality    # Maximum quality (8K context, unlimited)
om optimize 1 chat           # Optimized for interactive chat
```

**Presets:**
- `fast` - ctx: 2048, predict: 512 - Fastest inference, smaller context
- `balanced` - ctx: 4096, predict: 2048 - Good speed/quality balance
- `quality` - ctx: 8192, predict: -1 - Best quality, slower
- `chat` - ctx: 4096, predict: 1024 - Interactive conversation

After optimizing, test with `om bench <model>` to see the speed improvement!

### Parameter Configuration

Set custom parameters for models to optimize for speed or capability:

```bash
om set qwen3 num_ctx 2048     # Smaller context = faster inference
om set claude temperature 0.7  # Adjust randomness
om set 1 --clear               # Remove custom parameters
```

Common parameters:
- `num_ctx` - Context window size (128-131072). Lower = faster, less memory.
- `temperature` - Randomness 0.0-1.0. 0 = deterministic, 1 = creative.
- `top_p` - Nucleus sampling (0.0-1.0)
- `top_k` - Top-k sampling (0-100)
- `repeat_penalty` - Reduce repetition (0.0-2.0)

Parameters are stored and shown when launching:
```bash
om launch 1           # Shows /set commands to run in Ollama
```

## Model Catalog

OllamaPilot ships with a built-in catalog (`lib/models.json`) that provides descriptions and performance data for known models. Unknown models still appear in the list with live metadata from the Ollama API (family, parameter size, quantization).

To add or update model info, edit `lib/models.json`:

```json
{
  "model-name:tag": {
    "description": "What this model is good at.",
    "promptTokPerSec": 120,
    "genTokPerSec": 50,
    "type": "Dense",
    "params": "7B"
  }
}
```

The `om bench` command automatically updates `promptTokPerSec` and `genTokPerSec` values with measured performance.

## Configuration

OllamaPilot respects the `OLLAMA_HOST` environment variable. If not set, it defaults to `127.0.0.1:11434`.

```bash
export OLLAMA_HOST="192.168.1.100:11434"
om
```

Personal notes are stored at `~/.config/om/notes.json`.

## License

MIT
