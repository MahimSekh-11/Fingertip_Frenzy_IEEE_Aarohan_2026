export const API_BASE_URL = "/api/v1";
export async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401 && !url.includes("/auth/"))
    window.dispatchEvent(new Event("session-expired"));
  return res;
}
export async function request(path, options = {}) {
  const res = await apiFetch("/api" + path, {
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.message || "Request failed. Please try again.");
  return data;
}
