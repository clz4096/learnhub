/** Light, dark, or follow the system. Kept in localStorage; applied as data-theme on the root element. */
import { signal } from '@preact/signals';

export type Theme = 'system' | 'light' | 'dark';
export const THEME_KEY = 'mastery.theme.v1';
export const theme = signal<Theme>('system');

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadTheme(): void {
  try {
    const v = store()?.getItem(THEME_KEY);
    theme.value = v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    theme.value = 'system';
  }
  apply();
}

export function setTheme(t: Theme): void {
  theme.value = t;
  try {
    store()?.setItem(THEME_KEY, t);
  } catch {
    // Not saved; the choice lasts for this page.
  }
  apply();
}

function apply(): void {
  if (typeof document === 'undefined') return;
  if (theme.value === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme.value;
  themeColor();
}

/**
 * The browser bar takes the page's own paper (tokens.css): a chosen theme sets both
 * theme-color tags to it; following the device restores each tag's own colour.
 */
function themeColor(): void {
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  if (metas.length === 0 || typeof getComputedStyle !== 'function') return;
  for (const m of metas) {
    m.dataset.own ??= m.content;
    m.content = theme.value === 'system' ? m.dataset.own : getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || m.dataset.own;
  }
}
