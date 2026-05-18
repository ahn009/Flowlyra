export class FlowlyraClient {
  constructor({ apiKey, baseUrl = "http://localhost:8000/api/v1" }) {
    if (!apiKey) throw new Error("apiKey is required");
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
        ...(options.headers || {}),
      },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`FlowLyra API error ${response.status}: ${text}`);
    }
    return response.status === 204 ? null : response.json();
  }

  listChats(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/platform/chats${q ? `?${q}` : ""}`);
  }

  listMessages(chatId) {
    return this.request(`/platform/chats/${chatId}/messages`);
  }

  sendMessage(chatId, content) {
    return this.request(`/platform/chats/${chatId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  }

  listContacts(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/platform/contacts${q ? `?${q}` : ""}`);
  }

  createTicket(payload) {
    return this.request("/platform/tickets", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  apiStatus() {
    return this.request("/platform/status");
  }
}
