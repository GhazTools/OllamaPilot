import { generate } from "../ollama.js";
import { resolveModel } from "../resolve.js";
import {
  RESET, BOLD, DIM, CYAN, GREEN, YELLOW, MAGENTA,
  header, formatDuration, SYM,
} from "../ui.js";

const PROMPT = "Explain what a neural network is in exactly two sentences.";

const PRESETS = {
  default: {
    name: "Default",
    params: {},
  },
  fast: {
    name: "Fast",
    params: {
      num_ctx: 2048,
      num_predict: 512,
      temperature: 0.7,
      top_k: 40,
    },
  },
  balanced: {
    name: "Balanced",
    params: {
      num_ctx: 4096,
      num_predict: 2048,
      temperature: 0.8,
      top_k: 40,
    },
  },
  quality: {
    name: "Quality",
    params: {
      num_ctx: 8192,
      num_predict: -1,
      temperature: 0.9,
      top_k: 80,
    },
  },
};

async function runBenchmark(modelName, presetName, params, seed = null) {
  try {
    const finalParams = seed !== null ? { ...params, seed } : params;
    const t0 = performance.now();
    const data = await generate(modelName, PROMPT, finalParams);
    const wallTime = performance.now() - t0;

    const loadDuration = (data.load_duration || 0) / 1e6;
    const promptEvalDuration = (data.prompt_eval_duration || 0) / 1e6;
    const evalDuration = (data.eval_duration || 0) / 1e6;
    const evalCount = data.eval_count || 0;
    const promptEvalCount = data.prompt_eval_count || 0;

    const genTokPerSec = evalDuration > 0 ? (evalCount / (evalDuration / 1000)).toFixed(1) : "?";
    const promptTokPerSec = promptEvalDuration > 0 ? (promptEvalCount / (promptEvalDuration / 1000)).toFixed(1) : "?";

    return {
      presetName,
      success: true,
      loadDuration,
      promptEvalDuration,
      evalDuration,
      wallTime,
      genTokPerSec,
      promptTokPerSec,
      evalCount,
      promptEvalCount,
      params,
    };
  } catch (err) {
    return {
      presetName,
      success: false,
      error: err.message,
    };
  }
}

function printComparison(results) {
  console.log();
  console.log(`  ${BOLD}${CYAN}Performance Comparison${RESET}`);
  console.log(`  ${"━".repeat(90)}`);
  console.log();

  // Header
  const headers = ["Preset", "Context", "Load", "Prompt", "Gen Speed", "Tokens", "Wall Time"];
  const widths = [12, 10, 10, 12, 12, 10, 12];
  
  let headerRow = "  ";
  for (let i = 0; i < headers.length; i++) {
    headerRow += `${BOLD}${headers[i].padEnd(widths[i])}${RESET} `;
  }
  console.log(headerRow);
  console.log(`  ${DIM}${"─".repeat(90)}${RESET}`);

  // Data rows
  for (const result of results) {
    if (!result.success) {
      console.log(`  ${result.presetName.padEnd(widths[0])} ${RED}Error: ${result.error}${RESET}`);
      continue;
    }

    const ctx = result.params.num_ctx || "default";
    const load = formatDuration(result.loadDuration).padEnd(widths[2]);
    const promptSpeed = `${result.promptTokPerSec} t/s`.padEnd(widths[3]);
    const genSpeed = `${result.genTokPerSec} t/s`.padEnd(widths[4]);
    const tokens = `${result.evalCount}`.padEnd(widths[5]);
    const wall = formatDuration(result.wallTime).padEnd(widths[6]);

    // Color code based on speed
    const speedNum = parseFloat(result.genTokPerSec);
    const speedColor = speedNum > 50 ? GREEN : speedNum > 30 ? YELLOW : RESET;

    console.log(
      `  ${BOLD}${result.presetName.padEnd(widths[0])}${RESET} ` +
      `${CYAN}${String(ctx).padEnd(widths[1])}${RESET} ` +
      `${DIM}${load}${RESET} ` +
      `${MAGENTA}${promptSpeed}${RESET} ` +
      `${speedColor}${genSpeed}${RESET} ` +
      `${tokens} ` +
      `${DIM}${wall}${RESET}`
    );
  }

  console.log();
  
  // Find fastest
  const fastest = results
    .filter(r => r.success)
    .reduce((best, curr) => {
      const bestSpeed = parseFloat(best.genTokPerSec);
      const currSpeed = parseFloat(curr.genTokPerSec);
      return currSpeed > bestSpeed ? curr : best;
    });

  if (fastest) {
    const improvement = results[0].success 
      ? ((parseFloat(fastest.genTokPerSec) / parseFloat(results[0].genTokPerSec) - 1) * 100).toFixed(0)
      : 0;
    
    console.log(`  ${GREEN}${SYM.bolt} Fastest: ${BOLD}${fastest.presetName}${RESET} ${GREEN}(${fastest.genTokPerSec} tok/s)${RESET}`);
    if (improvement > 0) {
      console.log(`  ${DIM}${improvement}% faster than default${RESET}`);
    }
  }

  console.log();
}

export default async function compare(args) {
  const modelArg = args[0];
  let presetNames = args.slice(1);
  
  // Check for --seed flag
  let seed = null;
  const seedIdx = presetNames.indexOf('--seed');
  if (seedIdx !== -1 && presetNames[seedIdx + 1]) {
    seed = parseInt(presetNames[seedIdx + 1], 10);
    presetNames = [...presetNames.slice(0, seedIdx), ...presetNames.slice(seedIdx + 2)];
  }

  if (!modelArg) {
    console.error("Usage: om compare <number|name> [preset1 preset2 ...] [--seed N]");
    console.error("   or: om compare <number|name>  (tests all presets)");
    console.error("");
    console.error("Available presets: default, fast, balanced, quality");
    console.error("Use --seed for consistent outputs across runs");
    process.exit(1);
  }

  const { model } = await resolveModel(modelArg);
  if (!model) {
    console.error(`Model "${modelArg}" not found. Run 'om' to list.`);
    process.exit(1);
  }

  // If no presets specified, test all
  const presetsToTest = presetNames.length > 0 
    ? presetNames.filter(p => PRESETS[p])
    : Object.keys(PRESETS);

  if (presetsToTest.length === 0) {
    console.error("No valid presets specified.");
    console.error("Available: default, fast, balanced, quality");
    process.exit(1);
  }

  console.log(header(`Compare Settings ${SYM.dot} ${model.name}`));
  console.log(`  ${DIM}Testing ${presetsToTest.length} configurations${seed !== null ? ` (seed: ${seed})` : ''}...${RESET}`);
  console.log();

  const results = [];

  for (const presetName of presetsToTest) {
    const preset = PRESETS[presetName];
    const displayName = preset.name;
    
    process.stdout.write(`  ${DIM}${SYM.clock} ${displayName.padEnd(12)}${RESET}`);
    
    const result = await runBenchmark(model.name, displayName, preset.params, seed);
    results.push(result);
    
    if (result.success) {
      process.stdout.write(`\r  ${GREEN}${SYM.check}${RESET} ${displayName.padEnd(12)} ${DIM}${result.genTokPerSec} tok/s${RESET}\n`);
    } else {
      process.stdout.write(`\r  ${YELLOW}${SYM.cross}${RESET} ${displayName.padEnd(12)} ${DIM}Failed${RESET}\n`);
    }
  }

  printComparison(results);
  
  // Recommendation
  const fastest = results.filter(r => r.success).reduce((best, curr) => 
    parseFloat(curr.genTokPerSec) > parseFloat(best.genTokPerSec) ? curr : best
  );
  
  if (fastest && fastest.presetName !== "Default") {
    const presetKey = Object.keys(PRESETS).find(k => PRESETS[k].name === fastest.presetName);
    console.log(`  ${YELLOW}💡 Tip:${RESET} Apply fastest settings with ${BOLD}om optimize ${modelArg} ${presetKey}${RESET}`);
    console.log();
  }
}
