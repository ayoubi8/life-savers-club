"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function SignOutButton({ locale, label, variant = "solid" }: { locale: string; label: string; variant?: "solid" | "ghost" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await createClient().auth.signOut();
        router.replace(`/${locale}/login`);
        router.refresh();
      }}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 text-sm font-bold transition disabled:opacity-60",
        variant === "solid"
          ? "rounded-full bg-pink px-4 py-2 text-white hover:opacity-90"
          : "h-9 w-9 justify-center rounded-lg text-white/70 hover:bg-pink hover:text-white",
      )}
    >
      <LogOut className="h-4 w-4" aria-hidden />
      {variant === "solid" && label}
    </button>
  );
}
