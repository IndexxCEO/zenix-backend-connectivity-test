"use strict";
const button = document.getElementById("rerun");
const summary = document.getElementById("summary");
const timeoutMs = 20000;

async function request(path, options = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(path, {
      ...options,
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function update(id, success, explanation) {
  const el = document.getElementById(id + "-status");
  el.className = success ? "ok" : "fail";
  el.textContent = (success ? "Успешно: " : "Ошибка: ") + explanation;
}

async function run() {
  button.disabled = true;
  summary.textContent = "Проверяем соединение с сервером…";
  summary.className = "summary";
  let passed = 0;
  const tests = [
    {
      id: "get",
      run: async () => {
        const result = await request("/api/health");
        if (result.ok !== true || result.service !== "zenix-backend-test") throw new Error("Неверный ответ сервера");
        return "FastAPI ответил на GET.";
      },
    },
    {
      id: "post",
      run: async () => {
        const result = await request("/api/probe", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({probe: "zenix-backend-v1", payload: "X"})});
        if (result.ack !== "ZENIX_BACKEND_OK" || result.received_bytes !== 1) throw new Error("Неверное подтверждение POST");
        return "сервер принял и подтвердил тестовый POST.";
      },
    },
    {
      id: "large",
      run: async () => {
        const result = await request("/api/probe", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({probe: "zenix-backend-v1", payload: "X".repeat(32768)})});
        if (result.ack !== "ZENIX_BACKEND_OK" || result.received_bytes !== 32768) throw new Error("Неверная длина ответа сервера");
        return "сервер принял 32 КиБ тестовых данных.";
      },
    },
  ];
  // Tests run in sequence so failures are easier to understand.
  for (const test of tests) {
    update(test.id, true, "проверка выполняется…");
    try {
      update(test.id, true, await test.run());
      passed++;
    } catch (e) {
      update(test.id, false, e.name === "AbortError" ? "истекло время ожидания 20 с" : e.message);
    }
  }
  summary.textContent = `Результат: ${passed}/3 ${passed === 3 ? "PASS — все проверки успешны." : "— не все проверки прошли."}`;
  summary.className = "summary " + (passed === 3 ? "ok" : "fail");
  button.disabled = false;
}
button.addEventListener("click", run);
run();
