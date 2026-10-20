const SAFE_FIELDS = new Set([
  "source",
  "runId",
  "userPresent",
  "adminRole",
  "eventName",
  "status",
  "durationMs",
  "requestId",
  "errorType",
  "promiseState",
  "payloadValid"
]);

function safeValue(key, value) {
  if (!SAFE_FIELDS.has(key)) return undefined;
  if (["userPresent", "adminRole", "payloadValid"].includes(key)) return Boolean(value);
  if (["runId", "status", "durationMs"].includes(key)) {
    return Number.isFinite(Number(value)) ? Number(value) : undefined;
  }
  if (key === "requestId") {
    const requestId = String(value || "").slice(0, 120);
    return /^[\w:-]*$/.test(requestId) ? requestId : undefined;
  }
  const text = String(value || "").slice(0, 48);
  return /^[\w:-]*$/.test(text) ? text : undefined;
}

export function createAuthDiagnostics(enabled) {
  if (!enabled) return { record() {} };

  const startedAt = performance.now();
  const events = [];
  const panel = document.createElement("details");
  panel.className = "auth-diagnostics";
  panel.innerHTML = "<summary>Diagnóstico temporário do acesso</summary>";

  const content = document.createElement("div");
  content.className = "auth-diagnostics__content";
  const note = document.createElement("p");
  note.textContent = "Registro local desta aba. Não inclui conta, senha, token ou conteúdo das respostas; nada é enviado.";
  const actions = document.createElement("div");
  actions.className = "auth-diagnostics__actions";
  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "button button--secondary button--compact";
  copy.textContent = "Copiar diagnóstico";
  const output = document.createElement("textarea");
  output.readOnly = true;
  output.rows = 9;
  output.setAttribute("aria-label", "Registro do diagnóstico de acesso");
  actions.append(copy);
  content.append(note, actions, output);
  panel.append(content);
  document.body.append(panel);

  const serialize = () => JSON.stringify(events, null, 2);
  const render = () => { output.value = serialize(); };

  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(serialize());
    } catch {
      output.focus();
      output.select();
      document.execCommand("copy");
    }
    copy.textContent = "Copiado";
    window.setTimeout(() => { copy.textContent = "Copiar diagnóstico"; }, 1400);
  });

  return {
    record(name, details = {}) {
      const event = {
        at: new Date().toISOString(),
        elapsedMs: Math.round(performance.now() - startedAt),
        event: String(name).slice(0, 48)
      };
      for (const [key, value] of Object.entries(details)) {
        const safe = safeValue(key, value);
        if (safe !== undefined) event[key] = safe;
      }
      events.push(event);
      if (events.length > 80) events.shift();
      render();
    }
  };
}
