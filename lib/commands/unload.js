import { getLoaded, unloadModel } from "../ollama.js";
import { resolveModel } from "../resolve.js";
import { RESET, BOLD, DIM, GREEN, SYM } from "../ui.js";

export default async function unload(args) {
  const arg = args[0];

  // Unload specific model
  if (arg) {
    const { model } = await resolveModel(arg);
    if (!model) {
      console.error(`Model "${arg}" not found. Run 'om' to list.`);
      process.exit(1);
    }
    await unloadModel(model.name);
    console.log(`  ${GREEN}${SYM.check}${RESET} Unloaded ${BOLD}${model.name}${RESET}`);
    return;
  }

  // Unload all
  const loaded = await getLoaded();
  if (loaded.length === 0) {
    console.log(`  ${DIM}No models loaded in memory.${RESET}`);
    return;
  }

  for (const m of loaded) {
    await unloadModel(m.name);
    console.log(`  ${GREEN}${SYM.check}${RESET} Unloaded ${BOLD}${m.name}${RESET}`);
  }
}
