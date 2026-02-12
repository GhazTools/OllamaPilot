import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { resolveModel } from "../resolve.js";
import { generate } from "../ollama.js";
import {
  RESET, BOLD, DIM, CYAN, GREEN, YELLOW, MAGENTA, SYM,
  header, formatDuration,
} from "../ui.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODELS_FILE = join(__dirname, "../models.json");

const PROMPT = "Explain what a neural network is in exactly two sentences.";

// Context sizes to test for auto-optimization
const CONTEXT_SIZES = [2048, 4096, 8192, 16384, 32768, 65536];

const PRESETS = {
  fast: {
    num_ctx: 2048,
    num_predict: 512,
    temperature: 0.7,
    top_k: 40,
    top_p: 0.9,
    repeat_penalty: 1.1,
    description: "Maximum speed - smaller context, limited output",
  },
  balanced: {
    num_ctx: 4096,
    num_predict: 2048,
    temperature: 0.8,
    top_k: 40,
    top_p: 0.9,
    description: "Balanced speed and capability",
  },
  quality: {
    num_ctx: 8192,
    num_predict: -1,
    temperature: 0.9,
    top_k: 80,
    top_p: 0.95,
    description: "Maximum quality - larger context, unlimited output",
  },
  chat: {
    num_ctx: 4096,
    num_predict: 1024,
    temperature: 0.8,
    top_k: 40,
    top_p: 0.9,
    repeat_penalty: 1.15,
    description: "Optimized for interactive chat",
  },
};

async function benchmarkConfig(modelName, config) {
  try {
    const t0 = performance.now();
    const data = await generate(modelName, PROMPT, config);
    const evalDuration = (data.eval_duration || 0) / 1e6;
    const evalCount = data.eval_count || 0;
    const genTokPerSec = evalDuration > 0 ? (evalCount / (evalDuration / 1000)) : 0;
    
    return {
      success: true,
      genTokPerSec,
      config,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      config,
    };
  }
}

async function findBestConfig(modelName) {
  console.log(`  ${CYAN}Testing ${CONTEXT_SIZES.length} context sizes...${RESET}`);
  
  const results = [];
  
  for (const ctx of CONTEXT_SIZES) {
    const config = {
      num_ctx: ctx,
      temperature: 0.8,
      num_predict: 512,
    };
    
    process.stdout.write(`  ${DIM}${SYM.clock} ${String(ctx).padEnd(6)}ctx${RESET}`);
    
    const result = await benchmarkConfig(modelName, config);
    
    if (result.success) {
      results.push(result);
      process.stdout.write(`\r  ${GREEN}${SYM.check}${RESET} ${String(ctx).padEnd(6)}ctx ${DIM}${result.genTokPerSec.toFixed(1)} tok/s${RESET}\n`);
    } else {
      process.stdout.write(`\r  ${YELLOW}${SYM.cross}${RESET} ${String(ctx).padEnd(6)}ctx ${DIM}Failed${RESET}\n`);
    }
  }
  
  if (results.length === 0) {
    return null;
  }
  
  // Find fastest configuration
  const best = results.reduce((a, b) => a.genTokPerSec > b.genTokPerSec ? a : b);
  
  return {
    params: best.config,
    speed: best.genTokPerSec,
  };
}

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

export default async function optimize(args) {
  const modelArg = args[0];
  const preset = args[1];

  // List presets
  if (!modelArg || modelArg === "--list") {
    console.log(header("Performance Presets"));
    console.log();
    for (const [name, config] of Object.entries(PRESETS)) {
      console.log(`  ${BOLD}${CYAN}${name.padEnd(10)}${RESET} ${DIM}${config.description}${RESET}`);
      console.log(`  ${DIM}           ctx: ${config.num_ctx}, predict: ${config.num_predict}, temp: ${config.temperature}${RESET}`);
      console.log();
    }
    console.log(`  ${DIM}Usage: om optimize <model> <preset>${RESET}`);
    console.log(`  ${DIM}   or: om optimize all       (auto-tune all models)${RESET}`);
    console.log(`  ${DIM}   or: om optimize all fast  (apply preset to all)${RESET}`);
    console.log();
    return;
  }

  if (!preset) {
    // Auto-optimize all models without preset
    if (modelArg === "all") {
      const catalog = loadCatalog();
      const modelNames = Object.keys(catalog);
      
      if (modelNames.length === 0) {
        console.error("No models found in catalog.");
        process.exit(1);
      }

      console.log(`\n  ${BOLD}${CYAN}Auto-Optimizing ${modelNames.length} models${RESET}`);
      console.log(`  ${DIM}Testing contexts: ${CONTEXT_SIZES.join(", ")}${RESET}\n`);
      
      for (const modelName of modelNames) {
        console.log(`\n  ${BOLD}${MAGENTA}${modelName}${RESET}`);
        
        const bestConfig = await findBestConfig(modelName);
        
        if (!bestConfig) {
          console.log(`  ${YELLOW}${SYM.cross}${RESET} ${DIM}All tests failed${RESET}\n`);
          continue;
        }
        
        // Save best configuration
        const key = findModelKey(catalog, modelName);
        if (!catalog[key].parameters) {
          catalog[key].parameters = {};
        }
        Object.assign(catalog[key].parameters, bestConfig.params);
        
        // Save benchmark results
        catalog[key].genTokPerSec = parseFloat(bestConfig.speed.toFixed(1));
        catalog[key].lastBenchmark = new Date().toISOString();
        
        console.log(`  ${GREEN}${SYM.bolt} Best: ${bestConfig.params.num_ctx} context → ${bestConfig.speed.toFixed(1)} tok/s${RESET}`);
      }
      
      saveCatalog(catalog);
      console.log(`\n  ${GREEN}${SYM.check}${RESET} ${BOLD}All models optimized${RESET}\n`);
      return;
    }
    
    console.error("Usage: om optimize <model> <fast|balanced|quality|chat>");
    console.error("   or: om optimize all  (auto-tune all models)");
    console.error("   or: om optimize --list");
    process.exit(1);
  }

  const presetConfig = PRESETS[preset];
  if (!presetConfig) {
    console.error(`Unknown preset: ${preset}`);
    console.error(`Available: ${Object.keys(PRESETS).join(", ")}`);
    process.exit(1);
  }

  // Handle 'all' models with preset - apply preset to all
  if (modelArg === "all") {
    const catalog = loadCatalog();
    const modelNames = Object.keys(catalog);
    
    if (modelNames.length === 0) {
      console.error("No models found in catalog.");
      process.exit(1);
    }

    console.log(`\n  ${BOLD}${CYAN}Applying ${YELLOW}${preset}${CYAN} to ${modelNames.length} models${RESET}\n`);
    
    for (const modelName of modelNames) {
      applyPresetToModel(catalog, modelName, presetConfig, preset);
      console.log(`  ${GREEN}${SYM.check}${RESET} ${modelName}`);
    }
    
    saveCatalog(catalog);
    console.log(`\n  ${DIM}Test with: ${BOLD}om bench <model>${RESET}\n`);
    return;
  }

  const { model } = await resolveModel(modelArg);
  if (!model) {
    console.error(`Model "${modelArg}" not found. Run 'om' to list.`);
    process.exit(1);
  }

  // Apply preset to single model
  const catalog = loadCatalog();
  applyPresetToModel(catalog, model.name, presetConfig, preset);
  saveCatalog(catalog);

  console.log(`\n  ${GREEN}${SYM.check}${RESET} ${BOLD}${model.name}${RESET} optimized for ${YELLOW}${preset}${RESET}`);
  console.log(`  ${DIM}${presetConfig.description}${RESET}\n`);
  
  console.log(`  ${CYAN}Parameters set:${RESET}`);
  for (const [param, value] of Object.entries(presetConfig)) {
    if (param !== "description") {
      console.log(`  ${DIM}${SYM.dot}${RESET} ${param}: ${MAGENTA}${value}${RESET}`);
    }
  }
  
  console.log();
  console.log(`  ${DIM}Test with: ${BOLD}om bench ${modelArg}${RESET}\n`);
}

function applyPresetToModel(catalog, modelName, presetConfig, presetName) {
  const key = findModelKey(catalog, modelName);
  
  // Extract only the parameter fields (exclude description)
  const params = Object.entries(presetConfig)
    .filter(([k]) => k !== "description")
    .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {});

  if (!key) {
    catalog[modelName] = {
      description: "",
      parameters: params,
    };
  } else {
    if (!catalog[key].parameters) {
      catalog[key].parameters = {};
    }
    Object.assign(catalog[key].parameters, params);
  }
}
