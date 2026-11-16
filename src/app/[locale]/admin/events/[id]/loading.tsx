import { FormTabSkeleton } from "@/components/ui/skeleton";

// Inside the event layout: the header and tabs stay visible while a tab loads.
export default function Loading() {
  return <FormTabSkeleton />;
}
