import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { resolveModel } from "../resolve.js";
import {
  RESET, BOLD, DIM, CYAN, GREEN, YELLOW, SYM,
  header, kvRow,
} from "../ui.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODELS_FILE = join(__dirname, "../models.json");

// Common Ollama parameters
const VALID_PARAMS = {
  num_ctx: { type: "number", desc: "Context window size", min: 128, max: 131072 },
  num_predict: { type: "number", desc: "Max tokens to generate", min: -2, max: 131072 },
  num_batch: { type: "number", desc: "Batch size for processing", min: 1, max: 2048 },
  num_gpu: { type: "number", desc: "GPU layers to offload", min: 0, max: 999 },
  num_thread: { type: "number", desc: "CPU threads to use", min: 1, max: 128 },
  temperature: { type: "number", desc: "Randomness (0.0-1.0)", min: 0, max: 2 },
  top_p: { type: "number", desc: "Nucleus sampling", min: 0, max: 1 },
  top_k: { type: "number", desc: "Top-k sampling", min: 0, max: 100 },
  repeat_penalty: { type: "number", desc: "Repetition penalty", min: 0, max: 2 },
  seed: { type: "number", desc: "Random seed", min: 0 },
  stop: { type: "string", desc: "Stop sequences" },
};

function loadCatalog() {
  try {
    return JSON.parse(readFileSync(MODELS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveCatalog(catalog) {
  writeFileSync(MODELS_FILE, JSON.stringify(catalog, null, 2) + "\n");
}

function findModelKey(catalog, modelName) {
  if (catalog[modelName]) return modelName;
  const base = modelName.split(":")[0];
  return Object.keys(catalog).find((k) => k.split(":")[0] === base);
}

function validateParam(paramName, value) {
  const spec = VALID_PARAMS[paramName];
  if (!spec) {
    return { valid: false, error: `Unknown parameter: ${paramName}` };
  }

  if (spec.type === "number") {
    const num = parseFloat(value);
    if (isNaN(num)) {
      return { valid: false, error: `${paramName} must be a number` };
    }
    if (spec.min !== undefined && num < spec.min) {
      return { valid: false, error: `${paramName} must be >= ${spec.min}` };
    }
    if (spec.max !== undefined && num > spec.max) {
      return { valid: false, error: `${paramName} must be <= ${spec.max}` };
    }
    return { valid: true, value: num };
  }

  return { valid: true, value };
}

export default async function set(args) {
  const modelArg = args[0];
  const paramName = args[1];
  const paramValue = args[2];

  // Handle --clear flag
  if (args[1] === "--clear") {
    if (!modelArg) {
      console.error("Usage: om set <number|name> --clear");
      process.exit(1);
    }

    const { model } = await resolveModel(modelArg);
    if (!model) {
      console.error(`Model "${modelArg}" not found. Run 'om' to list.`);
      process.exit(1);
    }

    const catalog = loadCatalog();
    const key = findModelKey(catalog, model.name);

    if (key && catalog[key]?.parameters) {
      delete catalog[key].parameters;
      saveCatalog(catalog);
      console.log(`\n  ${GREEN}${SYM.check}${RESET} Cleared parameters for ${BOLD}${model.name}${RESET}\n`);
    } else {
      console.log(`\n  ${DIM}No parameters set for ${model.name}${RESET}\n`);
    }
    return;
  }

  // Handle --list flag
  if (args[0] === "--list") {
    console.log(header("Available Parameters"));
    console.log();
    for (const [name, spec] of Object.entries(VALID_PARAMS)) {
      const range = spec.min !== undefined && spec.max !== undefined
        ? ` ${DIM}(${spec.min}-${spec.max})${RESET}`
        : spec.min !== undefined
        ? ` ${DIM}(min: ${spec.min})${RESET}`
        : "";
      console.log(`  ${CYAN}${name.padEnd(16)}${RESET} ${DIM}${spec.desc}${RESET}${range}`);
    }
    console.log();
    return;
  }

  // Set parameter
  if (!modelArg || !paramName || paramValue === undefined) {
    console.error("Usage: om set <number|name> <parameter> <value>");
    console.error("   or: om set <number|name> --clear");
    console.error("   or: om set --list");
    process.exit(1);
  }

  const { model } = await resolveModel(modelArg);
  if (!model) {
    console.error(`Model "${modelArg}" not found. Run 'om' to list.`);
    process.exit(1);
  }

  // Validate parameter
  const validation = validateParam(paramName, paramValue);
  if (!validation.valid) {
    console.error(`\n  ${validation.error}\n`);
    console.error(`  Run 'om set --list' to see available parameters.\n`);
    process.exit(1);
  }

  // Save to catalog
  const catalog = loadCatalog();
  const key = findModelKey(catalog, model.name);

  if (!key) {
    // Model not in catalog yet, create entry
    catalog[model.name] = {
      description: "",
      parameters: { [paramName]: validation.value }
    };
  } else {
    if (!catalog[key].parameters) {
      catalog[key].parameters = {};
    }
    catalog[key].parameters[paramName] = validation.value;
  }

  saveCatalog(catalog);

  console.log(`\n  ${GREEN}${SYM.check}${RESET} Set ${CYAN}${paramName}${RESET} = ${YELLOW}${validation.value}${RESET} for ${BOLD}${model.name}${RESET}`);
  
  // Show helpful context info for num_ctx
  if (paramName === "num_ctx") {
    const kb = (validation.value * 4) / 1024; // Rough estimate: 4 bytes per token
    console.log(`  ${DIM}Context window: ~${kb.toFixed(1)} KB ${SYM.dot} affects speed and memory${RESET}`);
  }
  
  console.log();
}
