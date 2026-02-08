import { listModels } from "./ollama.js";

export async function resolveModel(arg) {
  const models = await listModels();
  if (models.length === 0) return { models, model: null };

  const n = parseInt(arg, 10);
  if (!isNaN(n) && n >= 1 && n <= models.length) {
    return { models, model: models[n - 1] };
  }

  const match = models.find(
    (m) => m.name === arg || m.name.startsWith(arg + ":")
  );
  return { models, model: match || null };
}
