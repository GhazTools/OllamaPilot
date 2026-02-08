import { generate } from "../ollama.js";
import { resolveModel } from "../resolve.js";
import {
  RESET, BOLD, DIM, CYAN, GREEN, YELLOW,
  header, kvRow, formatDuration, separator, SYM,
} from "../ui.js";

const PROMPT = "Explain what a neural network is in exactly two sentences.";

export default async function bench(args) {
  const arg = args[0];
  if (!arg) {
    console.error("Usage: om bench <number|name>");
    process.exit(1);
  }

  const { model } = await resolveModel(arg);
  if (!model) {
    console.error(`Model "${arg}" not found. Run 'om' to list.`);
    process.exit(1);
  }

  console.log(header(`Benchmark ${SYM.dot} ${model.name}`));
  console.log(`  ${DIM}"${PROMPT}"${RESET}\n`);

  process.stdout.write(`  ${DIM}${SYM.clock} Running...${RESET}`);

  const t0 = performance.now();
  const data = await generate(model.name, PROMPT);
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
