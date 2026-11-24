const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:4100/api"
).replace(/\/+$/, "");

const ROLE_USER_IDS = {
  admin: "u1",
  sales_rep: "u2",
  sales_manager: "u3",
  support_agent: "u4"
};

function getCurrentUserId() {
  try {
    const savedUser = localStorage.getItem("crmUser");

    if (!savedUser) return null;

    const user = JSON.parse(savedUser);

    return ROLE_USER_IDS[user.role] || null;
  } catch {
    return null;
  }
}

export async function apiRequest(endpoint, options = {}) {
  const userId = getCurrentUserId();

  if (!userId) {
    throw new Error("Please log in to continue");
  }

  const path = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,

    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      "x-demo-user": userId
    }
  });

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();

  let result;

  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    result = text;
  }

  if (!response.ok) {
    throw new Error(
      result?.error ||
      result?.message ||
      `API Error: ${response.status}`
    );
  }

  return result;
}