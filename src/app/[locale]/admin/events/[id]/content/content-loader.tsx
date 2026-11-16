"use client";

import dynamic from "next/dynamic";
import { FormTabSkeleton } from "@/components/ui/skeleton";

/**
 * The editor only runs in the browser: it reads the local backup on first render and
 * the TipTap bundle stays out of server rendering and out of every other route.
 */
export const ContentEditorLoader = dynamic(() => import("./content-editor").then((mod) => mod.ContentEditor), {
  ssr: false,
  loading: () => <FormTabSkeleton />,
});
