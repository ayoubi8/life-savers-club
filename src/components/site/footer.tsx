import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { site } from "@/lib/site";
import { Ecg } from "./ecg";

export async function Footer({ locale }: { locale: string }) {
  const t = await getTranslations({ locale });
  return (
    <footer className="relative mt-24 overflow-hidden bg-deep text-white">
      <div className="absolute inset-0 dots opacity-50" />
      <Ecg className="absolute inset-x-0 top-0 h-10 w-full opacity-70" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <Image src="/brand/logo.png" alt="" width={56} height={46} className="rounded-full bg-white" />
            <span className="text-xl font-extrabold">Life <span className="text-pink">Savers</span></span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">{t("footer.about")}</p>
          <p className="mt-3 font-bold italic text-green">{t("brand.tagline")}</p>
        </div>
        <div>
          <h3 className="mb-4 font-extrabold text-pink">{t("footer.contact")}</h3>
          <ul className="space-y-3 text-sm text-white/80">
            <li className="flex gap-2"><Mail size={16} className="mt-0.5 shrink-0 text-blue" /><a href={`mailto:${site.email}`} className="break-all hover:text-white">{site.email}</a></li>
            <li className="flex gap-2"><Phone size={16} className="mt-0.5 shrink-0 text-blue" />{site.phone}</li>
            <li className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-blue" />{site.address}</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 font-extrabold text-pink">{t("footer.follow")}</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(site.socials).map(([k, v]) => (
              <a key={k} href={v} target="_blank" rel="noreferrer" className="glass rounded-full px-4 py-2 text-sm font-bold capitalize hover:bg-white/20">{k}</a>
            ))}
          </div>
        </div>
      </div>
      <div className="relative border-t border-white/10 px-4 py-5 text-center text-xs text-white/60">
        © {new Date().getFullYear()} Life Savers · <Link href="/login" className="underline-offset-2 hover:underline">{t("nav.login")}</Link>
      </div>
    </footer>
  );
}
