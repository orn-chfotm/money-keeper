// All backend calls in this app go through this module.
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return Promise.reject(new Error("NEXT_PUBLIC_API_BASE_URL is not set"));
  }
  return fetch(`${baseUrl}${path}`, init);
}
