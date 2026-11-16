import {
  Activity,
  Award,
  BookOpen,
  Brain,
  Droplet,
  Globe,
  GraduationCap,
  Handshake,
  Heart,
  HeartHandshake,
  HeartPulse,
  Lightbulb,
  Megaphone,
  Microscope,
  Network,
  ShieldPlus,
  Sprout,
  Star,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Fixed icon set editors can choose from (values and journey milestones). */
export const SITE_ICONS = {
  "book-open": BookOpen,
  "heart-handshake": HeartHandshake,
  network: Network,
  sprout: Sprout,
  megaphone: Megaphone,
  users: Users,
  award: Award,
  handshake: Handshake,
  heart: Heart,
  "heart-pulse": HeartPulse,
  stethoscope: Stethoscope,
  "graduation-cap": GraduationCap,
  lightbulb: Lightbulb,
  microscope: Microscope,
  brain: Brain,
  droplet: Droplet,
  "shield-plus": ShieldPlus,
  activity: Activity,
  globe: Globe,
  star: Star,
} satisfies Record<string, LucideIcon>;

export type SiteIcon = keyof typeof SITE_ICONS;
export const ICON_NAMES = Object.keys(SITE_ICONS) as SiteIcon[];
export const isSiteIcon = (value: unknown): value is SiteIcon => typeof value === "string" && value in SITE_ICONS;

export const BRAND_COLORS = ["pink", "blue", "green"] as const;
export type BrandColor = (typeof BRAND_COLORS)[number];
