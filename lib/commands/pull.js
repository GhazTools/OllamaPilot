import { pullModel } from "../ollama.js";
import { RESET, BOLD, DIM, GREEN, header, progressBar, formatSize, SYM } from "../ui.js";

export default async function pull(args) {
  const name = args[0];
  if (!name) {
    console.error("Usage: om pull <model>");
    process.exit(1);
  }

  console.log(header(`Pulling ${name}`));
  console.log();

  let lastStatus = "";
  await pullModel(name, (data) => {
    if (data.total && data.completed !== undefined) {
      const bar = progressBar(data.completed, data.total);
      const dl = `${formatSize(data.completed)} / ${formatSize(data.total)}`;
      process.stdout.write(`\r  ${bar}  ${DIM}${dl}${RESET}  `);
    } else if (data.status && data.status !== lastStatus) {
      if (lastStatus && data.total === undefined && lastStatus !== data.status) {
        process.stdout.write("\n");
      }
      console.log(`  ${DIM}${SYM.arrow} ${data.status}${RESET}`);
      lastStatus = data.status;
    }
  });

  console.log(`\n\n  ${GREEN}${SYM.check} Done${RESET}\n`);
}
