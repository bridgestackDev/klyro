import { THEME_STORAGE_KEY } from "./ThemeProvider";

/**
 * Dashboard route segments (locale-prefixed at runtime, e.g. /es/dashboard).
 * Keep in sync with NAV_ITEMS in src/components/dashboard/nav-items.ts.
 */
const DASHBOARD_SEGMENTS = [
  "dashboard",
  "agenda",
  "team",
  "branches",
  "services",
  "links",
  "settings",
];

/**
 * Blocking inline no-flash script, rendered (server-side) once in the ROOT
 * layout — not the dashboard layout. The root layout never client-remounts, so
 * the <script> element is only ever in the initial server HTML and never goes
 * through a client render, which is what avoids React 19's "script tag while
 * rendering" warning (that fired when the dashboard layout mounted on client
 * navigation).
 *
 * It self-gates to dashboard pathnames so the (dark-only, hardcoded) marketing
 * landing and the public booking flow are left untouched; theming stays
 * dashboard-scoped. On dashboard full loads it applies the stored/system theme
 * to <html> before first paint, so light-mode users never flash dark→light.
 */
export const THEME_NO_FLASH_SCRIPT = `(function(){try{var seg=${JSON.stringify(
  DASHBOARD_SEGMENTS
)};var p=location.pathname;var isDash=seg.some(function(s){return new RegExp('^/[a-z]{2}/'+s+'(/|$)').test(p);});if(!isDash)return;var t=localStorage.getItem('${THEME_STORAGE_KEY}');var d=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';var r=(t==='light'||t==='dark')?t:d;var e=document.documentElement;e.classList.remove('light','dark');e.classList.add(r);e.style.colorScheme=r;}catch(e){}})();`;
