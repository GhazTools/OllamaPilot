const OLLAMA_HOST = process.env.OLLAMA_HOST || "127.0.0.1:11434";
const BASE = `http://${OLLAMA_HOST}`;

export async function listModels() {
  const res = await fetch(`${BASE}/api/tags`);
  if (!res.ok) throw new Error(`Ollama unreachable at ${BASE}`);
  const data = await res.json();
  return data.models || [];
}

export async function getLoaded() {
  const res = await fetch(`${BASE}/api/ps`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.models || [];
}

export function formatSize(bytes) {
  return (bytes / 1024 ** 3).toFixed(1) + " GB";
}
