import { FormTabSkeleton } from "@/components/ui/skeleton";

// Inside the form layout: the builder header and tabs stay visible while a tab loads.
export default function Loading() {
  return <FormTabSkeleton />;
}
