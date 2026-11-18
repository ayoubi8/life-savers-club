"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { updateCredentials, type CredentialsResult } from "./actions";

type ErrorCode = Extract<CredentialsResult, { ok: false }>["error"];

type Labels = {
  open: string;
  email: string;
  password: string;
  passwordHint: string;
  save: string;
  saved: string;
  errors: Record<ErrorCode, string>;
};

/** Owner only: change an account's sign-in email or give it a new password. */
export function CredentialsForm({ account, labels: l }: { account: { id: string; email: string }; labels: Labels }) {
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(false);
  const [pending, startTransition] = useTransition();

  function action(formData: FormData) {
    startTransition(async () => {
      const result = await updateCredentials(null, formData);
      if (!result.ok) return void toast.error(l.errors[result.error]);
      toast.success(l.saved);
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-sm font-bold text-blue hover:bg-muted sm:self-end"
      >
        <KeyRound className="h-4 w-4" aria-hidden />
        {l.open}
      </button>
    );
  }

  const field = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm";
  return (
    <form action={action} className="flex w-full flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3 sm:w-80">
      <input type="hidden" name="id" value={account.id} />
      <label className="text-xs font-bold text-grey">
        {l.email}
        <input name="email" type="email" defaultValue={account.email} autoComplete="off" className={`mt-1 ${field}`} />
      </label>
      <label className="text-xs font-bold text-grey">
        {l.password}
        <span className="relative mt-1 block">
          <input name="password" type={show ? "text" : "password"} minLength={8} maxLength={72} autoComplete="new-password" className={`${field} pr-10`} />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide" : "Show"}
            className="absolute inset-y-0 right-0 grid w-10 place-items-center text-grey"
          >
            {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        </span>
        <span className="mt-1 block font-semibold text-muted-foreground">{l.passwordHint}</span>
      </label>
      <div className="flex gap-2">
        <button disabled={pending} className="rounded-full bg-blue px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
          {l.save}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full px-3 py-2 text-sm font-bold text-grey hover:bg-muted">
          ✕
        </button>
      </div>
    </form>
  );
}
