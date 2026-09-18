/**
 * Read a server-side environment variable without exposing its value to the browser.
 */
export function env(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}
