const MEALS = ["Завтрак", "Обед", "Ужин", "Перекус", "В запас"];

function corsHeaders(origin, allowed) {
  const list = String(allowed || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const ok = origin && list.includes(origin) ? origin : list[0] || "*";
  return {
    "Access-Control-Allow-Origin": ok,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

function extractJson(text) {
  const trimmed = String(text || "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Модель вернула не JSON");
  }
}

function normalizePlan(raw, total, dayCount) {
  if (!raw || !Array.isArray(raw.days) || raw.days.length !== dayCount) {
    throw new Error("Неверное число дней в ответе");
  }

  const days = raw.days.map((day, index) => {
    const items = Array.isArray(day?.items) ? day.items : [];
    const cleaned = items
      .map((item) => ({
        name: String(item?.name || "").trim().slice(0, 48),
        amount: String(item?.amount || "").trim().slice(0, 32),
        price: Math.max(1, Math.round(Number(item?.price) || 0)),
        meal: MEALS.includes(item?.meal) ? item.meal : "Перекус",
      }))
      .filter((item) => item.name && item.price > 0)
      .slice(0, 16);

    if (!cleaned.length) {
      throw new Error(`Пустой набор на день ${index + 1}`);
    }
    return { items: cleaned };
  });

  let left = total;
  const equal = total / dayCount;
  for (let i = 0; i < dayCount; i += 1) {
    const allowance = Math.ceil(left / (dayCount - i));
    let spent = days[i].items.reduce((sum, item) => sum + item.price, 0);
    while (days[i].items.length && spent > allowance) {
      days[i].items.pop();
      spent = days[i].items.reduce((sum, item) => sum + item.price, 0);
    }
    if (!days[i].items.length) {
      throw new Error(`Не удалось уложить день ${i + 1} в бюджет`);
    }
    left -= spent;
    days[i].allowanceHint = allowance;
    days[i].equalHint = equal;
  }

  return { days };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin, env.ALLOWED_ORIGINS);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "POST") {
      return json({ error: "Только POST" }, 405, headers);
    }

    if (!env.DEEPSEEK_API_KEY) {
      return json({ error: "На Worker не задан DEEPSEEK_API_KEY" }, 500, headers);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Нужен JSON" }, 400, headers);
    }

    const total = Math.round(Number(body?.total));
    const dayCount = Math.round(Number(body?.dayCount));
    if (!Number.isFinite(total) || total < 50 || total > 1000000) {
      return json({ error: "Сумма от 50 до 1 000 000 ₽" }, 400, headers);
    }
    if (!Number.isFinite(dayCount) || dayCount < 1 || dayCount > 14) {
      return json({ error: "Для AI пока 1–14 дней" }, 400, headers);
    }

    const perDay = Math.round(total / dayCount);
    const system = [
      "Ты помощник по дешёвому меню на одного человека в России.",
      "Отвечай только валидным JSON без markdown и без пояснений.",
      "Цены — ориентиры порций в рублях, не выдумывай бренды сетей.",
      'Формат: {"days":[{"items":[{"name":"...","amount":"...","price":123,"meal":"Завтрак"}]}]}',
      `meal только одно из: ${MEALS.join(", ")}.`,
      "На каждый день: завтрак, обед, ужин; перекус и запас по желанию.",
      "Сумма цен дня должна быть <= дневного лимита и желательно близко к нему.",
      "Дни должны отличаться. Без алкоголя.",
    ].join(" ");

    const user = [
      `Общий бюджет: ${total} ₽ на ${dayCount} дн.`,
      `Равная доля примерно ${perDay} ₽/день.`,
      "Если в один день остаётся сдача, следующие дни могут быть чуть дороже равной доли.",
      "Верни ровно столько объектов days, сколько дней.",
    ].join(" ");

    try {
      const upstream = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-flash",
          temperature: 0.7,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });

      const payload = await upstream.json();
      if (!upstream.ok) {
        const message = payload?.error?.message || `DeepSeek ${upstream.status}`;
        return json({ error: message }, 502, headers);
      }

      const content = payload?.choices?.[0]?.message?.content;
      const parsed = extractJson(content);
      const plan = normalizePlan(parsed, total, dayCount);
      return json(plan, 200, headers);
    } catch (error) {
      return json({ error: error.message || "Сбой AI" }, 502, headers);
    }
  },
};
