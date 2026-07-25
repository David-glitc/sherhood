"use client"

import { SiteFooter } from "@/components/layout/page-shell"

/**
 * Always-visible site footer in document flow.
 * (Previous soft/fixed footer hid on short pages — links never appeared.)
 */
export function SoftSiteFooter() {
  return <SiteFooter />
}
