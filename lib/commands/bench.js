import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { generate } from "../ollama.js";
import { resolveModel } from "../resolve.js";
import {
  RESET, BOLD, DIM, CYAN, GREEN, YELLOW,
  header, kvRow, formatDuration, separator, SYM,
} from "../ui.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODELS_FILE = join(__dirname, "../models.json");

const PROMPT = "Explain what a neural network is in exactly two sentences. /no_think";

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

function saveBenchmarkResults(modelName, promptTokPerSec, genTokPerSec) {
  try {
    const catalog = JSON.parse(readFileSync(MODELS_FILE, "utf-8"));
    
    // Find matching entry (exact or base name match)
    let key = modelName;
    if (!catalog[key]) {
      const base = modelName.split(":")[0];
      key = Object.keys(catalog).find((k) => k.split(":")[0] === base);
    }
    
    if (key && catalog[key]) {
      catalog[key].promptTokPerSec = promptTokPerSec;
      catalog[key].genTokPerSec = genTokPerSec;
      catalog[key].lastBenchmark = new Date().toISOString();
      writeFileSync(MODELS_FILE, JSON.stringify(catalog, null, 2) + "\n");
      return true;
    }
  } catch (err) {
    // Silently fail if models.json doesn't exist or can't be written
  }
  return false;
}

export default async function bench(args) {
  const modelArg = args[0];
  const cliParams = {};
  let i = 1;

  // Parse parameter flags (e.g., --ctx 2048, --temp 0.7)
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const paramName = arg.slice(2);
      const paramValue = args[i + 1];
      
      // Map common shortcuts
      const paramMap = {
        ctx: "num_ctx",
        temp: "temperature",
        "top-p": "top_p",
        "top-k": "top_k",
      };
      
      const fullName = paramMap[paramName] || paramName;
      // Convert to number if it looks like a number
      cliParams[fullName] = isNaN(paramValue) ? paramValue : parseFloat(paramValue);
      i += 2;
    } else {
      i++;
    }
  }

  if (!modelArg) {
    console.error("Usage: om bench <number|name> [--ctx <size>] [--temp <value>]");
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

  // Merge stored params with CLI params (CLI takes precedence)
  // Default num_ctx to 8192 for bench to avoid models claiming 262k+ context
  const benchParams = { num_ctx: 8192, ...storedParams, ...cliParams };

  console.log(header(`Benchmark ${SYM.dot} ${model.name}`));
  
  // Show parameters being used
  if (Object.keys(benchParams).length > 0) {
    const paramStr = Object.entries(benchParams)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");
    console.log(`  ${YELLOW}${SYM.dot} ${paramStr}${RESET}`);
  }
  
  console.log(`  ${DIM}"${PROMPT}"${RESET}\n`);

  process.stdout.write(`  ${DIM}${SYM.clock} Running...${RESET}`);

  const t0 = performance.now();
  const data = await generate(model.name, PROMPT, benchParams);
  const wallTime = performance.now() - t0;

  // Clear the "Running..." line
  process.stdout.write("\r\x1b[K");

  // Ollama returns durations in nanoseconds
  const loadDuration = (data.load_duration || 0) / 1e6;
  const promptEvalDuration = (data.prompt_eval_duration || 0) / 1e6;
  const evalDuration = (data.eval_duration || 0) / 1e6;
  const evalCount = data.eval_count || 0;
  const promptEvalCount = data.prompt_eval_count || 0;

  const tokPerSec = evalDuration > 0 ? (evalCount / (evalDuration / 1000)).toFixed(1) : "?";
  const promptTokPerSec = promptEvalDuration > 0 ? (promptEvalCount / (promptEvalDuration / 1000)).toFixed(1) : "?";

  // Save benchmark results to models.json
  if (tokPerSec !== "?" && promptTokPerSec !== "?") {
    const saved = saveBenchmarkResults(
      model.name,
      parseFloat(promptTokPerSec),
      parseFloat(tokPerSec)
    );
    if (saved) {
      console.log(`  ${DIM}${SYM.check} Benchmark results saved${RESET}\n`);
    }
  }

  console.log(kvRow("Load time", formatDuration(loadDuration)));
  console.log(kvRow("Prompt eval", `${promptEvalCount} tok in ${formatDuration(promptEvalDuration)}  ${GREEN}${SYM.bolt} ${promptTokPerSec} tok/s${RESET}`));
  console.log(kvRow("Generation", `${evalCount} tok in ${formatDuration(evalDuration)}  ${GREEN}${SYM.bolt} ${tokPerSec} tok/s${RESET}`));
  console.log(kvRow("Wall time", formatDuration(wallTime)));

  if (data.response) {
    console.log();
    console.log(separator());
    console.log();
    for (const line of data.response.trim().split("\n")) {
      console.log(`  ${DIM}${line}${RESET}`);
    }
  }

  console.log();
}
