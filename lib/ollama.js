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

export async function showModel(name) {
  const res = await fetch(`${BASE}/api/show`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Failed to get info for ${name}`);
  return res.json();
}

export async function deleteModel(name) {
  const res = await fetch(`${BASE}/api/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Failed to delete ${name}`);
}

export async function generate(name, prompt, opts = {}) {
  const res = await fetch(`${BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: name, prompt, stream: false, ...opts }),
  });
  if (!res.ok) throw new Error(`Generate failed for ${name}`);
  return res.json();
}

export async function unloadModel(name) {
  const res = await fetch(`${BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: name, prompt: "", keep_alive: 0, stream: false }),
  });
  if (!res.ok) throw new Error(`Failed to unload ${name}`);
}

export async function pullModel(name, onProgress) {
  const res = await fetch(`${BASE}/api/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Failed to pull ${name}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      const data = JSON.parse(line);
      if (onProgress) onProgress(data);
      if (data.status === "success") return;
    }
  }

  // Process remaining buffer
  if (buffer.trim()) {
    const data = JSON.parse(buffer);
    if (onProgress) onProgress(data);
  }
}

export function formatSize(bytes) {
  return (bytes / 1024 ** 3).toFixed(1) + " GB";
}
