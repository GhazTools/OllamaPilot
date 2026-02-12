import { spawn } from "child_process";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { resolveModel } from "../resolve.js";
import { RESET, BOLD, DIM, CYAN, YELLOW, SYM } from "../ui.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODELS_FILE = join(__dirname, "../models.json");

function loadCatalog() {
  try {
    return JSON.parse(readFileSync(MODELS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function findModelKey(catalog, modelName) {
  if (catalog[modelName]) return modelName;
  const base = modelName.split(":")[0];
  return Object.keys(catalog).find((k) => k.split(":")[0] === base);
}

export default async function launch(args) {
  let modelArg = args[0];

  // Support both: `om launch claude` and `om launch --model claude`
  if (modelArg === "--model" && args[1]) {
    modelArg = args[1];
  }

  if (!modelArg) {
    console.error("Usage: om launch <number|name>");
    console.error("   or: om launch --model <name>");
    process.exit(1);
  }

  const { model } = await resolveModel(modelArg);
  if (!model) {
    console.error(`Model "${modelArg}" not found. Run 'om' to list.`);
    process.exit(1);
  }

  // Load stored parameters from catalog
  const catalog = loadCatalog();
  const key = findModelKey(catalog, model.name);
  const storedParams = (key && catalog[key]?.parameters) || {};

  // Show launch message
  console.log(`\n  ${BOLD}${CYAN}${SYM.arrow}${RESET} ${BOLD}Launching ${model.name}${RESET}`);
  
  // If parameters are configured, show how to apply them
  if (Object.keys(storedParams).length > 0) {
    console.log(`  ${DIM}Custom parameters configured. Run these in the prompt:${RESET}`);
    for (const [param, value] of Object.entries(storedParams)) {
      console.log(`  ${YELLOW}/set ${param} ${value}${RESET}`);
    }
  }
  
  console.log();

  const child = spawn("ollama", ["run", model.name], { stdio: "inherit" });
  
  child.on("error", (err) => {
    console.error(`\n  ${DIM}Failed to launch: ${err.message}${RESET}\n`);
    process.exit(1);
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}
