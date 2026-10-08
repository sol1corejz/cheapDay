const AI_URL = import.meta.env.VITE_AI_URL || "https://cheapday-ai.sol1corejz.workers.dev";

export function aiConfigured() {
  return Boolean(AI_URL);
}

export async function fetchAiPlan(total, dayCount) {
  if (!AI_URL) {
    throw new Error("AI ещё не подключён: задайте VITE_AI_URL");
  }

  const response = await fetch(AI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ total, dayCount }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Ошибка AI (${response.status})`);
  }
  if (!Array.isArray(data.days)) {
    throw new Error("Пустой ответ AI");
  }
  return data.days;
}
