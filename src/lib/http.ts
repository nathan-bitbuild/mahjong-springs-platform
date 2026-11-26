/** Trailing-slash policy. API routes must not 308; pages still use a trailing slash. */

export function apiPathNeedsInternalSlash(pathname: string): boolean {
  if (pathname !== "/api" && !pathname.startsWith("/api/")) return false;
  return !pathname.endsWith("/");
}

export function pagePathNeedsTrailingSlash(pathname: string): boolean {
  if (pathname === "/api" || pathname.startsWith("/api/")) return false;
  if (pathname.endsWith("/")) return false;
  const last = pathname.split("/").pop() ?? "";
  if (last.includes(".")) return false;
  return true;
}
