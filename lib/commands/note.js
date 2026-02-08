import { resolveModel } from "../resolve.js";
import { getNote, setNote, deleteNote } from "../notes.js";
import { RESET, BOLD, DIM, CYAN, YELLOW, GREEN, SYM } from "../ui.js";

export default async function note(args) {
  const arg = args[0];
  if (!arg) {
    console.error("Usage: om note <number|name> [text]");
    console.error("       om note <number|name> --clear");
    process.exit(1);
  }

  const { model } = await resolveModel(arg);
  if (!model) {
    console.error(`Model "${arg}" not found. Run 'om' to list.`);
    process.exit(1);
  }

  const text = args.slice(1).join(" ").trim();

  // Clear note
  if (text === "--clear") {
    deleteNote(model.name);
    console.log(`  ${GREEN}${SYM.check}${RESET} ${DIM}Note cleared for ${model.name}${RESET}`);
    return;
  }

  // Set note
  if (text) {
    setNote(model.name, text);
    console.log(`  ${GREEN}${SYM.check}${RESET} Note saved for ${BOLD}${model.name}${RESET}`);
    return;
  }

  // View note
  const existing = getNote(model.name);
  if (existing) {
    console.log(`  ${BOLD}${model.name}${RESET}`);
    console.log(`  ${YELLOW}${SYM.pencil} ${existing}${RESET}`);
  } else {
    console.log(`  ${DIM}No note for ${model.name}.${RESET}`);
  }
}
