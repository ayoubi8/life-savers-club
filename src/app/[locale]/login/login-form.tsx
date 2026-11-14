"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations("login");
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setError(error.code === "email_not_confirmed" ? t("emailNotConfirmed") : t("error"));
      router.replace(`/${locale}/admin`);
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${location.origin}/auth/callback?locale=${locale}`,
      },
    });
    setBusy(false);
    if (error) return setError(error.message || t("signupError"));
    if (data.session) {
      router.replace(`/${locale}/admin`);
      router.refresh();
    } else {
      setInfo(t("checkEmail"));
    }
  }

  async function onGoogle() {
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?locale=${locale}` },
    });
  }

  const input =
    "w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-blue focus:ring-2 focus:ring-blue/20";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "signup" && (
        <label className="block text-sm font-semibold text-grey">
          {t("fullName")}
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={input} />
        </label>
      )}
      <label className="block text-sm font-semibold text-grey">
        {t("email")}
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
      </label>
      <label className="block text-sm font-semibold text-grey">
        {t("password")}
        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
      </label>
      {error && <p className="text-sm text-pink">{error}</p>}
      {info && <p className="text-sm text-green">{info}</p>}
      {mode === "signup" && <p className="text-xs text-muted-foreground">{t("signupHint")}</p>}
      <button disabled={busy} className="w-full rounded-full bg-blue py-2.5 font-bold text-white hover:opacity-90 disabled:opacity-60">
        {mode === "login" ? t("submit") : t("create")}
      </button>
      <button type="button" onClick={onGoogle} className="w-full rounded-full border border-border py-2.5 font-semibold text-grey hover:bg-muted">
        {t("google")}
      </button>
      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setError(null);
          setInfo(null);
        }}
        className="w-full text-center text-sm font-semibold text-blue hover:underline"
      >
        {mode === "login" ? t("noAccount") : t("haveAccount")}
      </button>
    </form>
  );
}
