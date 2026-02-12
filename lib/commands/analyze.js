import { showModel } from "../ollama.js";
import { resolveModel } from "../resolve.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  RESET, BOLD, DIM, CYAN, GREEN, YELLOW, RED, MAGENTA,
  header, kvRow, formatSize, SYM,
} from "../ui.js";

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

function analyzeSpeed(details, params = {}) {
  const issues = [];
  const suggestions = [];
  let speedScore = 100;

  // Quantization impact
  const quant = details.quantization_level;
  if (quant && (quant.includes("Q8") || quant.includes("Q6"))) {
    speedScore -= 30;
    issues.push(`${YELLOW}${SYM.dot}${RESET} High quantization (${quant}) - slower but more accurate`);
    suggestions.push(`Try Q4_K_M or Q3_K_M version for 20-40% speed boost`);
  } else if (quant && quant.includes("Q4")) {
    issues.push(`${GREEN}${SYM.dot}${RESET} Good quantization (${quant}) - balanced`);
  } else if (quant && (quant.includes("Q2") || quant.includes("Q3"))) {
    issues.push(`${GREEN}${SYM.dot}${RESET} Low quantization (${quant}) - optimized for speed`);
  } else if (quant && quant.includes("MXFP4")) {
    issues.push(`${GREEN}${SYM.dot}${RESET} Mixed-precision FP4 - highly optimized`);
  }

  // Context window
  const ctx = params.num_ctx;
  if (ctx && ctx > 8192) {
    speedScore -= 25;
    issues.push(`${RED}${SYM.dot}${RESET} Large context (${ctx}) - significant slowdown`);
    suggestions.push(`Reduce to 2048-4096 for 2-3x speed improvement`);
  } else if (ctx && ctx > 4096) {
    speedScore -= 15;
    issues.push(`${YELLOW}${SYM.dot}${RESET} Medium context (${ctx}) - moderate impact`);
    suggestions.push(`Reduce to 2048 for faster responses`);
  } else if (ctx && ctx <= 2048) {
    issues.push(`${GREEN}${SYM.dot}${RESET} Small context (${ctx}) - optimized for speed`);
  } else {
    speedScore -= 20;
    issues.push(`${YELLOW}${SYM.dot}${RESET} Default context (likely 32K+) - very slow`);
    suggestions.push(`Set num_ctx to 2048: om set <model> num_ctx 2048`);
  }

  // Model size
  const paramSize = details.parameter_size;
  if (paramSize) {
    const sizeNum = parseFloat(paramSize);
    if (sizeNum > 30) {
      speedScore -= 25;
      issues.push(`${RED}${SYM.dot}${RESET} Very large model (${paramSize}) - slower inference`);
      suggestions.push(`Consider using a 7B-14B model for daily use`);
    } else if (sizeNum > 20) {
      speedScore -= 15;
      issues.push(`${YELLOW}${SYM.dot}${RESET} Large model (${paramSize}) - moderate speed`);
    } else if (sizeNum <= 14) {
      issues.push(`${GREEN}${SYM.dot}${RESET} Efficient model size (${paramSize})`);
    }
  }

  // Output limiting
  const numPredict = params.num_predict;
  if (!numPredict || numPredict === -1 || numPredict > 2048) {
    speedScore -= 10;
    issues.push(`${YELLOW}${SYM.dot}${RESET} Unlimited output - can be slow for long responses`);
    suggestions.push(`Limit output: om set <model> num_predict 512`);
  } else if (numPredict <= 512) {
    issues.push(`${GREEN}${SYM.dot}${RESET} Output limited to ${numPredict} tokens`);
  }

  // Temperature and sampling
  const temp = params.temperature;
  const topK = params.top_k;
  const topP = params.top_p;
  
  if (topK && topK > 80) {
    speedScore -= 5;
    suggestions.push(`Reduce top_k to 20-40 for faster token selection`);
  }

  return { issues, suggestions, speedScore: Math.max(0, speedScore) };
}

export default async function analyze(args) {
  const arg = args[0];
  if (!arg) {
    console.error("Usage: om analyze <number|name>");
    process.exit(1);
  }

  const { model } = await resolveModel(arg);
  if (!model) {
    console.error(`Model "${arg}" not found. Run 'om' to list.`);
    process.exit(1);
  }

  const data = await showModel(model.name);
  const details = data.details || {};

  // Get custom parameters
  const catalog = loadCatalog();
  const key = findModelKey(catalog, model.name);
  const params = (key && catalog[key]?.parameters) || {};
  const perfData = key && catalog[key];

  console.log(header(`Speed Analysis ${SYM.dot} ${model.name}`));
  console.log();

  // Performance score
  const analysis = analyzeSpeed(details, params);
  const scoreColor = analysis.speedScore >= 80 ? GREEN : analysis.speedScore >= 60 ? YELLOW : RED;
  console.log(`  ${BOLD}Speed Score: ${scoreColor}${analysis.speedScore}/100${RESET}`);
  console.log();

  // Current performance
  if (perfData?.promptTokPerSec && perfData?.genTokPerSec) {
    console.log(`  ${CYAN}Current Performance${RESET}`);
    console.log(`  ${SYM.bolt} Prompt: ${MAGENTA}${perfData.promptTokPerSec} tok/s${RESET}`);
    console.log(`  ${SYM.bolt} Generation: ${MAGENTA}${perfData.genTokPerSec} tok/s${RESET}`);
    console.log();
  }

  // Issues
  console.log(`  ${CYAN}Speed Factors${RESET}`);
  for (const issue of analysis.issues) {
    console.log(`  ${issue}`);
  }
  console.log();

  // Suggestions
  if (analysis.suggestions.length > 0) {
    console.log(`  ${BOLD}${YELLOW}Optimization Suggestions${RESET}`);
    for (let i = 0; i < analysis.suggestions.length; i++) {
      console.log(`  ${DIM}${i + 1}.${RESET} ${analysis.suggestions[i]}`);
    }
    console.log();
    console.log(`  ${DIM}Quick fix: ${BOLD}om optimize ${arg} fast${RESET}`);
    console.log();
  } else {
    console.log(`  ${GREEN}${SYM.check} Model is well optimized!${RESET}`);
    console.log();
  }
}
