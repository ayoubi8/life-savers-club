"use client";

import { useTranslations } from "next-intl";
import { ImageField, L10nField, Panel, SaveBar, SortableList, TextField, useSiteForm } from "@/components/admin/site-fields";
import { saveSponsorsPage } from "@/lib/site-content/actions";
import { LIMITS, type SponsorsPage } from "@/lib/site-content/schema";

export function SponsorsForm({ initial, locale }: { initial: SponsorsPage; locale: string }) {
  const t = useTranslations("adminPages.sponsors");
  const f = useTranslations("adminPages.fields");
  const { values: v, setValues, dirty, pending, save, undo, section } = useSiteForm(initial, saveSponsorsPage);
  const hero = section("hero");
  const cta = section("cta");

  return (
    <div className="space-y-4 pb-24">
      <Panel tour="sponsors.hero" title={t("hero")}>
        <L10nField label={f("title")} value={v.hero.title} onChange={hero("title")} />
        <L10nField label={f("subtitle")} value={v.hero.subtitle} max={LIMITS.long} rows={2} onChange={hero("subtitle")} />
      </Panel>

      <Panel tour="sponsors.list" title={t("list")} hint={t("listHint")}>
        <SortableList
          items={v.sponsors}
          onChange={(sponsors) => setValues((c) => ({ ...c, sponsors }))}
          create={() => ({ name: "", url: "", logo: null })}
          max={LIMITS.sponsors}
          addLabel={t("add")}
          itemTitle={(s) => s.name}
          renderItem={(s, update) => (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label={f("name")} value={s.name} max={80} onChange={(name) => update({ name })} />
                <TextField label={t("website")} type="url" value={s.url} max={500} placeholder="https://" onChange={(url) => update({ url })} />
              </div>
              <ImageField label={t("logo")} hint={t("logoHint")} value={s.logo} onChange={(logo) => update({ logo })} />
            </>
          )}
        />
      </Panel>

      <Panel tour="sponsors.cta" title={t("cta")} hint={t("ctaHint")}>
        <L10nField label={f("title")} value={v.cta.title} onChange={cta("title")} />
        <L10nField label={f("text")} value={v.cta.text} max={LIMITS.long} rows={2} onChange={cta("text")} />
        <L10nField label={f("button")} value={v.cta.button} max={60} onChange={cta("button")} />
      </Panel>

      <SaveBar dirty={dirty} pending={pending} onSave={save} onUndo={undo} viewHref={`/${locale}/sponsors`} />
    </div>
  );
}
