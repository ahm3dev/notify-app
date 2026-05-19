const DEFAULT_API_URL = "http://localhost:4000";

// Precedence: --api-url flag, then NOTIFY_API_URL, then the local default.
export function resolveApiUrl(flag?: string): string {
  const url = flag ?? process.env.NOTIFY_API_URL ?? DEFAULT_API_URL;
  return url.replace(/\/+$/, "");
}
