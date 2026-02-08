import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { listModels, getLoaded, showModel } from "../ollama.js";
import { getAllNotes } from "../notes.js";
import {
  RESET, BOLD, DIM, GREEN, CYAN, YELLOW, MAGENTA,
  header, separator, formatSize, tag, SYM,
} from "../ui.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(
  readFileSync(join(__dirname, "../models.json"), "utf-8")
);

function getInfo(name) {
  if (catalog[name]) return catalog[name];
  const base = name.split(":")[0];
  for (const [key, val] of Object.entries(catalog)) {
    if (key.split(":")[0] === base) return { ...val, description: val.description + " (variant)" };
  }
  return null;
}

export default async function list() {
  const [models, loaded] = await Promise.all([listModels(), getLoaded()]);
  if (models.length === 0) {
    console.log(`\n  ${DIM}No models installed.${RESET}\n`);
    return;
  }

  // Parallel fetch of model metadata
  const showResults = await Promise.all(
    models.map((m) => showModel(m.name).catch(() => null))
  );

  const notes = getAllNotes();
  const loadedNames = new Set(loaded.map((m) => m.name));

  console.log(header(`om ${DIM}${SYM.dot} Ollama Models${RESET}`));
  console.log();

  for (let i = 0; i < models.length; i++) {
    const m = models[i];
    const info = getInfo(m.name);
    const meta = showResults[i];
    const details = meta?.details || {};

    // Number badge
    const num = `${DIM}${String(i + 1).padStart(2)}${RESET}`;

    // Active indicator
    const active = loadedNames.has(m.name)
      ? ` ${GREEN}${SYM.bullet}${RESET}`
      : "";

    // Quant tag from live API
    const quant = details.quantization_level
      ? ` ${tag(details.quantization_level)}`
      : "";

    // Main line: number, name, size, quant, active
    console.log(`  ${num}  ${BOLD}${m.name}${RESET}  ${DIM}${formatSize(m.size)}${RESET}${quant}${active}`);

    // Description + stats from catalog
    if (info) {
      console.log(`      ${DIM}${info.description}${RESET}`);
      console.log(`      ${CYAN}${info.type}${RESET} ${DIM}${SYM.dot}${RESET} ${MAGENTA}${info.params}${RESET} ${DIM}${SYM.dot}${RESET} ${YELLOW}${SYM.bolt} ${info.tokPerSec} tok/s${RESET}`);
    } else if (details.family || details.parameter_size) {
      const parts = [];
      if (details.family) parts.push(`${CYAN}${details.family}${RESET}`);
      if (details.parameter_size) parts.push(`${MAGENTA}${details.parameter_size}${RESET}`);
      console.log(`      ${parts.join(` ${DIM}${SYM.dot}${RESET} `)}`);
    }

    // Personal note
    const noteText = notes[m.name];
    if (noteText) {
      console.log(`      ${YELLOW}${SYM.pencil} ${noteText}${RESET}`);
    }

    // Separator between models (not after last)
    if (i < models.length - 1) {
      console.log(separator());
    }
  }

  console.log(`\n  ${DIM}${SYM.arrow} om <number>  or  om <name>  to run${RESET}\n`);
}
