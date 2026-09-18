export const THEME_STORAGE_KEY = "jev-live-router-theme";
export const THEME_EVENT = "jev-theme";

export const THEME_LIGHT = "#f4f3ef";
export const THEME_DARK = "#141414";

export const THEME_BOOT_SCRIPT = `(function(){
  try {
    var key = ${JSON.stringify(THEME_STORAGE_KEY)};
    var stored = localStorage.getItem(key);
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var dark = stored === "dark" || ((stored === null || stored === "system") && prefersDark);
    if (stored === "light") dark = false;
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? ${JSON.stringify(THEME_DARK)} : ${JSON.stringify(THEME_LIGHT)});
  } catch (e) {}
})();`;

export function currentTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyTheme(theme: "light" | "dark", persist: boolean) {
  const dark = theme === "dark";
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? THEME_DARK : THEME_LIGHT);
  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* ignore quota */
    }
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function toggleTheme() {
  applyTheme(currentTheme() === "dark" ? "light" : "dark", true);
}

export function syncSystemTheme() {
  try {
    if (localStorage.getItem(THEME_STORAGE_KEY)) return;
  } catch {
    return;
  }
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(prefersDark ? "dark" : "light", false);
}
