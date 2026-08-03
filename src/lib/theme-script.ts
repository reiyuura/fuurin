/**
 * themeScript — inline IIFE injected into <head> as a raw <script> tag.
 *
 * MUST be server-safe: no imports, no closures over module-scope state,
 * no React hooks. Runs synchronously before first paint so the correct
 * theme is applied before the browser renders any pixels.
 *
 * Syncs two things to <html>:
 *   1. `dark` class  → drives CSS custom-property overrides in globals.css
 *   2. `lang` attr   → avoids a hydration mismatch on <html lang>
 *
 * The class is removed when the stored theme is light so stale `dark`
 * state from extensions/devtools doesn't survive a hard refresh.
 */

export const themeScript = `(function(){try{var t=localStorage.getItem('fuurin-theme');var d=t==='dark';if(!t){d=window.matchMedia('(prefers-color-scheme: dark)').matches}document.documentElement.classList.toggle('dark',d);var l=localStorage.getItem('fuurin-locale');if(l){document.documentElement.lang=l}}catch(e){}})();`