/**
 * One definition per route: the heading a reader sees, and the description
 * printed under it.
 *
 * This exists so page metadata is GENERATED from the on-page copy rather than
 * hand-copied beside it. Every route previously inherited the root layout's
 * single title and description - twelve pages with one identity - because every
 * page is a client component and client components cannot export metadata. The
 * fix is a per-route server layout that reads these same strings, so the
 * <title> and the <h1> can never drift apart: change the copy here and both
 * move together.
 */
export interface RouteMeta {
  path: string;
  /** Rendered as the page heading AND used as the document title. */
  title: string;
  /** Rendered under the heading AND used, trimmed, as the meta description. */
  description: string;
  /** Defaults to "en" (see routeMetadata.ts) - set per-route as each page's actual on-screen language changes (DESIGN.md §7's Indonesian-first redesign lands one page at a time). */
  locale?: "en" | "id";
}

export const ROUTES = {
  // Live destinations (DESIGN.md v2 §4.1), Indonesian per §7.
  "salat": {
    path: "/salat",
    title: "Jadwal Salat",
    description:
      "Waktu salat untuk tempat dan tanggal pilihan Anda, dihitung dari posisi matahari - lengkap dengan lintasan matahari sepanjang hari, sudut yang dipakai, dan jadwal sebulan (imsakiyah).",
    locale: "id",
  },
  "kiblat": {
    path: "/kiblat",
    title: "Arah Kiblat",
    description:
      "Arah dan jarak ke Ka'bah dari lokasi Anda, cara menemukannya dengan bayangan matahari tanpa kompas, dan jadwal Rashdul Kiblat - saat matahari tepat di atas Ka'bah.",
    locale: "id",
  },
  "awal-bulan": {
    path: "/awal-bulan",
    title: "Awal Bulan Hijriah",
    description:
      "Kapan awal Ramadan, Syawal, dan Zulhijah? Tanggal menurut tiap kriteria hisab, langit pada petang penentu, peta ketinggian hilal se-Indonesia, dan alasan di balik setiap perbedaan.",
    locale: "id",
  },
  "kalender": {
    path: "/kalender",
    title: "Kalender Hijriah",
    description:
      "Kalender dengan tanggal Masehi dan Hijriah berdampingan, hari besar Islam, konversi dua arah, dan awal tiap bulan menurut tiga kriteria - dibandingkan dengan keputusan sidang isbat.",
    locale: "id",
  },
  "belajar": {
    path: "/belajar",
    title: "Belajar Ilmu Falak",
    description:
      "Istilah hisab dan rukyat, tiga kriteria awal bulan beserta alasannya dan siapa yang memakainya, cara Falak menghitung, dan bagaimana hasilnya diuji terhadap efemeris JPL DE440.",
    locale: "id",
  },
  // Retired paths. They exist only as redirect stubs with their own noindex
  // metadata; kept here because older layouts and structured data still read
  // their titles.
  "hilal": {
    path: "/hilal",
    title: "Hilal",
    description: "Sekarang bagian dari Awal Bulan.",
    locale: "id",
  },
  "langit": {
    path: "/langit",
    title: "Langit",
    description: "Sekarang dibagi menjadi Salat dan Kiblat.",
    locale: "id",
  },
  "converter": {
    path: "/converter",
    title: "Hijri ↔ Gregorian Converter",
    description:
      "MABIMS-2021 method (Indonesia's current standard) — computed from real ijtimak + visibility, not a tabular lookup.",
  },
  "hilal-visibility": {
    path: "/hilal-visibility",
    title: "Hilal Visibility",
    description:
      "Numeric conditions at sunset on the given evening (intended for the 29th of a Hijri month), classified against three criteria side by side.",
  },
  "visibility-map": {
    path: "/visibility-map",
    title: "Visibility Map (Indonesia)",
    description:
      "Calculated hilal visibility across a 0.5° lat/lon grid — 3,255 locations, computed in your browser when you press Load grid.",
  },
  "prayer-times": {
    path: "/prayer-times",
    title: "Prayer Times",
    description:
      "Computed from solar position for any coordinate and date, shown in the local time zone for that location. Dhuhr, asr and maghrib come from the sun; fajr and isha depend on a twilight angle that organisations set differently.",
  },
  "qibla": {
    path: "/qibla",
    title: "Qibla Direction",
    description:
      "The compass bearing to face from any coordinate, and how far Mecca is. From Indonesia the answer is roughly west-north-west rather than due west — the shortest path over a sphere is a great circle, which curves north on a flat map, so following a due-west line would miss Mecca by hundreds of kilometres.",
  },
  "visibility-calendar": {
    path: "/visibility-calendar",
    title: "Visibility Calendar",
    description:
      "A 12-month view of hilal-visibility conditions for a Hijri year, under a single method at a time - see the whole year instead of one date at a time.",
  },
  "isbat-accuracy": {
    path: "/isbat-accuracy",
    title: "Isbat Accuracy",
    description:
      "How often does each hisab method match the real Kemenag sidang isbat announcement? Compared against actual historical records, not this app's own engine. Predictions are evaluated for Jakarta; sidang isbat is a national determination, so a criterion can miss simply because the deciding evening looked different elsewhere in the archipelago — and because isbat can weigh rukyat testimony no calculation anticipates.",
  },
  "hijri-archive": {
    path: "/hijri-archive",
    title: "Hijri Year Archive",
    description:
      "How far apart do the three criteria land across a Hijri year, and how much of the calendar does that move? Shows each month's start under every criterion, whether they agree, and each one's offset in days from MABIMS 2021, plus a count of how many months the criterion actually decided.",
  },
} as const satisfies Record<string, RouteMeta>;

export type RouteKey = keyof typeof ROUTES;

/** The live destinations, in navigation order (DESIGN.md v2 §4.1) - the sitemap and structured data list these, never the redirect stubs. */
export const LIVE_ROUTE_KEYS = ["salat", "kiblat", "awal-bulan", "kalender", "belajar"] as const satisfies readonly RouteKey[];

/** Every live route, for the sitemap. Home is first. */
export const ALL_PATHS: readonly string[] = ["/", ...LIVE_ROUTE_KEYS.map((key) => ROUTES[key].path)];

export const SITE = {
  name: "Falak",
  /**
   * Absolute origin, needed for canonical URLs and Open Graph - relative URLs
   * are not valid in og:url or og:image. Kept in step with the Pages basePath
   * the build already sets.
   */
  origin: "https://andifathulms.github.io",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  tagline: "Hisab awal bulan, jadwal salat & arah kiblat",
} as const;

export function absoluteUrl(path: string): string {
  const p = path === "/" ? "/" : path;
  return `${SITE.origin}${SITE.basePath}${p}`.replace(/(?<!:)\/\/+/g, "/");
}

/**
 * A meta description derived from the on-page description rather than written
 * separately.
 *
 * Several page descriptions run past 300 characters because they are doing
 * teaching work on screen, and search results truncate around 160. Taking whole
 * leading sentences up to that budget keeps the two in sync automatically - a
 * separately authored short version is exactly the drift this module exists to
 * prevent.
 */
export function metaDescription(description: string, limit = 160): string {
  if (description.length <= limit) return description;
  const sentences = description.split(/(?<=[.?!])\s+/);
  let out = "";
  for (const s of sentences) {
    if (out && (out + " " + s).length > limit) break;
    out = out ? `${out} ${s}` : s;
    if (out.length >= limit) break;
  }
  if (!out) out = description.slice(0, limit);
  return out.length > limit ? `${out.slice(0, limit - 1).trimEnd()}\u2026` : out;
}
