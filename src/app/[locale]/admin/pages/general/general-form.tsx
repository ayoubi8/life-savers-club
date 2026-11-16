"use client";

import { useTranslations } from "next-intl";
import { ImageField, L10nField, Panel, SaveBar, SortableList, TextField, useSiteForm } from "@/components/admin/site-fields";
import { saveSiteGeneral } from "@/lib/site-content/actions";
import { DEFAULT_GENERAL, LIMITS, type SiteGeneral } from "@/lib/site-content/schema";

export function GeneralForm({ initial, locale }: { initial: SiteGeneral; locale: string }) {
  const t = useTranslations("adminPages.general");
  const f = useTranslations("adminPages.fields");
  const { values: v, setValues, dirty, pending, save, undo, section } = useSiteForm(initial, saveSiteGeneral);
  const nav = section("nav");
  const footer = section("footer");

  return (
    <div className="space-y-4 pb-24">
      <Panel title={t("brand")} hint={t("brandHint")}>
        <ImageField label={t("logo")} value={v.logo} fallback={DEFAULT_GENERAL.logo} round onChange={(logo) => logo && setValues((c) => ({ ...c, logo }))} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label={t("nameStart")} value={v.nameStart} max={40} onChange={(nameStart) => setValues((c) => ({ ...c, nameStart }))} />
          <TextField label={t("nameEnd")} value={v.nameEnd} max={40} onChange={(nameEnd) => setValues((c) => ({ ...c, nameEnd }))} />
        </div>
      </Panel>

      <Panel title={t("nav")} hint={t("navHint")}>
        <L10nField label={t("navHome")} value={v.nav.home} max={40} onChange={nav("home")} />
        <L10nField label={t("navEvents")} value={v.nav.events} max={40} onChange={nav("events")} />
        <L10nField label={t("navTeam")} value={v.nav.team} max={40} onChange={nav("team")} />
        <L10nField label={t("navSponsors")} value={v.nav.sponsors} max={40} onChange={nav("sponsors")} />
        <L10nField label={t("navJoin")} value={v.nav.join} max={40} onChange={nav("join")} />
      </Panel>

      <Panel title={t("contact")} hint={t("contactHint")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label={t("email")} type="email" value={v.email} onChange={(email) => setValues((c) => ({ ...c, email }))} />
          <TextField label={t("phone")} type="tel" value={v.phone} onChange={(phone) => setValues((c) => ({ ...c, phone }))} />
        </div>
        <L10nField label={t("address")} value={v.address} max={200} onChange={(address) => setValues((c) => ({ ...c, address }))} />
      </Panel>

      <Panel title={t("footer")}>
        <L10nField label={t("about")} value={v.footer.about} max={LIMITS.long} rows={3} onChange={footer("about")} />
        <L10nField label={t("tagline")} value={v.footer.tagline} onChange={footer("tagline")} />
        <L10nField label={t("contactTitle")} value={v.footer.contactTitle} onChange={footer("contactTitle")} />
        <L10nField label={t("followTitle")} value={v.footer.followTitle} onChange={footer("followTitle")} />
        <L10nField label={t("login")} value={v.footer.login} onChange={footer("login")} />
      </Panel>

      <Panel title={t("socials")} hint={t("socialsHint")}>
        <SortableList
          items={v.socials}
          onChange={(socials) => setValues((c) => ({ ...c, socials }))}
          create={() => ({ label: "", url: "" })}
          max={LIMITS.socials}
          addLabel={t("addSocial")}
          itemTitle={(s) => s.label}
          renderItem={(s, update) => (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label={f("label")} value={s.label} max={40} placeholder="Instagram" onChange={(label) => update({ label })} />
              <TextField label={f("url")} type="url" value={s.url} max={500} placeholder="https://" onChange={(url) => update({ url })} />
            </div>
          )}
        />
      </Panel>

      <SaveBar dirty={dirty} pending={pending} onSave={save} onUndo={undo} viewHref={`/${locale}`} />
    </div>
  );
}
