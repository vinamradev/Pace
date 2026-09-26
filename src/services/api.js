const API_BASE = "http://localhost:5000/api";

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

export async function apiRegister({ name, email, password, monthlyBudget }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, monthlyBudget }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Registration failed");
  return data;
}

export async function apiLogin({ email, password }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Login failed");
  return data;
}

export async function apiGoogleAuth({ credential, email, name, picture, googleId }) {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential, email, name, picture, googleId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Google authentication failed");
  return data;
}

export async function apiResetPassword({ email, newPassword }) {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Reset password failed");
  return data;
}

export async function apiBulkAddTransactions(userId, transactions) {
  try {
    const res = await fetch(`${API_BASE}/transactions/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, transactions }),
    });
    return await res.json();
  } catch (error) {
    console.warn("Backend bulk import unavailable, data stored locally:", error.message);
    return null;
  }
}
