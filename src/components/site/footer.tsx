import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { L10n } from "@/lib/site";
import { getSiteGeneral } from "@/lib/site-content/queries";
import { tx } from "@/lib/site-content/schema";
import { Ecg } from "./ecg";

export async function Footer({ locale }: { locale: string }) {
  const g = await getSiteGeneral();
  const t = (value: L10n) => tx(value, locale);
  const socials = g.socials.filter((s) => s.url && s.label);
  const address = t(g.address);
  return (
    <footer className="relative mt-24 overflow-hidden bg-deep text-white">
      <div className="absolute inset-0 dots opacity-50" />
      <Ecg className="absolute inset-x-0 top-0 h-10 w-full opacity-70" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <Image src={g.logo.url} alt="" width={56} height={46} className="rounded-full bg-white" />
            <span className="text-xl font-extrabold">{g.nameStart} <span className="text-pink">{g.nameEnd}</span></span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">{t(g.footer.about)}</p>
          {t(g.footer.tagline) && <p className="mt-3 font-bold italic text-green">{t(g.footer.tagline)}</p>}
        </div>
        <div>
          <h3 className="mb-4 font-extrabold text-pink">{t(g.footer.contactTitle)}</h3>
          <ul className="space-y-3 text-sm text-white/80">
            {g.email && (
              <li className="flex gap-2"><Mail size={16} className="mt-0.5 shrink-0 text-blue" /><a href={`mailto:${g.email}`} className="break-all hover:text-white">{g.email}</a></li>
            )}
            {g.phone && (
              <li className="flex gap-2"><Phone size={16} className="mt-0.5 shrink-0 text-blue" /><a href={`tel:${g.phone.replace(/\s+/g, "")}`} className="hover:text-white">{g.phone}</a></li>
            )}
            {address && <li className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-blue" />{address}</li>}
          </ul>
        </div>
        {socials.length > 0 && (
          <div>
            <h3 className="mb-4 font-extrabold text-pink">{t(g.footer.followTitle)}</h3>
            <div className="flex flex-wrap gap-2">
              {socials.map((s) => (
                <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className="glass rounded-full px-4 py-2 text-sm font-bold hover:bg-white/20">{s.label}</a>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="relative border-t border-white/10 px-4 py-5 text-center text-xs text-white/60">
        © {new Date().getFullYear()} {`${g.nameStart} ${g.nameEnd}`.trim()} · <Link href="/login" className="underline-offset-2 hover:underline">{t(g.footer.login)}</Link>
      </div>
    </footer>
  );
}
