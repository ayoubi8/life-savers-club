// Every admin page guide. Pure data: safe in server code, client components and tests.
// Text lives in messages under `tours.<tour id>.<step id>.title / .body` (fr + en).
// Change a page → update its steps and raise `version` so people see the guide again.
import type { Tour } from "./types";

const ID = "[^/]+";
const route = (pattern: string) => new RegExp(`^${pattern.replaceAll(":id", ID)}/?$`);

export const TOURS: Tour[] = [
  // ───────── Dashboard ─────────
  {
    id: "dashboard",
    version: 1,
    match: route("/admin"),
    steps: [
      { id: "welcome" },
      { id: "nav", target: "admin.nav", side: "right" },
      { id: "cards", target: "dashboard.cards", side: "bottom" },
      { id: "noAccess", target: "dashboard.no-access", side: "bottom", only: "member" },
      { id: "account", target: "admin.account", side: "right" },
      { id: "guide", target: "guide-button", side: "top" },
    ],
  },

  // ───────── Events ─────────
  {
    id: "events.list",
    version: 1,
    match: route("/admin/events"),
    steps: [
      { id: "new", target: "events.new", side: "bottom" },
      { id: "filters", target: "events.filters", side: "bottom" },
      { id: "item", target: "events.item", side: "bottom" },
      { id: "star", target: "events.star", side: "left" },
      { id: "featured", target: "events.featured", side: "bottom" },
      { id: "pageSettings", target: "events.page-settings", side: "bottom", only: "admin" },
    ],
  },
  {
    id: "events.details",
    version: 1,
    match: route("/admin/events/:id/details"),
    steps: [
      { id: "tabs", target: "editor.tabs", side: "bottom" },
      { id: "publish", target: "editor.publish", side: "bottom" },
      { id: "general", target: "events.general", side: "top" },
      { id: "cover", target: "events.cover", side: "top" },
      { id: "stats", target: "events.stats", side: "top" },
      { id: "registration", target: "events.registration", side: "top" },
      { id: "save", target: "events.save", side: "top" },
    ],
  },
  {
    id: "events.media",
    version: 1,
    match: route("/admin/events/:id/media"),
    steps: [
      { id: "upload", target: "eventMedia.upload", side: "bottom" },
      { id: "item", target: "eventMedia.item", side: "top" },
    ],
  },
  {
    id: "events.content",
    version: 1,
    match: route("/admin/events/:id/content"),
    steps: [
      { id: "languages", target: "content.languages", side: "bottom" },
      { id: "toolbar", target: "content.toolbar", side: "bottom" },
      { id: "status", target: "content.status", side: "bottom" },
    ],
  },
  {
    id: "events.design",
    version: 1,
    match: route("/admin/events/:id/design"),
    steps: [
      { id: "controls", target: "design.controls", side: "right" },
      { id: "preview", target: "design.preview", side: "left" },
    ],
  },
  {
    id: "events.pageSettings",
    version: 1,
    match: route("/admin/events/page-settings"),
    steps: [
      { id: "locked", target: "pageSettings.locked", side: "bottom", only: "member" },
      { id: "texts", target: "pageSettings.texts", side: "top" },
      { id: "layout", target: "pageSettings.layout", side: "top" },
      { id: "notes", target: "pageSettings.notes", side: "top" },
    ],
  },

  // ───────── Forms ─────────
  {
    id: "forms.list",
    version: 1,
    match: route("/admin/forms"),
    steps: [
      { id: "new", target: "forms.new", side: "bottom" },
      { id: "card", target: "forms.card", side: "bottom" },
      { id: "actions", target: "forms.actions", side: "top" },
      { id: "templates", target: "forms.templates", side: "top" },
    ],
  },
  {
    id: "forms.edit",
    version: 1,
    match: route("/admin/forms/:id/edit"),
    steps: [
      { id: "tabs", target: "builder.tabs", side: "bottom" },
      { id: "title", target: "builder.title", side: "bottom" },
      { id: "questions", target: "builder.questions", side: "top" },
      { id: "add", target: "builder.add", side: "top" },
      { id: "save", target: "builder.save", side: "bottom" },
      { id: "undo", target: "builder.undo", side: "bottom" },
      { id: "preview", target: "builder.preview", side: "bottom" },
      { id: "publish", target: "builder.publish", side: "bottom" },
    ],
  },
  {
    id: "forms.design",
    version: 1,
    match: route("/admin/forms/:id/design"),
    steps: [
      { id: "controls", target: "formDesign.controls", side: "right" },
      { id: "preview", target: "formDesign.preview", side: "left" },
    ],
  },
  {
    id: "forms.share",
    version: 1,
    match: route("/admin/forms/:id/share"),
    steps: [
      { id: "link", target: "share.link", side: "bottom" },
      { id: "qr", target: "share.qr", side: "top" },
      { id: "embed", target: "share.embed", side: "top" },
    ],
  },
  {
    id: "forms.results",
    version: 1,
    match: route("/admin/forms/:id/results"),
    steps: [
      { id: "views", target: "results.views", side: "bottom" },
      { id: "filters", target: "results.filters", side: "bottom" },
      { id: "export", target: "results.export", side: "bottom" },
    ],
  },
  {
    id: "forms.integrations",
    version: 1,
    match: route("/admin/forms/:id/integrations"),
    steps: [
      { id: "google", target: "integrations.google", side: "bottom" },
      { id: "how", target: "integrations.how", side: "top" },
    ],
  },
  {
    id: "forms.settings",
    version: 1,
    match: route("/admin/forms/:id/settings"),
    steps: [
      { id: "main", target: "settings.main", side: "top" },
      { id: "danger", target: "settings.danger", side: "top" },
    ],
  },

  // ───────── Media library ─────────
  {
    id: "media.library",
    version: 1,
    match: route("/admin/media"),
    steps: [
      { id: "account", target: "media.account", side: "bottom" },
      { id: "changeAccount", target: "media.change-account", side: "bottom", only: "admin" },
      { id: "requests", target: "media.requests", side: "bottom", only: "admin" },
      { id: "newFolder", target: "media.new-folder", side: "bottom" },
      { id: "folder", target: "media.folder", side: "bottom" },
      { id: "menuAdmin", target: "media.folder-menu", side: "top", only: "admin" },
      { id: "menuMember", target: "media.folder-menu", side: "top", only: "member" },
    ],
  },
  {
    id: "media.folder",
    version: 1,
    match: route("/admin/media/:id"),
    steps: [
      { id: "filters", target: "media.filters", side: "bottom" },
      { id: "upload", target: "media.upload", side: "bottom" },
      { id: "file", target: "media.file", side: "bottom" },
      { id: "deleteAdmin", only: "admin" },
      { id: "deleteMember", only: "member" },
    ],
  },

  // ───────── Finance ─────────
  {
    id: "finance.home",
    version: 1,
    match: route("/admin/finance"),
    steps: [
      { id: "noYear", target: "finance.no-year", side: "bottom" },
      { id: "google", target: "finance.google", side: "bottom" },
      { id: "shareEmail", target: "finance.share-email", side: "bottom" },
      { id: "yearActions", target: "finance.year-actions", side: "bottom", only: "admin" },
      { id: "totals", target: "finance.totals", side: "bottom" },
      { id: "charts", target: "finance.charts", side: "top" },
      { id: "sheets", target: "finance.sheets", side: "top" },
      { id: "recent", target: "finance.recent", side: "top" },
    ],
  },
  {
    id: "finance.sheet",
    version: 1,
    match: route("/admin/finance/sheets/:id"),
    steps: [
      { id: "locked", target: "sheet.locked", side: "bottom" },
      { id: "add", target: "sheet.add", side: "bottom" },
      { id: "filters", target: "sheet.filters", side: "bottom" },
      { id: "table", target: "sheet.table", side: "top" },
      { id: "quick", target: "sheet.quick", side: "top" },
      { id: "editMember", only: "member" },
      { id: "editAdmin", only: "admin" },
      { id: "export", target: "sheet.export", side: "bottom" },
    ],
  },
  {
    id: "finance.history",
    version: 1,
    match: route("/admin/finance/history"),
    steps: [{ id: "list", target: "history.list", side: "top" }],
  },

  // ───────── Team (admins) ─────────
  {
    id: "team.list",
    version: 1,
    match: route("/admin/team"),
    steps: [
      { id: "bureau", target: "team.bureau", side: "bottom" },
      { id: "departments", target: "team.departments", side: "top" },
      { id: "new", target: "team.new", side: "bottom" },
      { id: "view", target: "team.view", side: "bottom" },
    ],
  },
  {
    id: "team.details",
    version: 1,
    match: route("/admin/team/:id/details"),
    steps: [
      { id: "tabs", target: "editor.tabs", side: "bottom" },
      { id: "publish", target: "editor.publish", side: "bottom" },
      { id: "identity", target: "dept.identity", side: "top" },
      { id: "leader", target: "dept.leader", side: "top" },
      { id: "autosave", target: "dept.autosave", side: "top" },
    ],
  },
  {
    id: "team.content",
    version: 1,
    match: route("/admin/team/:id/content"),
    steps: [
      { id: "languages", target: "content.languages", side: "bottom" },
      { id: "toolbar", target: "content.toolbar", side: "bottom" },
      { id: "status", target: "content.status", side: "bottom" },
    ],
  },
  {
    id: "team.design",
    version: 1,
    match: route("/admin/team/:id/design"),
    steps: [
      { id: "controls", target: "design.controls", side: "right" },
      { id: "card", target: "dept.card-preview", side: "left" },
      { id: "preview", target: "design.preview", side: "top" },
    ],
  },
  {
    id: "team.media",
    version: 1,
    match: route("/admin/team/:id/media"),
    steps: [
      { id: "mode", target: "dept.mode", side: "bottom" },
      { id: "photos", target: "dept.photos", side: "top" },
      { id: "members", target: "dept.members", side: "top" },
    ],
  },

  // ───────── Site pages (admins) ─────────
  {
    id: "pages.index",
    version: 1,
    match: route("/admin/pages"),
    steps: [{ id: "pages", target: "site.pages", side: "bottom" }],
  },
  {
    id: "pages.general",
    version: 1,
    match: route("/admin/pages/general"),
    steps: [
      { id: "brand", target: "general.brand", side: "top" },
      { id: "nav", target: "general.nav", side: "top" },
      { id: "contact", target: "general.contact", side: "top" },
      { id: "socials", target: "general.socials", side: "top" },
      { id: "save", target: "site.save", side: "top" },
    ],
  },
  {
    id: "pages.home",
    version: 1,
    match: route("/admin/pages/home"),
    steps: [
      { id: "hero", target: "home.hero", side: "top" },
      { id: "stats", target: "home.stats", side: "top" },
      { id: "journey", target: "home.journey", side: "top" },
      { id: "events", target: "home.events", side: "top" },
      { id: "testimonials", target: "home.testimonials", side: "top" },
      { id: "save", target: "site.save", side: "top" },
    ],
  },
  {
    id: "pages.sponsors",
    version: 1,
    match: route("/admin/pages/sponsors"),
    steps: [
      { id: "hero", target: "sponsors.hero", side: "top" },
      { id: "list", target: "sponsors.list", side: "top" },
      { id: "cta", target: "sponsors.cta", side: "top" },
      { id: "save", target: "site.save", side: "top" },
    ],
  },

  // ───────── Accounts (admins) ─────────
  {
    id: "accounts",
    version: 1,
    match: route("/admin/accounts"),
    steps: [
      { id: "pending", target: "accounts.pending", side: "bottom" },
      { id: "role", target: "accounts.role", side: "bottom" },
      { id: "sections", target: "accounts.sections", side: "bottom" },
      { id: "status", target: "accounts.status", side: "bottom" },
      { id: "disabled", target: "accounts.disabled", side: "top" },
    ],
  },
];

/** The guide of the page at `pathname` (without the locale), if it has one. */
export function matchTour(pathname: string): Tour | null {
  return TOURS.find((tour) => tour.match.test(pathname)) ?? null;
}
