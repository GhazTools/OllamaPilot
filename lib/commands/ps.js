import { getLoaded } from "../ollama.js";
import { RESET, BOLD, DIM, GREEN, CYAN, header, formatSize, SYM } from "../ui.js";

export default async function ps() {
  const loaded = await getLoaded();
  if (loaded.length === 0) {
    console.log(`\n  ${DIM}No models loaded in memory.${RESET}\n`);
    return;
  }

  console.log(header("Loaded Models"));
  console.log();

  // Header row
  console.log(`  ${DIM}${"MODEL".padEnd(30)} ${"VRAM".padEnd(10)} ${"CTX".padEnd(8)} EXPIRES${RESET}`);
  console.log(`  ${DIM}${"─".repeat(30)} ${"─".repeat(10)} ${"─".repeat(8)} ${"─".repeat(12)}${RESET}`);

  for (const m of loaded) {
    const name = `${GREEN}${SYM.bullet}${RESET} ${BOLD}${m.name}${RESET}`;
    const namePad = 28 - (m.name.length);
    const vram = formatSize(m.size_vram || m.size).padEnd(10);
    const ctx = String(m.context_length || "?").padEnd(8);
    const expiry = m.expires_at
      ? `${DIM}${new Date(m.expires_at).toLocaleTimeString()}${RESET}`
      : `${DIM}─${RESET}`;

    console.log(`  ${name}${" ".repeat(Math.max(namePad, 1))}${DIM}${vram} ${ctx}${RESET} ${expiry}`);
  }
  console.log();
}
