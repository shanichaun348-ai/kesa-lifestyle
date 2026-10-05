"use client";

import * as React from "react";

import { syncWishlistAction } from "@/modules/account/actions";
import { localWishlistStore } from "@/modules/wishlist/store";

import { useSession } from "./session-provider";

/**
 * When a session exists, merge the device wishlist into the account once per
 * page load and mirror the account list back into the device store.
 */
export function WishlistSync() {
  const { user, ready } = useSession();
  const synced = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!ready || !user || synced.current === user.id) return;
    synced.current = user.id;
    const local = [...localWishlistStore.getSnapshot()];
    void syncWishlistAction({ slugs: local }).then((result) => {
      if (result.ok) localWishlistStore.replace(result.value.slugs);
    });
  }, [ready, user]);

  return null;
}
