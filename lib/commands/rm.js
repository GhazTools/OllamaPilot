import { deleteModel } from "../ollama.js";
import { resolveModel } from "../resolve.js";
import { RESET, BOLD, DIM, RED, GREEN, confirm, SYM } from "../ui.js";

export default async function rm(args) {
  const arg = args[0];
  if (!arg) {
    console.error("Usage: om rm <number|name>");
    process.exit(1);
  }

  const { model } = await resolveModel(arg);
  if (!model) {
    console.error(`Model "${arg}" not found. Run 'om' to list.`);
    process.exit(1);
  }

  const yes = await confirm(`  ${RED}${SYM.cross} Delete ${BOLD}${model.name}${RESET}${RED}?${RESET}`);
  if (!yes) {
    console.log(`  ${DIM}Cancelled.${RESET}`);
    return;
  }

  await deleteModel(model.name);
  console.log(`  ${GREEN}${SYM.check} Deleted ${BOLD}${model.name}${RESET}`);
}
