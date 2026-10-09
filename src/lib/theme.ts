/**
 * Light / dark theme (ADR-34).
 *
 * The choice lives in localStorage under THEME_STORAGE_KEY and is applied as
 * `data-theme` on <html>. With no stored choice the OS preference is used.
 * THEME_INIT_SCRIPT runs inline in <head> before first paint so a dark page
 * never flashes light; it must stay dependency-free and tiny.
 */
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "kesa:theme";

export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)},t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})();`;

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}
