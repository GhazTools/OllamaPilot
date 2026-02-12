#!/usr/bin/env node
import { spawn } from "child_process";
import { listModels } from "../lib/ollama.js";
import { resolveModel } from "../lib/resolve.js";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";

const COMMANDS = {
  "--ps":   { mod: "../lib/commands/ps.js",     desc: "Show loaded models" },
  launch:   { mod: "../lib/commands/launch.js",  desc: "Launch model interactively" },
  info:     { mod: "../lib/commands/info.js",    desc: "Detailed model info" },
  bench:    { mod: "../lib/commands/bench.js",   desc: "Benchmark tok/s" },
  analyze:  { mod: "../lib/commands/analyze.js",  desc: "Analyze model speed" },
  compare:  { mod: "../lib/commands/compare.js",  desc: "Compare settings" },
  pull:     { mod: "../lib/commands/pull.js",    desc: "Pull a model" },
  rm:       { mod: "../lib/commands/rm.js",      desc: "Remove a model" },
  unload:   { mod: "../lib/commands/unload.js",  desc: "Unload model from VRAM" },
  note:     { mod: "../lib/commands/note.js",    desc: "Manage personal notes" },
  set:      { mod: "../lib/commands/set.js",     desc: "Configure model parameters" },
  optimize: { mod: "../lib/commands/optimize.js", desc: "Apply performance presets" },
};

// Commands that take a model name/number as their next argument
const MODEL_CMDS = new Set(["launch", "info", "bench", "analyze", "compare", "rm", "unload", "note", "set", "optimize"]);
const SUBCMDS = ["launch", "info", "bench", "analyze", "compare", "pull", "rm", "unload", "note", "set", "optimize", "--ps", "--help"];

async function completions(args) {
  const pos = args.length; // how many args after --completions
  const prev = args[0];

  // Position 1 after a subcommand that takes a model → complete model names
  if (pos >= 1 && MODEL_CMDS.has(prev)) {
    try {
      const models = await listModels();
      for (const m of models) console.log(m.name);
    } catch { /* ollama unreachable, output nothing */ }
    process.exit(0);
  }

  // Position 0 (or first arg) → subcommands + model names
  try {
    const models = await listModels();
    for (const cmd of SUBCMDS) console.log(cmd);
    for (const m of models) console.log(m.name);
  } catch {
    // Ollama down — still complete subcommands
    for (const cmd of SUBCMDS) console.log(cmd);
  }
  process.exit(0);
}

function setupCompletions() {
  const shell = process.env.SHELL || "";
  if (shell.includes("zsh")) {
    console.log(`# Add this to your ~/.zshrc:
_om() {
  local -a words
  words=("\${(@f)$(om --completions "\${words[2,-1]}" 2>/dev/null)}")
  compadd -a words
}
compdef _om om`);
  } else {
    console.log(`# Add this to your ~/.bashrc:
_om() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local prev="\${COMP_WORDS[1]}"
  if [ "\$COMP_CWORD" -ge 2 ]; then
    COMPREPLY=($(compgen -W "$(om --completions "\$prev" 2>/dev/null)" -- "\$cur"))
  else
    COMPREPLY=($(compgen -W "$(om --completions 2>/dev/null)" -- "\$cur"))
  fi
}
complete -F _om om`);
  }
  process.exit(0);
}

function showHelp() {
  console.log();
  console.log(`  ${BOLD}${CYAN}◆${RESET} ${BOLD}om${RESET} ${DIM}· Ollama model manager${RESET}`);
  console.log(`  ${DIM}${"━".repeat(44)}${RESET}`);
  console.log();
  console.log(`  ${GREEN}Browse${RESET}`);
  console.log(`    ${BOLD}om${RESET}                    ${DIM}List all models${RESET}`);
  console.log(`    ${BOLD}om${RESET} ${CYAN}<n|name>${RESET}           ${DIM}Run model interactively${RESET}`);
  console.log(`    ${BOLD}om --ps${RESET}               ${DIM}Loaded models + VRAM usage${RESET}`);
  console.log(`    ${BOLD}om info${RESET} ${CYAN}<n|name>${RESET}      ${DIM}Details (family, quant, template)${RESET}`);
  console.log(`    ${BOLD}om analyze${RESET} ${CYAN}<n|name>${RESET}   ${DIM}Speed analysis + suggestions${RESET}`);
  console.log();
  console.log(`  ${GREEN}Launch${RESET}`);
  console.log(`    ${BOLD}om launch${RESET} ${CYAN}<n|name>${RESET}   ${DIM}Launch model (alias for run)${RESET}`);
  console.log(`    ${BOLD}om launch${RESET} ${CYAN}--model <name>${RESET} ${DIM}Launch specific model${RESET}`);
  console.log();
  console.log(`  ${GREEN}Manage${RESET}`);
  console.log(`    ${BOLD}om pull${RESET} ${CYAN}<model>${RESET}       ${DIM}Pull with progress bar${RESET}`);
  console.log(`    ${BOLD}om rm${RESET} ${CYAN}<n|name>${RESET}        ${DIM}Remove model${RESET}`);
  console.log(`    ${BOLD}om unload${RESET} ${CYAN}[n|name]${RESET}    ${DIM}Free VRAM (all if omitted)${RESET}`);
  console.log();
  console.log(`  ${GREEN}Performance${RESET}`);
  console.log(`    ${BOLD}om bench${RESET} ${CYAN}<n|name>${RESET}     ${DIM}Benchmark tok/s + load time${RESET}`);
  console.log(`    ${BOLD}om analyze${RESET} ${CYAN}<n|name>${RESET}   ${DIM}Speed analysis + optimization tips${RESET}`);
  console.log(`    ${BOLD}om compare${RESET} ${CYAN}<n|name>${RESET}   ${DIM}Test multiple settings${RESET}`);
  console.log(`    ${BOLD}om optimize${RESET} ${CYAN}<n|name>${RESET} ${CYAN}fast${RESET} ${DIM}Apply speed preset${RESET}`);
  console.log();
  console.log(`  ${GREEN}Config${RESET}`);
  console.log(`    ${BOLD}om set${RESET} ${CYAN}<n|name>${RESET} ${CYAN}<param> <val>${RESET} ${DIM}Configure parameters${RESET}`);
  console.log(`    ${BOLD}om note${RESET} ${CYAN}<n|name>${RESET} ${CYAN}[text]${RESET} ${DIM}Set/view notes${RESET}`);
  console.log();
  console.log(`  ${GREEN}Setup${RESET}`);
  console.log(`    ${BOLD}om --setup-completions${RESET}  ${DIM}Print shell tab-completion script${RESET}`);
  console.log();
}

async function run(modelName) {
  console.log(`\n  ${BOLD}▸ Running ${modelName}${RESET}\n`);
  const child = spawn("ollama", ["run", modelName], { stdio: "inherit" });
  child.on("exit", (code) => process.exit(code ?? 0));
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === "--help" || cmd === "-h") {
    showHelp();
    process.exit(0);
  }

  if (cmd === "--completions") {
    await completions(args.slice(1));
  }

  if (cmd === "--setup-completions") {
    setupCompletions();
  }

  // No args — list models
  if (!cmd) {
    const { default: list } = await import("../lib/commands/list.js");
    await list();
    process.exit(0);
  }

  // Known command — dispatch
  if (COMMANDS[cmd]) {
    const { default: handler } = await import(COMMANDS[cmd].mod);
    await handler(args.slice(1));
    process.exit(0);
  }

  // Otherwise — run model by number or name
  let models;
  try {
    models = await listModels();
  } catch {
    console.error("Could not reach Ollama. Is it running?");
    process.exit(1);
  }

  const { model } = await resolveModel(cmd);
  if (!model) {
    console.error(`Model "${cmd}" not found. Run 'om' to list.`);
    process.exit(1);
  }

  await run(model.name);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
