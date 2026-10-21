/**
 * Which photo links customers may attach to a review or a return.
 *
 * Only public objects in the store's own Supabase Storage buckets qualify.
 * Anything else, `javascript:` and `data:` URLs included, is rejected before
 * it can reach the admin queue or the storefront. Shared by the browser form
 * and the server action, so it must stay dependency-free.
 */

const PUBLIC_OBJECT_PREFIX = "/storage/v1/object/public/";

function configuredStorageHost(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/** True when `src` is an https link to a public object in `bucket` on this project's storage. */
export function isStoragePhotoUrl(src: string, bucket: string): boolean {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  const host = configuredStorageHost();
  const hostOk = host ? url.host === host : url.hostname.endsWith(".supabase.co");
  if (!hostOk) return false;
  const prefix = `${PUBLIC_OBJECT_PREFIX}${bucket}/`;
  if (!url.pathname.startsWith(prefix)) return false;
  const objectPath = url.pathname.slice(prefix.length);
  // A real object key: no empty segments, no traversal, no query tricks.
  return objectPath.length > 0 && !objectPath.split("/").some((part) => part === "" || part === "." || part === "..");
}
