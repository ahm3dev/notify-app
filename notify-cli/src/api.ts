export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  channel: "in_app" | "email";
  title: string;
  body: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface SendInput {
  userId: string;
  channel: "in_app" | "email";
  title: string;
  body: string;
}

export class ApiClient {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      // Encore error bodies are { code, message, ... }.
      const message = (data && data.message) || res.statusText || "request failed";
      throw new Error(`${res.status} ${message}`);
    }
    return data as T;
  }

  createUser(name: string, email: string): Promise<User> {
    return this.request<User>("POST", "/users", { name, email });
  }

  listUsers(): Promise<{ users: User[] }> {
    return this.request<{ users: User[] }>("GET", "/users");
  }

  send(input: SendInput): Promise<Notification> {
    return this.request<Notification>("POST", "/notifications", input);
  }

  listNotifications(userId: string): Promise<{ notifications: Notification[] }> {
    return this.request<{ notifications: Notification[] }>(
      "GET",
      `/notifications?userId=${encodeURIComponent(userId)}`,
    );
  }

  listUnread(userId: string): Promise<{ notifications: Notification[] }> {
    return this.request<{ notifications: Notification[] }>(
      "GET",
      `/notifications/unread?userId=${encodeURIComponent(userId)}`,
    );
  }

  markRead(id: string): Promise<Notification> {
    return this.request<Notification>(
      "POST",
      `/notifications/${encodeURIComponent(id)}/read`,
    );
  }
}
