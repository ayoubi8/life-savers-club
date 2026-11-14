"use client";

import { useLinkStatus } from "next/link";

/**
 * Thin animated bar shown under a `<Link>` while its navigation is pending.
 * Render it as a child of the Link; the Link needs `relative` positioning.
 * Always rendered (opacity toggles) so it never shifts layout.
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  return <span aria-hidden className="link-pending" data-pending={pending} />;
}
