"use client";

import { useTranslations } from "next-intl";
import { ColorPick, IconPick, ImageField, L10nField, Panel, SaveBar, SortableList, TextField, useSiteForm } from "@/components/admin/site-fields";
import { saveHomePage } from "@/lib/site-content/actions";
import { DEFAULT_HOME, LIMITS, type HomePage } from "@/lib/site-content/schema";

const EMPTY = { fr: "", en: "" };

export function HomeForm({ initial, locale }: { initial: HomePage; locale: string }) {
  const t = useTranslations("adminPages.home");
  const f = useTranslations("adminPages.fields");
  const { values: v, setValues, dirty, pending, save, undo, section } = useSiteForm(initial, saveHomePage);
  const hero = section("hero");
  const about = section("about");
  const journey = section("journey");
  const events = section("events");
  const testimonials = section("testimonials");
  const contact = section("contact");
  const fr = (value: { fr: string; en: string }) => value.fr || value.en;

  return (
    <div className="space-y-4 pb-24">
      <Panel tour="home.hero" title={t("hero")} hint={t("heroHint")}>
        <L10nField label={t("eyebrow")} value={v.hero.eyebrow} onChange={hero("eyebrow")} />
        <L10nField label={t("title1")} value={v.hero.title1} onChange={hero("title1")} />
        <L10nField label={t("title2")} value={v.hero.title2} onChange={hero("title2")} />
        <L10nField label={f("subtitle")} value={v.hero.subtitle} max={LIMITS.long} rows={3} onChange={hero("subtitle")} />
        <L10nField label={t("ctaJoin")} value={v.hero.ctaJoin} max={60} onChange={hero("ctaJoin")} />
        <L10nField label={t("ctaEvents")} value={v.hero.ctaEvents} max={60} onChange={hero("ctaEvents")} />
        <ImageField label={t("heroImage")} hint={t("heroImageHint")} value={v.hero.image} fallback={DEFAULT_HOME.hero.image} round onChange={(image) => image && hero("image")(image)} />
        <L10nField label={t("badge1")} value={v.hero.badge1} max={60} onChange={hero("badge1")} />
        <L10nField label={t("badge2")} value={v.hero.badge2} max={60} onChange={hero("badge2")} />
        <p className="text-xs text-muted-foreground">{t("badgeHint")}</p>
      </Panel>

      <Panel tour="home.stats" title={t("stats")} hint={t("statsHint")}>
        <SortableList
          items={v.stats}
          onChange={(stats) => setValues((c) => ({ ...c, stats }))}
          create={() => ({ value: "", label: EMPTY })}
          max={LIMITS.stats}
          addLabel={t("addStat")}
          itemTitle={(s) => `${s.value} ${fr(s.label)}`.trim()}
          renderItem={(s, update) => (
            <>
              <TextField label={t("statValue")} value={s.value} max={20} placeholder="100+" onChange={(value) => update({ value })} />
              <L10nField label={f("label")} value={s.label} max={60} onChange={(label) => update({ label })} />
            </>
          )}
        />
      </Panel>

      <Panel title={t("about")}>
        <L10nField label={f("title")} value={v.about.title} onChange={about("title")} />
        <L10nField label={t("p1")} value={v.about.p1} max={LIMITS.long} rows={3} onChange={about("p1")} />
        <L10nField label={t("p2")} value={v.about.p2} max={LIMITS.long} rows={3} onChange={about("p2")} />
        <L10nField label={f("button")} value={v.about.cta} max={60} onChange={about("cta")} />
      </Panel>

      <Panel title={t("values")} hint={t("valuesHint")}>
        <SortableList
          items={v.values}
          onChange={(values) => setValues((c) => ({ ...c, values }))}
          create={() => ({ icon: "heart" as const, color: "blue" as const, title: EMPTY, text: EMPTY })}
          max={LIMITS.values}
          addLabel={t("addValue")}
          itemTitle={(item) => fr(item.title)}
          renderItem={(item, update) => (
            <>
              <L10nField label={f("title")} value={item.title} max={60} onChange={(title) => update({ title })} />
              <L10nField label={f("text")} value={item.text} max={200} rows={2} onChange={(text) => update({ text })} />
              <IconPick value={item.icon} color={item.color} onChange={(icon) => update({ icon })} />
              <ColorPick value={item.color} onChange={(color) => update({ color })} />
            </>
          )}
        />
      </Panel>

      <Panel tour="home.journey" title={t("journey")}>
        <L10nField label={f("title")} value={v.journey.title} onChange={journey("title")} />
        <L10nField label={f("subtitle")} value={v.journey.subtitle} max={200} onChange={journey("subtitle")} />
        <L10nField label={t("journeyNow")} value={v.journey.now} max={200} onChange={journey("now")} />
        <h3 className="pt-2 text-sm font-extrabold text-grey">{t("milestones")}</h3>
        <SortableList
          items={v.journey.milestones}
          onChange={journey("milestones")}
          create={() => ({ year: String(new Date().getFullYear()), icon: "star" as const, color: "blue" as const, title: EMPTY, text: EMPTY })}
          max={LIMITS.milestones}
          addLabel={t("addMilestone")}
          itemTitle={(m) => `${m.year} · ${fr(m.title)}`}
          renderItem={(m, update) => (
            <>
              <TextField label={t("year")} value={m.year} max={12} onChange={(year) => update({ year })} />
              <L10nField label={f("title")} value={m.title} max={80} onChange={(title) => update({ title })} />
              <L10nField label={f("text")} value={m.text} max={240} rows={2} onChange={(text) => update({ text })} />
              <IconPick value={m.icon} color={m.color} onChange={(icon) => update({ icon })} />
              <ColorPick value={m.color} onChange={(color) => update({ color })} />
            </>
          )}
        />
      </Panel>

      <Panel tour="home.events" title={t("events")} hint={t("eventsHint")}>
        <L10nField label={t("nextTitle")} value={v.events.nextTitle} onChange={events("nextTitle")} />
        <L10nField label={t("featuredTitle")} value={v.events.featuredTitle} onChange={events("featuredTitle")} />
        <L10nField label={t("allLink")} value={v.events.allLink} max={60} onChange={events("allLink")} />
      </Panel>

      <Panel tour="home.testimonials" title={t("testimonials")}>
        <L10nField label={f("title")} value={v.testimonials.title} onChange={testimonials("title")} />
        <SortableList
          items={v.testimonials.items}
          onChange={testimonials("items")}
          create={() => ({ name: "", role: EMPTY, quote: EMPTY, photo: null })}
          max={LIMITS.testimonials}
          addLabel={t("addTestimonial")}
          itemTitle={(m) => m.name}
          renderItem={(m, update) => (
            <>
              <TextField label={f("name")} value={m.name} max={80} onChange={(name) => update({ name })} />
              <L10nField label={t("role")} value={m.role} max={80} onChange={(role) => update({ role })} />
              <L10nField label={t("quote")} value={m.quote} max={400} rows={3} onChange={(quote) => update({ quote })} />
              <ImageField label={t("photo")} hint={t("photoHint")} value={m.photo} round onChange={(photo) => update({ photo })} />
            </>
          )}
        />
      </Panel>

      <Panel title={t("contact")} hint={t("contactHint")}>
        <L10nField label={f("title")} value={v.contact.title} onChange={contact("title")} />
        <L10nField label={f("text")} value={v.contact.text} max={LIMITS.long} rows={2} onChange={contact("text")} />
        <L10nField label={f("button")} value={v.contact.cta} max={60} onChange={contact("cta")} />
      </Panel>

      <SaveBar dirty={dirty} pending={pending} onSave={save} onUndo={undo} viewHref={`/${locale}`} />
    </div>
  );
}
