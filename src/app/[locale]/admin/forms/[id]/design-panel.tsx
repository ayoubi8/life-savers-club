"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { FormShell } from "@/components/forms/form-shell";
import { PublicForm } from "@/components/forms/public-form";
import { createClient } from "@/lib/supabase/client";
import { updateFormDesign } from "@/lib/forms/actions";
import { firstPage, parseSettings } from "@/lib/forms/schema";
import { DEFAULT_THEME, THEME_PRESETS, isDark, themeWarnings, type FormTheme } from "@/lib/forms/theme";
import { cn } from "@/lib/utils";
import { useBuilder } from "./builder-provider";

const MAX_IMAGE = 5 * 1024 * 1024;

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm font-bold text-grey">
      {label}
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-white p-1"
        />
        <input
          value={value}
          onChange={(event) => {
            const next = event.target.value.trim();
            if (/^#[0-9a-fA-F]{0,6}$/.test(next) && next.length === 7) onChange(next.toLowerCase());
          }}
          aria-label={label}
          maxLength={7}
          className="w-24 rounded-lg border border-border px-2 py-1.5 font-mono text-xs font-normal outline-none focus:border-blue"
        />
      </span>
    </label>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-bold text-grey">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-9 rounded-full border px-4 py-1.5 text-xs font-bold",
              value === option.value ? "border-blue bg-blue/10 text-blue" : "border-border text-grey hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ImageField({
  label,
  hint,
  url,
  uploading,
  onPick,
  onClear,
}: {
  label: string;
  hint: string;
  url: string | null;
  uploading: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const t = useTranslations("adminForms.design");
  const input = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="text-sm font-bold text-grey">{label}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="mt-2 flex items-center gap-3">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of a user upload
          <img src={url} alt="" className="h-14 w-20 rounded-lg border border-border object-cover" />
        )}
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="sr-only"
          aria-label={label}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onPick(file);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => input.current?.click()}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold text-grey hover:border-blue hover:text-blue disabled:opacity-60"
        >
          <ImagePlus className="h-4 w-4" />
          {uploading ? t("uploading") : url ? t("replace") : t("upload")}
        </button>
        {url && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-pink hover:bg-pink/5"
          >
            <Trash2 className="h-4 w-4" />
            {t("remove")}
          </button>
        )}
      </div>
    </div>
  );
}

export function DesignPanel({
  formId,
  initialTheme,
  initialCover,
  initialLogo,
}: {
  formId: string;
  initialTheme: FormTheme;
  initialCover: string | null;
  initialLogo: string | null;
}) {
  const t = useTranslations("adminForms.design");
  const { form, schema } = useBuilder();
  const [theme, setTheme] = useState(initialTheme);
  const [cover, setCover] = useState(initialCover);
  const [logo, setLogo] = useState(initialLogo);
  const [saved, setSaved] = useState({ theme: initialTheme, cover: initialCover, logo: initialLogo });
  const [uploading, setUploading] = useState<"cover" | "logo" | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty =
    JSON.stringify(theme) !== JSON.stringify(saved.theme) || cover !== saved.cover || logo !== saved.logo;
  const warnings = themeWarnings(theme);
  const settings = parseSettings(form.settings);
  const page = firstPage(schema);

  const patch = (change: Partial<FormTheme>) => setTheme((current) => ({ ...current, ...change }));

  async function upload(kind: "cover" | "logo", file: File) {
    if (!file.type.startsWith("image/")) return toast.error(t("notImage"));
    if (file.size > MAX_IMAGE) return toast.error(t("tooBig"));
    setUploading(kind);
    const ext = (file.name.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "png";
    const path = `forms/${formId}/${kind}-${Date.now()}.${ext}`;
    const supabase = createClient();
    const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
    setUploading(null);
    if (error) return toast.error(t("uploadFailed"));
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    if (kind === "cover") setCover(data.publicUrl);
    else setLogo(data.publicUrl);
  }

  function save() {
    startTransition(async () => {
      const result = await updateFormDesign(formId, { theme, coverUrl: cover, logoUrl: logo });
      if (result.ok) {
        setSaved({ theme, cover, logo });
        toast.success(t("saved"));
      } else {
        toast.error(t(result.error === "image_invalid" ? "imageInvalid" : "saveFailed"));
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div data-tour="formDesign.controls" className="space-y-6 rounded-card border border-border bg-white p-5">
        <div>
          <h2 className="font-extrabold text-grey">{t("presets")}</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {THEME_PRESETS.map((preset) => {
              const active = JSON.stringify(preset.theme) === JSON.stringify(theme);
              return (
                <button
                  key={preset.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTheme(preset.theme)}
                  className={cn(
                    "overflow-hidden rounded-xl border text-left",
                    active ? "border-blue ring-2 ring-blue/20" : "border-border hover:border-blue/40",
                  )}
                >
                  <span
                    className="block h-8"
                    style={{
                      background:
                        preset.theme.header === "solid"
                          ? preset.theme.primary
                          : `linear-gradient(120deg, ${preset.theme.primary}, ${preset.theme.accent})`,
                    }}
                  />
                  <span className="block px-2 py-1.5 text-[11px] font-bold text-grey" style={{ background: preset.theme.background }}>
                    <span style={{ color: isDark(preset.theme.background) ? "#fff" : undefined }}>{t(`preset.${preset.key}`)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <ColorField label={t("primary")} value={theme.primary} onChange={(primary) => patch({ primary })} />
          <ColorField label={t("accent")} value={theme.accent} onChange={(accent) => patch({ accent })} />
          <ColorField label={t("background")} value={theme.background} onChange={(background) => patch({ background })} />
        </div>

        {warnings.length > 0 && (
          <div role="alert" className="flex gap-2 rounded-xl border border-pink/30 bg-pink/5 p-3 text-xs text-grey">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-pink" />
            <ul className="space-y-1">
              {warnings.map((warning) => (
                <li key={warning}>{t(`warning.${warning}`)}</li>
              ))}
            </ul>
          </div>
        )}

        <Segmented
          label={t("header")}
          value={theme.header}
          onChange={(header) => patch({ header })}
          options={[
            { value: "gradient", label: t("headerGradient") },
            { value: "solid", label: t("headerSolid") },
          ]}
        />
        <Segmented
          label={t("font")}
          value={theme.font}
          onChange={(font) => patch({ font })}
          options={[
            { value: "sans", label: t("fontSans") },
            { value: "serif", label: t("fontSerif") },
            { value: "mono", label: t("fontMono") },
          ]}
        />
        <Segmented
          label={t("radius")}
          value={theme.radius}
          onChange={(radius) => patch({ radius })}
          options={[
            { value: "sharp", label: t("radiusSharp") },
            { value: "soft", label: t("radiusSoft") },
            { value: "round", label: t("radiusRound") },
          ]}
        />

        <ImageField
          label={t("cover")}
          hint={t("coverHint")}
          url={cover}
          uploading={uploading === "cover"}
          onPick={(file) => upload("cover", file)}
          onClear={() => setCover(null)}
        />
        <ImageField
          label={t("logo")}
          hint={t("logoHint")}
          url={logo}
          uploading={uploading === "logo"}
          onPick={(file) => upload("logo", file)}
          onClear={() => setLogo(null)}
        />

        <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap items-center gap-2 rounded-b-card border-t border-border bg-white px-5 py-3">
          <button
            type="button"
            onClick={save}
            disabled={!dirty || pending}
            className="rounded-full bg-blue px-5 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? t("saving") : t("save")}
          </button>
          <button
            type="button"
            onClick={() => {
              setTheme(DEFAULT_THEME);
              setCover(null);
              setLogo(null);
            }}
            className="rounded-full border border-border px-4 py-2 text-xs font-bold text-grey hover:bg-muted"
          >
            {t("reset")}
          </button>
          {dirty && <span className="text-xs font-semibold text-pink">{t("unsaved")}</span>}
        </div>
      </div>

      <div data-tour="formDesign.preview">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("livePreview")}</p>
        <FormShell
          compact
          theme={theme}
          coverUrl={cover}
          logoUrl={logo}
          title={form.title}
          description={page.description}
        >
          <PublicForm
            preview
            formId={form.id}
            schema={schema}
            layout={settings.layout}
            submitLabel={settings.submitLabel}
            successTitle=""
            successMessage=""
            closed={false}
          />
        </FormShell>
      </div>
    </div>
  );
}
