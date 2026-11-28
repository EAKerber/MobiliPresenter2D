// Read-only bootstrap helper. Never retries permission denials or writes.
// Pure dependency-injected boundary so first-login races can be tested without credentials.
export class AdminBootstrapRequestError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AdminBootstrapRequestError";
    this.code = code;
  }
}

export async function fetchAdminBootstrap({
  fetchImpl,
  getUserImpl,
  failureMessages,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  retryDelaysMs = [250, 500],
}) {
  if (typeof fetchImpl !== "function" || typeof getUserImpl !== "function") {
    throw new TypeError("authenticated fetch and user lookup required");
  }
  for (let attempt = 0; ; attempt++) {
    let response;
    try {
      response = await fetchImpl("/api/admin-bootstrap", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
    } catch {
      throw new AdminBootstrapRequestError("network", failureMessages.network);
    }
    if (response.status === 401 && attempt < retryDelaysMs.length) {
      // A just-established Identity login may briefly precede server validation.
      // Retry *only* if the client still reports an authenticated user.
      let user = null;
      try { user = await getUserImpl(); } catch { /* No unverified retry. */ }
      if (user) {
        await wait(retryDelaysMs[attempt]);
        continue;
      }
    }
    if (response.status === 401) {
      throw new AdminBootstrapRequestError("unauthorized", failureMessages.unauthorized);
    }
    if (response.status === 403) {
      throw new AdminBootstrapRequestError("forbidden", failureMessages.forbidden);
    }
    if (!response.ok) {
      throw new AdminBootstrapRequestError("unavailable", failureMessages.unavailable);
    }
    let payload;
    try { payload = await response.json(); } catch {
      throw new AdminBootstrapRequestError("invalid", failureMessages.invalid);
    }
    if (!payload?.priceBook?.pricing) {
      throw new AdminBootstrapRequestError("invalid", failureMessages.invalid);
    }
    return payload;
  }
}
