/**
 * Only same-origin absolute paths may be used as post-auth redirects.
 * Blocks open redirects (`//evil`, `https://…`, `javascript:`) and the auth
 * pages themselves.
 */
export function safeNextPath(input: string | null | undefined, fallback = "/account/"): string {
  if (!input) return fallback;
  if (!input.startsWith("/") || input.startsWith("//") || input.includes("\\") || /[\u0000-\u001f]/.test(input)) return fallback;
  if (/^\/(login|register|forgot-password|auth)\b/.test(input)) return fallback;
  return input;
}
