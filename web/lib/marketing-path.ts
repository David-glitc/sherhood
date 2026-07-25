/** Routes that can defer wallet/RainbowKit JS until idle or first interaction. */
export function isMarketingPath(pathname: string): boolean {
  if (pathname === "/") return true
  return (
    pathname.startsWith("/docs") ||
    pathname.startsWith("/roadmap") ||
    pathname.startsWith("/deck") ||
    pathname.startsWith("/legal") ||
    pathname.startsWith("/telegram") ||
    pathname.startsWith("/share")
  )
}
