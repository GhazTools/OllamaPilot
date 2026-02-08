#!/usr/bin/env node
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const COMPLETION_SCRIPT = `# om shell completions (auto-installed)
_om() {
  local -a words
  words=("\${(@f)$(om --completions "\${words[2,-1]}" 2>/dev/null)}")
  compadd -a words
}
compdef _om om
`;

const BASH_COMPLETION_SCRIPT = `# om shell completions (auto-installed)
_om() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local prev="\${COMP_WORDS[1]}"
  if [ "\$COMP_CWORD" -ge 2 ]; then
    COMPREPLY=($(compgen -W "$(om --completions "\$prev" 2>/dev/null)" -- "\$cur"))
  else
    COMPREPLY=($(compgen -W "$(om --completions 2>/dev/null)" -- "\$cur"))
  fi
}
complete -F _om om
`;

const SOURCE_LINE = `[ -f ~/.config/om/completions.sh ] && source ~/.config/om/completions.sh`;

try {
  const home = homedir();
  const configDir = join(home, ".config", "om");
  const completionFile = join(configDir, "completions.sh");

  // Detect shell
  const shell = process.env.SHELL || "";
  const isZsh = shell.includes("zsh");
  const rcFile = join(home, isZsh ? ".zshrc" : ".bashrc");

  // Write completion script
  mkdirSync(configDir, { recursive: true });
  writeFileSync(completionFile, isZsh ? COMPLETION_SCRIPT : BASH_COMPLETION_SCRIPT);

  // Add source line to rc file if not already there
  const rcContent = existsSync(rcFile) ? readFileSync(rcFile, "utf-8") : "";
  if (!rcContent.includes("om/completions.sh")) {
    writeFileSync(rcFile, rcContent.trimEnd() + "\n\n" + SOURCE_LINE + "\n");
    console.log(`om: tab-completion installed → ${rcFile}`);
  } else {
    console.log(`om: tab-completion already configured`);
  }
} catch {
  // Silently skip if we can't install completions (e.g. CI)
}
