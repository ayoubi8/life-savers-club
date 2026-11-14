import { Ecg } from "./ecg";

export function PageHero({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: string }) {
  return (
    <section className="bg-hero relative overflow-hidden text-white">
      <div className="dots absolute inset-0" />
      <div className="animate-drift absolute -left-20 top-0 h-64 w-64 rounded-full bg-blue/40 blur-3xl" />
      <div className="animate-drift absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-pink/40 blur-3xl [animation-delay:-5s]" />
      <Ecg className="absolute inset-x-0 bottom-0 h-12 w-full opacity-60" />
      <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
        {eyebrow && <p className="mb-3 text-sm font-extrabold uppercase tracking-widest text-green">{eyebrow}</p>}
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl md:text-6xl">{title}</h1>
        {subtitle && <p className="mx-auto mt-4 max-w-2xl text-base text-white/80 sm:text-lg">{subtitle}</p>}
      </div>
    </section>
  );
}
