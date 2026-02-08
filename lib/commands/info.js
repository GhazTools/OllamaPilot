import { showModel } from "../ollama.js";
import { resolveModel } from "../resolve.js";
import { getNote } from "../notes.js";
import {
  RESET, BOLD, DIM, CYAN, YELLOW, MAGENTA,
  box, header, kvRow, formatSize, SYM,
} from "../ui.js";

export default async function info(args) {
  const arg = args[0];
  if (!arg) {
    console.error(`Usage: om info <number|name>`);
    process.exit(1);
  }

  const { model } = await resolveModel(arg);
  if (!model) {
    console.error(`Model "${arg}" not found. Run 'om' to list.`);
    process.exit(1);
  }

  const data = await showModel(model.name);
  const details = data.details || {};

  console.log(header(model.name));
  console.log();

  const rows = [
    ["Family", details.family],
    ["Parameters", details.parameter_size],
    ["Quantization", details.quantization_level],
    ["Format", details.format],
    ["Disk Size", formatSize(model.size)],
    ["Modified", new Date(model.modified_at).toLocaleDateString()],
  ];

  for (const [label, value] of rows) {
    if (value) console.log(kvRow(label, value));
  }

  // Personal note
  const note = getNote(model.name);
  if (note) {
    console.log();
    console.log(`  ${YELLOW}${SYM.pencil} ${note}${RESET}`);
  }

  if (data.template) {
    console.log();
    console.log(`  ${DIM}Template${RESET}`);
    const tmpl = data.template.length > 200 ? data.template.slice(0, 200) + "..." : data.template;
    for (const line of tmpl.split("\n")) {
      console.log(`  ${DIM}${SYM.bar} ${line}${RESET}`);
    }
  }

  if (data.license) {
    const license = data.license.split("\n")[0].slice(0, 80);
    console.log();
    console.log(`  ${DIM}License${RESET}  ${license}`);
  }

  console.log();
}
