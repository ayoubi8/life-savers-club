"use client";

import { ShareContent } from "./share-content";

export function SharePanel(props: {
  publicUrl: string;
  title: string;
  slug: string;
  published: boolean;
  settingsHref: string;
}) {
  return (
    <div className="max-w-3xl">
      <ShareContent {...props} />
    </div>
  );
}
