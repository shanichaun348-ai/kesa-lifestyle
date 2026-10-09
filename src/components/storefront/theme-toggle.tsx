"use client";

import * as React from "react";
import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { isTheme, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

function readTheme(): Theme {
  const current = document.documentElement.dataset.theme;
  return isTheme(current) ? current : "light";
}

/** Re-render whenever `data-theme` on <html> changes (this tab or another). */
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY && isTheme(event.newValue)) {
      document.documentElement.dataset.theme = event.newValue;
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    observer.disconnect();
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Light / dark switch. The server renders the light icon; after hydration
 * the real value is read from <html>, which the inline script in the root
 * layout set before first paint, so the page itself never flashes.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = React.useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);
  const next: Theme = theme === "dark" ? "light" : "dark";

  function toggle() {
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* storage unavailable: the choice lasts for this page only */
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={className}
    >
      {theme === "dark" ? <SunIcon strokeWidth={1.5} aria-hidden="true" /> : <MoonIcon strokeWidth={1.5} aria-hidden="true" />}
    </Button>
  );
}
