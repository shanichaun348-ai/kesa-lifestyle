"use client";

import * as React from "react";

export type SessionInfo = { id: string; email: string | null } | null;

type SessionContextValue = { user: SessionInfo; ready: boolean; refresh: () => Promise<void> };

const SessionContext = React.createContext<SessionContextValue | null>(null);

/**
 * Client view of the session, fetched after hydration so cached pages stay
 * static. Carries only the user id and email; authorisation always happens
 * on the server from the cookie, never from this context.
 */
async function loadSession(): Promise<SessionInfo> {
  try {
    const res = await fetch("/api/session/", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: SessionInfo };
    return data.user;
  } catch {
    return null; // offline: treat as guest
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SessionInfo>(null);
  const [ready, setReady] = React.useState(false);

  // State is set only inside the promise callback, never synchronously in the effect.
  const refresh = React.useCallback(
    () =>
      loadSession().then((next) => {
        setUser(next);
        setReady(true);
      }),
    [],
  );

  React.useEffect(() => {
    let active = true;
    loadSession().then((next) => {
      if (!active) return;
      setUser(next);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const value = React.useMemo(() => ({ user, ready, refresh }), [user, ready, refresh]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = React.useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
