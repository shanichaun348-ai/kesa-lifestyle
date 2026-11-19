/**
 * Light / dark theme (ADR-34).
 *
 * The choice lives in localStorage under THEME_STORAGE_KEY and is applied as
 * `data-theme` on <html>. The brand default is LIGHT (blush rose gold) for
 * every visitor regardless of OS setting; dark remains an explicit choice
 * via the header toggle. THEME_INIT_SCRIPT runs inline in <head> before
 * first paint so a stored dark choice never flashes light; it must stay
 * dependency-free and tiny. <html> is server-rendered with data-theme="light"
 * so the default holds even without JavaScript.
 */
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "kesa:theme";
export const DEFAULT_THEME: Theme = "light";

export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)},t=localStorage.getItem(k);document.documentElement.dataset.theme=(t==="light"||t==="dark")?t:${JSON.stringify(DEFAULT_THEME)}}catch(e){}})();`;

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}
