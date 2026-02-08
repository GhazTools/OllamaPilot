// ── ANSI codes ──────────────────────────────────────────
export const RESET = "\x1b[0m";
export const BOLD = "\x1b[1m";
export const DIM = "\x1b[2m";
export const ITALIC = "\x1b[3m";
export const UNDERLINE = "\x1b[4m";
export const GREEN = "\x1b[32m";
export const RED = "\x1b[31m";
export const CYAN = "\x1b[36m";
export const YELLOW = "\x1b[33m";
export const MAGENTA = "\x1b[35m";
export const WHITE = "\x1b[37m";
export const BLUE = "\x1b[34m";
export const BG_DIM = "\x1b[48;5;236m";

// ── Unicode symbols ─────────────────────────────────────
export const SYM = {
  dot:      "·",
  bullet:   "●",
  diamond:  "◆",
  arrow:    "▸",
  check:    "✔",
  cross:    "✖",
  pencil:   "✎",
  bolt:     "⚡",
  clock:    "◷",
  bar:      "│",
  dash:     "─",
  thick:    "━",
};

// ── Box drawing ─────────────────────────────────────────
export function box(title, rows, width = 44) {
  const inner = width - 2;
  const lines = [];

  lines.push(`  ${DIM}┌${"─".repeat(inner)}┐${RESET}`);

  if (title) {
    const pad = inner - stripAnsi(title).length - 2;
    lines.push(`  ${DIM}│${RESET} ${title}${" ".repeat(Math.max(pad, 0))}${DIM}│${RESET}`);
    lines.push(`  ${DIM}├${"─".repeat(inner)}┤${RESET}`);
  }

  for (const row of rows) {
    const pad = inner - stripAnsi(row).length - 2;
    lines.push(`  ${DIM}│${RESET} ${row}${" ".repeat(Math.max(pad, 0))}${DIM}│${RESET}`);
  }

  lines.push(`  ${DIM}└${"─".repeat(inner)}┘${RESET}`);
  return lines.join("\n");
}

// ── Header banner ───────────────────────────────────────
export function header(text, width = 44) {
  const line = `${DIM}${"━".repeat(width)}${RESET}`;
  return `\n  ${BOLD}${CYAN}${SYM.diamond}${RESET} ${BOLD}${text}${RESET}\n  ${line}`;
}

// ── Separator ───────────────────────────────────────────
export function separator(width = 44) {
  return `  ${DIM}${"─".repeat(width)}${RESET}`;
}

// ── Key-value row (aligned) ─────────────────────────────
export function kvRow(label, value, labelWidth = 16) {
  return `  ${CYAN}${label.padEnd(labelWidth)}${RESET} ${value}`;
}

// ── Progress bar ────────────────────────────────────────
export function progressBar(completed, total, width = 30) {
  const ratio = total > 0 ? Math.min(completed / total, 1) : 0;
  const filled = Math.round(width * ratio);
  const empty = width - filled;
  const pct = (ratio * 100).toFixed(1);
  const filledBar = `${GREEN}${"█".repeat(filled)}${RESET}`;
  const emptyBar = `${DIM}${"░".repeat(empty)}${RESET}`;
  return `${filledBar}${emptyBar} ${BOLD}${pct}%${RESET}`;
}

// ── Format helpers ──────────────────────────────────────
export function formatSize(bytes) {
  if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(0) + " KB";
  if (bytes < 1024 ** 3) return (bytes / 1024 ** 2).toFixed(1) + " MB";
  return (bytes / 1024 ** 3).toFixed(1) + " GB";
}

export function formatDuration(ms) {
  if (ms < 1000) return ms.toFixed(0) + "ms";
  return (ms / 1000).toFixed(2) + "s";
}

// ── Tag pill ────────────────────────────────────────────
export function tag(text, color = DIM) {
  return `${color}[${text}]${RESET}`;
}

// ── Confirm prompt ──────────────────────────────────────
export function confirm(question) {
  return new Promise((resolve) => {
    process.stdout.write(`${question} ${DIM}(y/N)${RESET} `);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once("data", (data) => {
      const ch = data.toString().trim().toLowerCase();
      process.stdin.setRawMode(false);
      process.stdin.pause();
      console.log(ch);
      resolve(ch === "y");
    });
  });
}

// ── Strip ANSI (for width calculations) ─────────────────
export function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}
