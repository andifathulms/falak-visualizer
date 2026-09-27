/**
 * Display names for Hijri months - presentation only. The engine keeps its own
 * spellings in lib/falak/converter.ts (HIJRI_MONTH_NAMES), which the golden
 * vectors pin; the UI shows the standard Indonesian (KBBI) spelling instead,
 * with the Arabic name beside it.
 */
export const HIJRI_MONTHS_ID = [
  "Muharam",
  "Safar",
  "Rabiulawal",
  "Rabiulakhir",
  "Jumadilawal",
  "Jumadilakhir",
  "Rajab",
  "Syakban",
  "Ramadan",
  "Syawal",
  "Zulkaidah",
  "Zulhijah",
] as const;

/** Short forms for tight spaces (the year ribbon on phones). */
export const HIJRI_MONTHS_SHORT = ["Muh", "Saf", "RAw", "RAk", "JAw", "JAk", "Raj", "Syk", "Ram", "Syw", "ZQa", "ZHj"] as const;

export const HIJRI_MONTHS_AR = [
  "محرم",
  "صفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الآخرة",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذو القعدة",
  "ذو الحجة",
] as const;

export function hijriMonthName(month: number): string {
  return HIJRI_MONTHS_ID[month - 1] ?? `Bulan ${month}`;
}

export function hijriMonthArabic(month: number): string {
  return HIJRI_MONTHS_AR[month - 1] ?? "";
}

const ARABIC_INDIC = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export function toArabicDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => ARABIC_INDIC[Number(d)]);
}

/** Days of the Hijri year that Indonesian readers look for, by Hijri date. */
export const ISLAMIC_DAYS: Array<{ month: number; day: number; name: string; major?: boolean }> = [
  { month: 1, day: 1, name: "Tahun Baru Islam", major: true },
  { month: 1, day: 10, name: "Hari Asyura" },
  { month: 3, day: 12, name: "Maulid Nabi Muhammad saw.", major: true },
  { month: 7, day: 27, name: "Isra Mikraj", major: true },
  { month: 8, day: 15, name: "Nisfu Syakban" },
  { month: 9, day: 1, name: "Awal Ramadan", major: true },
  { month: 9, day: 17, name: "Nuzululquran" },
  { month: 10, day: 1, name: "Idulfitri", major: true },
  { month: 12, day: 9, name: "Hari Arafah" },
  { month: 12, day: 10, name: "Iduladha", major: true },
];
