"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ locale, label }: { locale: string; label: string }) {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await createClient().auth.signOut();
        router.replace(`/${locale}/login`);
        router.refresh();
      }}
      className="rounded-lg bg-pink px-3 py-2 text-sm font-bold hover:opacity-90"
    >
      {label}
    </button>
  );
}
