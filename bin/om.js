#!/usr/bin/env node
import { readFileSync } from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { listModels, getLoaded, formatSize } from "../lib/ollama.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(
  readFileSync(join(__dirname, "../lib/models.json"), "utf-8")
);

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const MAGENTA = "\x1b[35m";

function getInfo(name) {
  if (catalog[name]) return catalog[name];
  // try without tag
  const base = name.split(":")[0];
  for (const [key, val] of Object.entries(catalog)) {
    if (key.split(":")[0] === base) return { ...val, description: val.description + " (variant)" };
  }
  return null;
}

async function main() {
  const arg = process.argv[2];

  if (arg === "--help" || arg === "-h") {
    console.log(`${BOLD}om${RESET} — Ollama model picker\n`);
    console.log("Usage:");
    console.log("  om          List available models");
    console.log("  om <n>      Run model by number");
    console.log("  om <name>   Run model by name");
    console.log("  om --ps     Show loaded models");
    process.exit(0);
  }

  let models;
  try {
    models = await listModels();
  } catch {
    console.error("Could not reach Ollama. Is it running?");
    process.exit(1);
  }

  if (models.length === 0) {
    console.log("No models installed.");
    process.exit(0);
  }

  if (arg === "--ps") {
    const loaded = await getLoaded();
    if (loaded.length === 0) {
      console.log(`${DIM}No models loaded in memory.${RESET}`);
    } else {
      for (const m of loaded) {
        console.log(`${GREEN}●${RESET} ${BOLD}${m.name}${RESET}  ${DIM}ctx:${m.context_length || "?"}  vram:${formatSize(m.size_vram || m.size)}${RESET}`);
      }
    }
    process.exit(0);
  }

  // No arg — list models
  if (!arg) {
    const loaded = await getLoaded();
    const loadedNames = new Set(loaded.map((m) => m.name));

    console.log(`\n${BOLD}  Ollama Models${RESET}\n`);

    for (let i = 0; i < models.length; i++) {
      const m = models[i];
      const info = getInfo(m.name);
      const num = `${DIM}${String(i + 1).padStart(2)})${RESET}`;
      const active = loadedNames.has(m.name) ? ` ${GREEN}●${RESET}` : "";
      const name = `${BOLD}${m.name}${RESET}${active}`;
      const size = `${DIM}${formatSize(m.size)}${RESET}`;

      console.log(`  ${num} ${name}  ${size}`);

      if (info) {
        const desc = `     ${DIM}${info.description}${RESET}`;
        const stats = `     ${CYAN}${info.type}${RESET} ${DIM}·${RESET} ${MAGENTA}${info.params}${RESET} ${DIM}·${RESET} ${YELLOW}~${info.tokPerSec} tok/s${RESET}`;
        console.log(desc);
        console.log(stats);
      }
      console.log();
    }

    console.log(`  ${DIM}Run: om <number> or om <name>${RESET}\n`);
    process.exit(0);
  }

  // Pick by number or name
  let modelName;
  const n = parseInt(arg, 10);
  if (!isNaN(n) && n >= 1 && n <= models.length) {
    modelName = models[n - 1].name;
  } else {
    const match = models.find(
      (m) => m.name === arg || m.name.startsWith(arg + ":")
    );
    if (match) {
      modelName = match.name;
    } else {
      console.error(`Model "${arg}" not found. Run 'om' to list.`);
      process.exit(1);
    }
  }

  console.log(`${BOLD}Running ${modelName}${RESET}\n`);
  const child = spawn("ollama", ["run", modelName], { stdio: "inherit" });
  child.on("exit", (code) => process.exit(code ?? 0));
}

main();
