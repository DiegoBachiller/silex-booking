// Helper to generate readable API keys for AI tool endpoints.
export function generateApiKey(prefix = "silex") {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "")
    .replace(/\//g, "")
    .replace(/=/g, "");
  return `${prefix}_${b64}`;
}
