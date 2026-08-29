const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

function getToken() {
  return localStorage.getItem("unigig_token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    /* no body */
  }

  if (!res.ok) {
    const message = data?.detail || `Request failed (${res.status})`;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }
  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),
  me: () => request("/users/me"),
  workers: (skill) => request(`/users/workers${skill ? `?skill=${encodeURIComponent(skill)}` : ""}`),

  createTask: (payload) => request("/tasks", { method: "POST", body: payload }),
  listTasks: (params = "") => request(`/tasks${params}`),
  getTask: (id) => request(`/tasks/${id}`),
  getCandidates: (id) => request(`/tasks/${id}/candidates`),
  selectWorkers: (id, worker_ids) =>
    request(`/tasks/${id}/select-workers`, { method: "POST", body: { worker_ids } }),
  startTask: (id) => request(`/tasks/${id}/start`, { method: "PATCH" }),
  completeTask: (id) => request(`/tasks/${id}/complete`, { method: "PATCH" }),
  cancelTask: (id) => request(`/tasks/${id}/cancel`, { method: "PATCH" }),

  applyToTask: (taskId, message) => request(`/tasks/${taskId}/apply`, { method: "POST", body: { message } }),
  getApplications: (taskId) => request(`/tasks/${taskId}/applications`),
  getMyApplications: () => request(`/tasks/applications/mine`),
  withdrawApplication: (taskId) => request(`/tasks/${taskId}/applications/mine`, { method: "DELETE" }),
  acceptApplication: (taskId, applicationId) =>
    request(`/tasks/${taskId}/applications/${applicationId}/accept`, { method: "POST" }),

  getQueueForTask: (taskId) => request(`/matching/queues/task/${taskId}`),
  getPendingForWorker: (workerId) => request(`/matching/queues/worker/${workerId}/pending`),
  respondToPing: (queueId, worker_id, accept) =>
    request(`/matching/queues/${queueId}/respond`, { method: "POST", body: { worker_id, accept } }),

  getCategories: () => request("/pricing/categories", { auth: false }),
  getQuote: (payload) => request("/pricing/quote", { method: "POST", body: payload, auth: false }),
};

export function saveSession(token, user) {
  localStorage.setItem("unigig_token", token);
  localStorage.setItem("unigig_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("unigig_token");
  localStorage.removeItem("unigig_user");
}

export function loadUser() {
  const raw = localStorage.getItem("unigig_user");
  return raw ? JSON.parse(raw) : null;
}
