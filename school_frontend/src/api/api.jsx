const api = {
  async request(endpoint, method = "GET", data = null, token = null, isFile = false) {
    const headers = {};
    if (!isFile) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let body = null;
    if (data) {
      if (isFile) body = data;
      else body = JSON.stringify(data);
    }

    const res = await fetch(`${API_URL}${endpoint}`, { method, headers, body });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "API Error");
    }
    return await res.json();
  }
};
export default api;