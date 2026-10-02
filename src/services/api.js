const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const TOKEN_KEY = "pace_auth_token";

/**
 * Token management
 */
export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setAuthToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (e) {
    console.warn("Could not save auth token:", e);
  }
}

export function clearAuthToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.warn("Could not clear auth token:", e);
  }
}

/**
 * Standard fetch wrapper with auth header injection & error normalization
 */
async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.message || `Request failed with status ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Check backend connection status
 */
export async function checkServerHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const data = await res.json();
      return { online: true, ...data };
    }
  } catch {
    // Server is unreachable
  }
  return { online: false, database: { connected: false } };
}

/* ==========================================================================
   AUTHENTICATION API CALLS
   ========================================================================== */

export async function apiRegister({ name, email, password }) {
  const data = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  if (data?.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function apiLogin({ email, password }) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (data?.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function apiGoogleAuth({ credential }) {
  const data = await request("/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
  if (data?.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function apiForgotPassword(email) {
  return await request("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function apiVerifyOtp(email, otp) {
  return await request("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
}

export async function apiResetPassword({ email, resetToken, otp, newPassword }) {
  return await request("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, resetToken, otp, newPassword }),
  });
}

export async function apiGetProfile() {
  return await request("/auth/me", { method: "GET" });
}

export async function apiChangePassword({ currentPassword, newPassword }) {
  return await request("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

/* ==========================================================================
   TRANSACTIONS API CALLS
   ========================================================================== */

export async function apiGetTransactions(filters = {}) {
  const query = new URLSearchParams();
  if (filters.month) query.set("month", filters.month);
  if (filters.eventId) query.set("eventId", filters.eventId);
  if (filters.loanId) query.set("loanId", filters.loanId);
  if (filters.type && filters.type !== "all") query.set("type", filters.type);

  const qs = query.toString();
  return await request(`/transactions${qs ? `?${qs}` : ""}`, { method: "GET" });
}

export async function apiCreateTransaction(tx) {
  return await request("/transactions", {
    method: "POST",
    body: JSON.stringify(tx),
  });
}

export async function apiUpdateTransaction(id, updates) {
  return await request(`/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function apiBulkAddTransactions(transactions) {
  try {
    return await request("/transactions/bulk", {
      method: "POST",
      body: JSON.stringify({ transactions }),
    });
  } catch (error) {
    console.warn("Backend bulk import unavailable:", error.message);
    return null;
  }
}

export async function apiDeleteTransaction(id) {
  return await request(`/transactions/${id}`, { method: "DELETE" });
}

export async function apiDeleteAccount({ password, confirmText } = {}) {
  return await request("/auth/account", {
    method: "DELETE",
    body: JSON.stringify({ password, confirmText }),
  });
}

/* ==========================================================================
   BUDGET & GOALS API CALLS
   ========================================================================== */

export async function apiGetBudget() {
  return await request("/budgets", { method: "GET" });
}

export async function apiUpdateBudget(budgetData) {
  return await request("/budgets", {
    method: "POST",
    body: JSON.stringify(budgetData),
  });
}

export async function apiGetGoals() {
  return await request("/goals", { method: "GET" });
}

export async function apiCreateGoal(goal) {
  return await request("/goals", {
    method: "POST",
    body: JSON.stringify(goal),
  });
}

export async function apiUpdateGoal(id, updates) {
  return await request(`/goals/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function apiDeleteGoal(id) {
  return await request(`/goals/${id}`, { method: "DELETE" });
}

/* ==========================================================================
   EVENTS API CALLS (Wedding, Vacation, Renovation)
   ========================================================================== */

export async function apiGetEvents() {
  return await request("/events", { method: "GET" });
}

export async function apiCreateEvent(eventData) {
  return await request("/events", {
    method: "POST",
    body: JSON.stringify(eventData),
  });
}

export async function apiGetEvent(id) {
  return await request(`/events/${id}`, { method: "GET" });
}

export async function apiUpdateEvent(id, updates) {
  return await request(`/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function apiDeleteEvent(id) {
  return await request(`/events/${id}`, { method: "DELETE" });
}

export async function apiGetEventTransactions(id) {
  return await request(`/events/${id}/transactions`, { method: "GET" });
}

/* ==========================================================================
   LOANS & EMI API CALLS
   ========================================================================== */

export async function apiGetLoans() {
  return await request("/loans", { method: "GET" });
}

export async function apiCreateLoan(loanData) {
  return await request("/loans", {
    method: "POST",
    body: JSON.stringify(loanData),
  });
}

export async function apiGetLoan(id) {
  return await request(`/loans/${id}`, { method: "GET" });
}

export async function apiUpdateLoan(id, updates) {
  return await request(`/loans/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function apiDeleteLoan(id) {
  return await request(`/loans/${id}`, { method: "DELETE" });
}

export async function apiGetLoanAmortization(id) {
  return await request(`/loans/${id}/amortization`, { method: "GET" });
}

export async function apiCalculatePrepayment(id, { extraMonthly = 0, lumpSum = 0 }) {
  return await request(`/loans/${id}/prepayment-calculation`, {
    method: "POST",
    body: JSON.stringify({ extraMonthly, lumpSum }),
  });
}

/* ==========================================================================
   EMAIL NOTIFICATIONS API CALLS
   ========================================================================== */

export async function apiSendTestEmail() {
  return await request("/notifications/test", { method: "POST" });
}

export async function apiSendReportEmail() {
  return await request("/notifications/report", { method: "POST" });
}

export async function apiTriggerBudgetAlert() {
  return await request("/notifications/budget-alert", { method: "POST" });
}

export async function apiGetNotificationPrefs() {
  return await request("/notifications/preferences", { method: "GET" });
}

export async function apiUpdateNotificationPrefs(prefs) {
  return await request("/notifications/preferences", {
    method: "PUT",
    body: JSON.stringify(prefs),
  });
}
